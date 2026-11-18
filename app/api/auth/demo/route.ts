import { NextResponse } from "next/server";
import { loginWithEmail, loginWithPhone } from "@/lib/auth/login";
import { DEMO_ACCOUNTS, homeFor } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

/** One-tap demo sign-in for judges (form POST). Disabled when DEMO_MODE=false. */
export async function POST(req: Request) {
  if ((process.env.DEMO_MODE ?? "true").toLowerCase() === "false") return NextResponse.json({ error: "demo disabled" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const as = String(form?.get("as") ?? "");
  const next = String(form?.get("next") ?? "");
  if ((process.env.AUTH_SECRET?.length ?? 0) < 16) {
    console.error("Demo login failed: AUTH_SECRET is not set (or < 16 chars). Add it in the host's environment variables.");
    return NextResponse.json({ error: "Server is missing AUTH_SECRET. See /api/health?full=1" }, { status: 500 });
  }
  let r;
  try {
    r =
    as === "farmer"
      ? await loginWithPhone(DEMO_ACCOUNTS.farmer.phone, DEMO_ACCOUNTS.farmer.pin)
      : as === "installer"
        ? await loginWithEmail(DEMO_ACCOUNTS.installer.email, DEMO_ACCOUNTS.installer.password)
        : as === "authority"
          ? await loginWithEmail(DEMO_ACCOUNTS.authority.email, DEMO_ACCOUNTS.authority.password)
          : null;
  } catch (err) {
    console.error("Demo login failed (database?):", err);
    return NextResponse.json({ error: "Sign-in failed on the server. See /api/health?full=1" }, { status: 500 });
  }
  if (!r) return NextResponse.json({ error: "unknown demo account" }, { status: 400 });
  if (!r.ok) return NextResponse.redirect(new URL("/login?error=demo", req.url), 303);
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : as === "farmer" ? "/farmer/karamat" : homeFor(r.role);
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
