import "dotenv/config";

import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";

import {PrismaClient} from "../prisma/generated/client";

// Production-safe first-run initializer (unlike scripts/seed.ts, which fills the DB with fake
// demo data and refuses to run in production). This sets the app's base language and seeds the
// preconfigured taxonomies (categories + frequencies) in that language. It is IDEMPOTENT: each
// category table is only filled when empty, so re-running never duplicates. It does NOT seed
// suppliers or income sources — those are user data, created as you go.
//
// Invoked by the Proxmox helper after the container is built:
//   APP_LOCALE=de npm run db:init

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

if (!databaseUrl.startsWith("file:")) {
  throw new Error("Refusing to initialize a non-SQLite database");
}

const LOCALES = ["en", "de"] as const;
type Locale = (typeof LOCALES)[number];

const requested = (process.env.APP_LOCALE ?? "en").toLowerCase();
const locale: Locale = (LOCALES as readonly string[]).includes(requested)
  ? (requested as Locale)
  : "en";

// Frequency.id has no autoincrement default, so ids are assigned explicitly (stable across
// locales — the same row, just a localized name).
type Frequency = {id: number; name: string; value: number; isRecurring: boolean};

type LocaleData = {
  itemCategories: string[];
  supplierCategories: string[];
  contractCategories: string[];
  incomeCategories: string[];
  // `value` = billing occurrences per year (used by the app for amortization math, e.g.
  // 12 / value). `isRecurring: false` marks the one-off entry, which the contract/fixed-expense
  // forms filter out (a one-off expense is a Bill) — it is offered for Income only.
  frequencies: Frequency[];
};

const DATA: Record<Locale, LocaleData> = {
  de: {
    itemCategories: [
      "Essen", "Getränk", "Kleidung", "Elektronik", "Haushaltswaren", "Buch", "Spiel",
      "Abonnement", "Kosmetik", "Medikament", "Unternehmung", "Reparatur", "Kraftstoff",
      "Dienstleistung", "Reisen", "Wohnen", "Kommunikation", "Versicherung", "Pfand",
      "Geschenk", "Sonstiges",
    ],
    supplierCategories: [
      "Online-Handel", "Supermarkt", "Drogerie", "Gesundheitsdienstleister",
      "Bekleidungsgeschäft", "Bäckerei", "Elektronikmarkt", "Baumarkt", "Mobilfunkanbieter",
      "Buchhandlung", "Spielwarenladen", "Entertainment", "Restaurant", "Tankstelle",
      "Werkstatt", "Versicherungsunternehmen", "Friseur", "Sonstiges",
    ],
    contractCategories: [
      "Wohnen", "Energie", "Versicherung", "Abonnement", "Kommunikation", "Mitgliedschaft",
      "Kredit", "Dienstleistung", "Sonstiges",
    ],
    incomeCategories: ["Gehalt", "Bonus", "Stipendium", "Sonstiges"],
    frequencies: [
      {id: 1, name: "einmalig", value: 1, isRecurring: false},
      {id: 2, name: "jährlich", value: 1, isRecurring: true},
      {id: 3, name: "halbjährlich", value: 2, isRecurring: true},
      {id: 4, name: "vierteljährlich", value: 4, isRecurring: true},
      {id: 5, name: "monatlich", value: 12, isRecurring: true},
    ],
  },
  en: {
    itemCategories: [
      "Food", "Beverage", "Clothing", "Electronics", "Household", "Book", "Game",
      "Subscription", "Cosmetics", "Medication", "Leisure", "Repair", "Fuel", "Service",
      "Travel", "Housing", "Communication", "Insurance", "Deposit", "Gift", "Other",
    ],
    supplierCategories: [
      "Online retail", "Supermarket", "Drugstore", "Healthcare", "Clothing store", "Bakery",
      "Electronics store", "Hardware store", "Mobile carrier", "Bookstore", "Toy store",
      "Entertainment", "Restaurant", "Gas station", "Garage", "Insurance company",
      "Hairdresser", "Other",
    ],
    contractCategories: [
      "Housing", "Energy", "Insurance", "Subscription", "Communication", "Membership",
      "Loan", "Service", "Other",
    ],
    incomeCategories: ["Salary", "Bonus", "Scholarship", "Other"],
    frequencies: [
      {id: 1, name: "One-time", value: 1, isRecurring: false},
      {id: 2, name: "Annually", value: 1, isRecurring: true},
      {id: 3, name: "Semi-annually", value: 2, isRecurring: true},
      {id: 4, name: "Quarterly", value: 4, isRecurring: true},
      {id: 5, name: "Monthly", value: 12, isRecurring: true},
    ],
  },
};

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({url: databaseUrl}),
});

// Fill a table only when it is empty, so re-running never duplicates rows.
async function seedIfEmpty(
  label: string,
  count: () => Promise<number>,
  create: () => Promise<unknown>,
): Promise<void> {
  const existing = await count();
  if (existing > 0) {
    console.log(`  • ${label}: ${existing} row(s) already present — skipped`);
    return;
  }
  await create();
  console.log(`  • ${label}: seeded`);
}

async function main(): Promise<void> {
  const data = DATA[locale];
  console.log(`Initializing BeyondLedger (locale: ${locale})`);

  // 1) Base language — the AppSettings singleton (id: 1).
  await prisma.appSettings.upsert({
    where: {id: 1},
    create: {id: 1, locale},
    update: {locale},
  });
  console.log(`  • base language set to "${locale}"`);

  // 2) Category taxonomies + frequencies (only when empty).
  await seedIfEmpty(
    "itemCategories",
    () => prisma.itemCategory.count(),
    () => prisma.itemCategory.createMany({data: data.itemCategories.map((name) => ({name}))}),
  );
  await seedIfEmpty(
    "supplierCategories",
    () => prisma.supplierCategory.count(),
    () => prisma.supplierCategory.createMany({data: data.supplierCategories.map((name) => ({name}))}),
  );
  await seedIfEmpty(
    "contractCategories",
    () => prisma.contractCategory.count(),
    () => prisma.contractCategory.createMany({data: data.contractCategories.map((name) => ({name}))}),
  );
  await seedIfEmpty(
    "incomeCategories",
    () => prisma.incomeCategory.count(),
    () => prisma.incomeCategory.createMany({data: data.incomeCategories.map((name) => ({name}))}),
  );
  await seedIfEmpty(
    "frequencies",
    () => prisma.frequency.count(),
    () => prisma.frequency.createMany({data: data.frequencies}),
  );

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
