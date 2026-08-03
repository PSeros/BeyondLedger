"use client";

import {startTransition, useState} from "react";
import {useTranslations} from "next-intl";
import {Button, ButtonGroup} from "@heroui/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import TopKTableCard from "@/components/TopKTableCard";
import type {BillTopKRow} from "@/features/expense/variable/types";

type TopKMode = "supplier" | "itemCategory";

type BillTopKToggleCardProps = {
  supplierRows: BillTopKRow[];
  itemCategoryRows: BillTopKRow[];
};

const MODE_CONFIG: Record<TopKMode, {labelKey: string; titleKey: string; paramName: string}> = {
  supplier: {labelKey: "suppliers", titleKey: "topSuppliers", paramName: "supplierId"},
  itemCategory: {labelKey: "categories", titleKey: "topCategories", paramName: "itemCategoryId"},
};

const MODE_ORDER: TopKMode[] = ["supplier", "itemCategory"];

export default function BillTopKToggleCard({supplierRows, itemCategoryRows}: BillTopKToggleCardProps) {
  const t = useTranslations("topk");
  const [mode, setMode] = useState<TopKMode>("supplier");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rows = mode === "supplier" ? supplierRows : itemCategoryRows;
  const paramName = MODE_CONFIG[mode].paramName;
  const activeId = searchParams.get(paramName);

  // Clicking a row toggles the matching URL filter (supplierId / itemCategoryId) — the same
  // params the filter menu and table read, so table + chart + top-k all re-scope together.
  // Re-clicking the active row clears it. Uses replace (no history spam) + scroll:false, in a
  // transition to keep the click responsive while the server data refetches. NB: the id is
  // compared as a string since URL params are strings but the row ids are numbers.
  function handleRowSelect(id: number | string) {
    const params = new URLSearchParams(searchParams.toString());

    if (String(id) === activeId) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(id));
    }

    const queryString = params.toString();

    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  return (
    <TopKTableCard
      title={t(MODE_CONFIG[mode].titleKey)}
      rows={rows}
      onRowSelect={handleRowSelect}
      activeId={activeId ? Number(activeId) : null}
      headerAction={
        <ButtonGroup size="sm">
          {MODE_ORDER.map((item) => (
            <Button
              key={item}
              variant={mode === item ? "secondary" : "tertiary"}
              onPress={() => setMode(item)}
            >
              {t(MODE_CONFIG[item].labelKey)}
            </Button>
          ))}
        </ButtonGroup>
      }
    />
  );
}
