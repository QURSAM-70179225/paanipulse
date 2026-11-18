import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
import { AuthorityQuery, farmRef, toCsv, type AuthorityData } from "@/lib/services/authority";

describe("authority helpers", () => {
  it("farm references are stable, anonymous and district-coded", () => {
    expect(farmRef("karamat", "Sheikhupura")).toMatch(/^SKP-[0-9A-F]{4}$/);
    expect(farmRef("karamat", "Sheikhupura")).toBe(farmRef("karamat", "Sheikhupura"));
    expect(farmRef("karamat", "Sheikhupura")).not.toContain("karamat");
  });
  it("validates filters", () => {
    expect(AuthorityQuery.parse({}).days).toBe(7);
    expect(AuthorityQuery.safeParse({ days: "5" }).success).toBe(false);
    expect(AuthorityQuery.safeParse({ crop: "banana" }).success).toBe(false);
  });
  it("CSV has a header and escapes commas/quotes", () => {
    const d = {
      window: { days: 7 },
      farms: [{ ref: "SKP-0001", district: "Sheikhupura", tehsil: 'Muridke, "East"', crop: "wheat", areaAcres: 12.5, lat: 31.8, lng: 74.26, pumpedM3: 974.2, needM3: 529.8, excessM3: 444.4, excessPct: 45.6, overNeedPct: 83.9, intensity: 11.1, wastedKwh: 101.4, synthetic: false }],
    } as unknown as AuthorityData;
    const [header, row] = toCsv(d).trim().split("\n");
    expect(header.split(",")[0]).toBe("farm_ref");
    expect(row).toContain('"Muridke, ""East"""');
    expect(row).toContain(",974,530,444,");
  });
});
