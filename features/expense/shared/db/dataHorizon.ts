import {client} from "@/lib/prisma";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {buildSavingWhere} from "@/features/saving/db/savingWhere";
import {type Granularity, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {periodsPerYear} from "@/features/expense/shared/db/recurrence";

// The user's data horizon: the earliest date at which a stream holds any record. Every rolling Ø
// baseline is clipped to this, so an install that is three weeks old is not averaged against five
// empty weeks — the average describes the horizon that actually exists rather than being diluted by
// pre-history. Streams are named rather than inferred so each view asks only about what it draws.
//
// For recurring contracts/income, startDate is the right boundary: the chart builders project
// occurrences all the way back to it, so those periods genuinely do contain data.
//
// SERVER-ONLY (imports the Prisma client). Cheap — plain _min aggregates over indexed columns.

export type HorizonStream = "bills" | "contracts" | "income" | "savings";

/**
 * Earliest record date across `streams`, normalized to UTC midnight so it compares cleanly against
 * the half-open period windows in cumulativeChart. `null` when every requested stream is empty —
 * the "no baseline is possible yet" signal that suppresses the Ø line entirely.
 *
 * Honors the active account by threading `workspaceId` through the same predicate builders the
 * chart queries use, so switching accounts moves the horizon with it.
 */
export async function getDataStart(
  workspaceId: number | null | undefined,
  streams: HorizonStream[],
  granularity?: Granularity,
): Promise<Date | null> {
  const wsFilter = workspaceId != null ? {workspaceId} : {};
  const wanted = new Set(streams);

  // fitsGranularity as a Prisma predicate: when a granularity is given, a recurring record only
  // extends the horizon if it recurs at least once per period, because only then does the view
  // actually draw it. Without this, 1W would report a 2019 horizon off a monthly rent it no longer
  // plots and hand the Ø line a span with nothing in it.
  const fits = granularity
    ? {
        OR: [
          {frequency: {isRecurring: false}},
          {frequency: {value: {gte: periodsPerYear(granularity)}}},
        ],
      }
    : {};

  const [bills, contracts, income, savings] = await Promise.all([
    wanted.has("bills")
      ? client.bill.aggregate({where: buildBillWhere(wsFilter), _min: {date: true}})
      : null,
    wanted.has("contracts")
      ? client.contract.aggregate({
          where: {AND: [buildContractWhere(wsFilter), fits]},
          _min: {startDate: true},
        })
      : null,
    wanted.has("income")
      ? client.income.aggregate({
          where: {AND: [buildIncomeWhere(wsFilter), fits]},
          _min: {startDate: true},
        })
      : null,
    wanted.has("savings")
      ? client.saving.aggregate({
          where: {AND: [buildSavingWhere(wsFilter), fits]},
          _min: {startDate: true},
        })
      : null,
  ]);

  const candidates = [
    bills?._min.date,
    contracts?._min.startDate,
    income?._min.startDate,
    savings?._min.startDate,
  ].filter(
    (date): date is Date => date != null,
  );
  if (!candidates.length) return null;

  const earliest = candidates.reduce((min, date) => (date < min ? date : min));
  return utcDate(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate());
}
