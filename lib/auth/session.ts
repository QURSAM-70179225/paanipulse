/** Server-side session helpers (cookies, password hashing, farm access rules). */
import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession, type Role, type SessionUser } from "./token";

export const hashSecret = (plain: string) => bcrypt.hash(plain, 10);
export const checkSecret = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export async function getSession(): Promise<SessionUser | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function startSession(u: SessionUser) {
  (await cookies()).set(SESSION_COOKIE, await signSession(u), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Farmers see their own farms; installers see farms they installed. Authorities only get anonymised views. */
export async function canAccessFarm(user: SessionUser | null, farmId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === "AUTHORITY") return false;
  const farm = await prisma.farm.findUnique({ where: { id: farmId }, select: { ownerId: true, installerId: true } });
  if (!farm) return false;
  return user.role === "FARMER" ? farm.ownerId === user.id : farm.installerId === user.id;
}

export const hasRole = (user: SessionUser | null, ...roles: Role[]) => !!user && roles.includes(user.role);

/** Very small in-memory brute-force brake (per instance): 8 failed attempts per identifier per 15 minutes. */
const failures = new Map<string, { n: number; until: number }>();
export function loginBlocked(id: string) {
  const f = failures.get(id);
  return !!f && f.n >= 8 && Date.now() < f.until;
}
export function recordFailure(id: string) {
  const f = failures.get(id);
  const fresh = !f || Date.now() > f.until;
  failures.set(id, { n: fresh ? 1 : f!.n + 1, until: Date.now() + 15 * 60_000 });
}
export const clearFailures = (id: string) => failures.delete(id);
