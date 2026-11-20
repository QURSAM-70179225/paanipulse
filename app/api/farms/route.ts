import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api/http";
import { getSession, hashSecret } from "@/lib/auth/session";
import { normalisePhone } from "@/lib/auth/token";
import { FarmCreate } from "@/lib/services/farmInput";

export const dynamic = "force-dynamic";

/** Farmer: create own farm. Installer: register a farmer (account + farm) at the point of sale. */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();
  if (user.role === "AUTHORITY") return forbidden();
  const parsed = FarmCreate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const b = parsed.data;
  try {
    let ownerId: string | null = user.role === "FARMER" ? user.id : null;
    let farmerName = user.name;
    if (user.role === "INSTALLER") {
      if (!b.farmer) return NextResponse.json({ error: "farmer details required" }, { status: 400 });
      const phone = normalisePhone(b.farmer.phone);
      if (!phone) return NextResponse.json({ error: "invalid-phone" }, { status: 400 });
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing && existing.role !== "FARMER") return NextResponse.json({ error: "phone-taken" }, { status: 409 });
      // Existing farmers keep their PIN; new farmers get the PIN the installer set with them.
      const farmer =
        existing ??
        (await prisma.user.create({ data: { role: "FARMER", name: b.farmer.name, phone, passwordHash: await hashSecret(b.farmer.pin) } }));
      ownerId = farmer.id;
      farmerName = farmer.name;
    }
    const farm = await prisma.farm.create({
      data: {
        farmerName,
        language: b.language,
        lat: b.lat,
        lng: b.lng,
        district: b.district,
        tehsil: b.tehsil || null,
        cropType: b.cropType,
        sowingDate: b.sowingDate,
        areaAcres: b.areaAcres,
        areaUnit: b.areaUnit,
        irrigationMethod: b.irrigationMethod,
        soilType: b.soilType,
        variety: b.variety,
        maturity: b.maturity,
        dataConsent: b.dataConsent,
        isSynthetic: false,
        ownerId,
        installerId: user.role === "INSTALLER" ? user.id : null,
        pumps: { create: { ratedKw: b.ratedKw, pvKwp: b.pvKwp, staticDepthFt: b.staticDepthFt } },
      },
    });
    return NextResponse.json({ ok: true, id: farm.id }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
