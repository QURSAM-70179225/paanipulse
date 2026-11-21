import { describe, expect, it } from "vitest";
import { checkFix, distanceKm, locationReminderDue, sourceAtSignup } from "@/lib/services/farmLocation";
import { toInternational } from "@/lib/config/phone";

describe("farm location", () => {
  it("knows when sign-up only gave the district centre", () => {
    expect(sourceAtSignup("Sheikhupura", 31.71, 73.98)).toBe("district");
    expect(sourceAtSignup("Sheikhupura", 31.7432, 73.9512)).toBe("signup");
    expect(sourceAtSignup("Nowhere", 31.71, 73.98)).toBe("signup");
  });

  it("accepts a good GPS fix in the field", () => {
    expect(checkFix({ lat: 31.75, lng: 73.95, accuracyM: 12 }, "Sheikhupura")).toEqual({ ok: true });
  });

  it("refuses fixes outside Pakistan, too imprecise, or far from the district", () => {
    expect(checkFix({ lat: 51.5, lng: -0.12, accuracyM: 10 }, "Sheikhupura")).toEqual({ ok: false, reason: "outside" });
    expect(checkFix({ lat: 31.75, lng: 73.95, accuracyM: 900 }, "Sheikhupura")).toEqual({ ok: false, reason: "inaccurate" });
    expect(checkFix({ lat: 24.86, lng: 67.0, accuracyM: 10 }, "Sheikhupura")).toEqual({ ok: false, reason: "far" }); // Karachi
  });

  it("measures distance in km", () => {
    expect(Math.round(distanceKm({ lat: 31.52, lng: 74.36 }, { lat: 31.42, lng: 73.08 }))).toBeGreaterThan(115); // Lahore–Faisalabad
  });

  it("reminds once a week, only while the spot is the district centre", () => {
    const now = new Date("2026-11-21T09:00:00Z");
    expect(locationReminderDue({ locationSource: "district", lastLocationReminderAt: null }, now)).toBe(true);
    expect(locationReminderDue({ locationSource: "district", lastLocationReminderAt: new Date("2026-11-18T09:00:00Z") }, now)).toBe(false);
    expect(locationReminderDue({ locationSource: "district", lastLocationReminderAt: new Date("2026-11-13T09:00:00Z") }, now)).toBe(true);
    expect(locationReminderDue({ locationSource: "farm-gps", lastLocationReminderAt: null }, now)).toBe(false);
  });
});

describe("support phone numbers", () => {
  it("turns the usual Pakistani forms into one international form", () => {
    expect(toInternational("0300-1234567")).toBe("923001234567");
    expect(toInternational("+92 300 1234567")).toBe("923001234567");
    expect(toInternational("0092 300 1234567")).toBe("923001234567");
    expect(toInternational("923001234567")).toBe("923001234567");
    expect(toInternational("12345")).toBeNull();
    expect(toInternational(undefined)).toBeNull();
  });
});
