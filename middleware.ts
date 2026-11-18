import { NextResponse, type NextRequest } from "next/server";
import { homeFor, SESSION_COOKIE, verifySession, type Role } from "@/lib/auth/token";

/** Route → roles allowed. Fine-grained farm ownership is checked again in pages and APIs. */
const RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/authority", roles: ["AUTHORITY"] },
  { prefix: "/report", roles: ["AUTHORITY", "INSTALLER", "FARMER"] },
  { prefix: "/installer", roles: ["INSTALLER"] },
  { prefix: "/farmer", roles: ["FARMER", "INSTALLER"] },
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (!rule) return NextResponse.next();
  const user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (!rule.roles.includes(user.role)) return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/authority/:path*", "/report/:path*", "/installer/:path*", "/farmer/:path*"] };
