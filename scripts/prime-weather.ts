/**
 * Fetch real weather from Open-Meteo for every farm location and store it in the database cache.
 *
 * Use it when the deployed server cannot reach Open-Meteo (shared cloud IPs are sometimes throttled): run it from a
 * laptop on normal internet, with DATABASE_URL pointing at the production database. The deployed app then shows
 * "Saved weather" (real data) instead of the offline sample. Re-run it each morning of an event: saved data is only
 * used while it still covers today and tomorrow.
 *
 *   DATABASE_URL="postgresql://…" npm run weather:prime
 */
import { PrismaClient } from "@prisma/client";
import { getWeather } from "../lib/services/weather";

const prisma = new PrismaClient();

(async () => {
  // Real farms only (the 150 simulated wells are never opened as dashboards); Karamat's area is always included.
  const farms = await prisma.farm.findMany({ where: { isSynthetic: false }, select: { lat: true, lng: true } });
  const cells = new Map<string, { lat: number; lng: number }>();
  for (const f of [...farms, { lat: 31.8, lng: 74.26 }]) cells.set(`${f.lat.toFixed(1)}_${f.lng.toFixed(1)}`, f);
  console.log(`${cells.size} locations to fetch…`);
  let live = 0;
  for (const [key, c] of cells) {
    try {
      const w = await getWeather(c.lat, c.lng);
      const now = w.current ? `${Math.round(w.current.tempC)}°C now` : "no current";
      console.log(`${key.padEnd(10)} ${w.source.padEnd(11)} ${now}`);
      if (w.source === "live") live++;
    } catch (e) {
      console.log(`${key.padEnd(10)} FAILED ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 400)); // be polite to the free API
  }
  console.log(live === cells.size ? "All locations saved with live data." : `${live}/${cells.size} live. Check your internet connection and try again.`);
  await prisma.$disconnect();
})();
