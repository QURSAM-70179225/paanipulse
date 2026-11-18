import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notFound, serverError } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const farm = await prisma.farm.findUnique({ where: { id }, include: { pumps: true } });
    if (!farm) return notFound("Farm not found");
    const { phone: _phone, ...publicFarm } = farm; // never expose phone numbers
    void _phone;
    return NextResponse.json(publicFarm);
  } catch (err) {
    return serverError(err);
  }
}
