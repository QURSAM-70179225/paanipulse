/** Session token (JWT, HS256) — edge-safe, used by middleware and server code. */
import { jwtVerify, SignJWT } from "jose";

export type Role = "FARMER" | "INSTALLER" | "AUTHORITY";
export interface SessionUser {
  id: string;
  role: Role;
  name: string;
}

export const SESSION_COOKIE = "pp_session";
export const SESSION_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (at least 16 characters)");
  return new TextEncoder().encode(s);
}

export async function signSession(u: SessionUser): Promise<string> {
  return new SignJWT({ role: u.role, name: u.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || !["FARMER", "INSTALLER", "AUTHORITY"].includes(role)) return null;
    return { id: payload.sub, role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

/** Pakistani mobile numbers → "03XXXXXXXXX". Returns null if it doesn't look like one. */
export function normalisePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(4);
  if (d.startsWith("92") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("3")) d = `0${d}`;
  return /^03\d{9}$/.test(d) ? d : null;
}

export function homeFor(role: Role) {
  return role === "AUTHORITY" ? "/authority" : role === "INSTALLER" ? "/installer" : "/farmer";
}

export const DEMO_ACCOUNTS = {
  farmer: { phone: "03000000000", pin: "1234" },
  installer: { email: "installer@paanipulse.demo", password: "demo1234" },
  authority: { email: "authority@paanipulse.demo", password: "demo1234" },
} as const;

/** Demo accounts are shared by judges: their PIN/password can never be changed or reset. */
export function isDemoAccount(u: { phone?: string | null; email?: string | null }) {
  return u.phone === DEMO_ACCOUNTS.farmer.phone || !!u.email?.toLowerCase().endsWith("@paanipulse.demo");
}
