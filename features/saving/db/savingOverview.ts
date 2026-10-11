import {client} from "@/lib/prisma";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {addDays, dateKey, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {forEachOccurrence} from "@/features/expense/shared/db/recurrence";
import {getDataStart} from "@/features/expense/shared/db/dataHorizon";
import {getAnalysisStart} from "@/features/settings/db/appSettings";
import {PALETTE} from "@/features/dashboard/lib/donut";

// Everything the Sparen pages show, built in one pass over the account's savings: pots (targets) with
// their balance history, the booked movements, and the Überschuss.
//
// Pot balances are stocks: everything paid in counts, regardless of the app-wide start date. The
// Überschuss is a sum of flows (income − expenses − saved), so it starts at that date like every other
// calculation.

export type PotPlan = {savingId: number; name: string; amount: number; frequency: string; frequencyValue: number; startDate: string};

export type Pot = {
  id: number;
  name: string;
  color: string;
  balance: number;
  goal: number | null; // optional target amount; null = open-ended
  closed: boolean; // closed pots keep their history but get no card and no new bookings
  series: number[]; // end-of-month balance per `months`
  plans: PotPlan[];
};

export type Movement = {
  key: string;
  savingId: number;
  potId: number;
  date: string; // yyyy-mm-dd
  name: string;
  amount: number;
  kind: "plan" | "in" | "out" | "opening";
};

export type SurplusMonth = {month: string; income: number; expense: number; saved: number; left: number; isCurrent: boolean};

export type Surplus = {
  start: string; // yyyy-mm-dd the sum starts at
  opening: number; // the accounts' starting balance the sum starts from (not a flow)
  balance: number;
  series: number[]; // end-of-month balance per `months`, 0 before the start
  months: SurplusMonth[]; // newest first
};

export type SavingOverview = {
  months: string[]; // yyyy-mm, oldest first, through the current month
  pots: Pot[];
  movements: Movement[]; // newest first
  surplus: Surplus | null; // null = no data at all yet
  analysisStart: string | null; // yyyy-mm-dd; movements before it are listed dimmed
};

const monthOf = (day: string) => day.slice(0, 7);

function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export async function getSavingOverview(workspaceId: number | null): Promise<SavingOverview> {
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const tomorrow = addDays(today, 1);
  const ws = workspaceId != null ? {workspaceId} : {};

  const [targets, savings, analysisStart, firstRecord] = await Promise.all([
    client.savingTarget.findMany({select: {id: true, name: true, goalAmount: true, closedAt: true}, orderBy: {id: "asc"}}),
    client.saving.findMany({
      where: ws,
      select: {id: true, name: true, targetId: true, totalAmount: true, isOpening: true, startDate: true, endDate: true, frequency: true},
    }),
    getAnalysisStart(),
    getDataStart(workspaceId, ["bills", "contracts", "income", "savings"]),
  ]);

  const movements: Movement[] = [];
  for (const saving of savings) {
    const amount = Number(saving.totalAmount);
    forEachOccurrence(saving, saving.startDate, tomorrow, (date) => {
      movements.push({
        key: `${saving.id}-${dateKey(date)}`,
        savingId: saving.id,
        potId: saving.targetId,
        date: dateKey(date),
        name: saving.name,
        amount,
        kind: saving.isOpening ? "opening" : saving.frequency.isRecurring ? "plan" : amount < 0 ? "out" : "in",
      });
    });
  }
  movements.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.key < b.key ? 1 : -1));
  const flows = movements.filter((m) => m.kind !== "opening");

  const surplusStart = analysisStart ?? firstRecord;
  const firstMonth = [flows.at(-1)?.date ?? movements.at(-1)?.date, surplusStart ? dateKey(surplusStart) : undefined]
    .filter((day): day is string => day != null)
    .sort()[0];
  const months = firstMonth ? monthRange(monthOf(firstMonth), monthOf(dateKey(today))) : [];
  const index = new Map(months.map((month, i) => [month, i]));

  // Monthly net per pot, then a running sum.
  const cumulative = (byMonth: Map<string, number>) => {
    let running = 0;
    return months.map((month) => (running += byMonth.get(month) ?? 0));
  };

  const pots: Pot[] = targets
    .map((target, i) => {
      const byMonth = new Map<string, number>();
      for (const m of movements) {
        if (m.potId !== target.id) continue;
        // A starting balance was there before tracking: it sits at the start of the history, not as a
        // jump in the month it was entered.
        const month = m.kind === "opening" ? months[0] : monthOf(m.date);
        byMonth.set(month, (byMonth.get(month) ?? 0) + m.amount);
      }
      const series = cumulative(byMonth);
      const plans = savings
        .filter((s) => s.targetId === target.id && s.frequency.isRecurring && (!s.endDate || s.endDate >= today))
        .map((s) => ({
          savingId: s.id,
          name: s.name,
          amount: Number(s.totalAmount),
          frequency: s.frequency.name,
          frequencyValue: s.frequency.value,
          startDate: dateKey(s.startDate),
        }));
      return {
        id: target.id,
        name: target.name,
        color: PALETTE[i % PALETTE.length],
        balance: series.at(-1) ?? 0,
        goal: target.goalAmount != null ? Number(target.goalAmount) : null,
        closed: target.closedAt != null,
        series,
        plans,
      };
    })
    // A pot nobody ever paid into (on this account) stays out of the overview.
    .filter((pot) => pot.plans.length > 0 || movements.some((m) => m.potId === pot.id));

  const surplus = surplusStart ? await getSurplus(ws, surplusStart, tomorrow, movements, months, index) : null;
  return {months, pots, movements, surplus, analysisStart: analysisStart ? dateKey(analysisStart) : null};
}

// Überschuss: income − expenses − saved per month, from `start` through today (the running month as
// realized so far), accumulated.
async function getSurplus(
  ws: {workspaceId?: number},
  start: Date,
  tomorrow: Date,
  movements: Movement[],
  months: string[],
  index: Map<string, number>,
): Promise<Surplus> {
  const [bills, contracts, incomes, accounts] = await Promise.all([
    client.bill.findMany({
      where: {AND: [buildBillWhere(ws), {date: {gte: start, lt: tomorrow}}]},
      select: {date: true, totalAmount: true},
    }),
    client.contract.findMany({
      where: buildContractWhere(ws),
      select: {startDate: true, endDate: true, totalAmount: true, frequency: true},
    }),
    client.income.findMany({
      where: buildIncomeWhere(ws),
      select: {startDate: true, endDate: true, totalAmount: true, frequency: true},
    }),
    client.workspace.findMany({
      where: ws.workspaceId != null ? {id: ws.workspaceId} : undefined,
      select: {openingBalance: true},
    }),
  ]);
  const opening = accounts.reduce((sum, a) => sum + Number(a.openingBalance ?? 0), 0);

  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  const saved = new Map<string, number>();
  const add = (map: Map<string, number>, day: string, amount: number) =>
    map.set(monthOf(day), (map.get(monthOf(day)) ?? 0) + amount);

  for (const bill of bills) add(expense, dateKey(bill.date), Number(bill.totalAmount));
  for (const contract of contracts) {
    forEachOccurrence(contract, start, tomorrow, (date) => add(expense, dateKey(date), Number(contract.totalAmount)));
  }
  for (const row of incomes) {
    forEachOccurrence(row, start, tomorrow, (date) => add(income, dateKey(date), Number(row.totalAmount)));
  }
  const startKey = dateKey(start);
  for (const m of movements) if (m.kind !== "opening" && m.date >= startKey) add(saved, m.date, m.amount);

  const startMonth = monthOf(startKey);
  const currentMonth = months.at(-1);
  const rows: SurplusMonth[] = months
    .filter((month) => month >= startMonth)
    .map((month) => {
      const inc = income.get(month) ?? 0;
      const exp = expense.get(month) ?? 0;
      const sav = saved.get(month) ?? 0;
      return {month, income: inc, expense: exp, saved: sav, left: inc - exp - sav, isCurrent: month === currentMonth};
    });

  const byMonth = new Map(rows.map((row) => [row.month, row.left]));
  // The starting balance is there from the start month on; the months themselves stay pure flows.
  let running = opening;
  const series = months.map((month) => (index.get(month)! >= index.get(startMonth)! ? (running += byMonth.get(month) ?? 0) : 0));

  return {start: startKey, opening, balance: series.at(-1) ?? opening, series, months: rows.reverse()};
}
