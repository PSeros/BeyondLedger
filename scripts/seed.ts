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
const ONE_OFF_BILLS_PER_MONTH = 24;
const PROJECT_INCOMES_PER_MONTH = 8;
const FILES_PER_MONTH = 7;
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

  const supplierCategories = await prisma.supplierCategory.createManyAndReturn({
    data: ["Software", "Utilities", "Office", "Hardware", "Travel", "Services"].map(
      (name) => ({name}),
    ),
  });
  const itemCategories = await prisma.itemCategory.createManyAndReturn({
    data: [
      "Subscriptions",
      "Utilities",
      "Hardware",
      "Supplies",
      "Services",
      "Travel",
      "Marketing",
    ].map((name) => ({name})),
  });
  const contractCategories = await prisma.contractCategory.createManyAndReturn({
    data: [
      "Software licenses",
      "Utilities",
      "Office services",
      "Insurance",
      "Professional services",
    ].map((name) => ({name})),
  });
  const incomeCategories = await prisma.incomeCategory.createManyAndReturn({
    data: ["Client work", "Salary", "Reimbursement", "Referral", "Product sales"].map(
      (name) => ({name}),
    ),
  });
  const incomeSources = await prisma.incomeSource.createManyAndReturn({
    data: [
      "Payroll",
      "Acme GmbH",
      "Globex AG",
      "Initech",
      "Umbrella Studio",
      "Partner Network",
      "Online Store",
    ].map((name) => ({name})),
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

  const supplierBlueprints = [
    ["Notion Labs", "Software"],
    ["CloudHost Europe", "Software"],
    ["Figma", "Software"],
    ["Linear", "Software"],
    ["Berlin Utility Co", "Utilities"],
    ["City Waterworks", "Utilities"],
    ["Office Depot", "Office"],
    ["Print & Paper GmbH", "Office"],
    ["ErgoDesk Supply", "Hardware"],
    ["Laptop World", "Hardware"],
    ["Rail Europe", "Travel"],
    ["Lufthansa", "Travel"],
    ["Search Ads Central", "Services"],
    ["Tax Advisory Partners", "Services"],
    ["Courier24", "Services"],
    ["SecureIT", "Services"],
  ];
  const supplierCategoryIdByName = Object.fromEntries(
    lookups.supplierCategories.map((category) => [category.name, category.id]),
  );
  const suppliers = await prisma.supplier.createManyAndReturn({
    data: supplierBlueprints.map(([name, category]) => ({
      name,
      categoryId: supplierCategoryIdByName[category],
    })),
  });

  const contractCategoryIdByName = Object.fromEntries(
    lookups.contractCategories.map((category) => [category.name, category.id]),
  );
  const contracts = await prisma.contract.createManyAndReturn({
    data: suppliers.slice(0, 12).map((supplier, index) => {
      const startDate = monthDate(randomInt(0, 8), 1);
      const categoryName = pick([
        "Software licenses",
        "Utilities",
        "Office services",
        "Insurance",
        "Professional services",
      ]);

      return {
        name: `${supplier.name} ${categoryName}`,
        categoryId: contractCategoryIdByName[categoryName],
        supplierId: supplier.id,
        documentNumber: `CTR-${supplier.id}-${startDate.getUTCFullYear()}`,
        totalAmount: toMoney(randomAmount(80, 2800)),
        frequencyId: pick([
          frequencyByName.Monthly.id,
          frequencyByName.Quarterly.id,
          frequencyByName.Yearly.id,
        ]),
        startDate,
        endDate: index % 5 === 0 ? addMonths(startDate, randomInt(18, 42)) : null,
        noticePeriod: pick([30, 60, 90]),
      };
    }),
  });

  const salary = lookups.incomeCategories.find((category) => category.name === "Salary")!;
  const payroll = lookups.incomeSources.find((source) => source.name === "Payroll")!;
  await prisma.income.createMany({
    data: [
      {
        name: "Monthly payroll",
        sourceId: payroll.id,
        categoryId: salary.id,
        totalAmount: "5200.00",
        frequencyId: frequencyByName.Monthly.id,
        startDate: START_DATE,
      },
      ...Array.from({length: MONTHS_TO_SEED * PROJECT_INCOMES_PER_MONTH}, (_, index) => {
        const date = monthDate(Math.floor(index / PROJECT_INCOMES_PER_MONTH));
        const source = pick(lookups.incomeSources.filter((item) => item.id !== payroll.id));
        const category = pick(
          lookups.incomeCategories.filter((item) => item.id !== salary.id),
        );

        return {
          name: `${source.name} ${category.name} ${yyyymm(date)}-${index}`,
          sourceId: source.id,
          categoryId: category.id,
          totalAmount: toMoney(randomAmount(180, 14500)),
          frequencyId: frequencyByName["One-time"].id,
          startDate: date,
          endDate: Math.random() > 0.7 ? monthDate(Math.floor(index / PROJECT_INCOMES_PER_MONTH), randomInt(15, 28)) : null,
        };
      }),
    ],
  });

  const recurringBillSuppliers = suppliers.slice(0, 8);
  const billRows = Array.from({length: MONTHS_TO_SEED}, (_, month) => {
    const recurring = recurringBillSuppliers.map((supplier) => {
      const date = monthDate(month, randomInt(1, 15));

      return {
        supplierId: supplier.id,
        documentNumber: `INV-${supplier.id}-${yyyymm(date)}`,
        totalAmount: "0.00",
        date,
        markdown: `Generated recurring invoice from ${supplier.name}.`,
      };
    });
    const oneOff = Array.from({length: ONE_OFF_BILLS_PER_MONTH}, (_, index) => {
      const supplier = pick(suppliers);
      const date = monthDate(month);

      return {
        supplierId: supplier.id,
        documentNumber: `INV-${supplier.id}-${yyyymm(date)}-${index + 1}`,
        totalAmount: "0.00",
        date,
        markdown: `Generated ${pick(["office", "operations", "project", "travel"])} expense.`,
      };
    });

    return [...recurring, ...oneOff];
  }).flat();

  const bills = await prisma.bill.createManyAndReturn({data: billRows});
  const itemNamesByCategory = {
    Hardware: ["Monitor", "Laptop dock", "Keyboard", "Headset", "SSD upgrade"],
    Marketing: ["Search campaign", "Design assets", "Landing page copy"],
    Services: ["Consulting", "Accounting", "Support package", "Legal review"],
    Subscriptions: ["Business seats", "Cloud storage", "API usage", "SaaS plan"],
    Supplies: ["Printer paper", "Pens", "Notebooks", "Packaging"],
    Travel: ["Train ticket", "Hotel", "Taxi", "Flight"],
    Utilities: ["Electricity", "Heating", "Water", "Internet"],
  };
  const categories = Object.keys(itemNamesByCategory) as Array<
    keyof typeof itemNamesByCategory
  >;

  const items = bills
    .map((bill) => {
      const itemCount = randomInt(1, 5);

      return Array.from({length: itemCount}, () => {
        const category = pick(categories);
        const quantity = randomInt(1, category === "Subscriptions" ? 25 : 8);
        const unitPrice = randomAmount(4, category === "Hardware" ? 1800 : 450);

        return {
          billId: bill.id,
          name: pick(itemNamesByCategory[category]),
          categoryId: itemCategoryByName[category].id,
          quantity,
          unitPrice: toMoney(unitPrice),
          totalPrice: toMoney(quantity * unitPrice),
          warranty: category === "Hardware" ? pick([12, 24, 36]) : null,
        };
      });
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
      originalName: `invoice-${bill.id}.pdf`,
      storedName: `seed-invoice-${bill.id}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: randomInt(80000, 900000),
      relativePath: `seed/invoices/${yyyymm(date)}/invoice-${bill.id}.pdf`,
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
    originalName: `contract-${contract.id}.pdf`,
    storedName: `seed-contract-${contract.id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: randomInt(120000, 1200000),
    relativePath: `seed/contracts/contract-${contract.id}.pdf`,
    status: FileStatusChoice.COMPLETED,
    contractId: contract.id,
  }));

  await prisma.fileAsset.createMany({data: [...fileAssets, ...contractFiles]});

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
