import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { cleanNickname, farmLabel, MAX_FARMS_PER_ACCOUNT } from "@/lib/services/farmLabel";
import { FarmCreate } from "@/lib/services/farmInput";

describe("farm nickname", () => {
  it("keeps ordinary names in any script, trimmed", () => {
    expect(cleanNickname("  North field ")).toBe("North field");
    expect(cleanNickname("شمالی کھیت")).toBe("شمالی کھیت");
    expect(cleanNickname("Field 2 (rice)")).toBe("Field 2 (rice)");
  });
  it("rejects empty, long and markup-like text", () => {
    for (const bad of ["", "   ", null, undefined, "a".repeat(41), "<b>x</b>", "x;y", "-start"]) expect(cleanNickname(bad as string | null | undefined)).toBeNull();
  });
  it("is part of the farm input and stored as none when unusable", () => {
    const base = { district: "Sheikhupura", lat: 31.7, lng: 73.98, cropType: "wheat", sowingDate: new Date(Date.now() - 86_400_000).toISOString(), areaAcres: 10, irrigationMethod: "flood", ratedKw: 11, pvKwp: 14, staticDepthFt: 90 };
    expect(FarmCreate.parse({ ...base, nickname: "North field" }).nickname).toBe("North field");
    expect(FarmCreate.parse(base).nickname).toBeNull();
    expect(FarmCreate.parse({ ...base, nickname: "<script>" }).nickname).toBeNull();
  });
});

describe("farm label", () => {
  const f = { nickname: null, district: "Narowal", cropType: "rice", variety: "Basmati-515" };
  it("uses the farmer's own name when there is one", () => {
    expect(farmLabel({ ...f, nickname: "North field" }, "en")).toBe("North field");
  });
  it("otherwise shows district, crop and variety, in the chosen language", () => {
    expect(farmLabel(f, "en")).toBe("Narowal · rice (Basmati-515)");
    expect(farmLabel({ ...f, variety: null }, "ur")).toBe("Narowal · چاول");
  });
  it("limits an account to 10 farms", () => {
    expect(MAX_FARMS_PER_ACCOUNT).toBe(10);
  });
});
