/**
 * Tools exposed to the LLM. Every number the assistant may say comes from here (computed by the engine).
 * Also used by the offline fallback answerer.
 */
import type { FarmState } from "./farmState";
import { CROP_NAMES } from "./advisoryText";

const r0 = (x: number) => Math.round(x);
const r1 = (x: number) => Math.round(x * 10) / 10;
const litres = (m3: number) => Math.round((m3 * 1000) / 100) * 100;

export const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "getTodayAdvice",
      description: "Today's pump recommendation (run or keep off, how many hours, when the next irrigation is due) and yesterday's pumping vs need. Use for 'kitne ghantay pump chalaun', 'pani kab dena hai', 'kitna pani dun'.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getWeatherForecast",
      description: "7-day weather forecast for the farm: rain (mm), max/min temperature. Use for questions about rain or weather.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getWeeklySummary",
      description: "Last 7 days: water pumped vs what the crop needed, water lost/wasted below the roots, hours run vs recommended. Use for 'is hafte kitna pani zaya hua', 'waste'.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSavings",
      description: "Money, spare/extra solar electricity and fertiliser: spare solar kWh today with income ideas and rupees (e.g. e-rickshaw charging), solar energy wasted on extra water this week and what it could have earned, urea/khaad washed away. Use for questions like 'fazil/faltu bijli se kya kamaun', 'kamai', 'paisay', 'khaad', 'urea', 'earn', 'save money'.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

export type ToolName = (typeof TOOL_DEFS)[number]["function"]["name"];

function nextText(days: number | null) {
  if (days === null) return null;
  if (days > 14) {
    const w = Math.round(days / 7);
    return { en: `in about ${w} weeks`, roman: `taqreeban ${w} hafte baad`, ur: `تقریباً ${w} ہفتے بعد` };
  }
  return { en: `in about ${days} days`, roman: `taqreeban ${days} din baad`, ur: `تقریباً ${days} دن بعد` };
}

export function runTool(name: string, s: FarmState): Record<string, unknown> {
  const a = s.today.advice;
  switch (name) {
    case "getTodayAdvice": {
      const h = a.hoursToday;
      const instruction =
        a.kind === "irrigate"
          ? { en: `Run the pump ${h} hours today, around midday.`, roman: `Aaj pump ${h} ghantay chalayen, dopahar ke waqt.`, ur: `آج پمپ ${h} گھنٹے چلائیں، دوپہر کے وقت۔` }
          : a.kind === "skip-rain"
            ? { en: "Do not run the pump today; rain is expected tomorrow.", roman: "Aaj pump na chalayen, kal barish ho sakti hai.", ur: "آج پمپ نہ چلائیں، کل بارش ہو سکتی ہے۔" }
            : { en: "Keep the pump off today; the soil has enough moisture.", roman: "Aaj pump band rakhein, zameen mein nami kafi hai.", ur: "آج پمپ بند رکھیں، زمین میں نمی کافی ہے۔" };
      return {
        crop: CROP_NAMES[s.farm.crop],
        daysSinceSowing: s.today.daysSinceSowing,
        decision: a.kind,
        pumpHoursToday: h,
        totalHoursThisIrrigation: a.totalHours,
        instruction,
        nextIrrigation: a.kind === "irrigate" ? null : nextText(a.daysUntilNext),
        cropWaterUseTodayLitres: litres(s.today.cropUseM3),
        yesterday: s.yesterday ? { pumpHoursRun: s.yesterday.actualHours, pumpHoursNeeded: s.yesterday.neededHours } : null,
      };
    }
    case "getWeatherForecast": {
      const labels = ["today", "tomorrow"];
      return {
        source: s.weatherSource,
        rainTomorrowMm: r1(s.forecast[1]?.precipMm ?? 0),
        rainExpectedTomorrow: (s.forecast[1]?.precipMm ?? 0) >= 2,
        days: s.forecast.map((d, i) => ({
          day: labels[i] ?? `in ${i} days`,
          date: d.date,
          rainMm: r1(d.precipMm),
          maxTempC: d.tMax === null ? null : r0(d.tMax),
          minTempC: d.tMin === null ? null : r0(d.tMin),
        })),
        irrigationAdvice: a.kind,
      };
    }
    case "getWeeklySummary": {
      const w = s.week;
      return {
        days: w.days,
        pumpedLitres: litres(w.pumpedM3),
        cropNeededLitres: litres(w.needM3),
        lostBelowRootsLitres: litres(w.excessM3),
        pumpedMoreThanNeededPercent: r0(w.overNeedPct),
        lostPercentOfPumped: r0(w.excessPct),
        pumpHoursRun: r1(w.actualHours),
        pumpHoursRecommended: r1(w.recommendedHours),
      };
    }
    case "getSavings": {
      const w = s.week;
      return {
        lastWeek: {
          solarKwhWastedOnExtraWaterThisWeek: r0(w.wastedKwh),
          rupeesThatWastedEnergyCouldHaveEarnedThisWeek: r0(w.wastedKwh * s.surplusRsPerKwh),
          ureaWashedAwayThisWeekKg: r1(w.ureaKg),
          ureaWashedAwayThisWeekValueRupees: r0(w.ureaRs),
        },
        today: {
          spareSolarKwhToday: r0(s.today.todaySpareKwh),
          incomeIdeasForTodaysSpareSolar: s.today.todaySpareIdeas.map((i) => ({ idea: i.labelEn, ideaUrdu: i.labelUr, rupeesToday: i.rs })),
        },
        rupeesPerKwh: s.surplusRsPerKwh,
        note: "All fertiliser and income figures are estimates. Do not add or combine these numbers.",
      };
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}

// ── Offline fallback (no LLM) ──────────────────────────────────────────────

export type Script = "ur" | "roman" | "en";

const ROMAN_HINTS = /\b(kal|aaj|kitn[ae]|ghant[ae]y?|barish|pani|paani|hogi|chalaun|chalaon|kya|kab|hai|hain|mein|zaya|bijli|kamai|kamaun|bachat|khaad|fasal|mausam|dun|doon|karun)\b/i;

export function detectScript(text: string): Script {
  if (/[؀-ۿ]/.test(text)) return "ur";
  if (ROMAN_HINTS.test(text)) return "roman";
  return "en";
}

type Intent = "weather" | "advice" | "weekly" | "savings" | "help";

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/(barish|baarish|rain|mausam|weather|بارش|موسم)/.test(t)) return "weather";
  if (/(zaya|waste|hafte|week|ضائع|ہفتے|nuqsan|nuksan|نقصان)/.test(t)) return "weekly";
  if (/(bijli|kamai|kama|earn|money|paisa|rupay|rupees|solar|dhoop|بجلی|کمائی|کماؤں|روپے|دھوپ|khaad|urea|کھاد|یوریا|fertili)/.test(t)) return "savings";
  if (/(ghant|hour|pump|pani|paani|water|irrigat|chala|گھنٹے|پمپ|پانی)/.test(t)) return "advice";
  return "help";
}

const fmt = (n: number) => n.toLocaleString("en-US");

export function fallbackAnswer(message: string, s: FarmState): string {
  const sc = detectScript(message);
  const pick = (o: { ur: string; roman: string; en: string }) => o[sc];
  const intent = detectIntent(message);
  if (intent === "advice") {
    const d = runTool("getTodayAdvice", s) as { instruction: { ur: string; roman: string; en: string }; nextIrrigation: { ur: string; roman: string; en: string } | null };
    const next = d.nextIrrigation ? pick({ ur: ` اگلا پانی ${d.nextIrrigation.ur}۔`, roman: ` Agla pani ${d.nextIrrigation.roman}.`, en: ` Next irrigation ${d.nextIrrigation.en}.` }) : "";
    return pick(d.instruction) + next;
  }
  if (intent === "weather") {
    const d = runTool("getWeatherForecast", s) as { rainTomorrowMm: number; rainExpectedTomorrow: boolean; days: { maxTempC: number | null }[] };
    const tmax = d.days[1]?.maxTempC ?? "";
    return d.rainExpectedTomorrow
      ? pick({
          ur: `جی ہاں، کل تقریباً ${d.rainTomorrowMm} ملی میٹر بارش کا امکان ہے۔ کل پمپ چلانے کی ضرورت نہیں۔`,
          roman: `Ji haan, kal taqreeban ${d.rainTomorrowMm} mm barish ka imkaan hai. Kal pump chalane ki zaroorat nahi.`,
          en: `Yes, about ${d.rainTomorrowMm} mm of rain is expected tomorrow. No need to run the pump tomorrow.`,
        })
      : pick({
          ur: `کل بارش کا امکان نہیں۔ زیادہ سے زیادہ درجہ حرارت ${tmax} ڈگری۔`,
          roman: `Kal barish ka imkaan nahi. Ziada se ziada darja hararat ${tmax} degree.`,
          en: `No rain is expected tomorrow. Maximum temperature ${tmax}°C.`,
        });
  }
  if (intent === "weekly") {
    const d = runTool("getWeeklySummary", s) as { lostBelowRootsLitres: number; pumpedMoreThanNeededPercent: number };
    return pick({
      ur: `پچھلے 7 دن میں آپ نے ضرورت سے ${d.pumpedMoreThanNeededPercent}٪ زیادہ پانی نکالا۔ تقریباً ${fmt(d.lostBelowRootsLitres)} لیٹر پانی جڑوں سے نیچے ضائع ہوا۔`,
      roman: `Pichle 7 din mein aap ne zaroorat se ${d.pumpedMoreThanNeededPercent}% zyada pani nikala. Taqreeban ${fmt(d.lostBelowRootsLitres)} litre pani jaron se neeche zaya hua.`,
      en: `In the last 7 days you pumped ${d.pumpedMoreThanNeededPercent}% more water than needed. About ${fmt(d.lostBelowRootsLitres)} litres were lost below the roots.`,
    });
  }
  if (intent === "savings") {
    const d = runTool("getSavings", s) as { week: { couldHaveEarnedRs: number; ureaWashedAwayKg: number }; today: { spareSolarKwh: number; ideas: { rs: number }[] } };
    const best = d.today.ideas[0]?.rs ?? 0;
    return pick({
      ur: `آج تقریباً ${d.today.spareSolarKwh} یونٹ سولر بجلی فالتو ہے۔ ای رکشہ بیٹری چارج کر کے تقریباً ${fmt(best)} روپے کمائے جا سکتے ہیں۔ اس ہفتے تقریباً ${d.week.ureaWashedAwayKg} کلو یوریا بہہ گئی (اندازہ)۔`,
      roman: `Aaj taqreeban ${d.today.spareSolarKwh} unit solar bijli faltu hai. E-rickshaw battery charge kar ke taqreeban ${fmt(best)} rupay kamaye ja sakte hain. Is hafte taqreeban ${d.week.ureaWashedAwayKg} kilo urea beh gayi (andaza).`,
      en: `About ${d.today.spareSolarKwh} kWh of solar energy is spare today. Charging e-rickshaw batteries could earn about Rs ${fmt(best)}. This week about ${d.week.ureaWashedAwayKg} kg of urea washed away (estimate).`,
    });
  }
  return pick({
    ur: "میں پمپ کے گھنٹے، بارش، اس ہفتے کا پانی اور فالتو بجلی کی کمائی کے بارے میں بتا سکتا ہوں۔ مثلاً پوچھیں: کل بارش ہوگی؟",
    roman: "Main pump ke ghantay, barish, is hafte ka pani aur faltu bijli ki kamai ke baare mein bata sakta hoon. Maslan poochein: kal barish hogi?",
    en: "I can tell you pump hours, rain, this week's water use and earnings from spare solar. For example, ask: will it rain tomorrow?",
  });
}
