import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness check for Render (no database call, so it stays fast and cheap). */
export function GET() {
  return NextResponse.json({ ok: true, service: "paanipulse", time: new Date().toISOString() });
}
