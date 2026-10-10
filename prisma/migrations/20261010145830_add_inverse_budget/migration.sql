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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" INTEGER NOT NULL,
    "isInverse" BOOLEAN NOT NULL DEFAULT false,
    "targetFromIncome" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Budget" ("amount", "anchorMonth", "createdAt", "endDate", "id", "name", "periodType", "startDate", "workspaceId") SELECT "amount", "anchorMonth", "createdAt", "endDate", "id", "name", "periodType", "startDate", "workspaceId" FROM "Budget";
DROP TABLE "Budget";
ALTER TABLE "new_Budget" RENAME TO "Budget";
CREATE INDEX "Budget_workspaceId_idx" ON "Budget"("workspaceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
