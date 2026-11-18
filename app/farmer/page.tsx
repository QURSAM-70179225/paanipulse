import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { dictFor, dirFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FarmerHome() {
  const user = await getSession();
  if (!user) redirect("/login?next=/farmer");
  if (user.role === "INSTALLER") redirect("/installer");
  const farms = await prisma.farm.findMany({ where: { ownerId: user.id }, select: { id: true, district: true, cropType: true, areaAcres: true }, orderBy: { createdAt: "asc" } });
  if (farms.length === 0) redirect("/farmer/onboard");
  if (farms.length === 1) redirect(`/farmer/${farms[0].id}`);
  const lang = await getLang("ur");
  const d = dictFor(lang);
  return (
    <main dir={dirFor(lang)} className={cn("mx-auto min-h-screen max-w-md bg-slate-50 p-4", lang === "ur" && "ur-ui")}>
      <h1 className="mb-4 text-2xl font-bold">{d.myFarms}</h1>
      <ul className="flex flex-col gap-2">
        {farms.map((f) => (
          <li key={f.id}>
            <Link href={`/farmer/${f.id}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Sprout className="h-5 w-5 text-emerald-700" aria-hidden /> {f.district} · {f.cropType} · {f.areaAcres} {d.acres}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/farmer/onboard" className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 font-semibold text-white">
        <Plus className="h-5 w-5" aria-hidden /> {d.addFarm}
      </Link>
    </main>
  );
}
