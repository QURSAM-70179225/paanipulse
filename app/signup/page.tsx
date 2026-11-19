import { AuthPage } from "@/components/auth/AuthPage";
import { getLang } from "@/lib/i18n/server";

export const metadata = { title: "Create account · PaaniPulse" };

const ROLES = { farmer: "FARMER", installer: "INSTALLER", authority: "AUTHORITY" } as const;

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const demoEnabled = (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
  return <AuthPage mode="signup" lang={await getLang("ur")} demoEnabled={demoEnabled} initialRole={as ? ROLES[as as keyof typeof ROLES] : undefined} />;
}
