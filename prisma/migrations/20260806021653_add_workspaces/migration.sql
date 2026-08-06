/*
  Warnings:

  - Added the required column `workspaceId` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Income` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "activeWorkspaceId" INTEGER;

-- CreateTable
CREATE TABLE "Workspace" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the default "Shared" account (id 1). Existing Bill/Contract/Income/Budget rows are backfilled
-- to it below so the required workspaceId FK holds (hand-added — Prisma can't backfill a NOT NULL
-- column on a populated table).
INSERT INTO "Workspace" ("id", "name", "color") VALUES (1, 'Shared', '#14b8a6');

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" INTEGER NOT NULL,
    "documentNumber" TEXT,
    "totalAmount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL,
    "markdown" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    CONSTRAINT "Bill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bill_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bill" ("createdAt", "date", "documentNumber", "id", "markdown", "supplierId", "totalAmount", "updatedAt", "workspaceId") SELECT "createdAt", "date", "documentNumber", "id", "markdown", "supplierId", "totalAmount", "updatedAt", 1 FROM "Bill";
DROP TABLE "Bill";
ALTER TABLE "new_Bill" RENAME TO "Bill";
CREATE INDEX "Bill_supplierId_createdAt_idx" ON "Bill"("supplierId", "createdAt" DESC);
CREATE INDEX "Bill_workspaceId_createdAt_idx" ON "Bill"("workspaceId", "createdAt" DESC);
CREATE TABLE "new_Budget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "anchorMonth" INTEGER,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" INTEGER NOT NULL,
    CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Budget" ("amount", "anchorMonth", "createdAt", "endDate", "id", "name", "periodType", "startDate", "workspaceId") SELECT "amount", "anchorMonth", "createdAt", "endDate", "id", "name", "periodType", "startDate", 1 FROM "Budget";
DROP TABLE "Budget";
ALTER TABLE "new_Budget" RENAME TO "Budget";
CREATE INDEX "Budget_workspaceId_idx" ON "Budget"("workspaceId");
CREATE TABLE "new_Contract" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "documentNumber" TEXT,
    "totalAmount" DECIMAL NOT NULL,
    "frequencyId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "noticePeriod" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" INTEGER NOT NULL,
    CONSTRAINT "Contract_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContractCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_frequencyId_fkey" FOREIGN KEY ("frequencyId") REFERENCES "Frequency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contract" ("categoryId", "createdAt", "documentNumber", "endDate", "frequencyId", "id", "name", "noticePeriod", "startDate", "supplierId", "totalAmount", "workspaceId") SELECT "categoryId", "createdAt", "documentNumber", "endDate", "frequencyId", "id", "name", "noticePeriod", "startDate", "supplierId", "totalAmount", 1 FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";
CREATE INDEX "Contract_categoryId_supplierId_frequencyId_createdAt_idx" ON "Contract"("categoryId", "supplierId", "frequencyId", "createdAt" DESC);
CREATE INDEX "Contract_workspaceId_createdAt_idx" ON "Contract"("workspaceId", "createdAt" DESC);
CREATE TABLE "new_Income" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "frequencyId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    CONSTRAINT "Income_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IncomeSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Income_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IncomeCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Income_frequencyId_fkey" FOREIGN KEY ("frequencyId") REFERENCES "Frequency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Income_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Income" ("categoryId", "createdAt", "endDate", "frequencyId", "id", "name", "sourceId", "startDate", "totalAmount", "updatedAt", "workspaceId") SELECT "categoryId", "createdAt", "endDate", "frequencyId", "id", "name", "sourceId", "startDate", "totalAmount", "updatedAt", 1 FROM "Income";
DROP TABLE "Income";
ALTER TABLE "new_Income" RENAME TO "Income";
CREATE UNIQUE INDEX "Income_name_key" ON "Income"("name");
CREATE INDEX "Income_sourceId_categoryId_frequencyId_createdAt_idx" ON "Income"("sourceId", "categoryId", "frequencyId", "createdAt" DESC);
CREATE INDEX "Income_workspaceId_createdAt_idx" ON "Income"("workspaceId", "createdAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_name_key" ON "Workspace"("name");
