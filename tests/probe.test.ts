import { describe, expect, it } from "vitest";
import { enqueue, parseHistoryLine, parseReading, shouldUpload, toUpload } from "@/lib/bluetooth/probe";

describe("probe reading", () => {
  it("parses moisture and raw", () => {
    expect(parseReading("24.5,1834")).toEqual({ moisturePct: 24.5, raw: 1834 });
    expect(parseReading(" 0 \n")).toEqual({ moisturePct: 0, raw: null });
    expect(parseReading("100,900")).toEqual({ moisturePct: 100, raw: 900 });
  });
  it("rejects garbage and impossible values", () => {
    for (const bad of ["", "abc", "101,1", "-1,1", ",5", "NaN"]) expect(parseReading(bad)).toBeNull();
  });
});

describe("probe history", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("turns an age into a timestamp", () => {
    const e = parseHistoryLine("5400,24.5", now);
    expect(e).not.toBe("END");
    expect(e && e !== "END" && e.timestamp.toISOString()).toBe("2026-11-20T10:30:00.000Z");
    expect(e && e !== "END" && e.moisturePct).toBe(24.5);
  });
  it("recognises the end marker and ignores bad lines", () => {
    expect(parseHistoryLine("END", now)).toBe("END");
    expect(parseHistoryLine("hello", now)).toBeNull();
    expect(parseHistoryLine("-5,20", now)).toBeNull();
    expect(parseHistoryLine("99999999,20", now)).toBeNull();
    expect(parseHistoryLine("60,140", now)).toBeNull();
  });
});

describe("upload helpers", () => {
  it("builds an upload reading with a rounded value and capped device id", () => {
    const u = toUpload(new Date("2026-11-20T12:00:00Z"), 24.5678, "x".repeat(100));
    expect(u.moisture_pct).toBe(24.6);
    expect(u.deviceId).toHaveLength(64);
    expect(u.source).toBe("sensor");
    expect(toUpload(new Date(), 10).deviceId).toBeUndefined();
  });
  it("keeps the newest readings when the offline queue is full", () => {
    const mk = (n: number) => toUpload(new Date(1_700_000_000_000 + n * 1000), 20);
    const q = enqueue([mk(1), mk(2)], [mk(3), mk(4)], 3);
    expect(q.map((r) => r.timestamp)).toEqual([mk(2), mk(3), mk(4)].map((r) => r.timestamp));
  });
  it("uploads live readings at most once a minute", () => {
    expect(shouldUpload(null, 1000)).toBe(true);
    expect(shouldUpload(1000, 30_000)).toBe(false);
    expect(shouldUpload(1000, 61_000)).toBe(true);
  });
});
