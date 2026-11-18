"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Coins, Download, Droplets, Gauge, Map as MapIcon, TrendingDown, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AuthorityData } from "@/lib/services/authority";
import { fill, type DictKey, type Lang } from "@/lib/i18n/dict";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ExtractionMap = dynamic(() => import("./ExtractionMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-200" />,
});

const CROPS = ["wheat", "sugarcane", "maize", "rice", "cotton"] as const;
const CROP_LABEL: Record<string, { en: string; ur: string }> = {
  wheat: { en: "Wheat", ur: "گندم" }, rice: { en: "Rice", ur: "چاول" }, maize: { en: "Maize", ur: "مکئی" },
  cotton: { en: "Cotton", ur: "کپاس" }, sugarcane: { en: "Sugarcane", ur: "گنا" },
};
const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
const n1 = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function AuthorityDashboard({ initial, lang, dict }: { initial: AuthorityData; lang: Lang; dict: Record<DictKey, string> }) {
  const T = (k: DictKey, v?: Record<string, string | number>) => (v ? fill(dict[k], v) : dict[k]);
  const ur = lang === "ur";
  const [district, setDistrict] = useState("");
  const [crop, setCrop] = useState("");
  const [days, setDays] = useState(7);
  const [minExcess, setMinExcess] = useState(0);
  const [data, setData] = useState<AuthorityData>(initial);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const qs = useMemo(() => {
    const p = new URLSearchParams({ days: String(days), minExcessPct: String(minExcess) });
    if (district) p.set("district", district);
    if (crop) p.set("crop", crop);
    return p.toString();
  }, [district, crop, days, minExcess]);

  useEffect(() => {
    if (qs === "days=7&minExcessPct=0") {
      setData(initial);
      return;
    }
    const ctrl = new AbortController();
    setState("loading");
    fetch(`/api/authority/summary?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: AuthorityData) => {
        setData(d);
        setState("idle");
      })
      .catch((e) => e?.name !== "AbortError" && setState("error"));
    return () => ctrl.abort();
  }, [qs, initial]);

  const k = data.kpis;
  const mapFarms = useMemo(() => data.farms.map((f) => ({ ref: f.ref, district: f.district, crop: f.crop, lat: f.lat, lng: f.lng, intensity: f.intensity, excessPct: f.excessPct, wastedKwh: f.wastedKwh })), [data]);
  const chartRows = data.districts.map((d) => ({ district: d.district, pumped: Math.round(d.pumpedM3), need: Math.round(d.needM3) }));
  const selectCls = "h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 via-sky-900 to-emerald-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex min-h-9 items-center gap-1 text-sm text-sky-100 hover:text-white">
              <ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> {T("appName")}
            </Link>
            <LanguageToggle lang={lang} />
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <MapIcon className="h-7 w-7 shrink-0" aria-hidden /> {T("authTitle")}
          </h1>
          <p className="text-sky-100">{T("authSubtitle")}</p>
        </div>
      </header>

      {data.simulated && (
        <div role="note" className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <AlertTriangle className="me-1 inline h-4 w-4" aria-hidden /> {T("simulatedBanner")}
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
        {/* Filters */}
        <section aria-label="Filters" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {T("filterDistrict")}
            <select className={selectCls} value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">{T("all")}</option>
              {data.availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {T("filterCrop")}
            <select className={selectCls} value={crop} onChange={(e) => setCrop(e.target.value)}>
              <option value="">{T("all")}</option>
              {CROPS.map((c) => <option key={c} value={c}>{CROP_LABEL[c][lang]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {T("filterPeriod")}
            <select className={selectCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={1}>{T("lastDay")}</option>
              {[7, 14, 30].map((d) => <option key={d} value={d}>{T("lastNDays", { n: d })}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {T("filterMinExcess")}
            <select className={selectCls} value={minExcess} onChange={(e) => setMinExcess(Number(e.target.value))}>
              {[0, 15, 30, 45].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </label>
          <a href={`/api/authority/export.csv?${qs}`} className={cn(buttonVariants({ variant: "secondary" }), "ms-auto")} download>
            <Download className="h-4 w-4" aria-hidden /> {T("exportCsv")}
          </a>
        </section>
        <p aria-live="polite" className="sr-only">{state === "loading" ? T("loading") : ""}</p>
        {state === "error" && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{T("loadError")}</p>}

        {/* KPIs */}
        <section aria-label="Key figures" className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5", state === "loading" && "opacity-60")}>
          <Kpi icon={Droplets} label={T("kpiExtraction")} value={`${n0(k.extractionM3)} m³`} sub={T("kpiPerDay", { v: n0(k.extractionPerDayM3) })} />
          <Kpi icon={TrendingDown} label={T("kpiAvgExcess")} value={`${n0(k.avgExcessPct)}%`} sub={T("kpiAvgExcessSub")} tone="text-red-700" />
          <Kpi icon={Gauge} label={T("kpiWellsOver")} value={n0(k.wellsOver30)} sub={T("kpiWellsOverSub", { n: k.wells })} tone="text-amber-700" />
          <Kpi icon={Zap} label={T("kpiWastedMwh")} value={`${n1(k.wastedMwh)} MWh`} sub={T("kpiWastedSub")} tone="text-sky-800" />
          <Kpi icon={Coins} label={T("kpiPotential")} value={`${n0(k.potentialSavingM3)} m³`} sub={T("kpiPotentialSub", { mwh: n1(k.wastedMwh), rs: n0(k.potentialSavingRs) })} tone="text-emerald-800" />
        </section>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Map */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{T("mapTitle")}</CardTitle>
              <ul className="flex flex-wrap gap-4 text-xs text-slate-700">
                {[["#dc2626", T("mapLegendHigh")], ["#f59e0b", T("mapLegendMid")], ["#16a34a", T("mapLegendLow")]].map(([c, l]) => (
                  <li key={l} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: c }} aria-hidden /> {l}</li>
                ))}
              </ul>
            </CardHeader>
            <CardContent>
              <div className="h-[420px] overflow-hidden rounded-xl" dir="ltr">
                {data.farms.length ? (
                  <ExtractionMap farms={mapFarms} labels={{ excess: T("excessLabel"), intensity: T("intensityLabel"), wasted: T("wastedLabel") }} />
                ) : (
                  <p className="flex h-full items-center justify-center bg-slate-100 text-slate-600">{T("noResults")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* District chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{T("districtTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[420px]" dir="ltr" role="img" aria-label={T("districtTitle")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="district" interval={0} angle={-35} textAnchor="end" height={56} tick={{ fontSize: 11, fill: "#334155" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#334155" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} width={40} />
                    <Tooltip formatter={(v) => `${Number(v).toLocaleString("en-US")} m³`} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                    <Bar dataKey="pumped" name={T("colPumped")} fill="#0369a1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="need" name={T("colNeed")} fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* District table */}
        <Card>
          <CardContent className="overflow-x-auto pt-5">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">{T("districtTitle")}</caption>
              <thead>
                <tr className="border-b border-slate-200 text-start text-slate-600">
                  {(["colDistrict", "colWells", "colPumped", "colNeed", "colExcess", "colOver30", "colMwh"] as DictKey[]).map((c, i) => (
                    <th key={c} scope="col" className={cn("px-2 py-2 font-semibold", i === 0 ? "text-start" : "text-end")}>{T(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.districts.map((d) => (
                  <tr key={d.district} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-2 py-2 text-start font-semibold text-slate-900">{d.district}</th>
                    <td className="num px-2 py-2 text-end">{d.wells}</td>
                    <td className="num px-2 py-2 text-end">{n0(d.pumpedM3)}</td>
                    <td className="num px-2 py-2 text-end">{n0(d.needM3)}</td>
                    <td className={cn("num px-2 py-2 text-end font-semibold", d.excessPct > 30 ? "text-red-700" : d.excessPct > 15 ? "text-amber-700" : "text-emerald-700")}>{n0(d.excessPct)}%</td>
                    <td className="num px-2 py-2 text-end">{d.wellsOver30}</td>
                    <td className="num px-2 py-2 text-end">{n1(d.wastedMwh)}</td>
                  </tr>
                ))}
                {data.districts.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-6 text-center text-slate-600">{T("noResults")}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-xs text-slate-600">{T("dataNote")}</p>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = "text-slate-900" }: { icon: React.ElementType; label: string; value: string; sub: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600"><Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}</p>
        <p className={cn("num mt-1 text-2xl font-bold", tone)}>
          <bdi dir="ltr">{value}</bdi>
        </p>
        <p className="mt-0.5 text-xs text-slate-600">{sub}</p>
      </CardContent>
    </Card>
  );
}
