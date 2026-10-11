"use client";

import {useState} from "react";
import type {SortDescriptor} from "@heroui/react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button} from "@heroui/react";
import DataTable from "@/components/DataTable";
import type {Movement} from "@/features/saving/db/savingOverview";

const PAGE = 15;

type PotRef = {id: number; name: string; color: string};

// Every booked movement (plan instalments, deposits, withdrawals), newest first, filterable by pot.
// A row opens the saving it came from.
export default function MovementsTable({movements, pots, showPot = true}: {movements: Movement[]; pots: PotRef[]; showPot?: boolean}) {
  const t = useTranslations("saving");
  const tFields = useTranslations("fields");
  const format = useFormatter();
  const router = useRouter();
  const [pot, setPot] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [sort, setSort] = useState<SortDescriptor>({column: "date", direction: "descending"});

  const potOf = new Map(pots.map((p) => [p.id, p]));
  // Sorted here, before paging, so "Show more" continues the same order.
  const dir = sort.direction === "ascending" ? 1 : -1;
  const shown = movements
    .filter((m) => pot == null || m.potId === pot)
    .sort((a, b) => dir * (sort.column === "amount" ? a.amount - b.amount
      : sort.column === "name" ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const kind = {plan: t("kindPlan"), in: t("kindIn"), out: t("kindOut")};

  const rows = shown.slice(0, limit).map((m) => {
    const p = potOf.get(m.potId);
    return {
      id: m.key,
      date: format.dateTime(new Date(`${m.date}T00:00:00Z`), {dateStyle: "medium", timeZone: "UTC"}),
      pot: (
        <span className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{background: p?.color}}/>
          {p?.name}
        </span>
      ),
      name: m.name,
      kind: <span className="rounded-full bg-[var(--default)] px-2 py-0.5 text-xs text-muted">{kind[m.kind]}</span>,
      amount: (
        <span className={`tabular-nums ${m.amount < 0 ? "text-danger" : ""}`}>
          {m.amount > 0 ? "+" : ""}{format.number(m.amount, "currency")}
        </span>
      ),
    };
  });
  const savingOf = new Map(shown.map((m) => [m.key, m.savingId]));

  const columns = [
    {id: "date" as const, name: tFields("date")},
    ...(showPot ? [{id: "pot" as const, name: tFields("target"), allowsSorting: false}] : []),
    {id: "name" as const, name: tFields("name"), isRowHeader: true},
    {id: "kind" as const, name: t("kind"), allowsSorting: false},
    {id: "amount" as const, name: tFields("amount")},
  ];

  return (
    <div className="flex flex-col gap-3">
      {showPot && pots.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={pot == null} onPress={() => { setPot(null); setLimit(PAGE); }}>{t("all")}</FilterChip>
          {pots.map((p) => (
            <FilterChip key={p.id} active={pot === p.id} onPress={() => { setPot(p.id); setLimit(PAGE); }}>
              <span className="size-2 rounded-full" style={{background: p.color}}/>{p.name}
            </FilterChip>
          ))}
        </div>
      ) : null}
      <DataTable
        ariaLabel={t("movements")}
        columns={columns}
        rows={rows}
        manualSorting
        sortDescriptor={sort}
        onSortChange={setSort}
        scroll="page"
        onRowAction={(id) => {
          const savingId = savingOf.get(String(id));
          if (savingId) router.push(`/saving/entry/${savingId}`);
        }}
      />
      {shown.length > limit ? (
        <Button size="sm" variant="tertiary" className="self-start" onPress={() => setLimit((n) => n + PAGE * 2)}>
          {t("more", {count: shown.length - limit})}
        </Button>
      ) : null}
    </div>
  );
}

function FilterChip({active, onPress, children}: {active: boolean; onPress: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${active ? "border-transparent bg-[var(--default)]" : "border-[var(--border)] text-muted"}`}
    >
      {children}
    </button>
  );
}
