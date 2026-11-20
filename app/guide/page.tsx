import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { GuidePlayer } from "@/components/guide/GuidePlayer";
import { GUIDE, GUIDE_TOPICS } from "@/lib/services/appGuide";
import { dictFor, dirFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "How to use · PaaniPulse" };

/** Public page: the voice guide plus a short written explanation of every feature. No data needed. */
export default async function GuidePage({ searchParams }: { searchParams: Promise<{ farm?: string }> }) {
  const { farm } = await searchParams;
  const lang = await getLang("ur");
  const d = dictFor(lang);
  const ur = lang === "ur";
  const farmId = farm && /^[\w-]{1,64}$/.test(farm) ? farm : null;
  const back = farmId ? `/farmer/${farmId}` : "/";
  return (
    <main dir={dirFor(lang)} className={cn("mx-auto min-h-screen max-w-md bg-slate-50 pb-10", ur && "ur-ui")}>
      <header className="bg-gradient-to-br from-sky-800 to-sky-600 px-4 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <Link href={back} className="inline-flex min-h-10 items-center gap-1 text-sm text-sky-50">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {d.guideBack}
          </Link>
          <LanguageToggle lang={lang} />
        </div>
        <h1 className="mt-3 text-2xl font-bold">{d.guideTitle}</h1>
        <p className="mt-1 text-sky-50">{d.guideIntro}</p>
        <GuidePlayer lang={lang} labels={{ play: d.guidePlay, stop: d.guideStop, unavailable: d.voiceUnavailable }} className="mt-3" />
      </header>
      <div className="flex flex-col gap-3 px-4 pt-4">
        <h2 className="text-lg font-bold text-slate-900">{d.guideFeatures}</h2>
        <p className="text-sm text-slate-600">{d.guideNeedsHardware}</p>
        {GUIDE_TOPICS.map((t) => (
          <section key={t} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-semibold text-slate-900">{GUIDE[t].title[lang]}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{GUIDE[t].how[lang]}</p>
          </section>
        ))}
        {farmId && (
          <Link href={`/farmer/${farmId}/chat`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 font-semibold text-white">
            <MessageCircle className="h-5 w-5" aria-hidden /> {d.guideAsk}
          </Link>
        )}
      </div>
    </main>
  );
}
