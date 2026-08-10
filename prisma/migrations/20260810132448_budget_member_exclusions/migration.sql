-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BudgetMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "budgetId" INTEGER NOT NULL,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_BudgetMember" ("budgetId", "contractCategoryId", "id", "itemCategoryId", "supplierCategoryId", "supplierId", "tagId") SELECT "budgetId", "contractCategoryId", "id", "itemCategoryId", "supplierCategoryId", "supplierId", "tagId" FROM "BudgetMember";
DROP TABLE "BudgetMember";
ALTER TABLE "new_BudgetMember" RENAME TO "BudgetMember";
CREATE INDEX "BudgetMember_budgetId_idx" ON "BudgetMember"("budgetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
