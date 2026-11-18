import { MessageCircle, Sprout, Wrench } from "lucide-react";
import { SimplePage } from "@/components/account/SimplePage";
import { ForgotForm } from "@/components/account/SecretForms";
import { dictFor } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";

export const metadata = { title: "Reset PIN or password · PaaniPulse" };

export default async function ForgotPage() {
  const lang = await getLang("ur");
  const d = dictFor(lang);
  const support = process.env.SUPPORT_WHATSAPP?.replace(/\D/g, "");
  return (
    <SimplePage lang={lang} title={d.forgotTitle} back="/login" backLabel={d.signIn}>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 font-bold"><Sprout className="h-5 w-5 text-emerald-700" aria-hidden /> {d.iAmFarmer}</h2>
        <p className="text-slate-700">{d.forgotFarmer}</p>
        {support && (
          <p className="mt-3 text-slate-700">
            {d.forgotSupport}{" "}
            <a className="inline-flex items-center gap-1 font-semibold text-[#128C7E] underline" href={`https://wa.me/${support}`} dir="ltr">
              <MessageCircle className="h-4 w-4" aria-hidden /> +{support}
            </a>
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 font-bold"><Wrench className="h-5 w-5 text-amber-700" aria-hidden /> {d.iAmInstaller} / {d.iAmAuthority}</h2>
        <p className="mb-3 text-slate-700">{d.forgotEmailIntro}</p>
        <ForgotForm d={d} />
      </section>
    </SimplePage>
  );
}
