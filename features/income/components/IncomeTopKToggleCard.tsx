"use client";

import {startTransition, useState} from "react";
import {Button, ButtonGroup} from "@heroui/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import TopKTableCard from "@/components/TopKTableCard";
import type {IncomeTopKRow} from "@/features/income/types";

type TopKMode = "source" | "category";

type IncomeTopKToggleCardProps = {
  sourceRows: IncomeTopKRow[];
  categoryRows: IncomeTopKRow[];
};

const MODE_CONFIG: Record<TopKMode, {label: string; title: string; paramName: string}> = {
  source: {label: "Sources", title: "Top Sources", paramName: "sourceId"},
  category: {label: "Categories", title: "Top Categories", paramName: "categoryId"},
};

const MODE_ORDER: TopKMode[] = ["source", "category"];

export default function IncomeTopKToggleCard({sourceRows, categoryRows}: IncomeTopKToggleCardProps) {
  const [mode, setMode] = useState<TopKMode>("source");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rows = mode === "source" ? sourceRows : categoryRows;
  const paramName = MODE_CONFIG[mode].paramName;
  const activeId = searchParams.get(paramName);

  // Clicking a row toggles the matching URL filter (sourceId / categoryId) — the same params the
  // filter menu and table read, so table + chart + top-k all re-scope together. Re-clicking clears.
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
      title={MODE_CONFIG[mode].title}
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
              {MODE_CONFIG[item].label}
            </Button>
          ))}
        </ButtonGroup>
      }
    />
  );
}
