'use client'

import type {SortDescriptor} from "@heroui/react";

import {EmptyState, Spinner, Table, cn} from "@heroui/react";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useMemo, useRef, useState} from "react";
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
  /**
   * "self" (default): the table is its own bounded, internally-scrolling box (max-h-full + overflow).
   * "page": the table flows to its natural height and lets an ancestor scroll it — headers stay
   * sticky against that ancestor and infinite-scroll still fires because React Aria's LoadMore
   * sentinel observes the nearest scroll parent (getScrollParent), which becomes the page container.
   * Use "page" when the whole route content (charts + table) should scroll as one region.
   */
  scroll?: "self" | "page";
  manualSorting?: boolean;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (sortDescriptor: SortDescriptor) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onRowAction?: (id: Key) => void;
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
  scroll = "self",
  manualSorting = false,
  sortDescriptor: sortDescriptorProp,
  onSortChange,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onRowAction,
}: DataTableProps<T>) {
  const locale = useLocale();
  const t = useTranslations("common");
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
        comparison = String(first ?? "").localeCompare(String(second ?? ""), locale, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDescriptor.direction === "descending" ? comparison * -1 : comparison;
    });
  }, [columns, manualSorting, rows, sortDescriptor, locale]);

  const isPageScroll = scroll === "page";
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load-more is driven by our own sentinel in page mode, not React Aria's.
  //
  // React Aria roots its load-more IntersectionObserver at getScrollParent(sentinel), and
  // getScrollParent picks any ancestor whose *computed overflow* contains "auto" — it is called
  // without a can-this-actually-scroll check. Below lg the ScrollContainer becomes a horizontal
  // scroller (see its className), i.e. a box that never scrolls vertically and whose height equals
  // its content height, with React Aria's 1px sentinel sitting on its bottom edge. That root makes
  // the sentinel either permanently intersecting (runaway pagination, since the callers' in-flight
  // guard only de-dupes concurrent calls) or permanently outside it (infinite scroll silently dead)
  // depending on sub-pixel layout.
  //
  // Observing our own sentinel against the viewport sidesteps the whole problem: ancestor scroll
  // containers still clip it, so it fires exactly when the end of the list is genuinely visible, and
  // the behaviour is identical above and below lg — one code path, no breakpoint branch.
  useEffect(() => {
    if (!isPageScroll || !hasMore || !onLoadMore) return;

    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      {rootMargin: "0px 0px 200px 0px"},
    );
    observer.observe(element);

    return () => observer.disconnect();
    // sortedRows.length re-arms the observer after each append (mirroring React Aria's own
    // tear-down-on-collection-change), so a first page too short to fill the viewport keeps loading.
  }, [isPageScroll, hasMore, onLoadMore, sortedRows.length]);

  return (
    <>
    <Table
      className={cn(
        "flex w-full flex-col",
        // Self-scroll: cap to the parent's height and clip so the ScrollContainer scrolls internally.
        // Page-scroll: no cap — flow to natural height and let the page container do the scrolling.
        isPageScroll ? "" : "max-h-full overflow-hidden",
        sortedRows.length === 0 ? "min-h-[200px]" : "",
        className,
      )}
    >
      <Table.ScrollContainer
        className={
          // Below lg the table scrolls horizontally on its own (HeroUI's default for this element).
          // At lg+ overflow-visible keeps it OUT of getScrollParent's chain so the sticky header
          // sticks to the page scroll container. Note overflow-x-auto + overflow-y-visible is not an
          // option: CSS computes the `visible` axis to `auto` once the other axis isn't visible, so
          // it would be a scroll container on both axes anyway.
          //
          // min-w-0 is required, not cosmetic: the Table root's `flex flex-col` overrides
          // .table-root's grid + minmax(0,1fr), so this flex item keeps the default min-width:auto
          // and sizes itself to the table's content (~900px). It would then be clipped by the
          // overflow-hidden <main> instead of scrolling. min-w-0 lets it shrink to the viewport so
          // overflow-x-auto has something to scroll.
          isPageScroll
            ? "min-w-0 overflow-x-auto lg:overflow-visible"
            : "min-h-0 overflow-auto [scrollbar-gutter:stable]"
        }
      >
        <Table.Content
          aria-label={ariaLabel}
          className={cn("min-w-full", sortedRows.length === 0 ? "h-full" : "")}
          sortDescriptor={sortDescriptor}
          onSortChange={handleSortChange}
          onRowAction={onRowAction ? (key) => onRowAction(key) : undefined}
        >
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column
                allowsSorting={column.allowsSorting ?? true}
                // In page mode below lg the ScrollContainer is a horizontal scroller, so there is no
                // vertical scroll container for the header to stick to — claim sticky only at lg+,
                // where the page container is the scroll parent again.
                className={cn(
                  "bg-surface-secondary max-lg:whitespace-nowrap",
                  isPageScroll ? "z-10 lg:sticky lg:top-0" : "sticky top-0 z-10",
                )}
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
                <span className="text-sm text-muted">{t("noResults")}</span>
              </EmptyState>
            )}
          >
            {sortedRows.map((row) => (
              <Table.Row
                key={row.id}
                id={String(row.id)}
                className={onRowAction ? "cursor-pointer" : undefined}
              >
                {columns.map((column) => (
                  // nowrap below lg so the table's min-content width actually exceeds a phone
                  // viewport and the horizontal scroller engages, instead of cells squashing to one
                  // word per line.
                  <Table.Cell key={column.id} className="max-lg:whitespace-nowrap">
                    {row[column.id]}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
            {!!hasMore && !!onLoadMore && (
              // In page mode this row is kept purely for the spanning spinner — withholding
              // onLoadMore no-ops React Aria's own sentinel so it can't double-fire against our
              // viewport-rooted observer below.
              <Table.LoadMore
                isLoading={isLoadingMore}
                scrollOffset={0}
                onLoadMore={isPageScroll ? undefined : onLoadMore}
              >
                <Table.LoadMoreContent>
                  <Spinner size="md"/>
                </Table.LoadMoreContent>
              </Table.LoadMore>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
    {/* Outside <Table> on purpose: no overflow anywhere inside the table can capture it, at any
        width. See the IntersectionObserver above. */}
    {isPageScroll && hasMore ? (
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full"/>
    ) : null}
    </>
  );
}
