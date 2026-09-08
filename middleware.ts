import { NextResponse, type NextRequest } from "next/server";

const SKIP_METHODS = new Set(["GET", "OPTIONS", "HEAD"]);

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

/**
 * Registra mutaciones HTTP en SystemLog (no GET/OPTIONS/HEAD).
 * Fire-and-forget hacia /api/system/logs.
 */
export function middleware(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (SKIP_METHODS.has(method)) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  // Evita bucle y ruido
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

  // No await: no retrasa la request
  void fetch(`${origin}${ingestPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-scheduly-log-ingest": "1",
      cookie,
    },
    body: JSON.stringify({
      httpMethod: method,
      endPoint,
      system: userAgent,
    }),
  }).catch(() => {
    /* silencioso */
  });

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    // con basePath Next aplica el matcher relativo a la app
  ],
};
