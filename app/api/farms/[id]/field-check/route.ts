import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, guardFarm, serverError } from "@/lib/api/http";
import { addFieldCheck, fieldCheckSummary } from "@/lib/services/fieldCheck";

export const dynamic = "force-dynamic";

const Body = z.object({
  hour: z.number().int().min(6).max(18),
  volumeL: z.number().min(5).max(2000),
  seconds: z.number().min(1).max(3600),
  /** Power shown on the solar drive/inverter display at the time (kW). Optional. */
  inverterKw: z.number().min(0.1).max(200).nullish(),
  note: z.string().max(200).nullish(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  return NextResponse.json(await fieldCheckSummary(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const check = await addFieldCheck(id, parsed.data);
    return NextResponse.json({ check, summary: await fieldCheckSummary(id) }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === "no-power-at-hour") return NextResponse.json({ error: "no-power-at-hour" }, { status: 422 });
    return serverError(err);
  }
}
