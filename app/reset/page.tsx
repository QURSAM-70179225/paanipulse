import { SimplePage } from "@/components/account/SimplePage";
import { ResetForm } from "@/components/account/SecretForms";
import { dictFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";

export const metadata = { title: "New password · PaaniPulse" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const lang = await getLang("en");
  const d = dictFor(lang);
  return (
    <SimplePage lang={lang} title={d.resetTitle} back="/login" backLabel={d.signIn}>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {token ? <ResetForm d={d} token={token} /> : <p className="text-red-800">{d.resetInvalid}</p>}
      </section>
    </SimplePage>
  );
}
