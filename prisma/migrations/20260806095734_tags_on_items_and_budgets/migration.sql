-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BudgetMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "budgetId" INTEGER NOT NULL,
    "itemCategoryId" INTEGER,
    "supplierCategoryId" INTEGER,
    "supplierId" INTEGER,
    "contractCategoryId" INTEGER,
    "tagId" INTEGER,
    CONSTRAINT "BudgetMember_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "ItemCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_supplierCategoryId_fkey" FOREIGN KEY ("supplierCategoryId") REFERENCES "SupplierCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_contractCategoryId_fkey" FOREIGN KEY ("contractCategoryId") REFERENCES "ContractCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetMember_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BudgetMember" ("budgetId", "contractCategoryId", "id", "itemCategoryId", "supplierCategoryId", "supplierId") SELECT "budgetId", "contractCategoryId", "id", "itemCategoryId", "supplierCategoryId", "supplierId" FROM "BudgetMember";
DROP TABLE "BudgetMember";
ALTER TABLE "new_BudgetMember" RENAME TO "BudgetMember";
CREATE INDEX "BudgetMember_budgetId_idx" ON "BudgetMember"("budgetId");
CREATE TABLE "new_EntryTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tagId" INTEGER NOT NULL,
    "billId" INTEGER,
    "itemId" INTEGER,
    "contractId" INTEGER,
    "incomeId" INTEGER,
    CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "Income" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EntryTag" ("billId", "contractId", "id", "incomeId", "tagId") SELECT "billId", "contractId", "id", "incomeId", "tagId" FROM "EntryTag";
DROP TABLE "EntryTag";
ALTER TABLE "new_EntryTag" RENAME TO "EntryTag";
CREATE INDEX "EntryTag_billId_idx" ON "EntryTag"("billId");
CREATE INDEX "EntryTag_itemId_idx" ON "EntryTag"("itemId");
CREATE INDEX "EntryTag_contractId_idx" ON "EntryTag"("contractId");
CREATE INDEX "EntryTag_incomeId_idx" ON "EntryTag"("incomeId");
CREATE UNIQUE INDEX "EntryTag_tagId_billId_key" ON "EntryTag"("tagId", "billId");
CREATE UNIQUE INDEX "EntryTag_tagId_itemId_key" ON "EntryTag"("tagId", "itemId");
CREATE UNIQUE INDEX "EntryTag_tagId_contractId_key" ON "EntryTag"("tagId", "contractId");
CREATE UNIQUE INDEX "EntryTag_tagId_incomeId_key" ON "EntryTag"("tagId", "incomeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
