import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CROPS, DEFAULTS, IRRIGATION_EFFICIENCY } from "@/lib/engine";
import { dirFor, type Lang } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "How we calculate · PaaniPulse" };

type Bi = { en: string; ur: string };
interface Section {
  id: string;
  title: Bi;
  body: Bi[];
  formulas?: string[];
}

const SECTIONS: Section[] = [
  {
    id: "principle",
    title: { en: "The rule: code computes, AI only speaks", ur: "اصول: حساب کوڈ کرتا ہے، AI صرف بولتا ہے" },
    body: [
      {
        en: "Every number (hours, litres, mm, kWh, rupees) is calculated by deterministic, unit-tested code. The AI assistant can only fetch these numbers through four tools. Before an AI answer is shown, the server checks that every number in it came from a tool; if not, the farmer gets the rule-based answer instead.",
        ur: "ہر نمبر (گھنٹے، لیٹر، ملی میٹر، یونٹ، روپے) ٹیسٹ شدہ کوڈ سے نکلتا ہے۔ AI مددگار یہ نمبر صرف چار ٹولز سے لے سکتا ہے۔ جواب دکھانے سے پہلے سرور چیک کرتا ہے کہ ہر نمبر ٹول سے آیا ہے؛ ورنہ کسان کو اصولی جواب ملتا ہے۔",
      },
    ],
  },
  {
    id: "crop",
    title: { en: "1. Crop water need (FAO-56)", ur: "1. فصل کا پانی (FAO-56)" },
    body: [
      {
        en: "Daily reference evapotranspiration ET₀, rain and solar radiation come from Open-Meteo (FAO Penman-Monteith ET₀). The crop coefficient Kc follows the FAO-56 stage curve (initial, development, mid, late) and is interpolated by days since sowing.",
        ur: "روزانہ ET₀، بارش اور دھوپ Open-Meteo سے آتی ہے۔ فصل کا عدد Kc بوائی کے دنوں کے حساب سے FAO-56 کے مراحل پر چلتا ہے۔",
      },
    ],
    formulas: ["ETc = Kc × ET₀", "Effective rain = 0.8 × rain", "Gross need (m³) = net need (mm) / 1000 × area (m²) / irrigation efficiency"],
  },
  {
    id: "balance",
    title: { en: "2. Soil-water balance → when to irrigate", ur: "2. زمین کی نمی کا حساب ← پانی کب دیں" },
    body: [
      {
        en: "Instead of 'run X hours every day', PaaniPulse tracks how much water is left in the root zone (FAO-56 chapter 8). Water applied beyond field capacity drains below the roots: that is the over-pumping we report. Flooded rice uses a daily-need model with 4 mm/day percolation instead.",
        ur: "روزانہ گھنٹے بتانے کے بجائے پانی پلس جڑوں کی مٹی میں باقی پانی کا حساب رکھتا ہے۔ جو پانی مٹی کی گنجائش سے زیادہ ہو وہ جڑوں سے نیچے چلا جاتا ہے — یہی ضائع پانی ہے۔ دھان کے لیے روزانہ ضرورت کا طریقہ ہے۔",
      },
    ],
    formulas: [
      "Root depth Zr: 0.3 m at sowing → crop maximum by end of development",
      `TAW = ${DEFAULTS.soilAwcMmPerM} mm/m × Zr      RAW = p × TAW`,
      "Dr(today) = Dr(yesterday) + ETc − effective rain − pumped × efficiency / area",
      "Irrigate when Dr ≥ RAW; otherwise 'keep pump off', next irrigation when Dr reaches RAW",
    ],
  },
  {
    id: "meter",
    title: { en: "3. Virtual water meter (no hardware)", ur: "3. ورچوئل پانی میٹر (کوئی مشین نہیں)" },
    body: [
      {
        en: "Pumped water is computed from the energy reaching the pump. Mode A uses the solar drive's own power readings. Mode B (default) uses hourly sunlight, panel size and the hours the pump ran.",
        ur: "نکالا گیا پانی پمپ تک پہنچنے والی بجلی سے حساب ہوتا ہے۔ موڈ A سولر ڈرائیو کی ریڈنگ استعمال کرتا ہے۔ موڈ B دھوپ، پینل اور چلنے کے گھنٹوں سے۔",
      },
    ],
    formulas: [
      `Head H = (static water level + ${DEFAULTS.drawdownM} m drawdown) × (1 + ${DEFAULTS.frictionFraction} friction)`,
      `Flow Q (m³/s) = η × P / (ρ × g × H)      η default ${DEFAULTS.efficiency}, ρ = 1000, g = 9.81`,
      `PV power = kWp × GHI / 1000 × ${DEFAULTS.performanceRatio}; capped at pump kW; zero below ${DEFAULTS.startThreshold * 100}% of rated`,
      "Bucket test: η = ρ × g × H × (drum litres / 1000 / seconds) / P",
    ],
  },
  {
    id: "money",
    title: { en: "4. Energy, fertiliser and money (estimates)", ur: "4. بجلی، کھاد اور پیسے (اندازے)" },
    body: [
      {
        en: "Solar energy is free, but each kWh spent lifting water the crop did not need could have charged a battery, run a dryer or a cold room. Nitrogen loss uses a deliberately conservative leachate concentration.",
        ur: "سولر بجلی مفت ہے، مگر فالتو پانی کھینچنے پر لگا ہر یونٹ بیٹری چارج یا مشین چلانے میں کام آ سکتا تھا۔ کھاد کا اندازہ جان بوجھ کر کم رکھا گیا ہے۔",
      },
    ],
    formulas: [
      "Wasted kWh = excess m³ × ρ g H / η / 3.6×10⁶",
      `Value = kWh × Rs ${DEFAULTS.surplusRsPerKwh} (e-rickshaw battery charging)`,
      `N leached (kg) = drained mm × hectares × ${DEFAULTS.leachateNitrateNMgPerL} mg/L × 0.01;  urea = N / ${DEFAULTS.ureaNFraction} at Rs ${DEFAULTS.ureaRsPerKg}/kg`,
    ],
  },
  {
    id: "sources",
    title: { en: "Data sources", ur: "ڈیٹا کے ذرائع" },
    body: [
      {
        en: "Weather: Open-Meteo forecast API (free, no key), refreshed hourly, with a saved last-good copy and an offline sample for demos. Crop coefficients: FAO Irrigation & Drainage Paper 56 (Allen et al., 1998), Tables 11, 12 and 22. Problem context: Reuters/Dawn reporting on ~650,000 solar tube wells (expert estimate) and a 2025 peer-reviewed study (Journal of Agriculture and Food Research) finding solar farms pumped more than diesel farms in 77% of matched pairs.",
        ur: "موسم: Open-Meteo (مفت)، ہر گھنٹے تازہ، آف لائن نمونے کے ساتھ۔ فصل کے اعداد: FAO-56۔ مسئلے کے اعداد: رائٹرز/ڈان (تقریباً 6.5 لاکھ سولر ٹیوب ویل، اندازہ) اور 2025 کی تحقیق (77٪ جوڑوں میں سولر نے زیادہ پانی نکالا)۔",
      },
    ],
  },
  {
    id: "limits",
    title: { en: "Limitations — what we do not claim", ur: "حدود — ہم کیا دعویٰ نہیں کرتے" },
    body: [
      { en: "The virtual meter is an estimate. Before a bucket test, flow can be off by roughly ±20% (we show a range); calibration narrows it.", ur: "ورچوئل میٹر اندازہ ہے۔ بالٹی ٹیسٹ سے پہلے فرق تقریباً ±20٪ ہو سکتا ہے (ہم رینج دکھاتے ہیں)؛ ٹیسٹ سے کم ہو جاتا ہے۔" },
      { en: "Static water level is entered by the farmer; a wrong depth changes the head and the flow.", ur: "پانی کی گہرائی کسان بتاتا ہے؛ غلط گہرائی سے حساب بدلتا ہے۔" },
      { en: "The soil model treats the whole farm as one field with loam soil; real farms irrigate kiyari by kiyari.", ur: "مٹی کا ماڈل پورے کھیت کو ایک مانتا ہے؛ اصل میں کیاری وار پانی لگتا ہے۔" },
      { en: "Wheat stage rules (e.g. first irrigation at crown-root initiation) are not yet added; we are validating with farmers.", ur: "گندم کے مرحلہ وار اصول (جیسے پہلا پانی) ابھی شامل نہیں؛ کسانوں سے تصدیق جاری ہے۔" },
      { en: "Fertiliser and income figures are simple estimates, labelled as such. The 150 regional wells are simulated demo data.", ur: "کھاد اور کمائی سادہ اندازے ہیں۔ علاقے کے 150 ٹیوب ویل فرضی ڈیمو ڈیٹا ہیں۔" },
    ],
  },
  {
    id: "privacy",
    title: { en: "Privacy", ur: "رازداری" },
    body: [
      {
        en: "Farmers own their data. Authorities and lenders see only district-level, anonymised data: a district code plus a random reference, locations blurred to about 1 km, and only farms that consented. Names and phone numbers never leave the farmer's account.",
        ur: "ڈیٹا کسان کا ہے۔ محکمے اور بینک صرف ضلع کی سطح پر، بغیر نام کا ڈیٹا دیکھتے ہیں؛ مقام تقریباً 1 کلومیٹر تک دھندلا۔ نام اور فون نمبر کبھی شیئر نہیں ہوتے۔",
      },
    ],
  },
];

export default async function AboutPage() {
  const lang: Lang = await getLang("en");
  const ur = lang === "ur";
  const pick = (b: Bi) => b[lang];
  return (
    <main dir={dirFor(lang)} className={cn("min-h-screen bg-slate-50", ur && "ur-ui")}>
      <header className="bg-gradient-to-br from-emerald-800 to-sky-800 text-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex min-h-9 items-center gap-1 text-sm text-emerald-100 hover:text-white">
              <ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> {ur ? "پانی پلس" : "PaaniPulse"}
            </Link>
            <LanguageToggle lang={lang} />
          </div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <BookOpen className="h-7 w-7 shrink-0" aria-hidden /> {ur ? "ہم حساب کیسے کرتے ہیں" : "How we calculate"}
          </h1>
        </div>
      </header>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <nav aria-label={ur ? "فہرست" : "Contents"} className="flex flex-wrap gap-2 text-sm">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-800 hover:bg-slate-100">
              {pick(s.title)}
            </a>
          ))}
        </nav>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 id={`${s.id}-h`} className="text-xl font-bold text-slate-900">{pick(s.title)}</h2>
            {s.body.length > 1 ? (
              <ul className="mt-3 list-disc space-y-2 ps-5 text-slate-700">{s.body.map((b, i) => <li key={i}>{pick(b)}</li>)}</ul>
            ) : (
              s.body.map((b, i) => <p key={i} className="mt-3 text-slate-700">{pick(b)}</p>)
            )}
            {s.formulas && (
              <pre dir="ltr" className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 font-mono text-sm leading-relaxed text-emerald-100">
                {s.formulas.join("\n")}
              </pre>
            )}
          </section>
        ))}
        <section aria-labelledby="defaults-h" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 id="defaults-h" className="text-xl font-bold text-slate-900">{ur ? "فصلوں کے اعداد (FAO-56)" : "Crop parameters (FAO-56, adjust locally)"}</h2>
          <div className="mt-3 overflow-x-auto" dir="ltr">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  {["Crop", "Kc ini", "Kc mid", "Kc end", "Stages (days)", "Max root (m)", "p"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(CROPS).map(([name, c]) => (
                  <tr key={name} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-2 py-2 text-left font-semibold capitalize">{name}</th>
                    <td className="px-2 py-2">{c.kcIni}</td>
                    <td className="px-2 py-2">{c.kcMid}</td>
                    <td className="px-2 py-2">{c.kcEnd}</td>
                    <td className="px-2 py-2">{c.stages.join(" / ")}</td>
                    <td className="px-2 py-2">{c.rootMaxM}</td>
                    <td className="px-2 py-2">{c.p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-slate-600">
              Irrigation efficiency: {Object.entries(IRRIGATION_EFFICIENCY).map(([k, v]) => `${k} ${v}`).join(" · ")}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
