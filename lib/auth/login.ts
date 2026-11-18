/** Credential checks shared by login and demo-login routes. */
import "server-only";
import { prisma } from "@/lib/db";
import { checkSecret, clearFailures, loginBlocked, recordFailure, startSession } from "./session";
import { normalisePhone, type Role } from "./token";

export type LoginResult = { ok: true; role: Role } | { ok: false; status: number; error: string };

export async function loginWithPhone(phoneRaw: string, pin: string): Promise<LoginResult> {
  const phone = normalisePhone(phoneRaw);
  if (!phone) return { ok: false, status: 400, error: "invalid-phone" };
  return check({ phone }, pin, phone);
}

export async function loginWithEmail(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  return check({ email }, password, email);
}

async function check(where: { phone: string } | { email: string }, secret: string, id: string): Promise<LoginResult> {
  if (loginBlocked(id)) return { ok: false, status: 429, error: "too-many-attempts" };
  const user = await prisma.user.findUnique({ where });
  // Compare even when the user is missing, so timing doesn't reveal which accounts exist.
  const ok = await checkSecret(secret, user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !ok) {
    recordFailure(id);
    return { ok: false, status: 401, error: "wrong-credentials" };
  }
  clearFailures(id);
  await startSession({ id: user.id, role: user.role as Role, name: user.name });
  return { ok: true, role: user.role as Role };
}
