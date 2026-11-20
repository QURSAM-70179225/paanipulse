import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** No farm yet: set one up. One farm: open it. Several: show them all (each farm is managed on its own page). */
export default async function FarmerHome() {
  const user = await getSession();
  if (!user) redirect("/login?next=/farmer");
  if (user.role === "INSTALLER") redirect("/installer");
  const farms = await prisma.farm.findMany({ where: { ownerId: user.id }, select: { id: true }, orderBy: { createdAt: "asc" } });
  if (farms.length === 0) redirect("/farmer/onboard");
  if (farms.length === 1) redirect(`/farmer/${farms[0].id}`);
  redirect("/farmer/farms");
}
