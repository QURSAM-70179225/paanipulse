import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { WizardPage } from "@/components/onboard/WizardPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add your farm · PaaniPulse" };

export default async function OnboardPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/farmer/onboard");
  if (user.role === "INSTALLER") redirect("/installer/new");
  return <WizardPage mode="farmer" lang={await getLang("ur")} user={user} backHref="/farmer" />;
}
