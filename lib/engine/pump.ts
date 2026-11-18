/** Virtual water meter: pump hydraulics, PV power and flow integration (pure). */
import { DEFAULTS } from "./config";
import { clamp, ftToM, G, J_PER_KWH, RHO_WATER } from "./units";

export interface PumpSpec {
  ratedKw: number;
  pvKwp: number;
  staticDepthFt: number;
  drawdownM?: number;
  efficiency?: number;
  calibrated?: boolean;
}

/** Total dynamic head H (m) = (static water level + drawdown) × (1 + friction allowance). */
export function totalHeadM(staticDepthFt: number, drawdownM = DEFAULTS.drawdownM, frictionFraction = DEFAULTS.frictionFraction): number {
  return (ftToM(staticDepthFt) + drawdownM) * (1 + frictionFraction);
}

/** Flow Q (m³/s) = η × P_in / (ρ g H). */
export function flowM3sFromPower(powerW: number, efficiency: number, headM: number): number {
  if (headM <= 0) throw new Error("head must be > 0");
  return (efficiency * Math.max(0, powerW)) / (RHO_WATER * G * headM);
}

/** Electrical energy (kWh) to lift 1 m³ through head H at efficiency η. */
export const kwhPerM3 = (headM: number, efficiency: number) => (RHO_WATER * G * headM) / efficiency / J_PER_KWH;

/** PV DC power available (kW) = kWp × GHI/1000 × performance ratio. */
export const pvPowerKw = (pvKwp: number, ghiWm2: number, pr = DEFAULTS.performanceRatio) => pvKwp * (Math.max(0, ghiWm2) / 1000) * pr;

/** Power the pump actually draws: capped at rated kW, zero below the start threshold. */
export function pumpInputKw(pvKw: number, ratedKw: number, threshold = DEFAULTS.startThreshold): number {
  if (pvKw < threshold * ratedKw) return 0;
  return Math.min(pvKw, ratedKw);
}

export interface HourlyPumpHour {
  hour: number;
  ghi: number;
  pvKw: number;
  pumpKw: number;
  flowM3h: number;
}

/** Mode B: per-hour pump power and flow from hourly GHI (W/m²). */
export function modeBHourly(pump: PumpSpec, hourlyGhi: number[]): HourlyPumpHour[] {
  const H = totalHeadM(pump.staticDepthFt, pump.drawdownM);
  const eta = pump.efficiency ?? DEFAULTS.efficiency;
  return hourlyGhi.map((ghi, hour) => {
    const pvKw = pvPowerKw(pump.pvKwp, ghi);
    const pumpKw = pumpInputKw(pvKw, pump.ratedKw);
    return { hour, ghi, pvKw, pumpKw, flowM3h: flowM3sFromPower(pumpKw * 1000, eta, H) * 3600 };
  });
}

export interface ModeBDay {
  /** Hours with enough sun to run the pump. */
  pumpableHours: number;
  /** PV energy produced if fully used (kWh). */
  pvKwh: number;
  /** Volume if the pump ran all pumpable hours (m³). */
  maxM3: number;
  /** Mean flow over the best `hours` hours (m³/h). */
  flowForHours: (hours: number) => number;
  /** Volume and energy for running `hours` hours (best-sun hours first). */
  runHours: (hours: number) => { m3: number; kwh: number };
}

/** Mode B daily integration. Running hours are assumed to be the sunniest hours (farmers run around midday). */
export function modeBDay(pump: PumpSpec, hourlyGhi: number[]): ModeBDay {
  const hrs = modeBHourly(pump, hourlyGhi);
  const running = hrs.filter((h) => h.pumpKw > 0).sort((a, b) => b.flowM3h - a.flowM3h);
  const runHours = (hours: number) => {
    let left = Math.max(0, hours);
    let m3 = 0;
    let kwh = 0;
    for (const h of running) {
      if (left <= 0) break;
      const f = Math.min(1, left);
      m3 += h.flowM3h * f;
      kwh += h.pumpKw * f;
      left -= f;
    }
    return { m3, kwh };
  };
  return {
    pumpableHours: running.length,
    pvKwh: hrs.reduce((s, h) => s + h.pvKw, 0),
    maxM3: running.reduce((s, h) => s + h.flowM3h, 0),
    flowForHours: (hours: number) => {
      const n = Math.min(Math.max(hours, 1), Math.max(1, running.length));
      return runHours(n).m3 / n;
    },
    runHours,
  };
}

export interface TelemetryPoint {
  timestamp: Date;
  powerKw: number;
  frequencyHz?: number;
}

/**
 * Mode A: integrate flow from drive telemetry (trapezoidal rule). Gaps longer than `maxGapMin` are treated as off.
 * Returns pumped volume (m³), energy (kWh) and running hours.
 */
export function modeAIntegrate(pump: PumpSpec, points: TelemetryPoint[], maxGapMin = 15) {
  const H = totalHeadM(pump.staticDepthFt, pump.drawdownM);
  const eta = pump.efficiency ?? DEFAULTS.efficiency;
  const pts = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  let m3 = 0;
  let kwh = 0;
  let hours = 0;
  for (let i = 1; i < pts.length; i++) {
    const dtH = (pts[i].timestamp.getTime() - pts[i - 1].timestamp.getTime()) / 3_600_000;
    if (dtH <= 0 || dtH * 60 > maxGapMin) continue;
    const p0 = Math.max(0, pts[i - 1].powerKw);
    const p1 = Math.max(0, pts[i].powerKw);
    const q0 = flowM3sFromPower(p0 * 1000, eta, H) * 3600;
    const q1 = flowM3sFromPower(p1 * 1000, eta, H) * 3600;
    m3 += ((q0 + q1) / 2) * dtH;
    kwh += ((p0 + p1) / 2) * dtH;
    if (p0 > 0 || p1 > 0) hours += dtH;
  }
  return { m3, kwh, hours };
}

/**
 * Bucket test: farmer fills a container of `volumeL` litres in `seconds` while the pump draws `powerKw`.
 * Back-calculates wire-to-water efficiency η = ρ g H Q / P, clamped to a plausible range.
 */
export function calibrateEfficiency(args: { volumeL: number; seconds: number; powerKw: number; staticDepthFt: number; drawdownM?: number }): number {
  const { volumeL, seconds, powerKw, staticDepthFt, drawdownM } = args;
  if (volumeL <= 0 || seconds <= 0 || powerKw <= 0) throw new Error("volume, seconds and power must be > 0");
  const Q = volumeL / 1000 / seconds;
  const H = totalHeadM(staticDepthFt, drawdownM);
  const eta = (RHO_WATER * G * H * Q) / (powerKw * 1000);
  return clamp(eta, 0.15, 0.75);
}

/** Flow range (m³/h) at a given input power, reflecting efficiency uncertainty. */
export function flowRangeM3h(pump: PumpSpec, powerKw: number) {
  const H = totalHeadM(pump.staticDepthFt, pump.drawdownM);
  const eta = pump.efficiency ?? DEFAULTS.efficiency;
  const band = pump.calibrated ? DEFAULTS.efficiencyBandCalibrated : DEFAULTS.efficiencyBandUncalibrated;
  const q = (e: number) => flowM3sFromPower(powerKw * 1000, clamp(e, 0.1, 0.8), H) * 3600;
  return { low: q(eta - band), mid: q(eta), high: q(eta + band) };
}
