-- CreateTable
CREATE TABLE "SavingTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Saving" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EntryTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tagId" INTEGER NOT NULL,
    "billId" INTEGER,
    "itemId" INTEGER,
    "contractId" INTEGER,
    "incomeId" INTEGER,
    "savingId" INTEGER,
    CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "Income" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_savingId_fkey" FOREIGN KEY ("savingId") REFERENCES "Saving" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EntryTag" ("billId", "contractId", "id", "incomeId", "itemId", "tagId") SELECT "billId", "contractId", "id", "incomeId", "itemId", "tagId" FROM "EntryTag";
DROP TABLE "EntryTag";
ALTER TABLE "new_EntryTag" RENAME TO "EntryTag";
CREATE INDEX "EntryTag_billId_idx" ON "EntryTag"("billId");
CREATE INDEX "EntryTag_itemId_idx" ON "EntryTag"("itemId");
CREATE INDEX "EntryTag_contractId_idx" ON "EntryTag"("contractId");
CREATE INDEX "EntryTag_incomeId_idx" ON "EntryTag"("incomeId");
CREATE INDEX "EntryTag_savingId_idx" ON "EntryTag"("savingId");
CREATE UNIQUE INDEX "EntryTag_tagId_billId_key" ON "EntryTag"("tagId", "billId");
CREATE UNIQUE INDEX "EntryTag_tagId_itemId_key" ON "EntryTag"("tagId", "itemId");
CREATE UNIQUE INDEX "EntryTag_tagId_contractId_key" ON "EntryTag"("tagId", "contractId");
CREATE UNIQUE INDEX "EntryTag_tagId_incomeId_key" ON "EntryTag"("tagId", "incomeId");
CREATE UNIQUE INDEX "EntryTag_tagId_savingId_key" ON "EntryTag"("tagId", "savingId");
CREATE TABLE "new_FileAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "relativePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "billId" INTEGER,
    "contractId" INTEGER,
    "savingId" INTEGER,
    CONSTRAINT "FileAsset_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_savingId_fkey" FOREIGN KEY ("savingId") REFERENCES "Saving" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FileAsset" ("billId", "contractId", "createdAt", "id", "mimeType", "originalName", "relativePath", "sizeBytes", "status", "storedName", "updatedAt") SELECT "billId", "contractId", "createdAt", "id", "mimeType", "originalName", "relativePath", "sizeBytes", "status", "storedName", "updatedAt" FROM "FileAsset";
DROP TABLE "FileAsset";
ALTER TABLE "new_FileAsset" RENAME TO "FileAsset";
CREATE INDEX "FileAsset_billId_contractId_createdAt_idx" ON "FileAsset"("billId", "contractId", "createdAt" DESC);
CREATE INDEX "FileAsset_savingId_idx" ON "FileAsset"("savingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SavingTarget_name_key" ON "SavingTarget"("name");

-- CreateIndex
CREATE INDEX "Saving_targetId_frequencyId_createdAt_idx" ON "Saving"("targetId", "frequencyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Saving_workspaceId_createdAt_idx" ON "Saving"("workspaceId", "createdAt" DESC);
