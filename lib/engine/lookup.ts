/**
 * The water chart: how much water a field needs from only what the farmer knows (crop, growth stage, soil, season, area,
 * irrigation method). No sensors, no weather feed, no internet. Pure.
 *
 * It uses the same FAO-56 formulas as the daily advice (ETc = Kc × ET₀; root-zone water balance), with a *typical* ET₀
 * for the season instead of today's weather. So it is a guide, not a replacement for the day-by-day answer.
 */
import { CROPS, DEFAULTS, IRRIGATION_EFFICIENCY, type CropType, type IrrigationMethod } from "./config";
import { kcForDay } from "./cropWater";
import { awcForSoil, type SoilType } from "./soils";
import { M2_PER_ACRE } from "./units";
import { rawMm, rootDepthM, tawMm } from "./waterBalance";

/** Longest gap the chart will suggest. A longer gap is limited by this simple model, so we cap it and refill what the crop used. */
export const MAX_INTERVAL_DAYS = 30;

export const STAGES = ["initial", "development", "mid", "late"] as const;
export type Stage = (typeof STAGES)[number];

/** Typical reference evapotranspiration (ET₀, mm/day) by season for the Punjab plains. Adjust locally; May–June can exceed "hot". */
export const SEASON_ET0_MM_PER_DAY = { cool: 2, mild: 4, hot: 6 } as const;
export type Season = keyof typeof SEASON_ET0_MM_PER_DAY;
export const SEASONS = Object.keys(SEASON_ET0_MM_PER_DAY) as Season[];

/** Day since sowing at the middle of a stage (used for Kc and root depth). */
export function stageMidDay(crop: CropType, stage: Stage): number {
  const [ini, dev, mid, late] = CROPS[crop].stages;
  const start = { initial: 0, development: ini, mid: ini + dev, late: ini + dev + mid }[stage];
  const len = { initial: ini, development: dev, mid, late }[stage];
  return start + len / 2;
}

export interface WaterLookupInput {
  crop: CropType;
  stage: Stage;
  soil: SoilType;
  season: Season;
  irrigationMethod: IrrigationMethod;
  areaAcres: number;
  /** Optional pump flow (m³ per hour) to turn the volume into pump hours. */
  pumpFlowM3h?: number;
}

export interface WaterLookup {
  kc: number;
  et0MmDay: number;
  /** Water the crop itself uses (mm/day). */
  etcMmDay: number;
  /** Flooded paddy: keep a standing layer and top up daily. */
  flooded: boolean;
  /** Days between irrigations (1 for flooded paddy). */
  intervalDays: number;
  /** Depth that refills the root zone (net, mm) and what to apply at the field after losses (gross, mm). */
  netMm: number;
  grossMm: number;
  /** For the farmer's whole area: per irrigation. */
  litresPerIrrigation: number;
  m3PerIrrigation: number;
  /** Average water to supply per day for the whole area, after losses. */
  litresPerDay: number;
  /** Per acre, per day (after losses). */
  litresPerAcrePerDay: number;
  /** Pump hours per irrigation if a flow was given. */
  pumpHours: number | null;
}

const r = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

export function waterLookup(i: WaterLookupInput): WaterLookup {
  const crop = CROPS[i.crop];
  const eff = IRRIGATION_EFFICIENCY[i.irrigationMethod];
  const day = stageMidDay(i.crop, i.stage);
  const kc = kcForDay(i.crop, day);
  const et0 = SEASON_ET0_MM_PER_DAY[i.season];
  const etc = kc * et0;
  const areaM2 = i.areaAcres * M2_PER_ACRE;
  const flooded = !!crop.flooded;
  let netMm: number;
  let intervalDays: number;
  if (flooded) {
    // Paddy: the daily need is crop use plus seepage; top up every day.
    netMm = etc + DEFAULTS.ricePercolationMm;
    intervalDays = 1;
  } else {
    const taw = tawMm(rootDepthM(i.crop, day), awcForSoil(i.soil));
    netMm = rawMm(taw, crop.p);
    intervalDays = Math.max(1, Math.floor(netMm / Math.max(etc, 0.1)));
    if (intervalDays > MAX_INTERVAL_DAYS) {
      intervalDays = MAX_INTERVAL_DAYS;
      netMm = etc * MAX_INTERVAL_DAYS; // water again sooner, putting back only what the crop used
    }
  }
  const grossMm = netMm / eff;
  const m3 = (grossMm / 1000) * areaM2;
  return {
    kc: r(kc, 2),
    et0MmDay: et0,
    etcMmDay: r(etc, 1),
    flooded,
    intervalDays,
    netMm: r(netMm, 0),
    grossMm: r(grossMm, 0),
    litresPerIrrigation: Math.round(m3 * 1000),
    m3PerIrrigation: r(m3, 0),
    litresPerDay: Math.round((m3 * 1000) / intervalDays),
    litresPerAcrePerDay: Math.round(((grossMm / 1000) * M2_PER_ACRE * 1000) / intervalDays),
    pumpHours: i.pumpFlowM3h && i.pumpFlowM3h > 0 ? r(m3 / i.pumpFlowM3h, 1) : null,
  };
}
