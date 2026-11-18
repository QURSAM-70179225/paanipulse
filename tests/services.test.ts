import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseOpenMeteo } from "@/lib/services/weather";
import { advisoryText } from "@/lib/services/advisoryText";

describe("Open-Meteo parsing", () => {
  const json = {
    daily: {
      time: ["2026-11-18", "2026-11-19"],
      et0_fao_evapotranspiration: [2.0, null],
      precipitation_sum: [0, 5],
      temperature_2m_max: [24, 20],
      temperature_2m_min: [11, 10],
      shortwave_radiation_sum: [12.3, 6.1],
    },
    hourly: {
      time: ["2026-11-18T00:00", "2026-11-18T13:00"],
      shortwave_radiation: [0, 550],
    },
  };
  it("maps daily fields and drops days with missing ET0", () => {
    const days = parseOpenMeteo(json);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ date: "2026-11-18", et0Mm: 2, precipMm: 0, radiationMj: 12.3, tMax: 24 });
  });
  it("shifts preceding-hour radiation so index h covers h→h+1", () => {
    expect(parseOpenMeteo(json)[0].hourlyGhi?.[12]).toBe(550);
  });
  it("rejects malformed responses", () => {
    expect(() => parseOpenMeteo({ daily: {} })).toThrow();
  });
});

describe("advisory text", () => {
  const base = {
    crop: "wheat" as const, hoursToday: 0, totalHours: 0, daysUntilNext: 39, rainTomorrowMm: 8, yesterdayHours: 6,
    yesterdayNeededHours: 0, weekUreaKg: 5.3, weekSpareKwh: 120, weekWastedKwh: 101, surplusRsPerKwh: 20,
  };
  it("keep-off message uses only the numbers it is given", () => {
    const t = advisoryText({ ...base, kind: "keep-off" });
    expect(t.textRomanUrdu).toContain("Kal aap ne pump 6 ghantay chalaya");
    expect(t.textRomanUrdu).toContain("Aaj pump band rakhein");
    expect(t.textRomanUrdu).toContain("6 hafte baad");
    expect(t.textRomanUrdu).toContain("Kal barish");
    expect(t.textRomanUrdu).toContain("2,020 rupay");
    expect(t.textUrdu).toContain("آج پمپ بند رکھیں");
    expect(t.textEnglish).toContain("Keep the pump off today");
  });
  it("irrigate message gives hours and the remainder", () => {
    const t = advisoryText({ ...base, kind: "irrigate", hoursToday: 8, totalHours: 11.5, daysUntilNext: 0 });
    expect(t.textRomanUrdu).toContain("Aaj pump 8 ghantay chalayen");
    expect(t.textRomanUrdu).toContain("Baqi 3.5 ghantay kal");
  });
  it("skip-rain message", () => {
    expect(advisoryText({ ...base, kind: "skip-rain" }).textEnglish).toContain("rain is expected tomorrow");
  });
});

import { numbersGrounded, numbersIn } from "@/lib/services/llm";
import { detectIntent, detectScript } from "@/lib/services/chatTools";

describe("chat guardrails", () => {
  it("extracts numbers with thousands separators and decimals", () => {
    expect(numbersIn("About 444,500 litres and 8.4 mm; Rs 1,028")).toEqual([444500, 8.4, 1028]);
  });
  it("accepts numbers that appear in tool outputs, rejects invented ones", () => {
    const tool = JSON.stringify({ rainTomorrowMm: 8.4, rupeesToday: 1028, lostLitres: 444500 });
    expect(numbersGrounded("Kal 8.4 mm barish, Rs 1,028", [tool]).ok).toBe(true);
    const bad = numbersGrounded("You could earn Rs 2,028 today", [tool]);
    expect(bad.ok).toBe(false);
    expect(bad.ungrounded).toEqual([2028]);
  });
  it("allows small counts like '3 ideas'", () => {
    expect(numbersGrounded("Here are 3 ideas", ["{}"]).ok).toBe(true);
  });
  it("detects script and intent", () => {
    expect(detectScript("آج کتنے گھنٹے پمپ چلاؤں؟")).toBe("ur");
    expect(detectScript("kal barish hogi?")).toBe("roman");
    expect(detectScript("Will it rain tomorrow?")).toBe("en");
    expect(detectIntent("kal barish hogi?")).toBe("weather");
    expect(detectIntent("aaj kitne ghantay pump chalaun?")).toBe("advice");
    expect(detectIntent("fazil bijli se kya kamaun?")).toBe("savings");
  });
});
