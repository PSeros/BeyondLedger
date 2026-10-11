"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import MultiSelectField, {type TriStateValue} from "@/features/budget/components/MultiSelectField";
import InsightsWindowPicker from "@/features/insights/components/InsightsWindowPicker";
import SavedViewsMenu from "@/features/insights/components/SavedViewsMenu";
import type {SavedView} from "@/features/insights/db/views";
import {useInsightsParams} from "@/hooks/useInsightsParams";
import {
  EXPENSE_PARAM_KEYS,
  INCOME_PARAM_KEYS,
  INSIGHTS_DOMAINS,
  serializeSignedIds,
  type InsightsDomain,
  type SignedIds,
} from "@/features/insights/params";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

export type InsightsFilterOptions = {
  itemCategories: FilterOption[];
  contractCategories: FilterOption[];
  supplierCategories: FilterOption[];
  suppliers: FilterOption[];
  tags: FilterOption[];
  incomeCategories: FilterOption[];
  incomeSources: FilterOption[];
};

type Selector = {param: string; label: string; options: FilterOption[]; ids: SignedIds};

const toTriState = ({include, exclude}: SignedIds): TriStateValue => ({
  included: include.map(String),
  excluded: exclude.map(String),
});
const fromTriState = ({included, excluded}: TriStateValue): SignedIds => ({
  include: included.map(Number),
  exclude: excluded.map(Number),
});

// The Insights toolbar (domain toggle, window picker, filter toggle) plus the collapsible filter
// panel under it. The panel's open state is UI-only; everything it edits lives in the URL.
export default function InsightsControls({options, views}: {options: InsightsFilterOptions; views: SavedView[]}) {
  const t = useTranslations("insights");
  const tBudget = useTranslations("budget");
  const tFilters = useTranslations("filters");
  const {query, update} = useInsightsParams();
  const [isOpen, setIsOpen] = useState(false);

  const domainLabels: Record<InsightsDomain, string> = {
    expense: t("domainExpense"),
    income: t("domainIncome"),
    both: t("domainBoth"),
  };

  const {include, exclude} = query.expense;
  const pick = (field: keyof typeof include): SignedIds => ({include: include[field], exclude: exclude[field]});
  const showExpense = query.domain !== "income";
  const showIncome = query.domain !== "expense";

  const selectors: Selector[] = [
    ...(showExpense
      ? [
        {param: EXPENSE_PARAM_KEYS.itemCategoryIds, label: tBudget("groupItemCategories"), options: options.itemCategories, ids: pick("itemCategoryIds")},
        {param: EXPENSE_PARAM_KEYS.contractCategoryIds, label: tBudget("groupContractCategories"), options: options.contractCategories, ids: pick("contractCategoryIds")},
        {param: EXPENSE_PARAM_KEYS.supplierCategoryIds, label: tBudget("groupSupplierCategories"), options: options.supplierCategories, ids: pick("supplierCategoryIds")},
        {param: EXPENSE_PARAM_KEYS.supplierIds, label: tBudget("groupSuppliers"), options: options.suppliers, ids: pick("supplierIds")},
      ]
      : []),
    ...(showIncome
      ? [
        {param: INCOME_PARAM_KEYS.categoryIds, label: t("groupIncomeCategories"), options: options.incomeCategories, ids: query.income.categoryIds},
        {param: INCOME_PARAM_KEYS.sourceIds, label: t("groupIncomeSources"), options: options.incomeSources, ids: query.income.sourceIds},
      ]
      : []),
    {param: EXPENSE_PARAM_KEYS.tagIds, label: tBudget("groupTags"), options: options.tags, ids: pick("tagIds")},
  ];

  const activeCount = selectors.reduce((sum, s) => sum + s.ids.include.length + s.ids.exclude.length, 0);

  function summarize(value: TriStateValue): string | null {
    const parts: string[] = [];
    if (value.included.length) parts.push(tBudget("countIncluded", {count: value.included.length}));
    if (value.excluded.length) parts.push(tBudget("countExcluded", {count: value.excluded.length}));
    return parts.length ? parts.join(", ") : null;
  }

  function clearFilters() {
    update(Object.fromEntries([...Object.values(EXPENSE_PARAM_KEYS), ...Object.values(INCOME_PARAM_KEYS)].map((key) => [key, null])));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Not PageToolbar: its equal thirds are too narrow for the period controls. */}
      <div className="flex flex-wrap items-center gap-3">
        <ButtonGroup size="sm">
          {INSIGHTS_DOMAINS.map((domain) => (
            <Button
              key={domain}
              variant={query.domain === domain ? "secondary" : "tertiary"}
              onPress={() => update({dom: domain === "expense" ? null : domain})}
            >
              {domainLabels[domain]}
            </Button>
          ))}
        </ButtonGroup>
        <InsightsWindowPicker window={query.window} onChange={update}/>
        <div className="ml-auto flex items-center gap-2">
          <SavedViewsMenu views={views}/>
          <Button size="sm" variant={isOpen ? "secondary" : "tertiary"} onPress={() => setIsOpen((open) => !open)} aria-label={tFilters("filter")}>
            <LuFilter/>
            <span className="hidden sm:inline">{tFilters("filter")}</span>
            {activeCount ? <span className="tabular-nums">({activeCount})</span> : null}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted">{t("filtersHint")}</p>
            {activeCount ? (
              <Button variant="tertiary" size="sm" onPress={clearFilters}>
                {tFilters("clear")}
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {selectors.map((selector) => (
              <MultiSelectField
                key={selector.param}
                label={selector.label}
                options={selector.options}
                value={toTriState(selector.ids)}
                onChange={(next) => update({[selector.param]: serializeSignedIds(fromTriState(next))})}
                placeholder={tFilters("all")}
                summary={summarize}
              />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
