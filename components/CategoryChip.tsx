import {Chip} from "@heroui/react";

// The category tag shown next to a supplier in the expense detail headers (SupplierCategory for
// a Bill, ContractCategory for a Contract). Shared so both detail surfaces — the intercepted
// modal and the standalone [id] page — render it identically.
export default function CategoryChip({label}: {label: string}) {
  return (
    <Chip variant="soft" color="accent" className="shrink-0">
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
