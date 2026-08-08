"use client";

import {useMemo, useState} from "react";
import type {Key} from "react-aria-components";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, ButtonGroup, Label, ListBox, Modal, Select} from "@heroui/react";
import {LuPencil, LuPlus} from "react-icons/lu";
import {labelClass, TextInputField} from "@/features/expense/shared/components/FormFields";
import MultiSelectField from "@/features/budget/components/MultiSelectField";
import WorkspaceSelectField from "@/features/workspaces/components/WorkspaceSelectField";
import type {BudgetMemberOptions, BudgetView} from "@/features/budget/db/budgets";
import type {BudgetPeriodType} from "@/features/budget/period";
import {createBudget, updateBudget} from "@/features/budget/db/budgetMutations";

// Create/edit form for a budget in a controlled Modal (not an interception route). `budget`
// undefined = create. The period-type Select reveals its extra fields (anchor month for
// MONTH_OF_YEAR; start/end for RANGE). Members are picked via four multi-Selects and mirrored into
// hidden inputs so the native <form action> posts them (memberItemCategoryId, …).

const PERIOD_TYPES: BudgetPeriodType[] = ["MONTHLY", "QUARTERLY", "YEARLY", "MONTH_OF_YEAR", "RANGE", "OPEN"];

type Selection = {
  itemCategory: string[];
  supplierCategory: string[];
  supplier: string[];
  contractCategory: string[];
  tag: string[];
};

function initialSelection(budget?: BudgetView): Selection {
  return {
    itemCategory: (budget?.memberIds.itemCategoryIds ?? []).map(String),
    supplierCategory: (budget?.memberIds.supplierCategoryIds ?? []).map(String),
    supplier: (budget?.memberIds.supplierIds ?? []).map(String),
    contractCategory: (budget?.memberIds.contractCategoryIds ?? []).map(String),
    tag: (budget?.memberIds.tagIds ?? []).map(String),
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

  const billLevel = selection.supplier.length > 0 || selection.supplierCategory.length > 0;
  const hasOverlap =
    (billLevel && selection.itemCategory.length > 0) ||
    (selection.supplier.length > 0 && selection.supplierCategory.length > 0);
  const totalSelected =
    selection.itemCategory.length +
    selection.supplierCategory.length +
    selection.supplier.length +
    selection.contractCategory.length +
    selection.tag.length;

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

                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
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
                  <MultiSelectField
                    label={t("groupItemCategories")}
                    options={options.itemCategories}
                    value={selection.itemCategory}
                    onChange={(keys) => setSelection((s) => ({...s, itemCategory: keys}))}
                    placeholder={t("selectPlaceholder")}
                  />
                  <MultiSelectField
                    label={t("groupContractCategories")}
                    options={options.contractCategories}
                    value={selection.contractCategory}
                    onChange={(keys) => setSelection((s) => ({...s, contractCategory: keys}))}
                    placeholder={t("selectPlaceholder")}
                  />
                  <MultiSelectField
                    label={t("groupSupplierCategories")}
                    options={options.supplierCategories}
                    value={selection.supplierCategory}
                    onChange={(keys) => setSelection((s) => ({...s, supplierCategory: keys}))}
                    placeholder={t("selectPlaceholder")}
                  />
                  <MultiSelectField
                    label={t("groupSuppliers")}
                    options={options.suppliers}
                    value={selection.supplier}
                    onChange={(keys) => setSelection((s) => ({...s, supplier: keys}))}
                    placeholder={t("selectPlaceholder")}
                  />
                  <MultiSelectField
                    label={t("groupTags")}
                    options={options.tags}
                    value={selection.tag}
                    onChange={(keys) => setSelection((s) => ({...s, tag: keys}))}
                    placeholder={t("selectPlaceholder")}
                  />
                </div>

                {hasOverlap ? <p className="text-xs text-warning">{t("overlapHint")}</p> : null}
                {totalSelected === 0 ? <p className="text-xs text-muted">{t("noMembers")}</p> : null}

                {/* Selected member ids mirrored into hidden inputs for FormData. */}
                {selection.itemCategory.map((id) => (
                  <input key={`ic-${id}`} type="hidden" name="memberItemCategoryId" value={id}/>
                ))}
                {selection.supplierCategory.map((id) => (
                  <input key={`sc-${id}`} type="hidden" name="memberSupplierCategoryId" value={id}/>
                ))}
                {selection.supplier.map((id) => (
                  <input key={`sp-${id}`} type="hidden" name="memberSupplierId" value={id}/>
                ))}
                {selection.contractCategory.map((id) => (
                  <input key={`cc-${id}`} type="hidden" name="memberContractCategoryId" value={id}/>
                ))}
                {selection.tag.map((id) => (
                  <input key={`tag-${id}`} type="hidden" name="memberTagId" value={id}/>
                ))}

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
