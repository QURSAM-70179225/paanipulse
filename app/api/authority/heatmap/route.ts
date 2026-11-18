import { NextResponse, type NextRequest } from "next/server";
import { badRequest, serverError } from "@/lib/api/http";
import { AuthorityQuery, getAuthorityData } from "@/lib/services/authority";

export const dynamic = "force-dynamic";

/** [lat, lng, intensity m³/acre/day] points for a heatmap layer. */
export async function GET(req: NextRequest) {
  const parsed = AuthorityQuery.safeParse(Object.fromEntries([...req.nextUrl.searchParams].filter(([, v]) => v !== "")));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const d = await getAuthorityData(parsed.data);
    return NextResponse.json({ unit: "m3_per_acre_per_day", points: d.farms.map((r) => [r.lat, r.lng, +r.intensity.toFixed(2)]) });
  } catch (err) {
    return serverError(err);
  }
}
