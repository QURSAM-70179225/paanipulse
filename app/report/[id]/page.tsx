import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Coins, Droplets, Gauge, ShieldCheck, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { canAccessFarm, getSession } from "@/lib/auth/session";
import { getWellReport } from "@/lib/services/report";
import { dictFor, dirFor, fill, type DictKey } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { PrintButton } from "@/components/PrintButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Well report · PaaniPulse" };

const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
const n1 = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 1 });

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/report/${id}`);
  const isAuthority = user.role === "AUTHORITY";
  if (isAuthority) {
    const f = await prisma.farm.findUnique({ where: { id }, select: { dataConsent: true } });
    if (!f?.dataConsent) notFound();
  } else if (!(await canAccessFarm(user, id))) notFound();

  const r = await getWellReport(id, { anonymise: isAuthority });
  if (!r) notFound();
  const lang = await getLang(isAuthority ? "en" : "ur");
  const d = dictFor(lang);
  const T = (k: DictKey, v?: Record<string, string | number>) => (v ? fill(d[k], v) : d[k]);
  const ur = lang === "ur";
  const back = isAuthority ? "/authority" : user.role === "INSTALLER" ? "/installer" : `/farmer/${id}`;
  const trend = r.water.trendDelta < -3 ? T("rptImproving") : r.water.trendDelta > 3 ? T("rptWorsening") : T("rptSteady");
  const flags = [
    r.flags.overPumping && T("flagOver"),
    r.flags.uncalibrated && T("flagUncal"),
    r.flags.noDataDays > 0 && T("flagNoData", { n: r.flags.noDataDays }),
  ].filter(Boolean) as string[];

  const Row = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className={cn("num text-end font-semibold text-slate-900", tone)}><bdi dir="ltr">{value}</bdi></dd>
    </div>
  );
  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <section className="break-inside-avoid rounded-xl border border-slate-200 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900"><Icon className="h-5 w-5 text-sky-700" aria-hidden /> {title}</h2>
      <dl className="text-sm">{children}</dl>
    </section>
  );

  return (
    <main dir={dirFor(lang)} className={cn("min-h-screen bg-slate-100 py-6", ur && "ur-ui")}>
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4">
        <Link href={back} className="inline-flex min-h-9 items-center gap-1 text-sm text-slate-700"><ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> {d.appName}</Link>
        <div className="flex items-center gap-3"><div className="rounded-full bg-slate-700 p-0.5"><LanguageToggle lang={lang} /></div><PrintButton label={T("rptPrint")} /></div>
      </div>
      <article className="print-page mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">PaaniPulse</p>
            <h1 className="text-2xl font-bold text-slate-900">{T("rptTitle")}</h1>
            <p className="text-sm text-slate-600">{T("rptSub", { n: r.period.days })}</p>
            {r.farm.synthetic && <p className="mt-1 text-xs font-semibold text-amber-700">{T("simulated")}</p>}
          </div>
          <div className="text-end">
            <p className="text-xs text-slate-500">{T("rptScore")}</p>
            <p className={cn("num text-5xl font-bold", r.score >= 80 ? "text-emerald-700" : r.score >= 60 ? "text-amber-600" : "text-red-700")}>{r.score}</p>
            <p className="max-w-[14rem] text-xs text-slate-500">{T("rptScoreNote")}</p>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-4">
          <div><dt className="text-slate-500">{T("rptWell")}</dt><dd className="num font-semibold">{r.ref}</dd></div>
          <div><dt className="text-slate-500">{T("rptOwner")}</dt><dd className="font-semibold">{r.farm.name ?? T("rptAnonymised")}</dd></div>
          <div><dt className="text-slate-500">{T("district")}</dt><dd className="font-semibold">{r.farm.tehsil ? `${r.farm.tehsil}, ` : ""}{r.farm.district}</dd></div>
          <div><dt className="text-slate-500">{T("rptPump")}</dt><dd className="num font-semibold"><bdi dir="ltr">{r.pump.ratedKw} kW · {r.pump.pvKwp} kWp</bdi></dd></div>
          <div className="col-span-2 mt-2 text-xs text-slate-500 sm:col-span-4">
            {r.period.from} → {r.period.to} · {r.pump.source === "telemetry" ? T("telemetry") : T("fromSunlight")} · {r.pump.calibrated ? T("calibrated") : T("defaultEstimate")} · {T("rptGenerated", { date: new Date().toISOString().slice(0, 10) })}
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <Section icon={Gauge} title={T("rptAsset")}>
            <Row label={T("rptDaysUsed")} value={`${r.asset.pumpedDays} / ${r.period.days}`} />
            <Row label={T("rptRunHours")} value={`${n1(r.asset.runHours)} h`} />
            <Row label={T("rptEnergyUsed")} value={`${n0(r.asset.energyUsedKwh)} kWh`} />
            <Row label={T("rptSolarAvailable")} value={`${n0(r.asset.solarKwh)} kWh`} />
            <Row label={T("rptUtilisation")} value={`${n0(r.asset.utilisationPct)}%`} />
          </Section>
          <Section icon={Droplets} title={T("rptWater")}>
            <Row label={T("rptPumped")} value={`${n0(r.water.pumpedM3)} m³`} />
            <Row label={T("rptNeeded")} value={`${n0(r.water.needM3)} m³`} />
            <Row label={T("rptLost")} value={`${n0(r.water.excessM3)} m³ (${n0(r.water.lostPct)}%)`} tone={r.water.lostPct > 30 ? "text-red-700" : undefined} />
            <Row label={T("rptTrend")} value={trend} />
          </Section>
          <Section icon={Coins} title={T("rptIncome")}>
            <Row label={T("rptSpare")} value={`${n0(r.income.spareKwh)} kWh`} />
            <Row label={T("rptSpareValue")} value={`Rs ${n0(r.income.spareRsPerMonth)} ${T("rptPerMonth")}`} tone="text-emerald-700" />
            <Row label={T("rptWasteValue")} value={`${n0(r.income.wastedKwh)} kWh ≈ Rs ${n0(r.income.wastedRsPerMonth)} ${T("rptPerMonth")}`} />
            <Row label={T("rptUrea")} value={`${n1(r.income.ureaKg)} kg ≈ Rs ${n0(r.income.ureaRs)}`} />
          </Section>
          <Section icon={ShieldCheck} title={T("rptFlags")}>
            {flags.length === 0 ? (
              <p className="flex items-center gap-2 py-2 text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden /> {T("flagNone")}</p>
            ) : (
              <ul className="flex flex-col gap-2 py-2">
                {flags.map((f) => <li key={f} className="flex items-start gap-2 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {f}</li>)}
              </ul>
            )}
          </Section>
        </div>
        <p className="flex items-start gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500"><Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {T("rptMethod")}</p>
      </article>
    </main>
  );
}
