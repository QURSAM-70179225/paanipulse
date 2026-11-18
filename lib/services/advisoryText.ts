/**
 * Template advisory text in Urdu script, Roman Urdu and English.
 * Every number comes from the engine; this is also the fallback when the LLM is unavailable.
 */
import type { AdviceKind, CropType } from "@/lib/engine";

export const CROP_NAMES: Record<CropType, { ur: string; roman: string; en: string }> = {
  wheat: { ur: "گندم", roman: "gandum", en: "wheat" },
  rice: { ur: "چاول", roman: "chawal", en: "rice" },
  maize: { ur: "مکئی", roman: "makai", en: "maize" },
  cotton: { ur: "کپاس", roman: "kapas", en: "cotton" },
  sugarcane: { ur: "گنا", roman: "ganna", en: "sugarcane" },
};

export interface AdvisoryFacts {
  crop: CropType;
  kind: AdviceKind;
  hoursToday: number;
  totalHours: number;
  daysUntilNext: number | null;
  rainTomorrowMm: number;
  yesterdayHours: number;
  yesterdayNeededHours: number;
  weekUreaKg: number;
  weekSpareKwh: number;
  weekWastedKwh: number;
  surplusRsPerKwh: number;
}

const fmtH = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
const fmt0 = (x: number) => Math.round(x).toLocaleString("en-US");

function whenNext(days: number | null) {
  if (days === null) return null;
  if (days <= 1) return { ur: "کل", roman: "kal", en: "tomorrow" };
  if (days <= 14) return { ur: `تقریباً ${days} دن بعد`, roman: `taqreeban ${days} din baad`, en: `in about ${days} days` };
  const w = Math.round(days / 7);
  return { ur: `تقریباً ${w} ہفتے بعد`, roman: `taqreeban ${w} hafte baad`, en: `in about ${w} weeks` };
}

export function advisoryText(f: AdvisoryFacts) {
  const c = CROP_NAMES[f.crop];
  const ur: string[] = [];
  const ro: string[] = [];
  const en: string[] = [];

  // 1. Yesterday vs need (the closed loop)
  if (f.yesterdayHours > 0) {
    if (f.yesterdayNeededHours <= 0) {
      ur.push(`کل آپ نے پمپ ${fmtH(f.yesterdayHours)} گھنٹے چلایا، ${c.ur} کو اس کی ضرورت نہیں تھی۔`);
      ro.push(`Kal aap ne pump ${fmtH(f.yesterdayHours)} ghantay chalaya, ${c.roman} ko is ki zaroorat nahi thi.`);
      en.push(`Yesterday you ran the pump ${fmtH(f.yesterdayHours)} hours; your ${c.en} did not need it.`);
    } else {
      ur.push(`کل آپ نے پمپ ${fmtH(f.yesterdayHours)} گھنٹے چلایا، ضرورت ${fmtH(f.yesterdayNeededHours)} گھنٹے کی تھی۔`);
      ro.push(`Kal aap ne pump ${fmtH(f.yesterdayHours)} ghantay chalaya, zaroorat ${fmtH(f.yesterdayNeededHours)} ghantay ki thi.`);
      en.push(`Yesterday you ran the pump ${fmtH(f.yesterdayHours)} hours; the crop needed ${fmtH(f.yesterdayNeededHours)}.`);
    }
  }

  // 2. Today's instruction
  const next = whenNext(f.daysUntilNext);
  if (f.kind === "irrigate") {
    ur.push(`آج پمپ ${fmtH(f.hoursToday)} گھنٹے چلائیں، دوپہر کے وقت جب دھوپ تیز ہو۔`);
    ro.push(`Aaj pump ${fmtH(f.hoursToday)} ghantay chalayen, dopahar ke waqt jab dhoop tez ho.`);
    en.push(`Today, run the pump for ${fmtH(f.hoursToday)} hours around midday when the sun is strongest.`);
    if (f.totalHours > f.hoursToday) {
      const rest = f.totalHours - f.hoursToday;
      ur.push(`باقی ${fmtH(rest)} گھنٹے کل۔`);
      ro.push(`Baqi ${fmtH(rest)} ghantay kal.`);
      en.push(`The remaining ${fmtH(rest)} hours tomorrow.`);
    }
  } else if (f.kind === "skip-rain") {
    ur.push(`آج پمپ نہ چلائیں، کل بارش ہو سکتی ہے۔`);
    ro.push(`Aaj pump na chalayen, kal barish ho sakti hai.`);
    en.push(`Do not run the pump today; rain is expected tomorrow.`);
  } else {
    ur.push(`آج پمپ بند رکھیں، زمین میں نمی کافی ہے۔`);
    ro.push(`Aaj pump band rakhein, zameen mein nami kafi hai.`);
    en.push(`Keep the pump off today; there is enough moisture in the soil.`);
    if (next) {
      ur.push(`اگلا پانی ${next.ur}۔`);
      ro.push(`Agla pani ${next.roman}.`);
      en.push(`Next irrigation ${next.en}.`);
    }
    if (f.rainTomorrowMm >= 2) {
      ur.push(`کل بارش کا امکان ہے۔`);
      ro.push(`Kal barish ka imkaan hai.`);
      en.push(`Rain is likely tomorrow.`);
    }
  }

  // 3. Why it matters to the farmer: fertiliser + spare sunshine
  if (f.weekUreaKg >= 0.5) {
    ur.push(`اس ہفتے زیادہ پانی سے تقریباً ${fmt0(f.weekUreaKg)} کلو یوریا بہہ گئی۔`);
    ro.push(`Is hafte zyada pani se taqreeban ${fmt0(f.weekUreaKg)} kilo urea beh gayi.`);
    en.push(`This week, extra water washed away about ${fmt0(f.weekUreaKg)} kg of urea (estimate).`);
  }
  if (f.kind !== "irrigate" && f.weekWastedKwh >= 1) {
    const rs = f.weekWastedKwh * f.surplusRsPerKwh;
    ur.push(`جو بجلی زیادہ پانی پر لگی، اس سے تقریباً ${fmt0(rs)} روپے کمائے جا سکتے تھے۔`);
    ro.push(`Jo bijli zyada pani par lagi, us se taqreeban ${fmt0(rs)} rupay kamaye ja sakte thay.`);
    en.push(`The solar energy spent on extra water could have earned about Rs ${fmt0(rs)}.`);
  }

  return { textUrdu: ur.join(" "), textRomanUrdu: ro.join(" "), textEnglish: en.join(" ") };
}
