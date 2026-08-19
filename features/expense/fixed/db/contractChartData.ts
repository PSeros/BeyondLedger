import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import {
  addMonths,
  buildMonthView,
  buildYearView,
  dateKey,
  earliestDay,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import {getLookback} from "@/features/settings/db/appSettings";
import type {ContractChartData} from "@/features/expense/fixed/types";

// Chart restricts to Active contracts by nature, so the status filter is not applicable here.
type GetFixedExpenseChartDataInput = Omit<ContractFilters, "status">;

export async function getFixedExpenseChartData(
  filters: GetFixedExpenseChartDataInput = {},
  offset = 0,
): Promise<ContractChartData> {
  const [contracts, lookback] = await Promise.all([
    client.contract.findMany({
      where: buildContractWhere(filters),
      include: {frequency: true},
    }),
    getLookback(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Far enough out to cover the 1Y view's Dec 31 — 1M only ever needs through this month's end.
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const totalsByDay = new Map<string, number>();
  const upcomingTotalsByDay = new Map<string, number>();

  // Contracts have no per-occurrence record (unlike Bill's `date`) — only a recurring
  // amount + frequency. Project the billing dates from startDate/frequency/endDate so
  // they can feed the same cumulative-sum machinery as the Bill chart. Only frequencies
  // whose `value` (occurrences/year) evenly divides 12 are supported by this projection.
  // Occurrences past today go into `upcomingTotalsByDay` instead, to drive the chart's
  // "upcoming" forecast line.
  for (const contract of contracts) {
    if (determineStatus(contract) !== "Active") {
      continue;
    }

    const amount = Number(contract.totalAmount);
    const monthsBetween = 12 / contract.frequency.value;
    const stop = contract.endDate && contract.endDate < projectionHorizon ? contract.endDate : projectionHorizon;

    let step = 0;
    let occurrence = utcDate(
      contract.startDate.getUTCFullYear(),
      contract.startDate.getUTCMonth(),
      contract.startDate.getUTCDate(),
    );

    while (occurrence <= stop) {
      const key = dateKey(occurrence);
      const target = occurrence <= today ? totalsByDay : upcomingTotalsByDay;
      target.set(key, (target.get(key) ?? 0) + amount);

      step += 1;
      occurrence = utcDate(
        contract.startDate.getUTCFullYear(),
        contract.startDate.getUTCMonth() + step * monthsBetween,
        contract.startDate.getUTCDate(),
      );
    }
  }

  // Horizon = the first projected billing date of the contracts that actually feed this chart, so a
  // rent contract running since 2019 legitimately extends the baseline back that far.
  const dataStart = earliestDay(totalsByDay);

  return {
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), {
      lookback: lookback.months,
      dataStart,
      futureTotalsByDay: upcomingTotalsByDay,
      today,
    }),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), {
      lookback: lookback.years,
      dataStart,
      futureTotalsByDay: upcomingTotalsByDay,
      today,
    }),
  };
}
