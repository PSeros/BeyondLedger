"use client";

import {useState} from "react";
import {Button, ButtonGroup} from "@heroui/react";
import TopKTableCard from "@/components/TopKTableCard";
import type {BillTopKRow} from "@/features/expense/variable/types";

type TopKMode = "supplier" | "itemCategory";

type BillTopKToggleCardProps = {
  supplierRows: BillTopKRow[];
  itemCategoryRows: BillTopKRow[];
};

const MODE_CONFIG: Record<TopKMode, {label: string; title: string}> = {
  supplier: {label: "Suppliers", title: "Top Suppliers"},
  itemCategory: {label: "Categories", title: "Top Categories"},
};

const MODE_ORDER: TopKMode[] = ["supplier", "itemCategory"];

export default function BillTopKToggleCard({supplierRows, itemCategoryRows}: BillTopKToggleCardProps) {
  const [mode, setMode] = useState<TopKMode>("supplier");

  const rows = mode === "supplier" ? supplierRows : itemCategoryRows;

  return (
    <TopKTableCard
      title={MODE_CONFIG[mode].title}
      rows={rows}
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
