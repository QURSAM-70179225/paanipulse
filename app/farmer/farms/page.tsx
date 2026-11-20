import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Power, PowerOff, Radio, Sprout } from "lucide-react";
import { AccountBar } from "@/components/auth/AccountBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Card } from "@/components/ui/card";
import { effectiveOn } from "@/lib/engine";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { dictFor, dirFor, fill } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { areaText } from "@/lib/i18n/area";
import { isLandUnit } from "@/lib/engine/landUnits";
import { getFarmState } from "@/lib/services/farmState";
import { farmLabel } from "@/lib/services/farmLabel";
import { pumpControlAvailable } from "@/lib/services/pumpControl";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My farms · PaaniPulse" };

/** All the farms in one account at a glance: today's advice, the pump and the soil probe of each. Each farm is controlled separately on its own page. */
export default async function MyFarmsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/farmer/farms");
  if (user.role === "INSTALLER") redirect("/installer");
  if (user.role === "AUTHORITY") redirect("/authority");
  const lang = await getLang("ur");
  const d = dictFor(lang);
  const farms = await prisma.farm.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, nickname: true, district: true, cropType: true, variety: true, areaAcres: true, areaUnit: true, pumps: { select: { controlEnabled: true, desiredOn: true, offAt: true, autoStopWhenFull: true, deviceOn: true, deviceSeenAt: true }, take: 1 } },
  });
  if (farms.length === 0) redirect("/farmer/onboard");
  const now = new Date();
  const rows = await Promise.all(
    farms.map(async (f) => {
      const state = await getFarmState(f.id).catch(() => null);
      const soil = await prisma.soilReading.findFirst({ where: { farmId: f.id, timestamp: { lte: new Date(now.getTime() + 600_000) } }, orderBy: { timestamp: "desc" }, select: { moisturePct: true, timestamp: true } });
      const p = f.pumps[0];
      const control = pumpControlAvailable() && !!p?.controlEnabled;
      return { f, state, soil, control, on: !!p && effectiveOn(p, now) };
    }),
  );
  return (
    <main dir={dirFor(lang)} className={cn("mx-auto min-h-screen max-w-md bg-slate-50 pb-10", lang === "ur" && "ur-ui")}>
      <header className="bg-gradient-to-br from-emerald-800 to-teal-700 px-4 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex min-h-9 items-center gap-1 text-sm text-emerald-100 hover:text-white"><ArrowLeft className={cn("h-4 w-4", lang === "ur" && "rotate-180")} aria-hidden /> {d.appName}</Link>
          <LanguageToggle lang={lang} />
        </div>
        <AccountBar user={user} signOutLabel={d.signOut} className="mt-2 justify-between text-emerald-50" />
        <h1 className="mt-2 text-2xl font-bold">{d.myFarms}</h1>
        <p className="text-sm text-emerald-50">{d.farmOverviewHint}</p>
      </header>
      <div className="flex flex-col gap-3 px-4 pt-4">
        {rows.map(({ f, state, soil, control, on }) => {
          const a = state?.today.advice;
          const advice = !a ? "" : a.kind === "irrigate" ? fill(d.adviceIrrigate, { h: a.hoursToday }) : a.kind === "skip-rain" ? d.adviceSkipRain : d.adviceKeepOff;
          return (
            <Link key={f.id} href={`/farmer/${f.id}`} className="block">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <p className="flex items-center gap-2 text-lg font-bold text-slate-900"><Sprout className="h-5 w-5 text-emerald-700" aria-hidden /> {farmLabel(f, lang)}</p>
                <p className="num text-sm text-slate-600">{f.district} · {areaText(f.areaAcres, isLandUnit(f.areaUnit) ? f.areaUnit : "acre", (k) => d[k])}</p>
                {advice && <p className={cn("mt-2 rounded-xl px-3 py-2 text-sm font-semibold", a?.kind === "irrigate" ? "bg-emerald-50 text-emerald-900" : "bg-sky-50 text-sky-900")}>{advice}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                  <span className="inline-flex items-center gap-1">{control ? (on ? <Power className="h-4 w-4 text-emerald-700" aria-hidden /> : <PowerOff className="h-4 w-4 text-slate-500" aria-hidden />) : <PowerOff className="h-4 w-4 text-slate-300" aria-hidden />} {control ? (on ? d.pumpCtlOn : d.pumpCtlOff) : d.farmPumpNone}</span>
                  <span className="inline-flex items-center gap-1"><Radio className={cn("h-4 w-4", soil ? "text-sky-700" : "text-slate-300")} aria-hidden /> {soil ? fill(d.farmSoil, { pct: soil.moisturePct.toFixed(1) }) : d.farmNoProbe}</span>
                </p>
              </Card>
            </Link>
          );
        })}
        <Link href="/farmer/onboard" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-600 bg-white font-semibold text-emerald-800"><Plus className="h-5 w-5" aria-hidden /> {d.addFarm}</Link>
      </div>
    </main>
  );
}
