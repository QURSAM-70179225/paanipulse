import { describe, expect, it } from "vitest";
import { fieldFilled, FRESH_MINUTES, type MoistureSample } from "@/lib/engine";

const now = new Date("2026-11-20T12:00:00Z");
const at = (minAgo: number) => new Date(now.getTime() - minAgo * 60_000);
const s = (...pairs: [number, number][]): MoistureSample[] => pairs.map(([m, pct]) => ({ at: at(m), pct }));
// Loam limits: field capacity 30 %, wilting point 16 %: "full" means 30 − 0.15 × 14 = 27.9 % or more.

describe("field filled (enough water has reached the probe)", () => {
  it("fires when the soil was dry, got wetter, and the last two readings are near field capacity", () => {
    const r = fieldFilled(s([150, 19], [90, 22], [30, 28.5], [10, 29]), now);
    expect(r).toEqual({ filled: true, reason: "filled" });
  });
  it("needs at least two readings", () => {
    expect(fieldFilled(s([5, 29]), now).reason).toBe("too-few");
    expect(fieldFilled([], now).reason).toBe("too-few");
  });
  it("ignores old data, so back-filled history never alerts", () => {
    expect(fieldFilled(s([300, 19], [250, 28.5], [240, 29]), now).reason).toBe("stale");
    expect(fieldFilled(s([150, 19], [60, 28.5], [FRESH_MINUTES + 5, 29]), now).reason).toBe("stale");
  });
  it("does not fire until both of the last two readings are near field capacity", () => {
    expect(fieldFilled(s([150, 19], [30, 22], [10, 29]), now).reason).toBe("not-full");
    expect(fieldFilled(s([150, 19], [30, 29], [10, 25]), now).reason).toBe("not-full");
  });
  it("does not fire for soil that was already wet (no rise)", () => {
    expect(fieldFilled(s([150, 28.5], [90, 28.8], [30, 29], [10, 29.2]), now).reason).toBe("no-rise");
  });
  it("a rise of at least 3 points within 3 hours is required, older lows do not count", () => {
    expect(fieldFilled(s([400, 18], [170, 28.5], [60, 28.8], [10, 29]), now).reason).toBe("no-rise");
    expect(fieldFilled(s([170, 25.5], [60, 28.5], [10, 29]), now).filled).toBe(true);
  });
  it("is not confused by readings that arrive out of order", () => {
    expect(fieldFilled(s([10, 29], [150, 19], [30, 28.5], [90, 22]), now).filled).toBe(true);
  });
});
