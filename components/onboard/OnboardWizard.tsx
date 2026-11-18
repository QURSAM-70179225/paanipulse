"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Check, Crosshair, Droplets, Gauge, MapPin, ShieldCheck, Sprout, User } from "lucide-react";
import { DISTRICTS, TYPICAL_PUMP } from "@/lib/services/farmInput";
import type { DictKey, Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-200" /> });

const CROPS = [
  { id: "wheat", en: "Wheat", ur: "گندم" },
  { id: "rice", en: "Rice", ur: "چاول" },
  { id: "maize", en: "Maize", ur: "مکئی" },
  { id: "cotton", en: "Cotton", ur: "کپاس" },
  { id: "sugarcane", en: "Sugarcane", ur: "گنا" },
] as const;
const METHODS = ["flood", "furrow", "sprinkler", "drip"] as const;

export function OnboardWizard({ mode, lang, dict }: { mode: "farmer" | "installer"; lang: Lang; dict: Record<DictKey, string> }) {
  const T = (k: DictKey, v?: Record<string, string | number>) => Object.entries(v ?? {}).reduce((a, [x, y]) => a.replaceAll(`{${x}}`, String(y)), dict[k]);
  const steps = mode === "installer" ? ["farmer", "location", "crop", "pump", "consent"] : ["location", "crop", "pump", "consent"];
  const [i, setI] = useState(0);
  const d0 = DISTRICTS[0];
  const [v, setV] = useState({
    farmerName: "", phone: "", pin: "",
    district: d0.name as string, lat: d0.lat as number, lng: d0.lng as number,
    cropType: "wheat", sowingDate: new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10), areaAcres: 10, irrigationMethod: "flood",
    ratedKw: TYPICAL_PUMP.ratedKw, pvKwp: TYPICAL_PUMP.pvKwp, staticDepthFt: d0.typicalDepthFt as number,
    dataConsent: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const up = (patch: Partial<typeof v>) => setV((s) => ({ ...s, ...patch }));
  const step = steps[i];
  const input = "num h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";
  const label = "flex flex-col gap-1 text-sm font-medium text-slate-700";

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => up({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }),
      () => setError(T("errGeneric")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district: v.district, lat: v.lat, lng: v.lng, cropType: v.cropType, sowingDate: v.sowingDate, areaAcres: v.areaAcres,
          irrigationMethod: v.irrigationMethod, ratedKw: v.ratedKw, pvKwp: v.pvKwp, staticDepthFt: v.staticDepthFt, language: lang, dataConsent: v.dataConsent,
          ...(mode === "installer" ? { farmer: { name: v.farmerName, phone: v.phone, pin: v.pin } } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "invalid-phone" ? T("errPhone") : data.error === "phone-taken" ? T("errTaken") : T("errGeneric"));
        return;
      }
      window.location.assign(mode === "installer" ? "/installer" : `/farmer/${data.id}`);
    } catch {
      setError(T("errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  const canNext =
    step === "farmer" ? v.farmerName.trim().length >= 2 && /\d{10,}/.test(v.phone.replace(/\D/g, "")) && /^\d{4,6}$/.test(v.pin) :
    step === "crop" ? v.areaAcres > 0 && !!v.sowingDate :
    step === "pump" ? v.ratedKw > 0 && v.pvKwp > 0 && v.staticDepthFt > 0 : true;

  const titles: Record<string, { k: DictKey; icon: React.ElementType }> = {
    farmer: { k: "farmerName", icon: User }, location: { k: "stepLocation", icon: MapPin }, crop: { k: "stepCrop", icon: Sprout },
    pump: { k: "stepPump", icon: Gauge }, consent: { k: "stepConsent", icon: ShieldCheck },
  };
  const Title = titles[step];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-slate-600">{T("step", { n: i + 1, total: steps.length })}</p>
        <div className="mt-1 flex gap-1" aria-hidden>
          {steps.map((s, k) => <span key={s} className={cn("h-1.5 flex-1 rounded-full", k <= i ? "bg-emerald-600" : "bg-slate-200")} />)}
        </div>
      </div>
      <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Title.icon className="h-6 w-6 text-emerald-700" aria-hidden /> {T(Title.k)}</h2>

      {step === "farmer" && (
        <div className="flex flex-col gap-3">
          <label className={label}>{T("farmerName")}<input className={input} value={v.farmerName} onChange={(e) => up({ farmerName: e.target.value })} autoComplete="off" /></label>
          <label className={label}>{T("phone")}<input className={input} dir="ltr" type="tel" inputMode="tel" placeholder={T("phoneHint")} value={v.phone} onChange={(e) => up({ phone: e.target.value })} /></label>
          <label className={label}>{T("tempPin")}<input className={cn(input, "tracking-[0.4em]")} dir="ltr" inputMode="numeric" maxLength={6} value={v.pin} onChange={(e) => up({ pin: e.target.value.replace(/\D/g, "") })} /></label>
        </div>
      )}

      {step === "location" && (
        <div className="flex flex-col gap-3">
          <label className={label}>
            {T("district")}
            <select
              className={input}
              value={v.district}
              onChange={(e) => {
                const d = DISTRICTS.find((x) => x.name === e.target.value)!;
                up({ district: d.name, lat: d.lat, lng: d.lng, staticDepthFt: d.typicalDepthFt });
              }}
            >
              {DISTRICTS.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={locate} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white font-semibold text-emerald-800 hover:bg-emerald-50">
            <Crosshair className="h-5 w-5" aria-hidden /> {T("useMyLocation")}
          </button>
          <p className="text-sm text-slate-600">{T("tapMap")}</p>
          <div className="h-64 overflow-hidden rounded-xl border border-slate-200" dir="ltr">
            <LocationPicker lat={v.lat} lng={v.lng} onPick={(lat, lng) => up({ lat, lng })} />
          </div>
          <p className="num text-xs text-slate-500" dir="ltr">{v.lat.toFixed(4)}, {v.lng.toFixed(4)}</p>
        </div>
      )}

      {step === "crop" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={T("stepCrop")}>
            {CROPS.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={v.cropType === c.id} onClick={() => up({ cropType: c.id })}
                className={cn("flex min-h-14 flex-col items-center justify-center rounded-xl border-2 text-sm font-semibold", v.cropType === c.id ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-800")}>
                <Sprout className="h-5 w-5" aria-hidden /> {c[lang]}
              </button>
            ))}
          </div>
          <label className={label}>{T("sowingDate")}<input className={input} type="date" value={v.sowingDate} onChange={(e) => up({ sowingDate: e.target.value })} /></label>
          <label className={label}>{T("area")}<input className={input} type="number" inputMode="decimal" min={0.5} step={0.5} value={v.areaAcres} onChange={(e) => up({ areaAcres: Number(e.target.value) })} /></label>
          <p className={label}>{T("irrigation")}</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={T("irrigation")}>
            {METHODS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={v.irrigationMethod === m} onClick={() => up({ irrigationMethod: m })}
                className={cn("min-h-12 rounded-xl border-2 text-sm font-semibold", v.irrigationMethod === m ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-800")}>
                {T(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "pump" && (
        <div className="flex flex-col gap-3">
          <label className={label}>{T("pumpKw")}<input className={input} type="number" inputMode="decimal" min={0.5} step={0.5} value={v.ratedKw} onChange={(e) => up({ ratedKw: Number(e.target.value) })} /></label>
          <label className={label}>{T("panelKwp")}<input className={input} type="number" inputMode="decimal" min={0.5} step={0.5} value={v.pvKwp} onChange={(e) => up({ pvKwp: Number(e.target.value) })} /></label>
          <label className={label}>
            {T("waterLevel")}
            <input className={input} type="number" inputMode="numeric" min={5} value={v.staticDepthFt} onChange={(e) => up({ staticDepthFt: Number(e.target.value) })} />
            <span className="text-xs font-normal text-slate-500">{T("waterLevelHint")}</span>
          </label>
          <button type="button" onClick={() => up({ ...TYPICAL_PUMP, staticDepthFt: DISTRICTS.find((d) => d.name === v.district)?.typicalDepthFt ?? 100 })}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50">
            <Droplets className="h-4 w-4" aria-hidden /> {T("dontKnow")}
          </button>
        </div>
      )}

      {step === "consent" && (
        <div className="flex flex-col gap-3">
          <p className="text-base text-slate-800">{T("consentText")}</p>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <input type="checkbox" className="h-6 w-6 accent-emerald-700" checked={v.dataConsent} onChange={(e) => up({ dataConsent: e.target.checked })} />
            <span className="font-medium">{T("consentYes")}</span>
          </label>
          <p className="text-sm text-slate-600">{T("bucketLater")}</p>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        {i > 0 && (
          <button type="button" onClick={() => setI(i - 1)} className="h-12 flex-1 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800">{T("back")}</button>
        )}
        {i < steps.length - 1 ? (
          <button type="button" disabled={!canNext} onClick={() => setI(i + 1)} className="h-12 flex-[2] rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-50">{T("next")}</button>
        ) : (
          <button type="button" disabled={busy} onClick={save} className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-50">
            <Check className="h-5 w-5" aria-hidden /> {T("finish")}
          </button>
        )}
      </div>
    </div>
  );
}
