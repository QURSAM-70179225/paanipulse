import { AuthPage } from "@/components/auth/AuthPage";
import { getLang } from "@/lib/i18n/server";

export const metadata = { title: "Sign in · PaaniPulse" };

const ROLES = { farmer: "FARMER", installer: "INSTALLER", authority: "AUTHORITY" } as const;

/** /login?as=installer (or authority, farmer) opens the sign-in form for that role. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  const demoEnabled = (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
  return <AuthPage mode="login" lang={await getLang("ur")} next={next} demoEnabled={demoEnabled} initialRole={as ? ROLES[as as keyof typeof ROLES] : undefined} />;
}
