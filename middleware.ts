import { NextResponse, type NextRequest } from "next/server";

const SKIP_METHODS = new Set(["GET", "OPTIONS", "HEAD"]);

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

/**
 * Registra mutaciones HTTP en SystemLog (no GET/OPTIONS/HEAD).
 * Fire-and-forget hacia /api/system/logs con IP + User-Agent.
 */
export function middleware(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (SKIP_METHODS.has(method)) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  if (
    path.includes("/api/system/logs") ||
    path.includes("/_next") ||
    path.includes("/favicon")
  ) {
    return NextResponse.next();
  }

  const endPoint = `${path}${request.nextUrl.search || ""}`;
  const ingestPath = `${basePath}/api/system/logs`;
  const origin = request.nextUrl.origin;
  const cookie = request.headers.get("cookie") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "local";
  const referer = request.headers.get("referer") ?? "";
  const schedulyClient = request.headers.get("x-scheduly-client") ?? "";
  const schedulyFlow = request.headers.get("x-scheduly-flow") ?? "";

  void fetch(`${origin}${ingestPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-scheduly-log-ingest": "1",
      cookie,
      "user-agent": userAgent,
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      ...(schedulyClient ? { "x-scheduly-client": schedulyClient } : {}),
      ...(schedulyFlow ? { "x-scheduly-flow": schedulyFlow } : {}),
    },
    body: JSON.stringify({
      httpMethod: method,
      endPoint,
      ip,
      userAgent,
      referer,
      client: schedulyClient || undefined,
    }),
  }).catch(() => {
    /* silencioso */
  });

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
