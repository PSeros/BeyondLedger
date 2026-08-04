-- CreateTable
CREATE TABLE "Budget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BudgetMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "budgetId" INTEGER NOT NULL,
    "itemCategoryId" INTEGER,
    "supplierCategoryId" INTEGER,
    "supplierId" INTEGER,
    "contractCategoryId" INTEGER,
    CONSTRAINT "BudgetMember_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "ItemCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_supplierCategoryId_fkey" FOREIGN KEY ("supplierCategoryId") REFERENCES "SupplierCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_contractCategoryId_fkey" FOREIGN KEY ("contractCategoryId") REFERENCES "ContractCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetOverride" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "budgetId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "BudgetOverride_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BudgetMember_budgetId_idx" ON "BudgetMember"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetOverride_budgetId_year_month_key" ON "BudgetOverride"("budgetId", "year", "month");
