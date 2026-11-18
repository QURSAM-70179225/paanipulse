import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health + configuration check (never returns secret values, only yes/no).
 * /api/health        → fast liveness (used by Render)
 * /api/health?full=1 → also checks env vars, database, tables and demo accounts
 */
export async function GET(req: Request) {
  const base = { ok: true, service: "paanipulse", time: new Date().toISOString() };
  if (!new URL(req.url).searchParams.has("full")) return NextResponse.json(base);

  const env = {
    AUTH_SECRET: (process.env.AUTH_SECRET?.length ?? 0) >= 16,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    AZURE_SPEECH: !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    CRON_SECRET: !!process.env.CRON_SECRET,
    DEMO_MODE: (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false",
  };
  let database = "ok";
  let tables = "ok";
  let demoAccounts = 0;
  let farms = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    // Prisma puts "Invalid `...` invocation:" first; the useful reason is on a later line.
    const lines = (e as Error).message.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("Invalid `"));
    database = `error: ${lines[0] ?? "unreachable"}`.slice(0, 200);
  }
  if (database === "ok") {
    try {
      demoAccounts = await prisma.user.count({ where: { OR: [{ phone: "03000000000" }, { email: { endsWith: "@paanipulse.demo" } }] } });
      farms = await prisma.farm.count();
    } catch {
      tables = "missing — run `prisma migrate deploy` (check the build command)";
    }
  }
  const problems = [
    !env.AUTH_SECRET && "AUTH_SECRET is not set (or shorter than 16 characters) — sign-in cannot work",
    !env.DATABASE_URL && "DATABASE_URL is not set",
    !env.DIRECT_URL && "DIRECT_URL is not set (use the same Neon string as DATABASE_URL if you only have one)",
    database !== "ok" && `Database: ${database}`,
    tables !== "ok" && `Tables: ${tables}`,
    database === "ok" && tables === "ok" && demoAccounts < 3 && "Demo accounts missing — the seed did not run (database was not empty?)",
  ].filter(Boolean);
  return NextResponse.json({ ...base, ok: problems.length === 0, env, database, tables, demoAccounts, farms, problems }, { status: problems.length ? 503 : 200 });
}
