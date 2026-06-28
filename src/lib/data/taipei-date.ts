/**
 * Returns today's date in Asia/Taipei timezone as YYYY-MM-DD.
 *
 * Always use this for decision_date comparisons and writes.
 * DO NOT use new Date().toISOString().split("T")[0] — that is UTC and will
 * be off by one day between 00:00–08:00 Taiwan time.
 */
export function taipeiDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(date);
}
