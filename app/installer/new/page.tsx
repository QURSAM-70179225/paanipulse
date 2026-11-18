import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { WizardPage } from "@/components/onboard/WizardPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register a farmer · PaaniPulse" };

export default async function NewInstallPage() {
  const user = await getSession();
  if (!user || user.role !== "INSTALLER") redirect("/login?next=/installer/new");
  return <WizardPage mode="installer" lang={await getLang("en")} user={user} backHref="/installer" />;
}
