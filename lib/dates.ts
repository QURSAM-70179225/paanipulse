// Pakistan Standard Time is UTC+5 all year (no DST).
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the local (Asia/Karachi) day `offsetDays` from `now`, as a UTC Date. */
export function pktDayStart(offsetDays = 0, now: Date = new Date()): Date {
  const local = new Date(now.getTime() + PKT_OFFSET_MS);
  const localMidnightUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(localMidnightUtc - PKT_OFFSET_MS + offsetDays * DAY_MS);
}

/** "YYYY-MM-DD" for the Asia/Karachi local date of `d`. */
export function pktDateKey(d: Date): string {
  return new Date(d.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
