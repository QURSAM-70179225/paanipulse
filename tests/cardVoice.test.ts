import { describe, expect, it } from "vitest";
import { cardScripts, spokenAmount, VOICE_PICKED, type VoiceScript } from "@/lib/services/cardVoice";
import type { FarmState } from "@/lib/services/farmState";

const GURMUKHI = /[਀-੿]/;
const ARABIC = /[؀-ۿ]/;

function farm(over: { kind?: "irrigate" | "keep-off" | "skip-rain"; actual?: number; needed?: number; overPct?: number; rainTomorrow?: number } = {}) {
  const kind = over.kind ?? "irrigate";
  return {
    advisory: { textUrdu: "", textRomanUrdu: "", textEnglish: "" },
    pump: { calibrated: false },
    surplusRsPerKwh: 20,
    yesterday: { actualHours: over.actual ?? 6, neededHours: over.needed ?? 0, pumpedM3: 120 },
    weatherNow: { tempC: 31.4 },
    forecast: [
      { tMax: 36, tMin: 22, precipMm: 0 },
      { tMax: 35, tMin: 21, precipMm: over.rainTomorrow ?? 0 },
      { tMax: 34, tMin: 20, precipMm: 0 },
    ],
    week: { overNeedPct: over.overPct ?? 40, excessM3: 300, ureaKg: 4.6, ureaRs: 1250, wastedKwh: 90 },
    today: {
      advice: { kind, hoursToday: 4, totalHours: 6, daysUntilNext: kind === "irrigate" ? null : 5 },
      cropUseM3: 76.911,
      flowRange: { low: 9.119, mid: 11, high: 13.679 },
      pumpableHours: 6,
      pvKwh: 28,
      output: { mid: { litresPerMin: 183, kanalPerHour: 1.6, hoursPerAcre: 5.1 }, low: {}, high: {}, depthMm: 75 },
      todaySpareKwh: 12,
      todaySpareIdeas: [{ id: "battery", labelUr: "بیٹری چارجنگ", labelEn: "Battery charging", rs: 240 }],
    },
  } as unknown as FarmState;
}

const each = (s: VoiceScript) => [s.ur, s.urRoman, s.en, s.pa, s.paRoman];

describe("card voice notes", () => {
  it("says amounts the way a farmer would", () => {
    expect(spokenAmount(76_911, "ur")).toBe("77 ہزار");
    expect(spokenAmount(76_911, "en")).toBe("77 thousand");
    expect(spokenAmount(150_000, "pa")).toBe("1.5 ਲੱਖ");
    expect(spokenAmount(200_000, "urRoman")).toBe("2 lakh");
    expect(spokenAmount(640, "en")).toBe("640");
  });

  it("gives every card all five versions, in the right script", () => {
    const all = cardScripts(farm());
    for (const script of Object.values(all)) {
      if (!script) continue;
      for (const text of each(script)) expect(text.trim().length).toBeGreaterThan(10);
      expect(script.pa).toMatch(GURMUKHI);
      expect(script.ur).toMatch(ARABIC);
      expect(script.urRoman).not.toMatch(ARABIC);
      expect(script.paRoman).not.toMatch(GURMUKHI);
    }
    for (const text of each(VOICE_PICKED)) expect(text.length).toBeGreaterThan(10);
  });

  it("ends the advice with what to do", () => {
    expect(cardScripts(farm()).advice!.en).toContain("run the pump for 4 hours");
    expect(cardScripts(farm()).advice!.en).toContain("rest of the water tomorrow");
    const off = cardScripts(farm({ kind: "keep-off" })).advice!;
    expect(off.en).toContain("Keep the pump off");
    expect(off.en).toContain("about 5 days");
    expect(off.pa).toContain("ਬੰਦ ਰੱਖੋ");
  });

  it("uses the engine's own advisory for Urdu and English when there is one", () => {
    const s = farm();
    (s.advisory as { textUrdu: string; textEnglish: string }).textUrdu = "آج پمپ چلائیں";
    (s.advisory as { textUrdu: string; textEnglish: string }).textEnglish = "Run the pump";
    const a = cardScripts(s).advice!;
    expect(a.ur).toBe("آج پمپ چلائیں");
    expect(a.en).toBe("Run the pump");
    expect(a.pa).toMatch(GURMUKHI);
  });

  it("praises a good week and flags waste in a bad one", () => {
    expect(cardScripts(farm({ overPct: 2 })).week!.en).toContain("Well done");
    const bad = cardScripts(farm({ overPct: 40 })).week!.en;
    expect(bad).toContain("40 percent more");
    expect(bad).toContain("1 thousand rupees"); // 1,250 Rs of urea, rounded for the ear
  });

  it("tells the farmer about yesterday's over-pumping", () => {
    expect(cardScripts(farm({ actual: 6, needed: 0 })).yesterday!.en).toContain("did not need any water");
    expect(cardScripts(farm({ actual: 3, needed: 4 })).yesterday!.en).toContain("Well done");
  });

  it("reads tomorrow's rain into the today and weather cards", () => {
    expect(cardScripts(farm({ rainTomorrow: 5 })).today!.en).toContain("Rain is likely tomorrow");
    expect(cardScripts(farm({ rainTomorrow: 5 })).weather!.en).toContain("Rain is expected tomorrow");
    expect(cardScripts(farm()).weather!.en).toContain("No rain is expected in the next seven days");
  });
});
