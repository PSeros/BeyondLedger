-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "activeWorkspaceId" INTEGER,
    "warrantyWarnDays" INTEGER NOT NULL DEFAULT 60,
    "upcomingWindowDays" INTEGER NOT NULL DEFAULT 30,
    "lookbackWeeks" INTEGER NOT NULL DEFAULT 8,
    "lookbackMonths" INTEGER NOT NULL DEFAULT 6,
    "lookbackYears" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("activeWorkspaceId", "id", "locale", "upcomingWindowDays", "updatedAt", "warrantyWarnDays") SELECT "activeWorkspaceId", "id", "locale", "upcomingWindowDays", "updatedAt", "warrantyWarnDays" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
