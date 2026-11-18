import { type NextRequest } from "next/server";
import { badRequest, guardRole, serverError } from "@/lib/api/http";
import { AuthorityQuery, getAuthorityData, toCsv } from "@/lib/services/authority";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await guardRole("AUTHORITY");
  if (denied) return denied;
  const parsed = AuthorityQuery.safeParse(Object.fromEntries([...req.nextUrl.searchParams].filter(([, v]) => v !== "")));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const d = await getAuthorityData(parsed.data);
    const name = `paanipulse-extraction-${d.window.end.slice(0, 10)}-${d.window.days}d.csv`;
    return new Response(toCsv(d), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
    });
  } catch (err) {
    return serverError(err);
  }
}
