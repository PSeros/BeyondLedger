-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Saving" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "isOpening" BOOLEAN NOT NULL DEFAULT false,
    "frequencyId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    CONSTRAINT "Saving_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SavingTarget" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Saving_frequencyId_fkey" FOREIGN KEY ("frequencyId") REFERENCES "Frequency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Saving_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Saving" ("createdAt", "endDate", "frequencyId", "id", "name", "startDate", "targetId", "totalAmount", "updatedAt", "workspaceId") SELECT "createdAt", "endDate", "frequencyId", "id", "name", "startDate", "targetId", "totalAmount", "updatedAt", "workspaceId" FROM "Saving";
DROP TABLE "Saving";
ALTER TABLE "new_Saving" RENAME TO "Saving";
CREATE INDEX "Saving_targetId_frequencyId_createdAt_idx" ON "Saving"("targetId", "frequencyId", "createdAt" DESC);
CREATE INDEX "Saving_workspaceId_createdAt_idx" ON "Saving"("workspaceId", "createdAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
