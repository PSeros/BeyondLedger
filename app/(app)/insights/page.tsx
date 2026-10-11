import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import InsightsControls, {type InsightsFilterOptions} from "@/features/insights/components/InsightsControls";
import InsightsKpis from "@/features/insights/components/InsightsKpis";
import InsightsStats from "@/features/insights/components/InsightsStats";
import InsightsTimeChart, {type TimePoint} from "@/features/insights/components/InsightsTimeChart";
import InsightsDonut, {type DonutPanel} from "@/features/insights/components/InsightsDonut";
import InsightsBoxPlot, {type BoxPanel} from "@/features/insights/components/InsightsBoxPlot";
import InsightsScatter from "@/features/insights/components/InsightsScatter";
import InsightsMiniBars, {type MiniBarPoint} from "@/features/insights/components/InsightsMiniBars";
import InsightsTable from "@/features/insights/components/InsightsTable";
import {boxStats, breakdown, bucketTotals, chartUnitFor, histogram, samplesFor, weekdayAverages} from "@/features/insights/stats";
import {getInsightsRows} from "@/features/insights/db/insightsRows";
import {getSavedViews} from "@/features/insights/db/views";
import {parseInsightsQuery} from "@/features/insights/params";
import {previousSpan, realizedBounds, resolveWindow} from "@/features/insights/window";
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
  // Time buckets run to today at most; all time starts at the first row.
  const paid = realizedBounds(window);
  const oldest = rows.at(-1);
  const span = {start: window.start ?? (oldest ? new Date(`${oldest.date}T00:00:00Z`) : paid.end), end: paid.end};

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
  const donutPanels: DonutPanel[] = series.map((domain) => ({key: domain, rows: breakdown(of(domain), query.by, 6)}));
  const boxPanels: BoxPanel[] = series.map((domain) => ({key: domain, boxes: boxStats(of(domain), query.by)}));
  const scatter = series.map((domain) => ({
    key: domain,
    points: of(domain).map((row) => ({x: Date.parse(`${row.date}T00:00:00Z`), y: row.amount, label: row.label, counterparty: row.counterparty})),
  }));

  const weekdayNames = Array.from({length: 7}, (_, i) =>
    new Intl.DateTimeFormat(locale, {weekday: "short", timeZone: "UTC"}).format(new Date(Date.UTC(2024, 0, 1 + i))));
  const weekdays = series.map((domain) => weekdayAverages(of(domain), span));
  const weekdayPoints: MiniBarPoint[] = weekdayNames.map((label, i) => ({
    label,
    ...Object.fromEntries(series.map((domain, s) => [domain, weekdays[s][i]])),
  }));

  const bins = histogram(series.map((domain) => samplesFor(of(domain), query.unit, span)));
  const money = new Intl.NumberFormat(locale, {maximumFractionDigits: 0});
  const histogramPoints: MiniBarPoint[] = bins.map((bin) => ({
    label: `${money.format(bin.from)}–${money.format(bin.to)}`,
    ...Object.fromEntries(series.map((domain, s) => [domain, bin.counts[s]])),
  }));

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
                <InsightsDonut panels={donutPanels}/>
              </div>
              <div className="col-span-2 row-span-4 lg:col-span-3">
                <InsightsBoxPlot panels={boxPanels}/>
              </div>
              <div className="col-span-2 row-span-4 lg:col-span-3">
                <InsightsScatter series={scatter} start={span.start.getTime()} end={span.end.getTime()}/>
              </div>
              <div className="col-span-2 row-span-3 lg:col-span-2 lg:row-span-4">
                <InsightsStats rows={rows} domain={query.domain} unit={query.unit} stats={query.stats} span={span}/>
              </div>
              <div className="col-span-2 row-span-3 lg:col-span-2 lg:row-span-4">
                <InsightsMiniBars title={t("weekdayTitle")} hint={t("weekdayHint")} points={weekdayPoints} series={[...series]} valueKind="currency"/>
              </div>
              <div className="col-span-2 row-span-3 lg:col-span-2 lg:row-span-4">
                <InsightsMiniBars
                  title={t("histogramTitle")}
                  hint={t("histogramHint", {unit: t(`unit.${query.unit}`)})}
                  points={histogramPoints}
                  series={[...series]}
                  valueKind="count"
                />
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
