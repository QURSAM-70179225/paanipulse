import { NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { transcribe } from "@/lib/services/stt";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024; // ~2 minutes of opus

/** multipart: file (audio/webm|ogg|mp4|mpeg|wav), lang ("ur" | "en") → { text } */
export async function POST(req: Request) {
  if (!(await getSession())) return unauthorized();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const lang = form?.get("lang") === "en" ? "en" : "ur";
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Voice note too long (max ~2 minutes)." }, { status: 413 });
  if (file.type && !/^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|m4a|aac)/.test(file.type)) return NextResponse.json({ error: "Unsupported audio type." }, { status: 415 });
  try {
    const text = await transcribe(file, lang);
    if (text === null) return NextResponse.json({ error: "stt-unavailable" }, { status: 503 });
    return NextResponse.json({ text });
  } catch (err) {
    return serverError(err);
  }
}
