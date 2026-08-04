import "dotenv/config";

import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";

import {FileStatusChoice, PrismaClient} from "../prisma/generated/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed while NODE_ENV=production");
}

if (!databaseUrl.startsWith("file:")) {
  throw new Error("Refusing to seed a non-SQLite database");
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({url: databaseUrl}),
});

const MONTHS_TO_SEED = 36;
const BILLS_PER_MONTH = 16;
const ONE_OFF_INCOMES_PER_MONTH = 1;
const FILES_PER_MONTH = 4;
const today = new Date();
const START_DATE = new Date(
  Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - MONTHS_TO_SEED + 1, 1),
);

const toMoney = (value: number) => value.toFixed(2);
const pick = <T>(values: T[]) => values[Math.floor(Math.random() * values.length)];
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomAmount = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

const addMonths = (date: Date, months: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
const monthDate = (monthOffset: number, day?: number) => {
  const maxDay =
    monthOffset === MONTHS_TO_SEED - 1 ? Math.min(today.getUTCDate(), 28) : 28;
  const safeDay = Math.min(day ?? randomInt(1, maxDay), maxDay);

  return new Date(
    Date.UTC(
      START_DATE.getUTCFullYear(),
      START_DATE.getUTCMonth() + monthOffset,
      safeDay,
    ),
  );
};
const yyyymm = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

async function resetDatabase() {
  await prisma.$transaction([
    prisma.budget.deleteMany(), // cascades BudgetMember + BudgetOverride
    prisma.fileAsset.deleteMany(),
    prisma.item.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.income.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.contractCategory.deleteMany(),
    prisma.itemCategory.deleteMany(),
    prisma.supplierCategory.deleteMany(),
    prisma.incomeCategory.deleteMany(),
    prisma.incomeSource.deleteMany(),
    prisma.frequency.deleteMany(),
  ]);

  await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence");
}

async function createLookupRows() {
  const frequencies = await prisma.frequency.createManyAndReturn({
    data: [
      {id: 1, name: "One-time", value: 1, isRecurring: false},
      {id: 2, name: "Monthly", value: 12, isRecurring: true},
      {id: 3, name: "Quarterly", value: 4, isRecurring: true},
      {id: 4, name: "Yearly", value: 1, isRecurring: true},
    ],
  });

  // Household supplier categories — who a family actually spends money with.
  const supplierCategories = await prisma.supplierCategory.createManyAndReturn({
    data: ["Wohnen & Energie", "Lebensmittel", "Freizeit", "Versicherungen", "Mobilität", "Gesundheit"].map(
      (name) => ({name}),
    ),
  });
  // Item categories — what ends up on a single grocery/pharmacy/gas-station receipt.
  const itemCategories = await prisma.itemCategory.createManyAndReturn({
    data: ["Lebensmittel", "Drogerie", "Haushalt", "Getränke", "Tanken", "Gesundheit", "Sonstiges"].map(
      (name) => ({name}),
    ),
  });
  // Fixed-expense categories — recurring household commitments.
  const contractCategories = await prisma.contractCategory.createManyAndReturn({
    data: ["Wohnen & Energie", "Freizeit & Abos", "Versicherungen", "Mobilität"].map(
      (name) => ({name}),
    ),
  });
  const incomeCategories = await prisma.incomeCategory.createManyAndReturn({
    data: ["Gehalt", "Kindergeld", "Nebeneinkünfte", "Erstattung", "Sonstiges"].map(
      (name) => ({name}),
    ),
  });
  const incomeSources = await prisma.incomeSource.createManyAndReturn({
    data: ["Arbeitgeber", "Familienkasse", "Nebentätigkeit", "Finanzamt", "Privatverkauf"].map(
      (name) => ({name}),
    ),
  });

  return {
    frequencies,
    supplierCategories,
    itemCategories,
    contractCategories,
    incomeCategories,
    incomeSources,
  };
}

async function main() {
  await resetDatabase();

  const lookups = await createLookupRows();
  const frequencyByName = Object.fromEntries(
    lookups.frequencies.map((frequency) => [frequency.name, frequency]),
  );
  const itemCategoryByName = Object.fromEntries(
    lookups.itemCategories.map((category) => [category.name, category]),
  );
  const supplierCategoryIdByName = Object.fromEntries(
    lookups.supplierCategories.map((category) => [category.name, category.id]),
  );
  const contractCategoryIdByName = Object.fromEntries(
    lookups.contractCategories.map((category) => [category.name, category.id]),
  );

  // First 11 suppliers carry a recurring Contract (rent, utilities, insurance, subscriptions,
  // memberships). The last 5 are one-off retailers that only ever show up on itemized Bills —
  // nobody has a "contract" with their supermarket. No overlap between the two groups.
  const contractSupplierBlueprints = [
    ["Wohnbau München", "Wohnen & Energie"],
    ["Stadtwerke München", "Wohnen & Energie"],
    ["Deutsche Telekom", "Wohnen & Energie"],
    ["Netflix", "Freizeit"],
    ["Spotify", "Freizeit"],
    ["Fitness First", "Freizeit"],
    ["Allianz", "Versicherungen"],
    ["DEVK", "Versicherungen"],
    ["HUK-Coburg", "Versicherungen"],
    ["ADAC", "Mobilität"],
    ["Deutsche Bahn", "Mobilität"],
  ] as const;
  const billOnlySupplierBlueprints = [
    ["REWE", "Lebensmittel"],
    ["ALDI SÜD", "Lebensmittel"],
    ["EDEKA", "Lebensmittel"],
    ["Shell Tankstelle", "Mobilität"],
    ["Apotheke am Markt", "Gesundheit"],
  ] as const;

  const suppliers = await prisma.supplier.createManyAndReturn({
    data: [...contractSupplierBlueprints, ...billOnlySupplierBlueprints].map(([name, category]) => ({
      name,
      categoryId: supplierCategoryIdByName[category],
    })),
  });
  const supplierByName = Object.fromEntries(suppliers.map((supplier) => [supplier.name, supplier]));

  // {contract category, display name, billing frequency, per-occurrence amount range}
  const contractBlueprints = [
    {supplier: "Wohnbau München", category: "Wohnen & Energie", label: "Miete", frequency: "Monthly", amount: [950, 1450]},
    {supplier: "Stadtwerke München", category: "Wohnen & Energie", label: "Strom & Gas", frequency: "Monthly", amount: [140, 260]},
    {supplier: "Deutsche Telekom", category: "Wohnen & Energie", label: "Internet & Telefon", frequency: "Monthly", amount: [35, 65]},
    {supplier: "Netflix", category: "Freizeit & Abos", label: "Streaming-Abo", frequency: "Monthly", amount: [9, 20]},
    {supplier: "Spotify", category: "Freizeit & Abos", label: "Streaming-Abo", frequency: "Monthly", amount: [5, 17]},
    {supplier: "Fitness First", category: "Freizeit & Abos", label: "Mitgliedschaft", frequency: "Monthly", amount: [25, 55]},
    {supplier: "Allianz", category: "Versicherungen", label: "Hausratversicherung", frequency: "Yearly", amount: [120, 320]},
    {supplier: "DEVK", category: "Versicherungen", label: "KFZ-Versicherung", frequency: "Yearly", amount: [350, 900]},
    {supplier: "HUK-Coburg", category: "Versicherungen", label: "Haftpflichtversicherung", frequency: "Yearly", amount: [60, 150]},
    {supplier: "ADAC", category: "Mobilität", label: "Mitgliedschaft", frequency: "Yearly", amount: [55, 100]},
    {supplier: "Deutsche Bahn", category: "Mobilität", label: "BahnCard", frequency: "Yearly", amount: [250, 470]},
  ] as const;

  const contracts = await prisma.contract.createManyAndReturn({
    data: contractBlueprints.map((blueprint, index) => {
      const supplier = supplierByName[blueprint.supplier];
      const startDate = monthDate(randomInt(0, 8));

      return {
        name: `${blueprint.supplier} ${blueprint.label}`,
        categoryId: contractCategoryIdByName[blueprint.category],
        supplierId: supplier.id,
        documentNumber: `CTR-${supplier.id}-${startDate.getUTCFullYear()}`,
        totalAmount: toMoney(randomAmount(blueprint.amount[0], blueprint.amount[1])),
        frequencyId: frequencyByName[blueprint.frequency].id,
        startDate,
        // A handful of contracts have already ended (switched provider, cancelled membership).
        endDate: index % 5 === 0 ? addMonths(startDate, randomInt(18, 42)) : null,
        noticePeriod: pick([30, 60, 90]),
      };
    }),
  });

  const salary = lookups.incomeCategories.find((category) => category.name === "Gehalt")!;
  const childBenefit = lookups.incomeCategories.find((category) => category.name === "Kindergeld")!;
  const employer = lookups.incomeSources.find((source) => source.name === "Arbeitgeber")!;
  const familyBenefitsOffice = lookups.incomeSources.find((source) => source.name === "Familienkasse")!;

  const oneOffIncomeCategories = lookups.incomeCategories.filter(
    (category) => category.name !== "Gehalt" && category.name !== "Kindergeld",
  );
  const oneOffIncomeSources = lookups.incomeSources.filter(
    (source) => source.name !== "Arbeitgeber" && source.name !== "Familienkasse",
  );

  await prisma.income.createMany({
    data: [
      {
        name: "Gehalt Hauptverdiener",
        sourceId: employer.id,
        categoryId: salary.id,
        totalAmount: "3400.00",
        frequencyId: frequencyByName.Monthly.id,
        startDate: START_DATE,
      },
      {
        name: "Kindergeld",
        sourceId: familyBenefitsOffice.id,
        categoryId: childBenefit.id,
        totalAmount: "250.00",
        frequencyId: frequencyByName.Monthly.id,
        startDate: START_DATE,
      },
      // Occasional extra income: side gigs, tax refunds, selling used items.
      ...Array.from({length: MONTHS_TO_SEED * ONE_OFF_INCOMES_PER_MONTH}, (_, index) => {
        const date = monthDate(Math.floor(index / ONE_OFF_INCOMES_PER_MONTH), randomInt(1, 28));
        const source = pick(oneOffIncomeSources);
        const category = pick(oneOffIncomeCategories);

        return {
          name: `${source.name} ${category.name} ${yyyymm(date)}-${index}`,
          sourceId: source.id,
          categoryId: category.id,
          totalAmount: toMoney(randomAmount(20, 700)),
          frequencyId: frequencyByName["One-time"].id,
          startDate: date,
          endDate: null,
        };
      }),
    ],
  });

  // Weighted pool so the grocery stores and the gas station show up more often than the pharmacy.
  const billSupplierPool = [
    ...Array(4).fill("REWE"),
    ...Array(3).fill("ALDI SÜD"),
    ...Array(3).fill("EDEKA"),
    ...Array(4).fill("Shell Tankstelle"),
    ...Array(2).fill("Apotheke am Markt"),
  ];

  const billRows = Array.from({length: MONTHS_TO_SEED}, (_, month) =>
    Array.from({length: BILLS_PER_MONTH}, (_, index) => {
      const supplier = supplierByName[pick(billSupplierPool)];
      const date = monthDate(month, randomInt(1, 28));

      return {
        supplierId: supplier.id,
        documentNumber: `INV-${supplier.id}-${yyyymm(date)}-${index + 1}`,
        totalAmount: "0.00",
        date,
        markdown: `Kassenbon von ${supplier.name}.`,
      };
    }),
  ).flat();

  const bills = await prisma.bill.createManyAndReturn({data: billRows});

  const itemNamesByCategory = {
    Lebensmittel: ["Brot", "Milch", "Gemüse", "Obst", "Fleisch", "Käse", "Eier"],
    Drogerie: ["Shampoo", "Zahnpasta", "Duschgel", "Windeln", "Rasierklingen"],
    Haushalt: ["Waschmittel", "Küchenrolle", "Spülmittel", "Müllbeutel"],
    Getränke: ["Mineralwasser", "Orangensaft", "Kaffee", "Bier"],
    Tanken: ["Benzin", "Diesel", "Autowäsche"],
    Gesundheit: ["Vitamintabletten", "Schmerzmittel", "Hustensaft", "Pflaster"],
    Sonstiges: ["Zeitschrift", "Snacks", "Kaugummi", "Batterien"],
  };
  // Which item categories plausibly show up on a given supplier's receipt.
  const itemCategoriesBySupplier: Record<string, Array<keyof typeof itemNamesByCategory>> = {
    "REWE": ["Lebensmittel", "Drogerie", "Haushalt", "Getränke", "Sonstiges"],
    "ALDI SÜD": ["Lebensmittel", "Drogerie", "Haushalt", "Getränke", "Sonstiges"],
    "EDEKA": ["Lebensmittel", "Drogerie", "Haushalt", "Getränke", "Sonstiges"],
    "Shell Tankstelle": ["Tanken", "Getränke", "Sonstiges"],
    "Apotheke am Markt": ["Gesundheit", "Drogerie"],
  };
  // Single-purpose suppliers always ring up their defining item first (a gas station visit
  // without fuel, or a pharmacy visit without anything health-related, would look wrong).
  const primaryCategoryBySupplier: Partial<Record<string, keyof typeof itemNamesByCategory>> = {
    "Shell Tankstelle": "Tanken",
    "Apotheke am Markt": "Gesundheit",
  };
  // {unit price range, quantity range} per item category.
  const itemPricingByCategory: Record<keyof typeof itemNamesByCategory, {price: [number, number]; quantity: [number, number]}> = {
    Lebensmittel: {price: [0.5, 8], quantity: [1, 6]},
    Drogerie: {price: [1, 12], quantity: [1, 3]},
    Haushalt: {price: [1, 15], quantity: [1, 3]},
    Getränke: {price: [0.5, 15], quantity: [1, 4]},
    Tanken: {price: [35, 95], quantity: [1, 1]},
    Gesundheit: {price: [3, 25], quantity: [1, 2]},
    Sonstiges: {price: [1, 10], quantity: [1, 3]},
  };

  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const makeItem = (category: keyof typeof itemNamesByCategory) => {
    const pricing = itemPricingByCategory[category];
    const quantity = randomInt(pricing.quantity[0], pricing.quantity[1]);
    const unitPrice = randomAmount(pricing.price[0], pricing.price[1]);

    return {
      name: pick(itemNamesByCategory[category]),
      categoryId: itemCategoryByName[category].id,
      quantity,
      unitPrice: toMoney(unitPrice),
      totalPrice: toMoney(quantity * unitPrice),
      warranty: null,
    };
  };

  const items = bills
    .map((bill) => {
      const supplier = supplierById.get(bill.supplierId)!;
      const categoriesForSupplier = itemCategoriesBySupplier[supplier.name] ?? ["Sonstiges"];
      const primaryCategory = primaryCategoryBySupplier[supplier.name];
      const extraItemCount = randomInt(0, categoriesForSupplier.length > 3 ? 5 : 1);

      const categories = [
        ...(primaryCategory ? [primaryCategory] : []),
        ...Array.from({length: primaryCategory ? extraItemCount : Math.max(1, extraItemCount)}, () =>
          pick(categoriesForSupplier),
        ),
      ];

      return categories.map((category) => ({billId: bill.id, ...makeItem(category)}));
    })
    .flat();

  await prisma.item.createMany({data: items});

  const totalsByBill = new Map<number, number>();
  for (const item of items) {
    totalsByBill.set(
      item.billId,
      (totalsByBill.get(item.billId) ?? 0) + Number(item.totalPrice),
    );
  }
  for (let index = 0; index < bills.length; index += 100) {
    await prisma.$transaction(
      bills.slice(index, index + 100).map((bill) =>
        prisma.bill.update({
          where: {id: bill.id},
          data: {totalAmount: toMoney(totalsByBill.get(bill.id) ?? 0)},
        }),
      ),
    );
  }

  const fileAssets = Array.from({length: MONTHS_TO_SEED * FILES_PER_MONTH}, (_, index) => {
    const bill = pick(bills);
    const date = bill.date;

    return {
      id: index + 1,
      originalName: `beleg-${bill.id}.pdf`,
      storedName: `seed-beleg-${bill.id}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: randomInt(80000, 900000),
      relativePath: `seed/invoices/${yyyymm(date)}/beleg-${bill.id}.pdf`,
      status: pick([
        FileStatusChoice.UPLOADED,
        FileStatusChoice.PROCESSING,
        FileStatusChoice.COMPLETED,
        FileStatusChoice.FAILED,
      ]),
      billId: bill.id,
    };
  });
  const contractFiles = contracts.map((contract, index) => ({
    id: fileAssets.length + index + 1,
    originalName: `vertrag-${contract.id}.pdf`,
    storedName: `seed-vertrag-${contract.id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: randomInt(120000, 1200000),
    relativePath: `seed/contracts/vertrag-${contract.id}.pdf`,
    status: FileStatusChoice.COMPLETED,
    contractId: contract.id,
  }));

  await prisma.fileAsset.createMany({data: [...fileAssets, ...contractFiles]});

  // Sample budgets — user-defined groups mixing item categories (variable) and a contract
  // category (fixed). Demonstrates cross-table membership so the page isn't empty after a seed.
  const itemCatId = (name: string) => lookups.itemCategories.find((c) => c.name === name)!.id;
  const contractCatId = (name: string) => lookups.contractCategories.find((c) => c.name === name)!.id;

  const budgetYear = new Date().getUTCFullYear();
  await prisma.budget.create({
    data: {
      name: "Lebensmittel & Haushalt",
      amount: 600,
      periodType: "MONTHLY",
      members: {
        create: ["Lebensmittel", "Getränke", "Haushalt", "Drogerie"].map((name) => ({itemCategoryId: itemCatId(name)})),
      },
    },
  });
  await prisma.budget.create({
    data: {
      name: "Auto & Mobilität",
      amount: 3600,
      periodType: "YEARLY",
      members: {
        create: [{itemCategoryId: itemCatId("Tanken")}, {contractCategoryId: contractCatId("Mobilität")}],
      },
    },
  });
  await prisma.budget.create({
    data: {
      name: "Sommerurlaub",
      amount: 1500,
      periodType: "RANGE",
      startDate: new Date(Date.UTC(budgetYear, 7, 1)),
      endDate: new Date(Date.UTC(budgetYear, 7, 14)),
      members: {create: [{itemCategoryId: itemCatId("Tanken")}, {itemCategoryId: itemCatId("Lebensmittel")}]},
    },
  });
  await prisma.budget.create({
    data: {
      name: "Weihnachten",
      amount: 400,
      periodType: "MONTH_OF_YEAR",
      anchorMonth: 12,
      members: {create: [{itemCategoryId: itemCatId("Sonstiges")}]},
    },
  });

  const counts = await Promise.all([
    prisma.frequency.count(),
    prisma.supplierCategory.count(),
    prisma.itemCategory.count(),
    prisma.contractCategory.count(),
    prisma.supplier.count(),
    prisma.contract.count(),
    prisma.bill.count(),
    prisma.item.count(),
    prisma.fileAsset.count(),
    prisma.incomeCategory.count(),
    prisma.incomeSource.count(),
    prisma.income.count(),
    prisma.budget.count(),
  ]);

  console.log(
    [
      `Seeded ${counts[0]} frequencies`,
      `${counts[1]} supplier categories`,
      `${counts[2]} item categories`,
      `${counts[3]} contract categories`,
      `${counts[4]} suppliers`,
      `${counts[5]} contracts`,
      `${counts[6]} bills`,
      `${counts[7]} items`,
      `${counts[8]} file assets`,
      `${counts[9]} income categories`,
      `${counts[10]} income sources`,
      `${counts[11]} incomes`,
      `${counts[12]} budgets`,
    ].join(", "),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
