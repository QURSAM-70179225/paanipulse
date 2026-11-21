/**
 * Small pictures that replace sentences on the farm page: a picture is quicker to read than words, and works for a farmer who reads
 * little. Server components (no state), so they cost nothing on the phone. Every picture keeps a short label for screen readers.
 */
import { Droplets, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** How much usable water is left in the root zone, as a filling bar: full blue, low amber, empty red. */
export function SoilTank({ leftPct, label, full, empty }: { leftPct: number; label: string; full: string; empty: string }) {
  const p = Math.max(0, Math.min(100, Math.round(leftPct)));
  const fill = p >= 50 ? "bg-sky-300" : p >= 20 ? "bg-amber-300" : "bg-red-400";
  return (
    <div className="mt-3" role="img" aria-label={`${label}: ${p}%`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-white/90"><Droplets className="h-4 w-4" aria-hidden /> {label}</p>
      <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-white/20">
        <div className={cn("h-full rounded-full transition-all", fill)} style={{ width: `${Math.max(p, 4)}%` }} />
      </div>
      <p className="mt-0.5 flex justify-between text-[11px] text-white/80"><span>{empty}</span><span className="num font-bold text-white">{p}%</span><span>{full}</span></p>
    </div>
  );
}

/** Three blocks: three green = sure, two = medium, one red = low. */
export function ConfidenceMeter({ level }: { level: "high" | "medium" | "low" }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  const on = level === "high" ? "bg-emerald-300" : level === "medium" ? "bg-amber-300" : "bg-red-300";
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => <span key={i} className={cn("w-1.5 rounded-sm", i <= n ? on : "bg-white/25")} style={{ height: `${6 + i * 3}px` }} />)}
    </span>
  );
}

/** Water pumped against what the crop needed, as two bars of the same scale. The difference is what was wasted. */
export function CompareBars({ a, b, unit, extraLabel }: { a: { label: string; value: number }; b: { label: string; value: number }; unit: string; extraLabel?: string }) {
  const max = Math.max(a.value, b.value, 1);
  const row = (label: string, value: number, color: string) => (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-slate-700">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-100" dir="ltr">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
      </div>
      <span className="num w-20 shrink-0 text-end text-xs font-bold text-slate-900" dir="ltr">{Math.round(value).toLocaleString("en-US")} {unit}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={`${a.label} ${Math.round(a.value)} ${unit}, ${b.label} ${Math.round(b.value)} ${unit}${extraLabel ? `, ${extraLabel}` : ""}`}>
      {row(a.label, a.value, a.value > b.value * 1.05 ? "bg-red-500" : "bg-sky-600")}
      {row(b.label, b.value, "bg-emerald-600")}
      {extraLabel && <p className="text-end text-xs font-bold text-red-700">{extraLabel}</p>}
    </div>
  );
}

/** One sun per hour of good sunshine (up to 12). */
export function SunRow({ hours }: { hours: number }) {
  const n = Math.max(0, Math.min(12, Math.round(hours)));
  return (
    <span className="mt-1 flex flex-wrap gap-0.5" aria-hidden>
      {Array.from({ length: n }, (_, i) => <Sun key={i} className="h-3.5 w-3.5 text-amber-500" />)}
    </span>
  );
}

/** A bar sized against the biggest value in its list. */
export function ValueBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-emerald-100" aria-hidden dir="ltr">
      <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(4, (value / Math.max(max, 1)) * 100)}%` }} />
    </span>
  );
}
