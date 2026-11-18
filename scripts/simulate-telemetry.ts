/**
 * Streams realistic solar-pump drive readings to POST /api/telemetry for the demo farm.
 * A fast "demo clock" replays today from 09:00: every tick advances SIM_MINUTES of pump time.
 *
 *   npm run simulate               # stream to http://localhost:3000
 *   npm run simulate -- --url http://localhost:3100 --interval 2 --speed 5
 *   npm run simulate -- --reset    # remove today's readings and switch the farm back to "estimated from sunlight"
 */
import { PrismaClient } from "@prisma/client";
import { pktDayStart } from "../lib/dates";

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};
const URL_BASE = arg("url", "http://localhost:3000");
const PUMP_ID = arg("pump", "karamat-pump");
const INTERVAL_S = Number(arg("interval", "3"));
const SIM_MINUTES = Number(arg("speed", "5"));
const RATED_KW = Number(arg("rated", "15"));
const PV_KWP = Number(arg("pv", "20"));

async function reset() {
  const prisma = new PrismaClient();
  const del = await prisma.telemetryReading.deleteMany({ where: { pumpId: PUMP_ID } });
  await prisma.pump.update({ where: { id: PUMP_ID }, data: { hasTelemetry: false } });
  await prisma.$disconnect();
  console.log(`Removed ${del.count} readings; ${PUMP_ID} is back to "estimated from sunlight".`);
}

/** Clear-sky-ish November irradiance (W/m²) at a local decimal hour, with drifting cloud cover. */
let cloud = 1;
function ghiAt(hour: number) {
  const sunrise = 6.8, sunset = 17.2, peak = 620;
  if (hour <= sunrise || hour >= sunset) return 0;
  cloud = Math.min(1, Math.max(0.35, cloud + (Math.random() - 0.5) * 0.25 + (1 - cloud) * 0.15));
  return peak * Math.sin((Math.PI * (hour - sunrise)) / (sunset - sunrise)) * cloud;
}

async function stream() {
  const start = pktDayStart(0).getTime() + 9 * 3_600_000; // 09:00 PKT today
  let simMs = start;
  console.log(`Streaming to ${URL_BASE}/api/telemetry for ${PUMP_ID} — 1 tick / ${INTERVAL_S}s = ${SIM_MINUTES} pump-minutes. Ctrl+C to stop.`);
  for (;;) {
    const hour = ((simMs - pktDayStart(0).getTime()) / 3_600_000) % 24;
    if (hour >= 17.2) {
      console.log("Sun has set on the demo clock — done.");
      return;
    }
    const pv = PV_KWP * (ghiAt(hour) / 1000) * 0.75;
    const power = pv < 0.2 * RATED_KW ? 0 : Math.min(RATED_KW, pv);
    const freq = power > 0 ? 50 * Math.cbrt(power / RATED_KW) : 0;
    const reading = { pumpId: PUMP_ID, timestamp: new Date(simMs).toISOString(), power_kw: +power.toFixed(2), frequency_hz: +freq.toFixed(1) };
    try {
      const res = await fetch(`${URL_BASE}/api/telemetry`, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.TELEMETRY_INGEST_KEY ? { "x-ingest-key": process.env.TELEMETRY_INGEST_KEY } : {}) }, body: JSON.stringify([reading]) });
      const hh = String(Math.floor(hour)).padStart(2, "0");
      const mm = String(Math.floor((hour % 1) * 60)).padStart(2, "0");
      console.log(`${hh}:${mm}  ${reading.power_kw.toFixed(2)} kW  ${reading.frequency_hz} Hz  -> ${res.status}`);
    } catch (e) {
      console.error("POST failed (is the app running?):", (e as Error).message);
    }
    simMs += SIM_MINUTES * 60_000;
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
  }
}

(process.argv.includes("--reset") ? reset() : stream()).catch((e) => {
  console.error(e);
  process.exit(1);
});
