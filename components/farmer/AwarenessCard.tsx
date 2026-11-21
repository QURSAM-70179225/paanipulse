/**
 * "Where does the water go?": an awareness card that shows a farmer, with a picture and his own numbers, why wasting water matters.
 * Underground water is limited: pumped faster than rain refills it, the level falls, wells need to go deeper and pumps need more power.
 * No area-wide statistics are quoted (none are verified here); the numbers are the farm's own, from this week's meter.
 * Server component: no state. Urdu and English.
 */
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lang } from "@/lib/i18n/dict";

type Bi = { en: string; ur: string };
const b = (en: string, ur: string): Bi => ({ en, ur });

/** One short tip a day, so there is a reason to look again. */
const TIPS: Bi[] = [
  b("Water the crop needs, not the field full: the extra goes below the roots and is lost.", "فصل کو جتنا چاہیے اتنا دیں، کھیت بھرنا ضروری نہیں: زیادہ پانی جڑوں سے نیچے ضائع ہو جاتا ہے۔"),
  b("Run the pump in the midday sun and switch off when the field has enough.", "پمپ دوپہر کی دھوپ میں چلائیں اور کھیت میں کافی پانی ہو جائے تو بند کر دیں۔"),
  b("Extra water also carries urea away. Less water, less fertiliser lost.", "زیادہ پانی کے ساتھ یوریا بھی بہہ جاتی ہے۔ کم پانی، کم کھاد ضائع۔"),
  b("Rain is coming? Keep the pump off. The rain waters the crop for free.", "بارش آنے والی ہے؟ پمپ بند رکھیں۔ بارش فصل کو مفت پانی دیتی ہے۔"),
  b("Tell a neighbour. When many farms save water, the well stays full for everyone.", "پڑوسی کو بتائیں۔ جب بہت سے کھیت پانی بچاتے ہیں تو سب کا کنواں بھرا رہتا ہے۔"),
  b("A pump that runs less also lasts longer and uses less solar energy.", "کم چلنے والا پمپ زیادہ چلتا ہے اور سولر بجلی بھی کم لگتی ہے۔"),
];

const DRUM_L = 200;

export function AwarenessCard({ lang, title, wastedM3, ureaKg, dayIndex, listen }: { lang: Lang; title: string; wastedM3: number; ureaKg: number; dayIndex: number; listen?: React.ReactNode }) {
  const ur = lang === "ur";
  const p = (x: Bi) => x[lang];
  const drums = Math.round((wastedM3 * 1000) / DRUM_L);
  const tip = TIPS[((dayIndex % TIPS.length) + TIPS.length) % TIPS.length];
  const wasted = wastedM3 > 0.5;
  return (
    <Card className="border-sky-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-sky-700" aria-hidden /> {title}</CardTitle>
          <div className="shrink-0">{listen}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* the underground picture: pumping lowers the water level */}
        <svg viewBox="0 0 320 150" className="h-auto w-full rounded-xl" role="img" style={{ direction: "ltr" }}
          aria-label={ur ? "تصویر: زمین کے اندر پانی کی سطح۔ زیادہ پمپ چلانے سے سطح نیچے جاتی ہے اور کنواں گہرا کرنا پڑتا ہے" : "Picture: water level underground. More pumping lowers the level, and the well must go deeper"}>
          <rect width="320" height="150" rx="12" fill="#e0f2fe" />
          <rect x="0" y="44" width="320" height="106" fill="#b45309" />
          <rect x="0" y="44" width="320" height="6" fill="#16a34a" />
          {/* today's level and the lower level */}
          <rect x="0" y="92" width="320" height="58" fill="#38bdf8" opacity="0.55" />
          <line x1="0" y1="92" x2="320" y2="92" stroke="#0369a1" strokeWidth="2.5" strokeDasharray="6 4" />
          <rect x="0" y="116" width="320" height="34" fill="#0369a1" opacity="0.55" />
          <line x1="0" y1="116" x2="320" y2="116" stroke="#dc2626" strokeWidth="2.5" />
          {/* the well and the pump */}
          <rect x="146" y="22" width="28" height="22" rx="3" fill="#475569" />
          <rect x="157" y="44" width="6" height="86" fill="#94a3b8" />
          <circle cx="160" cy="132" r="5" fill="#475569" />
          {/* panel and sun */}
          <circle cx="34" cy="22" r="11" fill="#f59e0b" />
          <polygon points="60,40 70,16 112,16 102,40" fill="#1e3a8a" />
          {/* arrow down */}
          <path d="M268 94 v20" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="268,122 260,110 276,110" fill="#dc2626" />
          {/* crop */}
          {[200, 226].map((x) => (
            <g key={x} stroke="#16a34a" strokeWidth="2" fill="#22c55e" strokeLinecap="round">
              <line x1={x} y1="44" x2={x} y2="28" />
              <path d={`M${x} 36 q-8 -3 -9 -10 q8 1 9 10z`} />
            </g>
          ))}
        </svg>
        <p className="text-sm font-medium text-slate-800">{ur ? "جتنا زیادہ پمپ چلے گا، پانی کی سطح اتنی نیچے جائے گی۔" : "The more the pump runs, the lower the water goes."}</p>

        {/* his own week, in drums */}
        {wasted ? (
          <div className="rounded-xl bg-red-50 p-3" role="img" aria-label={ur ? `اس ہفتے تقریباً ${drums} ڈرم پانی ضائع ہوا` : `About ${drums} drums of water wasted this week`}>
            <p className="text-xs font-semibold text-red-900">{ur ? "اس ہفتے آپ کا ضائع پانی" : "Your wasted water this week"}</p>
            <div className="mt-1 flex flex-wrap gap-0.5" aria-hidden>
              {Array.from({ length: Math.min(drums, 30) }, (_, i) => (
                <svg key={i} viewBox="0 0 12 16" className="h-5 w-4"><rect x="1" y="1" width="10" height="14" rx="2" fill="#0369a1" /><rect x="1" y="6" width="10" height="2" fill="#7dd3fc" /></svg>
              ))}
              {drums > 30 && <span className="num self-center text-xs font-bold text-red-900">+{drums - 30}</span>}
            </div>
            <p className="num mt-1 text-base font-bold text-red-800">{drums.toLocaleString("en-US")} {ur ? `ڈرم (ہر ڈرم ${DRUM_L} لیٹر)` : `drums (${DRUM_L} L each)`}{ureaKg >= 0.1 && <span className="font-medium text-slate-700"> · {ureaKg.toFixed(1)} {ur ? "کلو یوریا بھی" : "kg urea too"}</span>}</p>
          </div>
        ) : (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{ur ? "اس ہفتے آپ نے پانی ضائع نہیں کیا۔ شاباش!" : "You wasted no water this week. Well done!"}</p>
        )}

        <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-950"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden /> <span>{p(tip)}</span></p>
      </CardContent>
    </Card>
  );
}
