/**
 * Streams simulated soil-probe readings to POST /api/soil for the demo farm (no hardware needed).
 * A fast "demo clock" replays a day: moisture falls as the crop and sun use water, and an irrigation
 * event (optional) lifts it again.
 *
 *   npm run simulate:soil                         # stream to http://localhost:3000, farm "karamat"
 *   npm run simulate:soil -- --url http://localhost:3100 --interval 2 --speed 20
 *   npm run simulate:soil -- --scenario dry       # start already dry (probe says: irrigate)
 *   npm run simulate:soil -- --scenario wet       # start wet (probe says: do not irrigate)
 *   npm run simulate:soil -- --irrigate           # an irrigation event half way through
 *   npm run simulate:soil -- --reset              # delete the simulated readings for the farm
 *
 * Readings are tagged source "simulator", so the app labels them "Simulated reading (demo)".
 */
import { PrismaClient } from "@prisma/client";

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};
const URL_BASE = arg("url", "http://localhost:3000");
const FARM_ID = arg("farm", "karamat");
const INTERVAL_S = Number(arg("interval", "3"));
const SIM_MINUTES = Number(arg("speed", "20"));
const SCENARIO = arg("scenario", "drying") as "drying" | "dry" | "wet";
const IRRIGATE = process.argv.includes("--irrigate");
const START: Record<typeof SCENARIO, number> = { drying: 26, dry: 17.5, wet: 30 };
/** How fast the soil dries: a wet field barely loses water. */
const DRYING: Record<typeof SCENARIO, number> = { drying: 1, dry: 1, wet: 0.3 };

async function reset() {
  const prisma = new PrismaClient();
  const del = await prisma.soilReading.deleteMany({ where: { farmId: FARM_ID, source: "simulator" } });
  await prisma.$disconnect();
  console.log(`Removed ${del.count} simulated soil readings for ${FARM_ID}.`);
}

const noise = (a: number) => (Math.random() - 0.5) * 2 * a;

async function stream() {
  // Start 24 h ago in demo time so the chart has history; one tick = SIM_MINUTES of field time.
  const ticksPerDay = Math.round((24 * 60) / SIM_MINUTES);
  let moisture = START[SCENARIO];
  const t0 = Date.now() - 24 * 3_600_000;
  console.log(`Streaming soil readings to ${URL_BASE}/api/soil for farm "${FARM_ID}" (${SCENARIO}${IRRIGATE ? ", with irrigation" : ""}). Ctrl+C to stop.`);
  for (let i = 0; i < ticksPerDay; i++) {
    const at = new Date(t0 + i * SIM_MINUTES * 60_000);
    const hour = (at.getUTCHours() + 5 + at.getUTCMinutes() / 60) % 24; // Pakistan time
    const sun = Math.max(0, Math.sin((Math.PI * (hour - 7)) / 10)); // 0 at night, 1 at midday
    moisture -= (0.02 + 0.09 * sun) * (SIM_MINUTES / 20) * DRYING[SCENARIO]; // drying: faster in sunshine
    if (IRRIGATE && i === Math.round(ticksPerDay * 0.55)) moisture += 7; // irrigation event
    moisture = Math.min(30, Math.max(16, moisture));
    const reading = {
      farmId: FARM_ID,
      deviceId: "sim-probe-1",
      timestamp: at.toISOString(),
      moisture_pct: +(moisture + noise(0.15)).toFixed(1),
      temperature_c: +(15 + 8 * sun + noise(0.3)).toFixed(1),
      ec_ds_m: +(1.1 + noise(0.05)).toFixed(2),
      n_mg_kg: Math.round(42 + noise(3)),
      p_mg_kg: Math.round(14 + noise(1)),
      k_mg_kg: Math.round(160 + noise(5)),
      source: "simulator",
    };
    try {
      const res = await fetch(`${URL_BASE}/api/soil`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.TELEMETRY_INGEST_KEY ? { "x-ingest-key": process.env.TELEMETRY_INGEST_KEY } : {}) },
        body: JSON.stringify([reading]),
      });
      console.log(`${at.toISOString().slice(11, 16)}Z  ${reading.moisture_pct.toFixed(1)} %  ${reading.temperature_c} °C  -> ${res.status}`);
    } catch (e) {
      console.error("POST failed (is the app running?):", (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
  }
  console.log("Done. The card now shows the last reading; run again for a new day, or with --reset to remove the readings.");
}

(process.argv.includes("--reset") ? reset() : stream()).catch((e) => {
  console.error(e);
  process.exit(1);
});
