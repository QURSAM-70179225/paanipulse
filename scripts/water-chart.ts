/**
 * Prints the water look-up chart as Markdown tables (same maths as the /water-chart page).
 *   npm run water:chart            # flood irrigation, 1 acre
 *   npm run water:chart -- furrow  # another irrigation method
 */
import { SEASONS, STAGES, waterLookup, type CropType, type IrrigationMethod, type Season, type Stage } from "../lib/engine";

const method = (process.argv[2] ?? "flood") as IrrigationMethod;
const CROPS: CropType[] = ["wheat", "rice", "maize", "cotton", "sugarcane"];
const SEASON_NAME: Record<Season, string> = { cool: "cool (Nov–Feb)", mild: "mild (Mar, Oct)", hot: "hot (Apr–Sep)" };
const STAGE_NAME: Record<Stage, string> = { initial: "initial", development: "development", mid: "mid-season", late: "late" };
const n0 = (x: number) => Math.round(x).toLocaleString("en-US");

for (const crop of CROPS) {
  const flooded = crop === "rice";
  console.log(`\n### ${crop[0].toUpperCase()}${crop.slice(1)} (${method} irrigation, per acre)\n`);
  if (flooded) {
    console.log("Flooded paddy: top up every day (crop use + seepage). Soil type does not change it.\n");
    console.log("| Stage | Season | Crop use (mm/day) | Add each day (mm at the field) | Litres per acre per day |\n|---|---|---|---|---|");
  } else {
    console.log("Each soil cell reads: *irrigate every N days, with X mm at the field each time*.\n");
    console.log("| Stage | Season | Crop use (mm/day) | Litres per acre per day | Sand | Sandy loam | Loam | Clay |\n|---|---|---|---|---|---|---|---|");
  }
  for (const stage of STAGES) {
    for (const season of SEASONS) {
      const at = (soil: "sand" | "sandy-loam" | "loam" | "clay") => waterLookup({ crop, stage, soil, season, irrigationMethod: method, areaAcres: 1 });
      const loam = at("loam");
      if (flooded) console.log(`| ${STAGE_NAME[stage]} | ${SEASON_NAME[season]} | ${loam.etcMmDay} | ${loam.grossMm} | ${n0(loam.litresPerAcrePerDay)} |`);
      else {
        const cell = (soil: "sand" | "sandy-loam" | "loam" | "clay") => { const w = at(soil); return `every ${w.intervalDays} d, ${w.grossMm} mm`; };
        console.log(`| ${STAGE_NAME[stage]} | ${SEASON_NAME[season]} | ${loam.etcMmDay} | ${n0(loam.litresPerAcrePerDay)} | ${cell("sand")} | ${cell("sandy-loam")} | ${cell("loam")} | ${cell("clay")} |`);
      }
    }
  }
}
