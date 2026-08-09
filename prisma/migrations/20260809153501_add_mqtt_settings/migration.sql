-- CreateTable
CREATE TABLE "MqttSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT NOT NULL DEFAULT '',
    "port" INTEGER NOT NULL DEFAULT 1883,
    "useTls" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL DEFAULT 'beyondledger',
    "topicPrefix" TEXT NOT NULL DEFAULT 'beyondledger',
    "discoveryPrefix" TEXT NOT NULL DEFAULT 'homeassistant',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "appUrl" TEXT NOT NULL DEFAULT '',
    "publishIntervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "updatedAt" DATETIME NOT NULL
);
