import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api/http";
import { getWeather } from "@/lib/services/weather";

export const dynamic = "force-dynamic";

const Query = z.object({
  lat: z.coerce.number().min(23).max(38),
  lng: z.coerce.number().min(60).max(78),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const w = await getWeather(parsed.data.lat, parsed.data.lng);
    return NextResponse.json(w);
  } catch (err) {
    return serverError(err);
  }
}
