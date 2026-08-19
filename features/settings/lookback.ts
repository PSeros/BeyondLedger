// Bounds for the Ø-baseline lookback preference (AppSettings.lookback*).
//
// Deliberately a NEUTRAL module — no "use client", no Prisma import — because both sides need these:
// the server action validates against them and the client form uses them for its input max/guard.
// Keeping them in features/settings/db/appSettings.ts would drag the Prisma client into the browser
// bundle (which is exactly what it did, and the build refused it).
//
// Ceilings, not correctness limits: the data horizon already truncates the average to the periods
// that actually hold records. These just stop a typo from spanning two centuries of chart windows.
export const MAX_LOOKBACK_WEEKS = 52;
export const MAX_LOOKBACK_MONTHS = 24;
export const MAX_LOOKBACK_YEARS = 10;
