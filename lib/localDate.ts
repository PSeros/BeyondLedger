// Today as yyyy-mm-dd in the local calendar. toISOString() would give the UTC date, which is still
// yesterday between midnight and the UTC offset (00:00–02:00 in Germany in summer).
export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
