"use client";

import {startTransition} from "react";
import {useTranslations} from "next-intl";
import {ListBox, Select} from "@heroui/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import type {LifecycleStatus} from "@/lib/status";
import IncomeDateRangeFilter from "@/features/income/components/IncomeDateRangeFilter";
import type {IncomeFilterOptions} from "@/features/income/db/incomeFilterOptions";

const ALL_KEY = "all";

const STATUS_IDS: LifecycleStatus[] = ["Active", "Pending", "Inactive"];

type IncomeFilterMenuProps = {
  options: IncomeFilterOptions;
  isRecurring: boolean;
};

export default function IncomeFilterMenu({options, isRecurring}: IncomeFilterMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("fields");
  const tStatus = useTranslations("status");
  const statusOptions = STATUS_IDS.map((id) => ({id, name: tStatus(id)}));

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    const queryString = params.toString();

    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterSelect
        label={t("source")}
        paramName="sourceId"
        options={options.sources}
        selectedId={searchParams.get("sourceId")}
        onSelect={setParam}
      />
      <FilterSelect
        label={t("category")}
        paramName="categoryId"
        options={options.categories}
        selectedId={searchParams.get("categoryId")}
        onSelect={setParam}
      />
      {isRecurring ? (
        <>
          <FilterSelect
            label={t("frequency")}
            paramName="frequencyId"
            options={options.frequencies}
            selectedId={searchParams.get("frequencyId")}
            onSelect={setParam}
          />
          <FilterSelect
            label={t("status")}
            paramName="status"
            options={statusOptions}
            selectedId={searchParams.get("status")}
            onSelect={setParam}
          />
        </>
      ) : (
        <IncomeDateRangeFilter/>
      )}
    </div>
  );
}

type FilterSelectProps = {
  label: string;
  paramName: string;
  options: {id: string | number; name: string}[];
  selectedId: string | null;
  onSelect: (name: string, value: string | null) => void;
};

function FilterSelect({label, paramName, options, selectedId, onSelect}: FilterSelectProps) {
  const tAll = useTranslations("filters")("all");
  return (
    <label className="flex flex-col gap-1">
      <span className="text-foreground-500 text-sm">{label}</span>
      <Select
        aria-label={label}
        value={selectedId ?? ALL_KEY}
        onChange={(key) => onSelect(paramName, key === ALL_KEY ? null : String(key))}
      >
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id={ALL_KEY} textValue={tAll}>{tAll}</ListBox.Item>
            {options.map((option) => (
              <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
                {option.name}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </label>
  );
}
