import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function badRequest(err: ZodError) {
  return NextResponse.json({ error: "Invalid request", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
}
export const notFound = (what = "Not found") => NextResponse.json({ error: what }, { status: 404 });
export function serverError(err: unknown) {
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

import { canAccessFarm, getSession, hasRole } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/token";

export const unauthorized = () => NextResponse.json({ error: "Please sign in." }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Not allowed." }, { status: 403 });

/** Returns an error response if the signed-in user may not access this farm, else null. */
export async function guardFarm(farmId: string) {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!(await canAccessFarm(user, farmId))) return notFound("Farm not found");
  return null;
}

export async function guardRole(...roles: Role[]) {
  const user = await getSession();
  if (!user) return unauthorized();
  return hasRole(user, ...roles) ? null : forbidden();
}
