'use client'

import type {SortDescriptor} from "@heroui/react";

import {EmptyState, Table, cn} from "@heroui/react";
import {useMemo, useState} from "react";
import type {Key, ReactNode} from "react";
import {MdKeyboardArrowUp} from "react-icons/md";
import {LuInbox} from "react-icons/lu";

type DataTableRow = Record<string, ReactNode> & {
  id: Key;
};

type DataTableColumn<T extends DataTableRow> = {
  id: Extract<keyof T, string>;
  name: string;
  isRowHeader?: boolean;
  allowsSorting?: boolean;
  sortValue?: (row: T) => string | number;
};

type DataTableProps<T extends DataTableRow> = {
  ariaLabel: string;
  columns: readonly DataTableColumn<T>[];
  rows: T[];
  className?: string;
  manualSorting?: boolean;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (sortDescriptor: SortDescriptor) => void;
};

function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between gap-3">
      {children}
      {!!sortDirection && (
        <MdKeyboardArrowUp
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transform transition-transform duration-100 ease-out",
            sortDirection === "descending" ? "rotate-180" : "",
          )}
        />
      )}
    </span>
  );
}

export default function DataTable<T extends DataTableRow>({
  ariaLabel,
  columns,
  rows,
  className,
  manualSorting = false,
  sortDescriptor: sortDescriptorProp,
  onSortChange,
}: DataTableProps<T>) {
  const [internalSortDescriptor, setInternalSortDescriptor] = useState<SortDescriptor>({
    column: columns[0]?.id ?? "id",
    direction: "ascending",
  });

  const sortDescriptor = sortDescriptorProp ?? internalSortDescriptor;
  const handleSortChange = onSortChange ?? setInternalSortDescriptor;

  const sortedRows = useMemo(() => {
    if (manualSorting) {
      return rows;
    }

    const columnId = String(sortDescriptor.column);
    const column = columns.find((item) => item.id === columnId);

    if (!column || column.allowsSorting === false) {
      return rows;
    }

    return [...rows].sort((firstRow, secondRow) => {
      const first = column.sortValue?.(firstRow) ?? firstRow[column.id];
      const second = column.sortValue?.(secondRow) ?? secondRow[column.id];
      let comparison: number;

      if (typeof first === "number" && typeof second === "number") {
        comparison = first - second;
      } else {
        comparison = String(first ?? "").localeCompare(String(second ?? ""), "de-DE", {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDescriptor.direction === "descending" ? comparison * -1 : comparison;
    });
  }, [columns, manualSorting, rows, sortDescriptor]);

  return (
    <Table
      className={cn(
        "flex max-h-full w-full flex-col overflow-hidden",
        sortedRows.length === 0 ? "min-h-[200px]" : "",
        className,
      )}
    >
      <Table.ScrollContainer className="min-h-0 overflow-auto">
        <Table.Content
          aria-label={ariaLabel}
          className={cn("min-w-full", sortedRows.length === 0 ? "h-full" : "")}
          sortDescriptor={sortDescriptor}
          onSortChange={handleSortChange}
        >
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column
                allowsSorting={column.allowsSorting ?? true}
                className="sticky top-0 z-10 bg-surface-secondary"
                id={column.id}
                isRowHeader={column.isRowHeader}
              >
                {({sortDirection}) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    {column.name}
                  </SortableColumnHeader>
                )}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                <LuInbox aria-hidden="true" className="size-20 text-muted"/>
                <span className="text-sm text-muted">No results found</span>
              </EmptyState>
            )}
          >
            {sortedRows.map((row) => (
              <Table.Row key={row.id}>
                {columns.map((column) => (
                  <Table.Cell key={column.id}>{row[column.id]}</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
