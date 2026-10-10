import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import InsightsControls, {type InsightsFilterOptions} from "@/features/insights/components/InsightsControls";
import InsightsSummary from "@/features/insights/components/InsightsSummary";
import {getInsightsRows} from "@/features/insights/db/insightsRows";
import {parseInsightsQuery} from "@/features/insights/params";
import {resolveWindow} from "@/features/insights/window";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

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

// Insights: free-form analysis of expenses and income over a rolling window. All state is in the URL
// (see features/insights/params.ts); the rows come from the budget matcher plus payment expansion.
export default async function InsightsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const query = parseInsightsQuery(await searchParams);
  const window = resolveWindow(query.window);
  const [workspaceId, options, t] = await Promise.all([
    getActiveWorkspaceId(),
    getFilterOptions(),
    getTranslations("insights"),
  ]);
  const rows = await getInsightsRows(query, window, workspaceId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense>
        <InsightsControls options={options}/>
      </Suspense>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {rows.length === 0 ? (
          <p className="text-muted py-16 text-center text-sm">{t("noResults")}</p>
        ) : (
          <InsightsSummary rows={rows} domain={query.domain}/>
        )}
      </div>
    </div>
  );
}
