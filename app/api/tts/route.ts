import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { synthesize } from "@/lib/services/tts";
import { isFixedString } from "@/lib/i18n/dict";

export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().min(1).max(1500), lang: z.enum(["ur", "en"]).default("ur") });

/** text + lang → audio/mpeg. 503 when neural TTS is unavailable so the client falls back to browser speech. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  // Signed-out visitors (landing, login) may voice the app's own fixed UI strings only: a bounded, cached set.
  if (!isFixedString(parsed.data.text) && !(await getSession())) return unauthorized();
  const audio = await synthesize(parsed.data.text, parsed.data.lang);
  if (!audio) return NextResponse.json({ error: "tts-unavailable" }, { status: 503 });
  return new NextResponse(new Uint8Array(audio), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });
}
