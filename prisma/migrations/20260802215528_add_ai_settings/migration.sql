-- CreateTable
CREATE TABLE "AiSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT NOT NULL DEFAULT '',
    "baseUrl" TEXT,
    "ocrModel" TEXT NOT NULL DEFAULT 'mistral-ocr-latest',
    "extractModel" TEXT NOT NULL DEFAULT 'mistral-small-latest',
    "pipelineMode" TEXT NOT NULL DEFAULT 'DOCUMENT_AI',
    "updatedAt" DATETIME NOT NULL
);
