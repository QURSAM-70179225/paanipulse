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

import { parseTelemetryCsv } from "@/lib/services/telemetryCsv";
describe("telemetry CSV", () => {
  it("parses header + rows", () => {
    const rows = parseTelemetryCsv("pumpId,timestamp,power_kw,frequency_hz\nkaramat-pump,2026-11-18T07:00:00Z,8.2,42.1\r\nkaramat-pump,2026-11-18T07:05:00Z,8.6,42.9\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ pumpId: "karamat-pump", timestamp: "2026-11-18T07:05:00Z", power_kw: "8.6", frequency_hz: "42.9" });
  });
});

import { buildUrl } from "@/lib/services/weather";
describe("Open-Meteo URL", () => {
  it("uses the free host without a key and the customer host with one", () => {
    delete process.env.OPEN_METEO_API_KEY;
    const free = buildUrl(31.8, 74.26);
    expect(free).toContain("https://api.open-meteo.com/v1/forecast?");
    expect(free).toContain("et0_fao_evapotranspiration");
    expect(free).toContain("timezone=Asia%2FKarachi");
    expect(free).not.toContain("apikey");
    process.env.OPEN_METEO_API_KEY = "k123";
    expect(buildUrl(31.8, 74.26)).toMatch(/^https:\/\/customer-api\.open-meteo\.com\/v1\/forecast\?.*apikey=k123/);
    // A rejected key falls back to the free host without the key.
    const fallback = buildUrl(31.8, 74.26, { forceFree: true });
    expect(fallback).toContain("https://api.open-meteo.com/");
    expect(fallback).not.toContain("apikey");
    delete process.env.OPEN_METEO_API_KEY;
  });
});

import { parseCurrent } from "@/lib/services/weather";
describe("current weather", () => {
  it("reads temperature, feels-like, humidity, wind and weather code", () => {
    const c = parseCurrent({
      daily: { time: [], et0_fao_evapotranspiration: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [], shortwave_radiation_sum: [] },
      current: { time: "2026-11-19T11:15", temperature_2m: 22.4, apparent_temperature: 21.1, relative_humidity_2m: 48, wind_speed_10m: 9.3, weather_code: 3 },
    });
    expect(c).toEqual({ tempC: 22.4, feelsLikeC: 21.1, humidityPct: 48, windKmh: 9.3, code: 3, time: "2026-11-19T11:15" });
  });
  it("returns null when the response has no current block", () => {
    expect(parseCurrent({ daily: { time: [], et0_fao_evapotranspiration: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [], shortwave_radiation_sum: [] } })).toBeNull();
    expect(parseCurrent("garbage")).toBeNull();
  });
});

import { nextHours, parseHourlyPoints } from "@/lib/services/weather";
describe("hourly weather", () => {
  const json = {
    daily: { time: [], et0_fao_evapotranspiration: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [], shortwave_radiation_sum: [] },
    hourly: {
      time: ["2026-11-17T23:00", "2026-11-18T10:00", "2026-11-18T11:00", "2026-11-18T12:00"],
      shortwave_radiation: [0, 300, 400, 500],
      temperature_2m: [12, 19.4, 21.2, 22.6],
      relative_humidity_2m: [80, 55, 50, 47],
      wind_speed_10m: [3, 8.2, 9.1, 10],
      precipitation_probability: [0, 10, 20, 60],
    },
  };
  const now = new Date("2026-11-18T06:30:00Z"); // 11:30 in Pakistan
  it("keeps points from yesterday onwards with all four measurements", () => {
    const pts = parseHourlyPoints(json, now);
    expect(pts).toHaveLength(4);
    expect(pts[2]).toEqual({ time: "2026-11-18T11:00", tempC: 21.2, humidityPct: 50, windKmh: 9.1, rainChancePct: 20 });
  });
  it("drops points older than yesterday and returns [] without hourly weather fields", () => {
    expect(parseHourlyPoints({ ...json, hourly: { ...json.hourly, time: ["2026-11-10T10:00", ...json.hourly.time.slice(1)] } }, now)).toHaveLength(3);
    expect(parseHourlyPoints({ daily: json.daily }, now)).toEqual([]);
  });
  it("nextHours starts at the current local hour", () => {
    const next = nextHours(parseHourlyPoints(json, now), now, 24);
    expect(next.map((p) => p.time)).toEqual(["2026-11-18T11:00", "2026-11-18T12:00"]);
    expect(nextHours(undefined, now)).toEqual([]);
  });
  it("buildUrl asks for the hourly fields and honours a custom base URL", () => {
    delete process.env.OPEN_METEO_API_KEY;
    process.env.OPEN_METEO_BASE_URL = "http://localhost:4020/";
    const url = buildUrl(31.8, 74.26);
    expect(url.startsWith("http://localhost:4020/v1/forecast?")).toBe(true);
    expect(decodeURIComponent(url)).toContain("hourly=shortwave_radiation,temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability");
    delete process.env.OPEN_METEO_BASE_URL;
  });
});

import { dailySms, overrunSms } from "@/lib/services/smsText";
describe("SMS texts", () => {
  it("daily advice fits one 160-character SMS and uses only ASCII", () => {
    const keepOff = dailySms({ kind: "keep-off", hoursToday: 0, daysUntilNext: 39, rainTomorrowMm: 8.4 });
    expect(keepOff).toBe("PaaniPulse: Aaj pump band rakhein. Agla pani 6 hafte baad. Kal barish ka imkaan.");
    expect(dailySms({ kind: "irrigate", hoursToday: 4.5, daysUntilNext: 0, rainTomorrowMm: 0 })).toBe("PaaniPulse: Aaj pump 4.5 ghantay chalayen (dopahar mein).");
    expect(dailySms({ kind: "skip-rain", hoursToday: 0, daysUntilNext: 1, rainTomorrowMm: 9 })).toContain("kal barish");
    for (const t of [keepOff, overrunSms({ ranHours: 3.25, recommendedHours: 2 }), overrunSms({ ranHours: 0.5, recommendedHours: 0 })]) {
      expect(t.length).toBeLessThanOrEqual(160);
      expect(/^[\x20-\x7E]+$/.test(t)).toBe(true);
    }
  });
  it("over-run message tells the farmer to switch the pump off", () => {
    expect(overrunSms({ ranHours: 3.25, recommendedHours: 2 })).toContain("3.3 ghantay");
    expect(overrunSms({ ranHours: 3.25, recommendedHours: 2 })).toContain("pump band karein");
    expect(overrunSms({ ranHours: 1, recommendedHours: 0 })).toContain("zaroorat nahi");
  });
});

import { buildFromOpenWeather, owmToWmo } from "@/lib/services/openweather";
import { sampleWeather } from "@/lib/services/sampleWeather";
describe("OpenWeather backup provider", () => {
  const todayKey = "2026-11-19";
  const history = sampleWeather(new Date("2026-11-19T07:00:00Z")).filter((d) => d.date < todayKey);
  // 3-hourly entries from 14:00 Pakistan time on the 19th for 5 days
  const start = Date.UTC(2026, 10, 19, 9, 0) / 1000;
  const list = Array.from({ length: 40 }, (_, i) => {
    const hourLocal = (14 + i * 3) % 24;
    return {
      dt: start + i * 10800,
      main: { temp: 11 + 11 * Math.max(0, Math.sin((Math.PI * (hourLocal - 6)) / 14)), humidity: 60 },
      wind: { speed: 3 },
      clouds: { all: 20 },
      pop: i === 6 ? 0.8 : 0.1,
      rain: i === 6 ? { "3h": 4.2 } : undefined,
      weather: [{ id: 801 }],
    };
  });
  const out = buildFromOpenWeather({
    current: { dt: start - 1800, main: { temp: 22.4, feels_like: 21.2, humidity: 48 }, wind: { speed: 2.5 }, weather: [{ id: 804 }] },
    forecast: { list },
    lat: 31.8,
    history,
    todayKey,
  });
  it("maps current conditions: m/s → km/h, condition → code, local time", () => {
    expect(out.current.tempC).toBe(22.4);
    expect(out.current.windKmh).toBeCloseTo(9, 6);
    expect(out.current.code).toBe(3);
    expect(out.current.time).toBe("2026-11-19T13:30"); // 08:30 UTC + 5 h
  });
  it("interpolates the 3-hourly forecast to hourly points, starting at the current hour from the observation", () => {
    expect(out.hourly[0].time).toBe("2026-11-19T13:00");
    expect(out.hourly[0].tempC).toBe(22.4);
    expect(out.hourly[1].time).toBe("2026-11-19T14:00");
    expect(out.hourly).toHaveLength(1 + 39 * 3);
    expect(out.hourly[2].windKmh).toBeCloseTo(10.8, 6);
  });
  it("keeps history before today, then today and the forecast days, with estimated ET0 and radiation", () => {
    const dates = out.days.map((d) => d.date);
    expect(dates.slice(0, history.length)).toEqual(history.map((d) => d.date));
    expect(dates).toContain(todayKey);
    expect(dates).toEqual([...dates].sort());
    const today = out.days.find((d) => d.date === todayKey)!;
    expect(today.et0Mm).toBeGreaterThan(1);
    expect(today.et0Mm).toBeLessThan(4);
    expect(today.radiationMj).toBeGreaterThan(8);
    expect(today.radiationMj).toBeLessThan(17);
    expect(out.days.reduce((s, d) => s + d.precipMm, 0) - history.reduce((s, d) => s + d.precipMm, 0)).toBeCloseTo(4.2, 6);
  });
  it("maps OpenWeather condition ids to the UI's codes", () => {
    expect([owmToWmo(800), owmToWmo(802), owmToWmo(804), owmToWmo(500), owmToWmo(211), owmToWmo(741), owmToWmo(undefined)]).toEqual([0, 2, 3, 61, 95, 45, null]);
  });
});
