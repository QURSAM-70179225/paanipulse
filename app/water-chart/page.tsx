import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { WaterChart, type ChartLabels } from "@/components/WaterChart";
import { dictFor, dirFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Water chart · PaaniPulse" };

/** Public page: how much water a field needs from crop, stage, soil, season and area only. No sensors, no sign-in, no network calls. */
export default async function WaterChartPage() {
  const lang = await getLang("ur");
  const d = dictFor(lang);
  const labels: ChartLabels = {
    title: d.chartTitle, intro: d.chartIntro, crop: d.chartCrop, stage: d.chartStage, soil: d.chartSoil, season: d.chartSeason, method: d.chartMethod,
    area: d.chartArea, flow: d.chartFlow, result: d.chartResult, use: d.chartUse, daily: d.chartDaily, every: d.chartEvery, rice: d.chartRice,
    hours: d.chartHours, perAcre: d.chartPerAcre, note: d.chartNote, tableTitle: d.chartTableTitle,
    crops: { wheat: lang === "ur" ? "گندم" : "Wheat", rice: lang === "ur" ? "چاول" : "Rice", maize: lang === "ur" ? "مکئی" : "Maize", cotton: lang === "ur" ? "کپاس" : "Cotton", sugarcane: lang === "ur" ? "گنا" : "Sugarcane" },
    stages: { initial: d.stageInitial, development: d.stageDevelopment, mid: d.stageMid, late: d.stageLate },
    soils: { sand: d.soilSand, "sandy-loam": d.soilSandyLoam, loam: d.soilLoam, clay: d.soilClay },
    seasons: { cool: d.seasonCool, mild: d.seasonMild, hot: d.seasonHot },
    methods: { flood: d.flood, furrow: d.furrow, sprinkler: d.sprinkler, drip: d.drip },
  };
  return (
    <main dir={dirFor(lang)} className={cn("mx-auto min-h-screen max-w-md bg-slate-50 pb-10", lang === "ur" && "ur-ui")}>
      <header className="bg-gradient-to-br from-emerald-800 to-emerald-600 px-4 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex min-h-10 items-center gap-1 text-sm text-emerald-50"><ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {d.chartBack}</Link>
          <LanguageToggle lang={lang} />
        </div>
        <h1 className="mt-3 text-2xl font-bold">{d.chartTitle}</h1>
        <p className="text-sm text-emerald-50">{d.chartSub}</p>
      </header>
      <div className="px-4 pt-4"><WaterChart labels={labels} /></div>
    </main>
  );
}
