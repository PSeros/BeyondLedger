import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import InsightsControls, {type InsightsFilterOptions} from "@/features/insights/components/InsightsControls";
import InsightsKpis from "@/features/insights/components/InsightsKpis";
import InsightsTimeChart, {type TimePoint} from "@/features/insights/components/InsightsTimeChart";
import InsightsDonut, {type DonutPanel} from "@/features/insights/components/InsightsDonut";
import InsightsBoxPlot, {type BoxPanel} from "@/features/insights/components/InsightsBoxPlot";
import InsightsKde from "@/features/insights/components/InsightsKde";
import InsightsTable from "@/features/insights/components/InsightsTable";
import {boxesFor, breakdown, bucketTotals, chartUnitFor, computeStats, kde, samplesFor} from "@/features/insights/stats";
import {getInsightsRows} from "@/features/insights/db/insightsRows";
import {getSavedViews} from "@/features/insights/db/views";
import {parseInsightsQuery} from "@/features/insights/params";
import {previousSpan, resolveWindow, spanFor} from "@/features/insights/window";
import {getActiveWorkspaceId, getLocale} from "@/features/settings/db/appSettings";

async function getFilterOptions(): Promise<InsightsFilterOptions> {
  const byName = {select: {id: true, name: true}, orderBy: {name: "asc"}} as const;
  const [itemCategories, contractCategories, supplierCategories, suppliers, tags, incomeCategories, incomeSources] = await Promise.all([
    client.itemCategory.findMany(byName),
    client.contractCategory.findMany(byName),
    client.supplierCategory.findMany(byName),
    client.supplier.findMany(byName),
    client.tag.findMany(byName),
    client.incomeCategory.findMany(byName),
    client.incomeSource.findMany(byName),
  ]);
  return {itemCategories, contractCategories, supplierCategories, suppliers, tags, incomeCategories, incomeSources};
}

// Insights: free-form analysis of expenses and income over a budget-style period. All state is in the URL
// (see features/insights/params.ts); the rows come from the budget matcher plus payment expansion.
export default async function InsightsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const query = parseInsightsQuery(await searchParams);
  const window = resolveWindow(query.window);
  const [workspaceId, options, t, locale] = await Promise.all([
    getActiveWorkspaceId(),
    getFilterOptions(),
    getTranslations("insights"),
    getLocale(),
  ]);
  const [rows, views] = await Promise.all([getInsightsRows(query, window, workspaceId), getSavedViews(options)]);
  const span = spanFor(window, rows);

  const series = (["expense", "income"] as const).filter((domain) =>
    domain === "expense" ? query.domain !== "income" : query.domain !== "expense");
  const of = (domain: "expense" | "income") => rows.filter((row) => row.domain === domain);

  const before = previousSpan(query.window, span);
  const previousRows = before ? await getInsightsRows(query, before, workspaceId) : null;

  const chartUnit = chartUnitFor(span);
  const totals = series.map((domain) => bucketTotals(of(domain), chartUnit, span));
  const points: TimePoint[] = [...(totals[0]?.keys() ?? [])].map((key) => ({
    key,
    ...Object.fromEntries(series.map((domain, i) => [domain, totals[i].get(key) ?? 0])),
  }));
  const weekdayNames = Array.from({length: 7}, (_, i) =>
    new Intl.DateTimeFormat(locale, {weekday: "short", timeZone: "UTC"}).format(new Date(Date.UTC(2024, 0, 1 + i))));
  const donutPanels: DonutPanel[] = series.map((domain) => ({key: domain, rows: breakdown(of(domain), query.by, weekdayNames, 6)}));
  const boxPanels: BoxPanel[] = series.map((domain) => ({
    key: domain,
    boxes: boxesFor(of(domain), query.by, query.unit, span, weekdayNames),
  }));
  const groupLabel = t(`group.${query.by}`);
  const unitLabel = t(`unit.${query.unit}`);
  const weekdayFallsBack = query.by === "weekday" && (query.unit === "week" || query.unit === "month");
  const boxHint = t(weekdayFallsBack || (query.by === "weekday" && query.unit === "day") ? "boxHintDays" : "boxHintUnit", {unit: unitLabel});

  const unitSamples = series.map((domain) => samplesFor(of(domain), query.unit, span));
  const density = kde(unitSamples);
  const medians = unitSamples.map((samples) => computeStats(samples).median);

  return (
    // Below lg the toolbar wraps to several rows, so the whole page scrolls instead of pinning it.
    <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:overflow-hidden">
      <Suspense>
        <InsightsControls options={options} views={views}/>
      </Suspense>

      <div className="mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
        {rows.length === 0 ? (
          <p className="text-muted py-16 text-center text-sm">{t("noResults")}</p>
        ) : (
          <div className="flex flex-col gap-4 pb-8">
            {/* Bento like the dashboard: a fixed row grid, tiles fill their cells (h-full). */}
            <div className="grid grid-flow-row-dense auto-rows-[6rem] grid-cols-2 gap-4 lg:grid-cols-6">
              <div className="col-span-2 row-span-2 lg:col-span-6 lg:row-span-1">
                <InsightsKpis rows={rows} previousRows={previousRows} domain={query.domain} unit={query.unit} span={span} previousSpan={before}/>
              </div>
              <div className="col-span-2 row-span-4 lg:col-span-4">
                <InsightsTimeChart points={points} unit={chartUnit} series={[...series]}/>
              </div>
              <div className="col-span-2 row-span-4 lg:col-span-2">
                <InsightsDonut panels={donutPanels} groupLabel={groupLabel}/>
              </div>
              <div className="col-span-2 row-span-3 lg:col-span-3 lg:row-span-4">
                <InsightsKde points={density} series={[...series]} medians={medians} unitLabel={unitLabel}/>
              </div>
              <div className="col-span-2 row-span-4 lg:col-span-3">
                <InsightsBoxPlot panels={boxPanels} title={t("boxTitle", {group: groupLabel})} hint={boxHint}/>
              </div>
            </div>
            <Suspense>
              <InsightsTable activeWorkspaceId={workspaceId}/>
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
