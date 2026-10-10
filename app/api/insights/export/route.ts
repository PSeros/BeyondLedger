import type {NextRequest} from "next/server";
import {getTranslations} from "next-intl/server";
import {loadTableRows} from "@/features/insights/db/tableRows";
import {getLocale} from "@/features/settings/db/appSettings";
import type {InsightsTableRow} from "@/features/insights/table";

// CSV of exactly what the entry table lists (same filters, level and sort). Semicolon-separated with
// a UTF-8 BOM so Excel opens it directly in a German locale; ISO dates; plain numbers with the
// locale's decimal separator.

// Quote when needed, and neutralize a leading formula character so a spreadsheet never evaluates a
// supplier or item name as a formula.
function cell(value: string, isText: boolean): string {
  const safe = isText && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(request: NextRequest) {
  const [rows, locale, t, tFields] = await Promise.all([
    loadTableRows(request.nextUrl.searchParams),
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
  };

  const header = [
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
  const lines = rows.map((row) => [
    row.date,
    kind[row.kind],
    t(row.domain === "income" ? "domainIncome" : "domainExpense"),
    row.label,
    row.lineCount != null ? String(row.lineCount) : "",
    row.counterparty,
    row.category,
    row.tags.join(", "),
    amount(row.amount),
  ]);

  // Date, line count and amount are generated values; everything else may be user-typed text.
  const generated = new Set([0, 4, 8]);
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
