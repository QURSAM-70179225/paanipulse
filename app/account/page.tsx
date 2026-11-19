import { redirect } from "next/navigation";
import { SimplePage } from "@/components/account/SimplePage";
import { ChangeSecretForm, SmsAdviceToggle } from "@/components/account/SecretForms";
import { prisma } from "@/lib/db";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { smsConfigured } from "@/lib/services/sms";
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
  const smsAdvice = farmer ? (await prisma.user.findUnique({ where: { id: user.id }, select: { smsAdvice: true } }))?.smsAdvice ?? false : false;
  return (
    <SimplePage lang={lang} title={`${d.accountTitle} · ${user.name}`} back={homeFor(user.role)} backLabel={d.appName}>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">{farmer ? d.changePin : d.changePassword}</h2>
        <ChangeSecretForm d={d} isFarmer={farmer} />
      </section>
      {farmer && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold">{d.smsAdviceTitle}</h2>
          <SmsAdviceToggle d={d} initial={smsAdvice} available={smsConfigured()} />
        </section>
      )}
      <SignOutButton className="h-12 w-full rounded-xl border border-slate-300 bg-white font-semibold text-slate-800">{d.signOut}</SignOutButton>
    </SimplePage>
  );
}
