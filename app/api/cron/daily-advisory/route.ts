import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/http";
import { runDailyAdvisories } from "@/lib/services/dailyAdvisory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called by Vercel Cron (vercel.json) with "Authorization: Bearer $CRON_SECRET". */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDailyAdvisories());
  } catch (err) {
    return serverError(err);
  }
}
