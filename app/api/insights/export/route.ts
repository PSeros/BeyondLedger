import type {NextRequest} from "next/server";
import {getTranslations} from "next-intl/server";
import {loadTableRows} from "@/features/insights/db/tableRows";
import {getLocale} from "@/features/settings/db/appSettings";
import {parseInsightsQuery, seriesOf} from "@/features/insights/params";
import {SERIES_LABEL_KEYS} from "@/features/insights/colors";
import type {InsightsTableRow, PeriodRow} from "@/features/insights/table";

// CSV of exactly what the entry table lists (same filters, unit and sort): entries, or one row per
// day / week / month. Semicolon-separated with
// a UTF-8 BOM so Excel opens it directly in a German locale; ISO dates; plain numbers with the
// locale's decimal separator.

// Quote when needed, and neutralize a leading formula character so a spreadsheet never evaluates a
// supplier or item name as a formula.
function cell(value: string, isText: boolean): string {
  const safe = isText && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const [table, locale, t, tFields] = await Promise.all([
    loadTableRows(params),
    getLocale(),
    getTranslations("insights"),
    getTranslations("fields"),
  ]);

  const amount = (value: number) => {
    const text = value.toFixed(2);
    return locale === "de" ? text.replace(".", ",") : text;
  };
  const kind: Record<InsightsTableRow["kind"], string> = {
    item: t("kind.item"),
    bill: t("kind.bill"),
    contractPayment: t("kind.contractPayment"),
    incomePayment: t("kind.incomePayment"),
    savingPayment: t("kind.savingPayment"),
  };

  let header: string[];
  let lines: string[][];
  // Columns that hold generated values (dates, counts, amounts) and skip the formula guard.
  let generated: Set<number>;
  if (table.mode === "entries") {
    header = [
      tFields("date"),
      t("kindLabel"),
      t("csvDomain"),
      tFields("name"),
      t("csvLines"),
      t("byCounterparty"),
      tFields("category"),
      t("byTag"),
      t("csvAmount"),
    ];
    lines = table.rows.map((row) => [
      row.date,
      kind[row.kind],
      t(SERIES_LABEL_KEYS[row.domain]),
      row.label,
      row.lineCount != null ? String(row.lineCount) : "",
      row.counterparty,
      row.category,
      row.tags.join(", "),
      amount(row.amount),
    ]);
    generated = new Set([0, 4, 8]);
  } else {
    // One row per period: its first day, the entry count, and the money of the shown domain(s).
    const domain = parseInsightsQuery(params).domain;
    const money: {label: string; value: (row: PeriodRow) => number}[] = [
      ...seriesOf(domain).map((key) => ({label: t(SERIES_LABEL_KEYS[key]), value: (row: PeriodRow) => row[key]})),
      ...(domain === "both" ? [{label: t("net"), value: (row: PeriodRow) => row.amount}] : []),
    ];
    const periods = table.rows;
    header = [t("periodStart", {unit: t(`unit.${table.unit}`)}), t("csvEntries"), ...money.map((column) => column.label)];
    lines = periods.map((row) => [row.date, String(row.count), ...money.map((column) => amount(column.value(row)))]);
    generated = new Set(header.map((_, index) => index));
  }

  const body = [header, ...lines]
    .map((line) => line.map((value, index) => cell(value, !generated.has(index))).join(";"))
    .join("\r\n");
  const csv = `\uFEFF${body}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="insights-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
