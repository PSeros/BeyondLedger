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


// Prisma client with caching.
//
// The cache is UNCONDITIONAL (it used to be dev-only, to survive HMR). Production needs it too:
// instrumentation.ts is compiled as its own bundle graph, separate from the route/action bundles,
// so this module is evaluated twice per process — without the global we would open two
// PrismaClients and two better-sqlite3 handles on the same file.
const clientCache = globalThis as unknown as {
  client?: PrismaClient;
}

export const client = clientCache.client ?? new PrismaClient({adapter});

clientCache.client = client;