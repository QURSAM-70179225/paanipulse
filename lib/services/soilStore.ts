/** Saves soil-probe readings and runs the checks that follow (SMS "enough water", automatic pump stop). Server-only. */
import "server-only";
import { prisma } from "@/lib/db";
import { checkFieldFull } from "./fieldFullAlert";
import { autoStopIfFull } from "./pumpControl";

export interface SoilRow {
  farmId: string;
  deviceId?: string | null;
  timestamp: Date;
  moisturePct: number;
  temperatureC?: number | null;
  ecDsM?: number | null;
  nitrogenMgKg?: number | null;
  phosphorusMgKg?: number | null;
  potassiumMgKg?: number | null;
  source: string;
}

export async function saveSoilReadings(rows: SoilRow[]) {
  if (!rows.length) return;
  await prisma.soilReading.createMany({ data: rows });
  // Newest reading per farm. These checks never block or fail the upload.
  const newest = new Map<string, Date>();
  for (const r of rows) if (!newest.has(r.farmId) || r.timestamp > newest.get(r.farmId)!) newest.set(r.farmId, r.timestamp);
  const batches = [...newest].map(([farmId, latestAt]) => ({ farmId, latestAt }));
  await checkFieldFull(batches).catch((e) => console.error("field-full check failed", e));
  await autoStopIfFull(batches).catch((e) => console.error("auto-stop check failed", e));
}
