/**
 * Seed: 1 detailed demo farm (Karamat, Muridke) + 150 SIMULATED farms across 7 districts.
 * All dates are relative to "today" (Asia/Karachi) so the demo stays coherent whenever it runs.
 * Engine-derived DailyRecord fields are filled in Milestone 2.
 */
import { PrismaClient } from "@prisma/client";
import { pktDayStart } from "../lib/dates";

const prisma = new PrismaClient();
const HISTORY_DAYS = 30;

// Deterministic PRNG (mulberry32) so every seed run produces the same demo data.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261118);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const pick = <T,>(items: [T, number][]): T => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[items.length - 1][0];
};
const round = (x: number, step: number) => Math.round(x / step) * step;

// District centres + spread (deg) + typical static water level range (ft).
const DISTRICTS = [
  { name: "Sheikhupura", tehsil: null, lat: 31.71, lng: 73.98, spread: 0.25, depth: [60, 140], weight: 28 },
  { name: "Gujranwala", tehsil: null, lat: 32.16, lng: 74.19, spread: 0.22, depth: [50, 130], weight: 24 },
  { name: "Hafizabad", tehsil: null, lat: 32.07, lng: 73.69, spread: 0.2, depth: [60, 150], weight: 18 },
  { name: "Narowal", tehsil: "Narowal", lat: 32.1, lng: 74.87, spread: 0.12, depth: [40, 110], weight: 12 },
  { name: "Narowal", tehsil: "Shakargarh", lat: 32.26, lng: 75.16, spread: 0.12, depth: [40, 100], weight: 12 },
  { name: "Sargodha", tehsil: null, lat: 32.08, lng: 72.67, spread: 0.3, depth: [90, 200], weight: 20 },
  { name: "Okara", tehsil: null, lat: 30.81, lng: 73.45, spread: 0.25, depth: [80, 190], weight: 18 },
  { name: "Kasur", tehsil: null, lat: 31.12, lng: 74.45, spread: 0.2, depth: [70, 180], weight: 18 },
] as const;

const FIRST_NAMES = ["Muhammad", "Ghulam", "Allah", "Abdul", "Muhammad", "Rana", "Chaudhry", "Malik", "Mian", "Haji"];
const LAST_NAMES = ["Aslam", "Rasool", "Ditta", "Rehman", "Iqbal", "Akram", "Bashir", "Nawaz", "Sarwar", "Yousaf", "Anwar", "Latif"];

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.advisory.deleteMany();
  await prisma.dailyRecord.deleteMany();
  await prisma.telemetryReading.deleteMany();
  await prisma.pump.deleteMany();
  await prisma.farm.deleteMany();

  // ── Demo farm: Karamat, Muridke ──────────────────────────────────────────
  const karamat = await prisma.farm.create({
    data: {
      id: "karamat",
      farmerName: "Karamat Ali",
      phone: "+92 300 0000000",
      language: "ur",
      lat: 31.8,
      lng: 74.26,
      district: "Sheikhupura",
      tehsil: "Muridke",
      cropType: "wheat",
      sowingDate: pktDayStart(-13),
      areaAcres: 12.5, // "aadha murabba"
      irrigationMethod: "flood",
      isSynthetic: false,
      pumps: {
        create: {
          id: "karamat-pump",
          ratedKw: 15,
          pvKwp: 20,
          staticDepthFt: 90,
          boreDepthFt: 200,
          drawdownM: 3,
          efficiency: 0.4,
        },
      },
    },
  });

  // Karamat's habit: pump runs whenever the sun is out because it is "free".
  // -30..-19: light use after rice harvest; -18..-16: pre-sowing "rauni"; -13 sown; then 4–6 h most days.
  const karamatHours: number[] = [];
  for (let d = -HISTORY_DAYS; d <= -1; d++) {
    let h: number;
    if (d <= -19) h = rand() < 0.4 ? round(between(1, 3), 0.5) : 0;
    else if (d <= -16) h = 8;
    else if (d <= -14) h = 0;
    else h = rand() < 0.8 ? round(between(4, 6.5), 0.5) : 0;
    karamatHours.push(h);
  }
  karamatHours[karamatHours.length - 1] = 6; // yesterday: 6 h (demo line "Kal aap ne 6 ghantay chalaya")
  await prisma.dailyRecord.createMany({
    data: karamatHours.map((h, i) => ({
      farmId: karamat.id,
      date: pktDayStart(i - HISTORY_DAYS),
      actualHours: h,
    })),
  });

  // ── 150 simulated farms ──────────────────────────────────────────────────
  for (let i = 1; i <= 150; i++) {
    const dist = pick(DISTRICTS.map((d) => [d, d.weight] as [(typeof DISTRICTS)[number], number]));
    const crop = pick<string>([["wheat", 70], ["sugarcane", 18], ["maize", 12]]);
    const sowingOffset =
      crop === "wheat" ? -Math.round(between(5, 25)) : crop === "maize" ? -Math.round(between(80, 100)) : -Math.round(between(220, 260));
    const ratedKw = pick<number>([[7.5, 25], [11, 30], [15, 30], [18.5, 10], [22, 5]]);
    const habit = between(0.0, 0.6); // over-pumping tendency (tuned against engine in Milestone 2)
    const farm = await prisma.farm.create({
      data: {
        farmerName: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`,
        language: "ur",
        lat: +(dist.lat + between(-dist.spread, dist.spread)).toFixed(4),
        lng: +(dist.lng + between(-dist.spread, dist.spread)).toFixed(4),
        district: dist.name,
        tehsil: dist.tehsil,
        cropType: crop,
        sowingDate: pktDayStart(sowingOffset),
        areaAcres: round(between(4, 25), 0.5),
        irrigationMethod: pick<string>([["flood", 80], ["furrow", 15], ["sprinkler", 4], ["drip", 1]]),
        isSynthetic: true,
        pumps: {
          create: {
            ratedKw,
            pvKwp: round(ratedKw * between(1.2, 1.4), 0.5),
            staticDepthFt: Math.round(between(dist.depth[0], dist.depth[1])),
            drawdownM: 3,
            efficiency: +between(0.32, 0.45).toFixed(2),
          },
        },
      },
    });
    const baseHours = between(2, 4) * (1 + habit);
    await prisma.dailyRecord.createMany({
      data: Array.from({ length: HISTORY_DAYS }, (_, k) => ({
        farmId: farm.id,
        date: pktDayStart(k - HISTORY_DAYS),
        actualHours: rand() < 0.65 ? Math.min(9, round(baseHours * between(0.7, 1.4), 0.5)) : 0,
      })),
    });
  }

  const counts = {
    farms: await prisma.farm.count(),
    synthetic: await prisma.farm.count({ where: { isSynthetic: true } }),
    dailyRecords: await prisma.dailyRecord.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
