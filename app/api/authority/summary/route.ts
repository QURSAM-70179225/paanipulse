import { NextResponse, type NextRequest } from "next/server";
import { badRequest, guardRole, serverError } from "@/lib/api/http";
import { AuthorityQuery, getAuthorityData } from "@/lib/services/authority";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await guardRole("AUTHORITY");
  if (denied) return denied;
  const parsed = AuthorityQuery.safeParse(Object.fromEntries([...req.nextUrl.searchParams].filter(([, v]) => v !== "")));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    return NextResponse.json(await getAuthorityData(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}
