import { AuthorityDashboard } from "@/components/authority/AuthorityDashboard";
import { getAuthorityData } from "@/lib/services/authority";
import { dictFor, dirFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Authority dashboard · PaaniPulse" };

export default async function AuthorityPage() {
  const user = await getSession();
  if (!user || user.role !== "AUTHORITY") redirect("/login?next=/authority");
  const lang = await getLang("en");
  const initial = await getAuthorityData({ days: 7, minExcessPct: 0 });
  return (
    <main dir={dirFor(lang)} className={cn(lang === "ur" && "ur-ui")}>
      <AuthorityDashboard initial={initial} lang={lang} dict={dictFor(lang)} user={user} />
    </main>
  );
}
