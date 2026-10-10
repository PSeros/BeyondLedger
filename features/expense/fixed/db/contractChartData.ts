import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import {
  addDays,
  addMonths,
  buildMonthView,
  buildYearView,
  dateKey,
  earliestDay,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import {fitsGranularity, forEachOccurrence} from "@/features/expense/shared/db/recurrence";
import {getBaseline} from "@/features/settings/db/appSettings";
import type {ContractChartData} from "@/features/expense/fixed/types";

// Chart restricts to Active contracts by nature, so the status filter is not applicable here.
type GetFixedExpenseChartDataInput = Omit<ContractFilters, "status">;

export async function getFixedExpenseChartData(
  filters: GetFixedExpenseChartDataInput = {},
  offset = 0,
): Promise<ContractChartData> {
  const [contracts, baseline] = await Promise.all([
    client.contract.findMany({
      where: buildContractWhere(filters),
      include: {frequency: true},
    }),
    getBaseline(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Far enough out to cover the 1Y view's Dec 31 — 1M only ever needs through this month's end.
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const active = contracts.filter((contract) => determineStatus(contract) === "Active");

  // Contracts have no per-occurrence record (unlike Bill's `date`) — only a recurring amount +
  // frequency. Project the billing dates so they feed the same cumulative-sum machinery as the Bill
  // chart; occurrences past today go into `upcomingTotalsByDay` to drive the "upcoming" line.
  //
  // Built per granularity because fitsGranularity excludes a contract whose interval is longer than
  // the view's period — a quarterly contract hits 1 month in 3, which makes the Ø line describe no
  // real month. Such a contract shows up in 1Y instead.
  const streamFor = (granularity: "1M" | "1Y") => {
    const totalsByDay = new Map<string, number>();
    const upcomingTotalsByDay = new Map<string, number>();
    for (const contract of active) {
      if (!fitsGranularity(contract.frequency, granularity)) continue;
      const amount = Number(contract.totalAmount);
      forEachOccurrence(
        {startDate: contract.startDate, endDate: contract.endDate, frequency: contract.frequency},
        contract.startDate,
        addDays(projectionHorizon, 1),
        (occurrence) => {
          const key = dateKey(occurrence);
          const target = occurrence <= today ? totalsByDay : upcomingTotalsByDay;
          target.set(key, (target.get(key) ?? 0) + amount);
        },
      );
    }
    // Horizon = the first projected billing date of the contracts that actually feed this view, so a
    // rent contract running since 2019 legitimately extends the baseline back that far.
    return {totalsByDay, upcomingTotalsByDay, dataStart: earliestDay(totalsByDay)};
  };

  const month = streamFor("1M");
  const year = streamFor("1Y");

  return {
    "1M": buildMonthView(month.totalsByDay, addMonths(today, offset), {
      lookback: baseline.lookback.months,
      metric: baseline.metric,
      dataStart: month.dataStart,
      futureTotalsByDay: month.upcomingTotalsByDay,
      today,
    }),
    "1Y": buildYearView(year.totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), {
      lookback: baseline.lookback.years,
      metric: baseline.metric,
      dataStart: year.dataStart,
      futureTotalsByDay: year.upcomingTotalsByDay,
      today,
    }),
  };
}
