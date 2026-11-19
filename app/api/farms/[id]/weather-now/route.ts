import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardFarm, notFound, serverError } from "@/lib/api/http";
import { getWeather, nextHours } from "@/lib/services/weather";

export const dynamic = "force-dynamic";

/**
 * Current conditions and the next 24 hours for this farm's location. The dashboard polls this while it is open.
 * Answers come from the server's weather cache (default 30 min), so polling does not multiply Open-Meteo calls.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  try {
    const farm = await prisma.farm.findUnique({ where: { id }, select: { lat: true, lng: true } });
    if (!farm) return notFound("Farm not found");
    const w = await getWeather(farm.lat, farm.lng);
    return NextResponse.json({ source: w.source, fetchedAt: w.fetchedAt, current: w.current ?? null, hourly: nextHours(w.hourly, new Date(), 24) });
  } catch (err) {
    return serverError(err);
  }
}
