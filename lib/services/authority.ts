/**
 * Regional (authority / lender) view: anonymised, district-level aggregation of stored DailyRecords.
 * No farmer names or phone numbers leave this module; coordinates are coarsened.
 */
import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEFAULTS } from "@/lib/engine";

export const AuthorityQuery = z.object({
  district: z.string().max(40).optional(),
  crop: z.enum(["wheat", "rice", "maize", "cotton", "sugarcane"]).optional(),
  days: z.coerce.number().int().refine((d) => [1, 7, 14, 30].includes(d), "days must be 1, 7, 14 or 30").default(7),
  minExcessPct: z.coerce.number().min(0).max(100).default(0),
});
export type AuthorityFilters = z.infer<typeof AuthorityQuery>;

const DISTRICT_CODES: Record<string, string> = {
  Sheikhupura: "SKP", Gujranwala: "GRW", Hafizabad: "HFZ", Narowal: "NRW", Sargodha: "SGD", Okara: "OKR", Kasur: "KSR",
};

/** Stable anonymised reference, e.g. "SKP-7F3A". */
export function farmRef(id: string, district: string) {
  const code = DISTRICT_CODES[district] ?? district.slice(0, 3).toUpperCase();
  return `${code}-${createHash("sha256").update(`pp:${id}`).digest("hex").slice(0, 4).toUpperCase()}`;
}

/** Coarsen to ~1 km and add a stable ±0.5 km offset so a marker can't be matched to one house. */
function coarse(id: string, lat: number, lng: number) {
  const h = createHash("sha256").update(`geo:${id}`).digest();
  const j = (b: number) => ((b / 255) - 0.5) * 0.01;
  return { lat: +(lat + j(h[0])).toFixed(2), lng: +(lng + j(h[1])).toFixed(2) };
}

export interface FarmRow {
  /** Internal id (not personal) — used only to open the anonymised well report. */
  id: string;
  ref: string;
  district: string;
  tehsil: string | null;
  crop: string;
  areaAcres: number;
  lat: number;
  lng: number;
  pumpedM3: number;
  needM3: number;
  excessM3: number;
  excessPct: number;
  overNeedPct: number;
  /** Extraction intensity, m³ per acre per day. */
  intensity: number;
  wastedKwh: number;
  synthetic: boolean;
}

export async function getAuthorityData(f: AuthorityFilters) {
  // Window ends at the latest fully computed day (seed/history), so the view stays coherent on any date.
  const latest = await prisma.dailyRecord.findFirst({ where: { pumpedM3: { not: null } }, orderBy: { date: "desc" }, select: { date: true } });
  const end = latest?.date ?? new Date();
  const start = new Date(end.getTime() - (f.days - 1) * 86_400_000);

  const farms = await prisma.farm.findMany({
    where: { ...(f.district ? { district: f.district } : {}), ...(f.crop ? { cropType: f.crop } : {}), dataConsent: true },
    select: {
      id: true, district: true, tehsil: true, cropType: true, areaAcres: true, lat: true, lng: true, isSynthetic: true,
      dailyRecords: { where: { date: { gte: start, lte: end }, pumpedM3: { not: null } }, select: { pumpedM3: true, needM3: true, excessM3: true, wastedKwh: true } },
    },
  });

  // A well with no records in the window has nothing to report yet; counting it would show an empty "0 m³" row.
  const allRows: FarmRow[] = farms.filter((farm) => farm.dailyRecords.length > 0).map((farm) => {
    const s = (k: "pumpedM3" | "needM3" | "excessM3" | "wastedKwh") => farm.dailyRecords.reduce((acc, r) => acc + (r[k] ?? 0), 0);
    const pumped = s("pumpedM3");
    const need = s("needM3");
    const excess = s("excessM3");
    const days = Math.max(1, farm.dailyRecords.length);
    return {
      id: farm.id,
      ref: farmRef(farm.id, farm.district),
      district: farm.district,
      tehsil: farm.tehsil,
      crop: farm.cropType,
      areaAcres: farm.areaAcres,
      ...coarse(farm.id, farm.lat, farm.lng),
      pumpedM3: pumped,
      needM3: need,
      excessM3: excess,
      excessPct: pumped > 0 ? (excess / pumped) * 100 : 0,
      overNeedPct: need > 0 ? ((pumped - need) / need) * 100 : 0,
      intensity: pumped / farm.areaAcres / days,
      wastedKwh: s("wastedKwh"),
      synthetic: farm.isSynthetic,
    };
  });
  const rows = allRows.filter((r) => r.excessPct >= f.minExcessPct);

  const sum = (xs: FarmRow[], k: keyof FarmRow) => xs.reduce((a, r) => a + (r[k] as number), 0);
  const pumped = sum(rows, "pumpedM3");
  const excess = sum(rows, "excessM3");
  const wastedKwh = sum(rows, "wastedKwh");

  const byDistrict = new Map<string, FarmRow[]>();
  for (const r of rows) byDistrict.set(r.district, [...(byDistrict.get(r.district) ?? []), r]);
  const districts = [...byDistrict.entries()]
    .map(([district, rs]) => {
      const p = sum(rs, "pumpedM3");
      const n = sum(rs, "needM3");
      const e = sum(rs, "excessM3");
      return {
        district,
        wells: rs.length,
        pumpedM3: p,
        needM3: n,
        excessM3: e,
        excessPct: p > 0 ? (e / p) * 100 : 0,
        overNeedPct: n > 0 ? ((p - n) / n) * 100 : 0,
        wellsOver30: rs.filter((r) => r.excessPct > 30).length,
        wastedMwh: sum(rs, "wastedKwh") / 1000,
      };
    })
    .sort((a, b) => b.excessPct - a.excessPct);

  const availableDistricts = [...new Set((await prisma.farm.findMany({ select: { district: true }, distinct: ["district"] })).map((d) => d.district))].sort();

  return {
    filters: f,
    window: { start: start.toISOString(), end: end.toISOString(), days: f.days },
    simulated: rows.some((r) => r.synthetic),
    syntheticWells: rows.filter((r) => r.synthetic).length,
    realWells: rows.filter((r) => !r.synthetic).length,
    kpis: {
      wells: rows.length,
      extractionM3: pumped,
      extractionPerDayM3: pumped / f.days,
      needM3: sum(rows, "needM3"),
      excessM3: excess,
      avgExcessPct: pumped > 0 ? (excess / pumped) * 100 : 0,
      wellsOver30: rows.filter((r) => r.excessPct > 30).length,
      wastedMwh: wastedKwh / 1000,
      /** If every well followed the advice, this water and energy would be saved. */
      potentialSavingM3: excess,
      potentialSavingRs: wastedKwh * DEFAULTS.surplusRsPerKwh,
    },
    districts,
    farms: rows,
    availableDistricts,
  };
}

export type AuthorityData = Awaited<ReturnType<typeof getAuthorityData>>;

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(d: AuthorityData): string {
  const header = [
    "farm_ref", "district", "tehsil", "crop", "area_acres", "lat_approx", "lng_approx", "days", "pumped_m3", "crop_need_m3",
    "excess_m3", "excess_pct_of_pumped", "pumped_vs_need_pct", "intensity_m3_per_acre_day", "solar_kwh_wasted", "simulated",
  ];
  const lines = d.farms.map((r) =>
    [
      r.ref, r.district, r.tehsil, r.crop, r.areaAcres, r.lat, r.lng, d.window.days, Math.round(r.pumpedM3), Math.round(r.needM3),
      Math.round(r.excessM3), r.excessPct.toFixed(1), r.overNeedPct.toFixed(1), r.intensity.toFixed(1), Math.round(r.wastedKwh), r.synthetic ? "yes" : "no",
    ].map(csvCell).join(","),
  );
  return [header.join(","), ...lines].join("\n") + "\n";
}
