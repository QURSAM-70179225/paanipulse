import { redirect } from "next/navigation";
import { SimplePage } from "@/components/account/SimplePage";
import { ChangeSecretForm } from "@/components/account/SecretForms";
import { getSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/token";
import { dictFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account · PaaniPulse" };

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account");
  const lang = await getLang(user.role === "FARMER" ? "ur" : "en");
  const d = dictFor(lang);
  const farmer = user.role === "FARMER";
  return (
    <SimplePage lang={lang} title={`${d.accountTitle} · ${user.name}`} back={homeFor(user.role)} backLabel={d.appName}>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">{farmer ? d.changePin : d.changePassword}</h2>
        <ChangeSecretForm d={d} isFarmer={farmer} />
      </section>
      <form action="/api/auth/logout" method="post">
        <button className="h-12 w-full rounded-xl border border-slate-300 bg-white font-semibold text-slate-800">{d.signOut}</button>
      </form>
    </SimplePage>
  );
}
