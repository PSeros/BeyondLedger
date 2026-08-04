-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EntryTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tagId" INTEGER NOT NULL,
    "billId" INTEGER,
    "contractId" INTEGER,
    "incomeId" INTEGER,
    CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "Income" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "EntryTag_billId_idx" ON "EntryTag"("billId");

-- CreateIndex
CREATE INDEX "EntryTag_contractId_idx" ON "EntryTag"("contractId");

-- CreateIndex
CREATE INDEX "EntryTag_incomeId_idx" ON "EntryTag"("incomeId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryTag_tagId_billId_key" ON "EntryTag"("tagId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryTag_tagId_contractId_key" ON "EntryTag"("tagId", "contractId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryTag_tagId_incomeId_key" ON "EntryTag"("tagId", "incomeId");
