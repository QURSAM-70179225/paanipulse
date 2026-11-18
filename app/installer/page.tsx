import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Gauge, LayoutDashboard, Plus, Radio, Sprout, Wrench } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getInstallerFarms } from "@/lib/services/installer";
import { prisma } from "@/lib/db";
import { dictFor, dirFor, fill } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AccountBar } from "@/components/auth/AccountBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResetPinButton } from "@/components/account/SecretForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Installer portal · PaaniPulse" };

const CROP: Record<string, { en: string; ur: string }> = {
  wheat: { en: "Wheat", ur: "گندم" }, rice: { en: "Rice", ur: "چاول" }, maize: { en: "Maize", ur: "مکئی" }, cotton: { en: "Cotton", ur: "کپاس" }, sugarcane: { en: "Sugarcane", ur: "گنا" },
};

export default async function InstallerPage() {
  const user = await getSession();
  if (!user || user.role !== "INSTALLER") redirect("/login?next=/installer");
  const lang = await getLang("en");
  const d = dictFor(lang);
  const ur = lang === "ur";
  const org = (await prisma.user.findUnique({ where: { id: user.id }, select: { organisation: true } }))?.organisation;
  const { rows, kpis } = await getInstallerFarms(user.id);

  const Kpi = ({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) => (
    <Card><CardContent className="pt-5"><p className="flex items-center gap-1.5 text-sm text-slate-600"><Icon className="h-4 w-4" aria-hidden /> {label}</p><p className={cn("num mt-1 text-3xl font-bold", tone)}>{value}</p></CardContent></Card>
  );

  return (
    <main dir={dirFor(lang)} className={cn("min-h-screen bg-slate-50", ur && "ur-ui")}>
      <header className="bg-gradient-to-r from-amber-700 via-orange-700 to-emerald-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-sm text-amber-100">{d.appName}</Link>
            <div className="flex flex-wrap items-center gap-3"><AccountBar user={user} signOutLabel={d.signOut} /><LanguageToggle lang={lang} /></div>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Wrench className="h-7 w-7" aria-hidden /> {d.installerTitle}{org ? ` · ${org}` : ""}</h1>
          <p className="text-amber-50">{d.installerSub}</p>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
        <div className="flex justify-end">
          <Link href="/installer/new" className={cn(buttonVariants({ size: "lg" }))}><Plus className="h-5 w-5" aria-hidden /> {d.registerFarmer}</Link>
        </div>
        <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Sprout} label={d.kpiFarms} value={kpis.farms} tone="text-slate-900" />
          <Kpi icon={AlertTriangle} label={d.kpiOverPumping} value={kpis.overPumping} tone="text-red-700" />
          <Kpi icon={Gauge} label={d.kpiCalibrated} value={kpis.calibrated} tone="text-emerald-800" />
          <Kpi icon={Radio} label={d.kpiConnected} value={kpis.connected} tone="text-sky-800" />
        </section>
        <Card>
          <CardContent className="overflow-x-auto pt-5">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  {[d.colFarmer, d.district, d.colCrop, d.colStatus, d.kpiCalibrated, d.colActions].map((h, i) => (
                    <th key={i} scope="col" className="px-2 py-2 text-start font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-2 py-2 text-start font-semibold text-slate-900">
                      {r.farmerName}
                      {r.phoneMasked && <span className="num block text-xs font-normal text-slate-500" dir="ltr">{r.phoneMasked}</span>}
                      {r.synthetic && <Badge variant="outline" className="mt-0.5">sim</Badge>}
                    </th>
                    <td className="px-2 py-2">{r.tehsil ? `${r.tehsil}, ` : ""}{r.district}</td>
                    <td className="px-2 py-2">{CROP[r.crop]?.[lang] ?? r.crop} · <span className="num">{r.areaAcres}</span> {d.acres}</td>
                    <td className="px-2 py-2">
                      {!r.hasData ? <span className="text-slate-500">{d.statusNoData}</span> : (
                        <span className={cn("font-semibold", r.lostPct > 30 ? "text-red-700" : r.lostPct > 15 ? "text-amber-700" : "text-emerald-700")}>{fill(d.statusLost, { pct: Math.round(r.lostPct) })}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {r.calibrated ? <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-label={d.calibrated} /> : <span className="text-xs text-amber-800">{d.visitNeeded}</span>}
                      {r.telemetry && <Radio className="ms-1 inline h-4 w-4 text-sky-700" aria-label={d.telemetry} />}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Link href={`/farmer/${r.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-2 hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" aria-hidden /> {d.openDashboard}</Link>
                        <Link href={`/report/${r.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-2 hover:bg-slate-50"><FileText className="h-4 w-4" aria-hidden /> {d.openReport}</Link>
                        {r.ownerId && !r.synthetic && <ResetPinButton farmerId={r.ownerId} name={r.farmerName} d={d} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
