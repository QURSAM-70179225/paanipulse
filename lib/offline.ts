/**
 * Offline support for patchy village internet. Everything here lives only on the farmer's phone:
 *  - a snapshot of the last advice (shown by /offline.html when there is no connection)
 *  - a queue of reports (pump hours) to send when the connection returns
 * public/offline.html reads the same keys with its own small script, so keep the key names in sync.
 */
export const SNAPSHOT_KEY = "pp_snapshot_v1";
export const QUEUE_KEY = "pp_queue_v1";
export const timerKey = (farmId: string) => `pp_timer_v1_${farmId}`;

export interface Snapshot {
  v: 1;
  farmId: string;
  savedAt: string;
  name: string;
  lang: "ur" | "en";
  kind: "irrigate" | "keep-off" | "skip-rain";
  hoursToday: number;
  daysUntilNext: number | null;
  tempC: number | null;
  tMax: number | null;
  tMin: number | null;
  rainTomorrowMm: number;
  texts: { ur: string; roman: string; en: string };
}

export interface QueuedReport { farmId: string; hours: number; daysAgo: number; add?: boolean; queuedAt: string }

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or private mode */
  }
};

export const saveSnapshot = (s: Snapshot) => write(SNAPSHOT_KEY, s);
export const loadSnapshot = () => read<Snapshot>(SNAPSHOT_KEY);

/** Remove everything stored on this phone (used on sign-out: phones are often shared). */
export function clearOffline() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("pp_snapshot") || k.startsWith("pp_queue") || k.startsWith("pp_timer")).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export const queuedReports = () => read<QueuedReport[]>(QUEUE_KEY) ?? [];
export const queueReport = (r: Omit<QueuedReport, "queuedAt">) => write(QUEUE_KEY, [...queuedReports(), { ...r, queuedAt: new Date().toISOString() }].slice(-50));

/** Send queued reports; keeps the ones that still fail. Returns how many were sent. */
export async function flushQueue(): Promise<number> {
  const queue = queuedReports();
  if (!queue.length) return 0;
  const left: QueuedReport[] = [];
  let sent = 0;
  for (const r of queue) {
    try {
      const res = await fetch(`/api/farms/${r.farmId}/hours`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours: r.hours, daysAgo: r.daysAgo, add: !!r.add }) });
      if (res.ok || (res.status >= 400 && res.status < 500)) sent += res.ok ? 1 : 0; // a 4xx will never succeed: drop it
      else left.push(r);
    } catch {
      left.push(r);
    }
  }
  write(QUEUE_KEY, left);
  return sent;
}
