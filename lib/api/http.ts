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
