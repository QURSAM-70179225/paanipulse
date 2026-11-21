import { describe, expect, it } from "vitest";
import { batchToReadings, CODE_ALPHABET, makeCode, normalizeCode, pollSecondsFor, ProbeBatchSchema, PumpCheckInSchema, signalWord } from "@/lib/devices/code";

const fixedBytes = (vals: number[]) => () => Uint8Array.from(vals);

describe("device claim codes", () => {
  it("makes PP-XXXX-XXXX from the readable alphabet", () => {
    const code = makeCode(fixedBytes([0, 1, 2, 3, 4, 5, 6, 30]));
    expect(code).toBe(`PP-${CODE_ALPHABET.slice(0, 4)}-${CODE_ALPHABET.slice(4, 7)}${CODE_ALPHABET[30]}`);
    expect(code).toMatch(/^PP-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    expect(code).not.toMatch(/[01ILO]/);
  });

  it("accepts what a farmer types: lower case, spaces, no dashes, with or without PP", () => {
    expect(normalizeCode("pp-7k3q-9m2x")).toBe("PP-7K3Q-9M2X");
    expect(normalizeCode(" 7K3Q 9M2X ")).toBe("PP-7K3Q-9M2X");
    expect(normalizeCode("PP7K3Q9M2X")).toBe("PP-7K3Q-9M2X");
  });

  it("rejects things that cannot be a code", () => {
    expect(normalizeCode("")).toBeNull();
    expect(normalizeCode("PP-7K3Q")).toBeNull();
    expect(normalizeCode("PP-7K3Q-9M2X-AAAA")).toBeNull();
    expect(normalizeCode("PP-0K3Q-9M2X")).toBeNull(); // 0 is not used, so it is a typo
  });
});

describe("probe batch upload", () => {
  it("turns ages into times, so a probe needs no clock", () => {
    const parsed = ProbeBatchSchema.parse({ n: "2G", q: 9, r: [[0, 31.5], [900, 30.8, 24.1]] });
    const now = new Date("2026-11-21T10:00:00Z");
    const rows = batchToReadings(parsed, now);
    expect(rows[0]).toEqual({ timestamp: now, moisturePct: 31.5, temperatureC: null });
    expect(rows[1]).toEqual({ timestamp: new Date("2026-11-21T09:45:00Z"), moisturePct: 30.8, temperatureC: 24.1 });
  });

  it("accepts readings stored for up to a week while offline, and refuses bad values", () => {
    expect(ProbeBatchSchema.safeParse({ r: [[7 * 86_400, 20]] }).success).toBe(true);
    expect(ProbeBatchSchema.safeParse({ r: [[7 * 86_400 + 1, 20]] }).success).toBe(false);
    expect(ProbeBatchSchema.safeParse({ r: [[0, 120]] }).success).toBe(false);
    expect(ProbeBatchSchema.safeParse({ r: [[-5, 20]] }).success).toBe(false);
    expect(ProbeBatchSchema.safeParse({ r: [] }).success).toBe(false);
    expect(ProbeBatchSchema.safeParse({ n: "5G", r: [[0, 20]] }).success).toBe(false);
  });

  it("keeps the upload small for 2G: 48 readings are about 1 kB", () => {
    const body = JSON.stringify({ n: "2G", q: 9, r: Array.from({ length: 48 }, (_, i) => [i * 900, 25.4]) });
    expect(body.length).toBeLessThan(1100);
    expect(ProbeBatchSchema.safeParse(JSON.parse(body)).success).toBe(true);
  });
});

describe("pump box check-in", () => {
  it("needs the relay state; network and signal are optional", () => {
    expect(PumpCheckInSchema.safeParse({ on: false }).success).toBe(true);
    expect(PumpCheckInSchema.safeParse({ on: true, n: "3G", q: 12 }).success).toBe(true);
    expect(PumpCheckInSchema.safeParse({ n: "3G" }).success).toBe(false);
  });

  it("checks in faster while the pump runs, so a stop arrives quickly", () => {
    expect(pollSecondsFor(true)).toBeLessThan(pollSecondsFor(false));
  });
});

describe("signal words", () => {
  it("turns the modem's 0-31 into good, fair or weak", () => {
    expect(signalWord(20)).toBe("good");
    expect(signalWord(10)).toBe("fair");
    expect(signalWord(3)).toBe("weak");
    expect(signalWord(99)).toBeNull();
    expect(signalWord(null)).toBeNull();
  });
});
