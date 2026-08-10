"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Card, Chip, Input, Label, TextField} from "@heroui/react";
import {LuCalendarRange, LuArrowDownUp} from "react-icons/lu";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import TagChip from "@/components/TagChip";
import BudgetDetailModal from "@/features/budget/components/BudgetDetailModal";
import BudgetFormButton from "@/features/budget/components/BudgetFormButton";
import type {BudgetMemberOptions, BudgetResolved} from "@/features/budget/db/budgets";
import {clearBudgetOverride, deleteBudget, setBudgetOverride} from "@/features/budget/db/budgetMutations";
import {budgetProgress} from "@/features/budget/progress";

// One budget shown for its CURRENT period: the period label + window, target vs. actual vs.
// remaining, a usage meter, member chips, edit/delete, and a per-period override control.
export default function BudgetCard({budget, options}: { budget: BudgetResolved; options: BudgetMemberOptions }) {
  const t = useTranslations("budget");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();

  const {remaining, isOver, ratio, meterPercent: meterPct} = budgetProgress(budget.target, budget.actual);
  const meterColor = isOver ? "bg-danger" : ratio >= 0.85 ? "bg-warning" : "bg-success";

  const hasOverride = budget.overrides.some((o) => o.periodKey === budget.periodKey);

  const [editingOverride, setEditingOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState(String(budget.target));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function periodLabel(): string {
    const start = budget.windowStart ? new Date(budget.windowStart) : null;
    const end = budget.windowEnd ? new Date(budget.windowEnd) : null;
    switch (budget.periodType) {
      case "OPEN":
        return t("allTime");
      case "YEARLY":
        return start ? format.dateTime(start, {year: "numeric"}) : "";
      case "QUARTERLY": {
        const match = /Q(\d)$/.exec(budget.periodKey);
        const quarter = match ? Number(match[1]) : 1;
        return t("quarterLabel", {quarter, year: start ? start.getUTCFullYear() : ""});
      }
      case "RANGE": {
        if (!start || !end) return "";
        const endInclusive = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        return `${format.dateTime(start, {
          day: "numeric",
          month: "short"
        })} – ${format.dateTime(endInclusive, {day: "numeric", month: "short", year: "numeric"})}`;
      }
      default: // MONTHLY, MONTH_OF_YEAR
        return start ? format.dateTime(start, {month: "long", year: "numeric"}) : "";
    }
  }

  async function run(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      setEditingOverride(false);
      router.refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : tErrors("couldNotSave"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <Card.Header className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Card.Title className="truncate">{budget.name}</Card.Title>
            <TagChip name={budget.workspace.name} color={budget.workspace.color}/>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <LuCalendarRange className="size-3.5 shrink-0"/>
            <span className="truncate">{periodLabel()}</span>
            {hasOverride ? (
              <Chip variant="soft" color="accent" size="sm">
                <Chip.Label>{t("overrideActive")}</Chip.Label>
              </Chip>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BudgetDetailModal budget={budget}/>
          <BudgetFormButton options={options} budget={budget}/>
          {/* redirectTo keeps us on /budget after delete (this is a list card, not a modal). */}
          <DeleteEntityButton id={budget.id} action={deleteBudget} label={t("entityLabel")} redirectTo="/budget"/>
        </div>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tabular-nums">{format.number(budget.actual, "currency")}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              {t("ofTarget", {target: format.number(budget.target, "currency")})}
              {/* Iconified "adjust this period's target" — keeps the card bottom button-free. */}
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                isIconOnly
                aria-label={hasOverride ? t("editOverride") : t("overrideThisPeriod")}
                className="size-5 min-h-0! min-w-0! p-0!"
                onPress={() => {
                  setOverrideValue(String(budget.target));
                  setError(null);
                  setEditingOverride((v) => !v);
                }}
              >
                <LuArrowDownUp className="size-3.5"/>
              </Button>
            </p>
          </div>
          <Chip variant="soft" color={isOver ? "danger" : "success"} size="sm" className="h-fit">
            <Chip.Label>
              {isOver
                ? t("overBy", {amount: format.number(-remaining, "currency")})
                : t("remaining", {amount: format.number(remaining, "currency")})}
            </Chip.Label>
          </Chip>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-default-200" role="meter" aria-valuenow={meterPct}
             aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${meterColor}`} style={{width: `${meterPct}%`}}/>
        </div>

        {budget.members.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {budget.members.map((member) =>
              member.type === "tag" && member.color ? (
                <TagChip key={`${member.type}-${member.id}`} name={member.name} color={member.color}/>
              ) : (
                <Chip key={`${member.type}-${member.id}`} variant="soft" size="sm">
                  <Chip.Label>{member.name}</Chip.Label>
                </Chip>
              ),
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">{t("noMembers")}</p>
        )}

        {editingOverride ? (
          <div className="flex flex-col gap-2 rounded-(--radius) border border-default-200 p-3">
            <TextField value={overrideValue} onChange={setOverrideValue} className="flex flex-col gap-1">
              <Label className="text-foreground-500 text-xs uppercase tracking-wide">{t("overrideLabel")}</Label>
              <Input type="number" step="any"/>
            </TextField>
            {error ? <p className="text-danger text-xs">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              {hasOverride ? (
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  isDisabled={pending}
                  onPress={() => run(() => clearBudgetOverride(budget.id, budget.periodKey))}
                >
                  {t("resetToDefault")}
                </Button>
              ) : null}
              <Button type="button" variant="tertiary" size="sm" isDisabled={pending}
                      onPress={() => setEditingOverride(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isDisabled={pending}
                onPress={() => run(() => setBudgetOverride(budget.id, budget.periodKey, Number(overrideValue)))}
              >
                {t("saveOverride")}
              </Button>
            </div>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
