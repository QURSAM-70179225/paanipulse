import { AuthPage } from "@/components/auth/AuthPage";
import { getLang } from "@/lib/i18n/server";

export const metadata = { title: "Create account · PaaniPulse" };

export default async function SignupPage() {
  const demoEnabled = (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
  return <AuthPage mode="signup" lang={await getLang("ur")} demoEnabled={demoEnabled} />;
}
