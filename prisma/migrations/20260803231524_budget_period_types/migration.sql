/*
  Warnings:

  - You are about to drop the column `month` on the `BudgetOverride` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `BudgetOverride` table. All the data in the column will be lost.
  - Added the required column `periodKey` to the `BudgetOverride` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Budget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "anchorMonth" INTEGER,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Budget" ("amount", "createdAt", "id", "name") SELECT "amount", "createdAt", "id", "name" FROM "Budget";
DROP TABLE "Budget";
ALTER TABLE "new_Budget" RENAME TO "Budget";
CREATE TABLE "new_BudgetOverride" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "budgetId" INTEGER NOT NULL,
    "periodKey" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "BudgetOverride_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BudgetOverride" ("amount", "budgetId", "id") SELECT "amount", "budgetId", "id" FROM "BudgetOverride";
DROP TABLE "BudgetOverride";
ALTER TABLE "new_BudgetOverride" RENAME TO "BudgetOverride";
CREATE UNIQUE INDEX "BudgetOverride_budgetId_periodKey_key" ON "BudgetOverride"("budgetId", "periodKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
