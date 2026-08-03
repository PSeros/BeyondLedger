-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "updatedAt" DATETIME NOT NULL
);
