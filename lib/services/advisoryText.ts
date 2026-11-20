/**
 * Template advisory text in Urdu script, Roman Urdu and English.
 * Every number comes from the engine; this is also the fallback when the LLM is unavailable.
 */
import { areaNumber, type AdviceKind, type CropType, type LandUnit, type RainDeclined } from "@/lib/engine";

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
  /** Set when forecast rain would have covered the need but was not trusted enough to skip irrigation. */
  rainDeclined?: RainDeclined;
  /** Open-loop instruction for this field on an irrigate day: depth at the field and total volume. */
  waterPlan?: { grossMm: number; areaAcres: number; areaUnit?: LandUnit; totalM3: number };
  /** Set when today's / next irrigation is driven by a critical growth stage. */
  criticalStage?: { ur: string; roman: string; en: string };
}

const UNIT_NAMES: Record<LandUnit, { ur: string; roman: string; en: string }> = {
  acre: { ur: "ایکڑ", roman: "acre", en: "acre" },
  kanal: { ur: "کنال", roman: "kanal", en: "kanal" },
  marla: { ur: "مرلہ", roman: "marla", en: "marla" },
  murabba: { ur: "مربع", roman: "murabba", en: "murabba" },
  ghumaon: { ur: "گھماؤں", roman: "ghumaon", en: "ghumaon" },
};

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
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
  if (f.criticalStage && f.kind === "irrigate") {
    ur.push(`${f.criticalStage.ur}، اس وقت پانی کی کمی سے پیداوار کم ہوتی ہے۔`);
    ro.push(`${cap(f.criticalStage.roman)}, is waqt pani ki kami se paidawar kam hoti hai.`);
    en.push(`Your ${c.en}'s ${f.criticalStage.en}; water stress now reduces yield.`);
  }
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
    if (f.waterPlan && f.waterPlan.grossMm > 0) {
      const unit = f.waterPlan.areaUnit ?? "acre";
      const mm = fmt0(f.waterPlan.grossMm), m3 = fmt0(f.waterPlan.totalM3), ac = areaNumber(f.waterPlan.areaAcres, unit), u = UNIT_NAMES[unit];
      ur.push(`تقریباً ${mm} ملی میٹر پانی دیں، یعنی آپ کی ${ac} ${u.ur} کے لیے تقریباً ${m3} کیوبک میٹر۔`);
      ro.push(`Taqreeban ${mm} mm pani dein, yani aap ki ${ac} ${u.roman} ke liye taqreeban ${m3} cubic meter.`);
      en.push(`Give about ${mm} mm of water, about ${m3} m³ for your ${ac} ${u.en}.`);
    }
    if (f.rainDeclined === "weather") {
      ur.push(`آج موسم کا ڈیٹا تازہ نہیں، اس لیے بارش کی پیش گوئی پر بھروسا نہ کریں۔`);
      ro.push(`Aaj mausam ka data taaza nahi, is liye barish ki pesh goi par bharosa na karein.`);
      en.push(`Weather data is not live today, so do not rely on a rain forecast.`);
    } else if (f.rainDeclined) {
      ur.push(`بارش کی پیش گوئی ہے مگر پیش گوئی غلط بھی ہو سکتی ہے، اس لیے احتیاطاً آج پانی دیں۔`);
      ro.push(`Barish ki pesh goi hai magar ghalat bhi ho sakti hai, is liye ehtiyaatan aaj pani dein.`);
      en.push(`Rain is forecast, but forecasts can be wrong, so water today to be safe.`);
    }
  } else if (f.kind === "skip-rain") {
    ur.push(`آج پمپ نہ چلائیں، کل بارش ہو سکتی ہے۔`);
    ro.push(`Aaj pump na chalayen, kal barish ho sakti hai.`);
    en.push(`Do not run the pump today; rain is expected tomorrow.`);
    ur.push(`اگر بارش نہ آئی تو کل ایپ دیکھیں، وہ پانی دینے کا کہے گی۔`);
    ro.push(`Agar barish na aayi to kal app dekhen, woh pani dene ka kahegi.`);
    en.push(`If the rain does not come, check the app tomorrow: it will tell you to water.`);
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
