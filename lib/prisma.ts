import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";
import {PrismaClient} from "@/prisma/generated/client";

// Sqlite adapter
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});


// Prisma client with caching
const clientCache = globalThis as unknown as {
  client?: PrismaClient;
}

export const client = clientCache.client ?? new PrismaClient({adapter});

if (process.env.NODE_ENV !== "production") {
  clientCache.client = client;
}