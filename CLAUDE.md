# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeyondLedger is a personal finance tracker (income, expenses, budget) built with Next.js App Router, React 19, HeroUI, Tailwind v4, Prisma 7 (SQLite), and Zustand. The app is early-stage: several pages (`dashboard`, `budget`, `settings`) are stubs, and some components (`ChartCard`, `income/variable`) still render hardcoded dummy data. The UI is hardcoded to `de-DE` locale for currency and date formatting.

Note: the git repository root is this `next-app/` directory, not its parent.

## Commands

```bash
npm run dev       # start Next.js dev server
npm run build     # production build
npm run start     # run production build
npm run lint      # ESLint (flat config, eslint-config-next)
npm run db:seed   # seed the SQLite DB via scripts/seed.ts (tsx)
```

There is no test suite/framework configured in this repo.

Prisma (no npm scripts defined for these; run directly):

```bash
npx prisma generate      # regenerate client into prisma/generated/
npx prisma migrate dev   # create/apply a migration
npx prisma studio
```

- Schema is split across `prisma/schema.prisma` (generator/datasource only) and `prisma/models/*.prisma` (`expense.prisma`, `income.prisma`, `global.prisma`), configured via `prisma.config.ts` (`schema: "prisma/"`).
- `DATABASE_URL` (a `file:...` SQLite path, set in `.env`) must be set — `lib/prisma.ts` throws at import time otherwise.
- `scripts/seed.ts` refuses to run if `NODE_ENV=production` or if `DATABASE_URL` doesn't start with `file:` (SQLite-only safeguard).

## Architecture

### Routing

Pages live under `app/(app)/<domain>/...` inside a shared `(app)` route group (`app/(app)/layout.tsx` renders `Sidebar` + `Topbar`). Two domains — `income` and `expense` — each split into `fixed` and `variable` sub-routes (e.g. `app/(app)/expense/variable/page.tsx`), toggled via the `components/VFSwitch.tsx` tab control. `lib/routes.ts` is the single source of truth for top-level nav (Dashboard, Income, Expense, Budget, Settings) and active-route matching.

### Feature modules

Domain logic lives under `features/<domain>/<fixed|variable>/`, split into:

- `components/` — feature-specific React components (e.g. `BillTable.tsx`, `BillDataTable.tsx`, `BillSearchField.tsx`)
- `db/` — Prisma query functions consumed by Server Components (e.g. `features/expense/variable/db/db.ts` exports `getBills()`)
- `store/` — Zustand stores holding client-side filter UI state (e.g. `billFilterStore.ts`, `contractFilterStore.ts`)

### Data model

Prisma models are split by domain: `prisma/models/expense.prisma` (Supplier/SupplierCategory, Contract/ContractCategory = fixed expenses, Bill/Item/ItemCategory = variable expenses), `prisma/models/income.prisma` (Income/IncomeSource/IncomeCategory), and `prisma/models/global.prisma` (`Frequency`, a shared lookup table for recurrence used by both Income and Contract; `FileAsset`, attached to either a Bill or a Contract for uploaded documents). Models are indexed on their common filter/sort columns (category/supplier/frequency FKs plus `createdAt desc`).

### Client filter state — read the migration doc first

The current pattern for list pages (e.g. `/expense/variable`) is: a Server Component fetches *all* rows via a `db.ts` query, passes them down, and a Zustand `*FilterStore` filters them client-side.

`docs/variable-expense-performance-guide.md` documents the intended target architecture and is actively being migrated toward (not yet finished — `features/expense/variable/db/billTableData.ts` is a stub with a TODO, `billChartData.ts`/`billTopKData.ts` are empty placeholders). Before extending any list/filter/chart/top-k feature, read that doc. Its core rules:

- Search/filters that affect multiple page sections (table + chart + top-k) belong in the URL, not Zustand — Zustand state is invisible to server data fetching.
- Table-only concerns (sort column/dir, offset/cursor, loaded rows) stay in local component state, never the URL.
- Tables should fetch paginated, server-sorted rows from a dedicated API route instead of loading the full dataset and sorting/filtering in the browser.
- Charts and top-k cards should receive pre-aggregated data (grouped totals, top-N rows) from the server, not raw row collections.

`components/DataTable.tsx` (the generic HeroUI-backed table) currently only supports client-side sorting of whatever rows it's given; server/manual sorting support is part of the not-yet-finished migration described above.

### Providers

`app/layout.tsx` wraps the app in `contexts/GlobalProviders.tsx` (sets up `next-themes`). There is also a `store/globalProviders.tsx` file — it is dead code (unused, syntactically invalid JSX); do not import it.

### Path alias

`@/*` resolves to the `next-app/` root (see `tsconfig.json`).
