"use client";

import {startTransition} from "react";
import {ListBox, Select} from "@heroui/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import type {LifecycleStatus} from "@/lib/status";
import type {ContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";

const ALL_KEY = "all";

const STATUS_OPTIONS: {id: LifecycleStatus; name: string}[] = [
  {id: "Active", name: "Active"},
  {id: "Pending", name: "Pending"},
  {id: "Inactive", name: "Inactive"},
];

type ContractFilterMenuProps = {
  options: ContractFilterOptions;
};

export default function ContractFilterMenu({options}: ContractFilterMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        label="Supplier"
        paramName="supplierId"
        options={options.suppliers}
        selectedId={searchParams.get("supplierId")}
        onSelect={setParam}
      />
      <FilterSelect
        label="Category"
        paramName="categoryId"
        options={options.categories}
        selectedId={searchParams.get("categoryId")}
        onSelect={setParam}
      />
      <FilterSelect
        label="Frequency"
        paramName="frequencyId"
        options={options.frequencies}
        selectedId={searchParams.get("frequencyId")}
        onSelect={setParam}
      />
      <FilterSelect
        label="Status"
        paramName="status"
        options={STATUS_OPTIONS}
        selectedId={searchParams.get("status")}
        onSelect={setParam}
      />
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
  return (
    <label className="flex flex-col gap-1">
      <span className="text-foreground-500 text-sm">{label}</span>
      <Select
        aria-label={label}
        selectedKey={selectedId ?? ALL_KEY}
        onSelectionChange={(key) => onSelect(paramName, key === ALL_KEY ? null : String(key))}
      >
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id={ALL_KEY}>All</ListBox.Item>
            {options.map((option) => (
              <ListBox.Item key={option.id} id={String(option.id)}>
                {option.name}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </label>
  );
}
