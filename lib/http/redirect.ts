/**
 * Redirect with a RELATIVE Location header. Behind a proxy (Render, Docker, nginx) `req.url` is the internal
 * address (e.g. http://localhost:10000), so absolute redirects built from it send users to localhost.
 * Browsers resolve a relative Location against the address they actually used.
 */
export function relativeRedirect(path: string, status: 303 | 307 = 303): Response {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return new Response(null, { status, headers: { Location: safe } });
}

/**
 * Absolute public URL for middleware redirects (middleware requires absolute URLs).
 * Uses the proxy's forwarded headers so users stay on the public domain, not the internal localhost address.
 */
export function publicUrl(req: { headers: Headers; nextUrl: URL }, path: string): URL {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || req.nextUrl.protocol.replace(":", "");
  return new URL(path, `${proto}://${host}`);
}
