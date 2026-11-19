import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api/http";
import { parseTelemetryCsv as parseCsv } from "@/lib/services/telemetryCsv";
import { checkOverrun } from "@/lib/services/overrunAlert";

export const dynamic = "force-dynamic";

const Reading = z.object({
  pumpId: z.string().min(1).max(64),
  timestamp: z.coerce.date(),
  power_kw: z.coerce.number().min(0).max(200),
  frequency_hz: z.coerce.number().min(0).max(100),
});
const Readings = z.array(Reading).min(1).max(5000);

/**
 * Accepts pump-drive readings as JSON (array, or { readings: [...] }), raw CSV (text/csv),
 * or a multipart upload with a CSV file in field "file".
 */
export async function POST(req: Request) {
  // Optional device key: when TELEMETRY_INGEST_KEY is set, drives/simulator must send it.
  const key = process.env.TELEMETRY_INGEST_KEY;
  if (key && req.headers.get("x-ingest-key") !== key) return NextResponse.json({ error: "invalid ingest key" }, { status: 401 });
  const type = req.headers.get("content-type") ?? "";
  let raw: unknown;
  try {
    if (type.includes("multipart/form-data")) {
      const file = (await req.formData()).get("file");
      raw = file instanceof File ? parseCsv(await file.text()) : null;
    } else if (type.includes("text/csv")) {
      raw = parseCsv(await req.text());
    } else {
      const body = await req.json();
      raw = Array.isArray(body) ? body : body?.readings;
    }
  } catch {
    raw = null;
  }
  const parsed = Readings.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const pumpIds = [...new Set(parsed.data.map((r) => r.pumpId))];
    const known = await prisma.pump.findMany({ where: { id: { in: pumpIds } }, select: { id: true } });
    const knownIds = new Set(known.map((p) => p.id));
    const valid = parsed.data.filter((r) => knownIds.has(r.pumpId));
    if (valid.length) {
      await prisma.telemetryReading.createMany({
        data: valid.map((r) => ({ pumpId: r.pumpId, timestamp: r.timestamp, powerKw: r.power_kw, frequencyHz: r.frequency_hz })),
      });
      await prisma.pump.updateMany({ where: { id: { in: [...knownIds] } }, data: { hasTelemetry: true } });
    }
    // Warn the farmer by SMS if the pump has run longer than advised (never blocks or fails ingestion).
    if (valid.length) await checkOverrun([...knownIds]).catch((e) => console.error("overrun check failed", e));
    return NextResponse.json({ accepted: valid.length, rejectedUnknownPump: parsed.data.length - valid.length });
  } catch (err) {
    return serverError(err);
  }
}
