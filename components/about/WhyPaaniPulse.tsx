/**
 * "PaaniPulse in short" for the About page: the problem, how we solve it, who pays, how farmers manage today, why ours is
 * different, and how it earns. Plain words, Urdu and English. Numbers are the demo farm's or labelled estimates.
 */
import { Coins, Lightbulb, ShieldAlert, Sprout, Target, Users } from "lucide-react";
import type { Lang } from "@/lib/i18n/dict";

type Bi = { en: string; ur: string };
const b = (en: string, ur: string): Bi => ({ en, ur });

const BLOCKS: { id: string; icon: React.ElementType; title: Bi; lead: Bi; points: Bi[] }[] = [
  {
    id: "problem",
    icon: ShieldAlert,
    title: b("The problem", "مسئلہ"),
    lead: b(
      "Solar made pumping free, so farmers run the pump as long as the sun shines, with no idea how much water the crop needs or how much the pump gives.",
      "سولر نے پمپ چلانا مفت کر دیا، اس لیے کسان جتنی دھوپ اتنا پمپ چلاتا ہے، یہ جانے بغیر کہ فصل کو کتنا پانی چاہیے اور پمپ کتنا نکالتا ہے۔",
    ),
    points: [
      b("Water is wasted below the roots, and the water table keeps falling.", "پانی جڑوں سے نیچے ضائع ہوتا ہے اور زیرِ زمین پانی نیچے جاتا رہتا ہے۔"),
      b("Urea washes away with the extra water (about 3.6 kg a week on our demo farm).", "زیادہ پانی کے ساتھ یوریا بہہ جاتی ہے (ہمارے ڈیمو کھیت پر ہفتے میں تقریباً 3.6 کلو)۔"),
      b("Solar energy that lifted the extra water could have earned money.", "جو سولر بجلی فالتو پانی نکالنے میں لگی، اس سے کمائی ہو سکتی تھی۔"),
      b("No one has data on how much each solar tube-well pumps.", "کسی کے پاس یہ ڈیٹا نہیں کہ ہر سولر ٹیوب ویل کتنا پانی نکالتا ہے۔"),
    ],
  },
  {
    id: "solution",
    icon: Lightbulb,
    title: b("How we solve it", "ہم کیسے حل کرتے ہیں"),
    lead: b(
      "A virtual water meter and a morning advice in the farmer's own language, with no hardware needed to start.",
      "ایک ورچوئل پانی میٹر اور ہر صبح کسان کی اپنی زبان میں مشورہ، شروع کرنے کے لیے کوئی مشین ضروری نہیں۔",
    ),
    points: [
      b("We work out the litres from pump size, solar panel and sunshine; a 5-minute bucket test tunes it to his pump.", "پمپ، سولر پینل اور دھوپ سے لیٹر کا حساب؛ 5 منٹ کا بالٹی ٹیسٹ اسے اس کے اپنے پمپ کے مطابق کرتا ہے۔"),
      b("Weather, crop, crop age and soil give today's need (FAO-56).", "موسم، فصل، اس کی عمر اور مٹی سے آج کی ضرورت (FAO-56)۔"),
      b("Every morning: 'run the pump 4 hours' or 'keep it off', in text, voice (Urdu, Punjabi, English) and SMS.", "ہر صبح: 'پمپ 4 گھنٹے چلائیں' یا 'بند رکھیں'، لکھا ہوا، آواز میں (اردو، پنجابی، انگریزی) اور SMS میں۔"),
      b("Pictures show the week's waste of water, fertiliser and energy, in rupees.", "تصویریں ہفتے کا پانی، کھاد اور بجلی کا نقصان روپوں میں دکھاتی ہیں۔"),
      b("Optional SIM soil probe and pump box: the motor stops by itself when time is up or the soil is wet enough.", "اختیاری SIM والا پروب اور پمپ بکس: وقت پورا ہو یا مٹی میں نمی پوری ہو تو موٹر خود بند۔"),
    ],
  },
  {
    id: "customer",
    icon: Users,
    title: b("Who is the customer", "کسٹمر کون ہے"),
    lead: b("The farmer uses it; others pay for it.", "کسان استعمال کرتا ہے؛ پیسے دوسرے دیتے ہیں۔"),
    points: [
      b("User: the farmer with a solar tube-well (about 5–25 acres).", "استعمال کرنے والا: سولر ٹیوب ویل والا کسان (تقریباً 5 سے 25 ایکڑ)۔"),
      b("First paying customer: solar installers and dealers, as after-sales service for every pump they sell.", "پہلا پیسے دینے والا: سولر انسٹالر اور ڈیلر، ہر بیچے گئے پمپ کے ساتھ بعد کی سروس کے طور پر۔"),
      b("Later: banks and microfinance (pump-use reports for loans), and the Irrigation Department (district water map).", "بعد میں: بینک اور مائیکروفنانس (قرض کے لیے پمپ کے استعمال کی رپورٹ)، اور محکمہ آبپاشی (ضلع کا پانی کا نقشہ)۔"),
    ],
  },
];

const TODAY: { way: Bi; gap: Bi }[] = [
  { way: b("Habit: fill the field, or run the pump all day", "رواج: کھیت بھر دو، یا سارا دن پمپ چلاؤ"), gap: b("No measurement; usually too much water", "کوئی حساب نہیں؛ عام طور پر زیادہ پانی") },
  { way: b("General farm advice on radio, TV, SMS", "ریڈیو، ٹی وی، SMS پر عام زرعی مشورہ"), gap: b("Same for the whole area; not for this field or this pump", "پورے علاقے کے لیے ایک؛ اس کھیت یا پمپ کے لیے نہیں") },
  { way: b("Flow meters", "فلو میٹر"), gap: b("Cost thousands of rupees, need fitting, and give no advice", "ہزاروں روپے، لگانا مشکل، اور مشورہ نہیں دیتے") },
  { way: b("Soil-sensor systems", "مٹی کے سینسر والے نظام"), gap: b("Expensive, need upkeep, not in Urdu or by voice", "مہنگے، دیکھ بھال چاہیے، اردو یا آواز میں نہیں") },
  { way: b("Drip and sprinkler", "ڈرپ اور اسپرنکلر"), gap: b("Save water but cost a lot to install", "پانی بچاتے ہیں مگر لگانا بہت مہنگا") },
];

const BETTER: Bi[] = [
  b("Works from day one with only a phone: no hardware to buy first.", "پہلے دن سے صرف فون سے: پہلے کوئی مشین نہیں خریدنی۔"),
  b("Built for solar pumps: it uses sunshine and pump size, which general advice ignores.", "سولر پمپ کے لیے بنا: دھوپ اور پمپ کی طاقت سے حساب، جو عام مشورہ نہیں کرتا۔"),
  b("For each field: its crop, soil, pump and GPS spot.", "ہر کھیت کے لیے الگ: اس کی فصل، مٹی، پمپ اور جگہ۔"),
  b("In the farmer's language and voice, with pictures: easy for a farmer who reads little.", "کسان کی زبان اور آواز میں، تصویروں کے ساتھ: کم پڑھے لکھے کسان کے لیے آسان۔"),
  b("Works with weak internet: SMS advice, offline timer, devices on 2G.", "کمزور نیٹ پر بھی: SMS مشورہ، بغیر نیٹ ٹائمر، 2G پر چلنے والے آلات۔"),
  b("Grows with the farmer: add a probe and a pump box later, in the same app.", "کسان کے ساتھ بڑھتا ہے: بعد میں پروب اور پمپ بکس، اسی ایپ میں۔"),
];

const REVENUE: { stream: Bi; how: Bi; amount: Bi }[] = [
  { stream: b("Solar installers", "سولر انسٹالر"), how: b("After-sales service per pump", "ہر پمپ کے ساتھ بعد کی سروس"), amount: b("Rs 1,000–2,000 per pump a year", "فی پمپ سال کے Rs 1,000–2,000") },
  { stream: b("Hardware margin", "ہارڈویئر مارجن"), how: b("Probe or pump box ordered from a vendor and fitted; we keep a margin", "وینڈر سے پروب یا پمپ بکس منگوا کر لگوانا؛ ہم مارجن رکھتے ہیں"), amount: b("About Rs 4,000–16,000 per farm, once", "فی فارم تقریباً Rs 4,000–16,000، ایک بار") },
  { stream: b("Telecom package", "ٹیلی کام پیکج"), how: b("Operator sells a PaaniPulse package and shares the monthly revenue", "آپریٹر پانی پلس پیکج بیچے اور ماہانہ کمائی میں حصہ دے"), amount: b("About Rs 360–1,200 per farm a year", "فی فارم سال کے تقریباً Rs 360–1,200") },
  { stream: b("Banks and microfinance", "بینک اور مائیکروفنانس"), how: b("Verified pump-use report for loans", "قرض کے لیے پمپ کے استعمال کی تصدیق شدہ رپورٹ"), amount: b("Rs 500–1,000 per report a year", "فی رپورٹ سال کے Rs 500–1,000") },
];

export function WhyPaaniPulse({ lang }: { lang: Lang }) {
  const p = (x: Bi) => x[lang];
  const ur = lang === "ur";
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  return (
    <section aria-labelledby="why-h" className="flex flex-col gap-4">
      <h2 id="why-h" className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Sprout className="h-6 w-6 text-emerald-700" aria-hidden /> {ur ? "پانی پلس مختصراً" : "PaaniPulse in short"}
      </h2>
      <p className="rounded-2xl bg-emerald-700 p-4 text-lg font-semibold text-white">
        {ur ? "سولر نے پمپ چلانا مفت کر دیا؛ پانی پلس اسے سمجھدار بناتا ہے۔" : "Solar made pumping free. PaaniPulse makes it smart."}
      </p>
      {BLOCKS.map(({ id, icon: Icon, title, lead, points }) => (
        <div key={id} id={id} className={card}>
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon className="h-5 w-5 text-sky-700" aria-hidden /> {p(title)}</h3>
          <p className="mt-2 font-medium text-slate-800">{p(lead)}</p>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-slate-700">{points.map((x, i) => <li key={i}>{p(x)}</li>)}</ul>
        </div>
      ))}
      <div id="today" className={card}>
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Target className="h-5 w-5 text-sky-700" aria-hidden /> {ur ? "کسان آج کیا کرتے ہیں، اور کمی کیا ہے" : "How farmers manage today, and what is missing"}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-start text-slate-600">
                <th scope="col" className="px-2 py-2 text-start font-semibold">{ur ? "آج کا طریقہ" : "Today's way"}</th>
                <th scope="col" className="px-2 py-2 text-start font-semibold">{ur ? "کمی" : "What is missing"}</th>
              </tr>
            </thead>
            <tbody>
              {TODAY.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-2 py-2 text-start font-semibold text-slate-900">{p(r.way)}</th>
                  <td className="px-2 py-2 text-slate-700">{p(r.gap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 className="mt-4 font-bold text-emerald-800">{ur ? "پانی پلس مختلف کیوں ہے" : "Why PaaniPulse is different"}</h4>
        <ul className="mt-2 list-disc space-y-1.5 ps-5 text-slate-700">{BETTER.map((x, i) => <li key={i}>{p(x)}</li>)}</ul>
      </div>
      <div id="revenue" className={card}>
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Coins className="h-5 w-5 text-sky-700" aria-hidden /> {ur ? "کمائی کیسے ہو گی" : "How it earns"}</h3>
        <p className="mt-2 text-slate-800">{ur ? "کسان سے ماہانہ فیس نہیں؛ پیسے یہاں سے:" : "No monthly fee from the farmer; the money comes from:"}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th scope="col" className="px-2 py-2 text-start font-semibold">{ur ? "ذریعہ" : "Stream"}</th>
                <th scope="col" className="px-2 py-2 text-start font-semibold">{ur ? "کیسے" : "How"}</th>
                <th scope="col" className="px-2 py-2 text-start font-semibold">{ur ? "اندازہ" : "Estimate"}</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-2 py-2 text-start font-semibold text-slate-900">{p(r.stream)}</th>
                  <td className="px-2 py-2 text-slate-700">{p(r.how)}</td>
                  <td className="num px-2 py-2 text-slate-900">{p(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {ur
            ? "یہ سب اندازے ہیں: ابھی کسی انسٹالر، وینڈر یا ٹیلی کام کمپنی سے معاہدہ نہیں ہوا۔"
            : "These are estimates: no installer, vendor or telecom company has signed yet."}
        </p>
      </div>
    </section>
  );
}
