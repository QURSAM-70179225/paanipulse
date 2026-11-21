/**
 * Where the farm is. At sign-up a farmer is often at home, not at his field, so the app starts from the district centre and asks him,
 * once, to save the spot when he is standing in his field. Weather (rain especially) and the authority map then use the real place.
 * Pure: no database, so it is unit-testable.
 */
import { DISTRICTS } from "./farmInput";

/** "district": only the district centre is known. "signup": picked on the map or by GPS during sign-up. "farm-gps": saved in the field. */
export type LocationSource = "district" | "signup" | "farm-gps";

/** Pakistan, roughly. A fix outside this box is a mistake (or a phone abroad). */
const PK = { latMin: 23.5, latMax: 37.2, lngMin: 60.8, lngMax: 77.9 };
/** A phone fix less precise than this is not good enough to mark a field. */
export const MAX_ACCURACY_M = 150;
/** A field is in or near its district: further than this from the district centre is almost certainly a wrong place. */
export const MAX_FROM_DISTRICT_KM = 120;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const districtCentre = (name: string) => DISTRICTS.find((d) => d.name === name) ?? null;

/** What the sign-up form sent: still the district centre, or a place the farmer picked. */
export function sourceAtSignup(district: string, lat: number, lng: number): LocationSource {
  const c = districtCentre(district);
  if (!c) return "signup";
  return Math.abs(c.lat - lat) < 0.001 && Math.abs(c.lng - lng) < 0.001 ? "district" : "signup";
}

export type FixVerdict = { ok: true } | { ok: false; reason: "outside" | "inaccurate" | "far" };

/** Is a phone's GPS fix good enough to become the farm's location? */
export function checkFix(fix: { lat: number; lng: number; accuracyM: number }, district: string): FixVerdict {
  if (fix.lat < PK.latMin || fix.lat > PK.latMax || fix.lng < PK.lngMin || fix.lng > PK.lngMax) return { ok: false, reason: "outside" };
  if (!(fix.accuracyM > 0) || fix.accuracyM > MAX_ACCURACY_M) return { ok: false, reason: "inaccurate" };
  const c = districtCentre(district);
  if (c && distanceKm(c, fix) > MAX_FROM_DISTRICT_KM) return { ok: false, reason: "far" };
  return { ok: true };
}

/** One SMS a week, while only the district centre is known. */
export const LOCATION_REMINDER_DAYS = 7;
export function locationReminderDue(f: { locationSource: string; lastLocationReminderAt: Date | null }, now: Date): boolean {
  if (f.locationSource !== "district") return false;
  return !f.lastLocationReminderAt || now.getTime() - f.lastLocationReminderAt.getTime() >= LOCATION_REMINDER_DAYS * 86_400_000;
}
