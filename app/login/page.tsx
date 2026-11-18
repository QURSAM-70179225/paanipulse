import { AuthPage } from "@/components/auth/AuthPage";
import { getLang } from "@/lib/i18n/server";

export const metadata = { title: "Sign in · PaaniPulse" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const demoEnabled = (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
  return <AuthPage mode="login" lang={await getLang("ur")} next={next} demoEnabled={demoEnabled} />;
}
