"use client";

import {useMemo, useState} from "react";
import type {Key} from "react-aria-components";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, ButtonGroup, Label, ListBox, Modal, Select} from "@heroui/react";
import {LuPencil, LuPlus} from "react-icons/lu";
import {labelClass, TextInputField} from "@/features/expense/shared/components/FormFields";
import MultiSelectField, {type TriStateValue} from "@/features/budget/components/MultiSelectField";
import WorkspaceSelectField from "@/features/workspaces/components/WorkspaceSelectField";
import type {BudgetMemberOptions, BudgetView} from "@/features/budget/db/budgets";
import type {FacetGroup} from "@/features/budget/db/budgetSmartMatch";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {BudgetPeriodType} from "@/features/budget/period";
import {createBudget, updateBudget} from "@/features/budget/db/budgetMutations";

// Create/edit form for a budget in a controlled Modal (not an interception route). `budget`
// undefined = create. The period-type Select reveals its extra fields (anchor month for
// MONTH_OF_YEAR; start/end for RANGE). Members are picked via four multi-Selects and mirrored into
// hidden inputs so the native <form action> posts them (memberItemCategoryId, …).

const PERIOD_TYPES: BudgetPeriodType[] = ["MONTHLY", "QUARTERLY", "YEARLY", "MONTH_OF_YEAR", "RANGE", "OPEN"];

// One entry per selector, each holding both signs. `field` is the FormData name suffix: included
// ids post as `member<Field>Id`, excluded ones as `exclude<Field>Id` (see parseMembers).
const SELECTORS = [
  {key: "itemCategory", field: "ItemCategoryId"},
  {key: "contractCategory", field: "ContractCategoryId"},
  {key: "supplierCategory", field: "SupplierCategoryId"},
  {key: "supplier", field: "SupplierId"},
  {key: "tag", field: "TagId"},
] as const;

type SelectorKey = (typeof SELECTORS)[number]["key"];
type Selection = Record<SelectorKey, TriStateValue>;

function initialSelection(budget?: BudgetView): Selection {
  const ids = (list: number[] | undefined): string[] => (list ?? []).map(String);
  const of = (pick: (g: FacetGroup) => number[]): TriStateValue => ({
    included: ids(budget && pick(budget.memberIds.include)),
    excluded: ids(budget && pick(budget.memberIds.exclude)),
  });
  return {
    itemCategory: of((g) => g.itemCategoryIds),
    contractCategory: of((g) => g.contractCategoryIds),
    supplierCategory: of((g) => g.supplierCategoryIds),
    supplier: of((g) => g.supplierIds),
    tag: of((g) => g.tagIds),
  };
}

export default function BudgetFormButton({
  options,
  budget,
  showLabel = false,
  ...buttonProps
}: {
  options: BudgetMemberOptions;
  budget?: BudgetView;
  showLabel?: boolean;
}) {
  const t = useTranslations("budget");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();
  const isEdit = budget !== undefined;

  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(() => initialSelection(budget));
  const [periodType, setPeriodType] = useState<BudgetPeriodType>(budget?.periodType ?? "MONTHLY");
  const [anchorMonth, setAnchorMonth] = useState<string>(budget?.anchorMonth ? String(budget.anchorMonth) : "1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodLabels: Record<BudgetPeriodType, string> = {
    MONTHLY: t("periodMonthly"),
    QUARTERLY: t("periodQuarterly"),
    YEARLY: t("periodYearly"),
    MONTH_OF_YEAR: t("periodMonthOfYear"),
    RANGE: t("periodRange"),
    OPEN: t("periodOpen"),
  };

  // Localized month names for the anchor-month picker (no catalog keys needed).
  const monthOptions = useMemo(
    () =>
      Array.from({length: 12}, (_, index) => ({
        id: index + 1,
        name: format.dateTime(new Date(Date.UTC(2000, index, 1)), {month: "long"}),
      })),
    [format],
  );

  const totalSelected = SELECTORS.reduce(
    (sum, {key}) => sum + selection[key].included.length + selection[key].excluded.length,
    0,
  );

  // Trigger text for one selector: "3 included", "1 excluded", or both; null → show the placeholder.
  function summarize(value: TriStateValue): string | null {
    const parts: string[] = [];
    if (value.included.length) parts.push(t("countIncluded", {count: value.included.length}));
    if (value.excluded.length) parts.push(t("countExcluded", {count: value.excluded.length}));
    return parts.length ? parts.join(", ") : null;
  }

  const selectorLabels: Record<SelectorKey, string> = {
    itemCategory: t("groupItemCategories"),
    contractCategory: t("groupContractCategories"),
    supplierCategory: t("groupSupplierCategories"),
    supplier: t("groupSuppliers"),
    tag: t("groupTags"),
  };

  const selectorOptions: Record<SelectorKey, FilterOption[]> = {
    itemCategory: options.itemCategories,
    contractCategory: options.contractCategories,
    supplierCategory: options.supplierCategories,
    supplier: options.suppliers,
    tag: options.tags,
  };

  function openModal() {
    setSelection(initialSelection(budget));
    setPeriodType(budget?.periodType ?? "MONTHLY");
    setAnchorMonth(budget?.anchorMonth ? String(budget.anchorMonth) : "1");
    setError(null);
    setOpen(true);
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (isEdit) {
        await updateBudget(budget.id, formData);
      } else {
        await createBudget(formData);
      }
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tErrors("couldNotSave"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        {...buttonProps}
        {...(showLabel
          ? {variant: "primary" as const}
          : isEdit
            ? {variant: "tertiary" as const, size: "sm" as const, isIconOnly: true, "aria-label": t("editBudget")}
            : {isIconOnly: true, "aria-label": t("newBudget")})}
        onPress={openModal}
      >
        {isEdit ? <LuPencil className="size-4"/> : <LuPlus/>}
        {showLabel ? t("newBudget") : null}
        <ButtonGroup.Separator/>
      </Button>

      <Modal.Backdrop isOpen={open} variant="blur" onOpenChange={setOpen}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger/>
            <Modal.Header className="flex-row items-start gap-3">
              <div className="min-w-0 flex-1">
                <Modal.Heading className="block truncate text-base font-semibold">
                  {isEdit ? t("editBudget") : t("newBudget")}
                </Modal.Heading>
                <p className="mt-0.5 text-sm text-muted">{t("formSubtitle")}</p>
              </div>
            </Modal.Header>
            <Modal.Body className="-mx-6 px-6 py-1">
              <form action={action} className="flex flex-col gap-5">
                <input type="hidden" name="periodType" value={periodType}/>
                {periodType === "MONTH_OF_YEAR" ? <input type="hidden" name="anchorMonth" value={anchorMonth}/> : null}

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <TextInputField label={t("nameLabel")} name="name" defaultValue={budget?.name ?? ""} isRequired/>
                  <TextInputField
                    label={t("targetLabel")}
                    name="amount"
                    type="number"
                    defaultValue={budget ? String(budget.amount) : ""}
                    isRequired
                  />

                  <WorkspaceSelectField
                    workspaces={options.workspaces}
                    defaultValue={budget ? String(budget.workspaceId) : options.defaultWorkspaceId}
                  />

                  {/* Period type (controlled — drives the conditional fields below). */}
                  <Select
                    selectedKey={periodType}
                    onSelectionChange={(key: Key | null) => setPeriodType(String(key) as BudgetPeriodType)}
                    className="flex flex-col gap-1"
                  >
                    <Label className={labelClass}>{t("periodLabel")}</Label>
                    <Select.Trigger>
                      <Select.Value/>
                      <Select.Indicator/>
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {PERIOD_TYPES.map((type) => (
                          <ListBox.Item key={type} id={type} textValue={periodLabels[type]}>
                            {periodLabels[type]}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  {periodType === "MONTH_OF_YEAR" ? (
                    <Select
                      selectedKey={anchorMonth}
                      onSelectionChange={(key: Key | null) => setAnchorMonth(String(key))}
                      className="flex flex-col gap-1"
                    >
                      <Label className={labelClass}>{t("anchorMonthLabel")}</Label>
                      <Select.Trigger>
                        <Select.Value/>
                        <Select.Indicator/>
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {monthOptions.map((month) => (
                            <ListBox.Item key={month.id} id={String(month.id)} textValue={month.name}>
                              {month.name}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  ) : null}

                  {periodType === "RANGE" ? (
                    <>
                      <TextInputField
                        label={t("startDateLabel")}
                        name="startDate"
                        type="date"
                        defaultValue={budget?.startDate ? budget.startDate.slice(0, 10) : ""}
                        isRequired
                      />
                      <TextInputField
                        label={t("endDateLabel")}
                        name="endDate"
                        type="date"
                        defaultValue={budget?.endDate ? budget.endDate.slice(0, 10) : ""}
                        isRequired
                      />
                    </>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <span className={labelClass}>{t("membersLabel")}</span>
                  <p className="text-xs text-muted">{t("membersHint")}</p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {SELECTORS.map(({key}) => (
                    <MultiSelectField
                      key={key}
                      label={selectorLabels[key]}
                      options={selectorOptions[key]}
                      value={selection[key]}
                      onChange={(next) => setSelection((s) => ({...s, [key]: next}))}
                      placeholder={t("selectPlaceholder")}
                      summary={summarize}
                    />
                  ))}
                </div>

                {totalSelected === 0 ? <p className="text-xs text-muted">{t("noMembers")}</p> : null}

                {/* Picked ids mirrored into hidden inputs for FormData, one name per sign. */}
                {SELECTORS.flatMap(({key, field}) => [
                  ...selection[key].included.map((id) => (
                    <input key={`${key}-in-${id}`} type="hidden" name={`member${field}`} value={id}/>
                  )),
                  ...selection[key].excluded.map((id) => (
                    <input key={`${key}-ex-${id}`} type="hidden" name={`exclude${field}`} value={id}/>
                  )),
                ])}

                {error ? <p className="text-danger text-sm">{error}</p> : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="tertiary" isDisabled={pending} onPress={() => setOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={pending}>
                    {pending ? tCommon("saving") : tCommon("save")}
                  </Button>
                </div>
              </form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
