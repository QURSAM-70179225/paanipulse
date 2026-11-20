import { afterEach, describe, expect, it, vi } from "vitest";
import { crossCheck, depletedFraction, isFresh, salinityLevel, soilLimits, soilStatus } from "@/lib/engine";
import { SoilReadingsSchema, soilBodyToArray } from "@/lib/services/soilIngest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

describe("soil limits and depleted fraction", () => {
  it("derives wilting point from the soil's available water capacity", () => {
    const l = soilLimits(140, 30);
    expect(l.fcPct).toBe(30);
    expect(l.pwpPct).toBe(16);
  });
  it("is 0 at field capacity, 1 at wilting point, and clamped outside", () => {
    expect(depletedFraction(30)).toBe(0);
    expect(depletedFraction(16)).toBe(1);
    expect(depletedFraction(40)).toBe(0);
    expect(depletedFraction(5)).toBe(1);
    expect(depletedFraction(23)).toBeCloseTo(0.5, 5);
  });
});

describe("soil status", () => {
  it("is dry once the readily available water (p) is used", () => {
    expect(soilStatus(0.55, 0.55)).toBe("dry");
    expect(soilStatus(0.8, 0.55)).toBe("dry");
  });
  it("is wet close to field capacity and ok in between", () => {
    expect(soilStatus(0.1, 0.55)).toBe("wet");
    expect(soilStatus(0.3, 0.55)).toBe("ok");
  });
});

describe("cross-check against the water-balance model", () => {
  it("agrees within the tolerance", () => {
    expect(crossCheck(0.4, 0.5)).toBe("agree");
    expect(crossCheck(0.4, 0.25)).toBe("agree");
  });
  it("says the sensor is wetter or drier when they differ by 0.2 or more", () => {
    expect(crossCheck(0.6, 0.2)).toBe("sensor-wetter");
    expect(crossCheck(0.2, 0.6)).toBe("sensor-drier");
  });
});

describe("freshness and salinity", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("treats readings up to 6 hours old as fresh", () => {
    expect(isFresh(new Date("2026-11-20T07:00:00Z"), now)).toBe(true);
    expect(isFresh(new Date("2026-11-20T05:00:00Z"), now)).toBe(false);
  });
  it("flags EC of 2 dS/m or more as high", () => {
    expect(salinityLevel(1.1)).toBe("normal");
    expect(salinityLevel(2)).toBe("high");
  });
});

describe("ingest validation", () => {
  const ok = { farmId: "karamat", moisture_pct: 24.5 };
  it("accepts one reading, an array, or { readings }", () => {
    for (const body of [ok, [ok], { readings: [ok] }]) {
      expect(SoilReadingsSchema.safeParse(soilBodyToArray(body)).success).toBe(true);
    }
  });
  it("defaults the source to sensor and leaves optional fields undefined", () => {
    const r = SoilReadingsSchema.parse([ok])[0];
    expect(r.source).toBe("sensor");
    expect(r.temperature_c).toBeUndefined();
    expect(r.timestamp).toBeUndefined();
  });
  it("treats null and empty strings as not measured, not as zero", () => {
    const r = SoilReadingsSchema.parse([{ ...ok, temperature_c: null, ec_ds_m: "", n_mg_kg: null }])[0];
    expect(r.temperature_c).toBeUndefined();
    expect(r.ec_ds_m).toBeUndefined();
    expect(r.n_mg_kg).toBeUndefined();
  });
  it("rejects impossible values and a missing farm", () => {
    expect(SoilReadingsSchema.safeParse([{ ...ok, moisture_pct: 140 }]).success).toBe(false);
    expect(SoilReadingsSchema.safeParse([{ ...ok, moisture_pct: -1 }]).success).toBe(false);
    expect(SoilReadingsSchema.safeParse([{ moisture_pct: 20 }]).success).toBe(false);
    expect(SoilReadingsSchema.safeParse([{ ...ok, temperature_c: 200 }]).success).toBe(false);
    expect(SoilReadingsSchema.safeParse([]).success).toBe(false);
  });
});

describe("POST /api/soil (checks that happen before the database)", () => {
  afterEach(() => {
    delete process.env.TELEMETRY_INGEST_KEY;
  });
  const post = async (body: string, headers: Record<string, string> = {}) => {
    const { POST } = await import("@/app/api/soil/route");
    return POST(new Request("http://x/api/soil", { method: "POST", headers: { "content-type": "application/json", ...headers }, body }));
  };
  it("rejects a wrong or missing ingest key when one is configured", async () => {
    process.env.TELEMETRY_INGEST_KEY = "secret";
    expect((await post(JSON.stringify([{ farmId: "f", moisture_pct: 20 }]))).status).toBe(401);
    expect((await post(JSON.stringify([{ farmId: "f", moisture_pct: 20 }]), { "x-ingest-key": "wrong" })).status).toBe(401);
  });
  it("answers 400 for invalid JSON or invalid readings", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post(JSON.stringify([{ farmId: "f", moisture_pct: 300 }]))).status).toBe(400);
  });
});
