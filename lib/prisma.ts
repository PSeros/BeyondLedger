import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";
import {PrismaClient} from "@/prisma/generated/client";

// Sqlite adapter.
// TRY-BRANCH(match-smart): this prototype branch is pinned to its OWN isolated database copy so
// comparing the budget-matching prototypes never mutates the real DB or collides with another
// branch's schema.
const databaseUrl = "file:./prisma/beyondledger-smart.db";

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