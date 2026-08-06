-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "activeWorkspaceId" INTEGER,
    "warrantyWarnDays" INTEGER NOT NULL DEFAULT 60,
    "upcomingWindowDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("activeWorkspaceId", "id", "locale", "updatedAt") SELECT "activeWorkspaceId", "id", "locale", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
