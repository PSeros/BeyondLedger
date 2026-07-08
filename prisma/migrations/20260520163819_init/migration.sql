/*
  Warnings:

  - Added the required column `value` to the `Frequency` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Frequency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL
);
INSERT INTO "new_Frequency" ("id", "isRecurring", "name") SELECT "id", "isRecurring", "name" FROM "Frequency";
DROP TABLE "Frequency";
ALTER TABLE "new_Frequency" RENAME TO "Frequency";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
