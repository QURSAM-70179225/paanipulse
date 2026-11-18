import { AuthorityDashboard } from "@/components/authority/AuthorityDashboard";
import { getAuthorityData } from "@/lib/services/authority";
import { dictFor, dirFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Authority dashboard · PaaniPulse" };

export default async function AuthorityPage() {
  const lang = await getLang("en");
  const initial = await getAuthorityData({ days: 7, minExcessPct: 0 });
  return (
    <main dir={dirFor(lang)} className={cn(lang === "ur" && "ur-ui")}>
      <AuthorityDashboard initial={initial} lang={lang} dict={dictFor(lang)} />
    </main>
  );
}
