import "dotenv/config";

export function getSchedulyBaseUrl() {
  const fromEnv = process.env.SCHEDULY_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = process.env.HOSTNAME?.trim() || "localhost";
  const port = process.env.PORT?.trim() || "3005";
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
    /\/$/,
    "",
  );
  return `http://${host}:${port}${basePath}`;
}

export type HttpResult = {
  ok: boolean;
  status: number;
  body: unknown;
  setCookie: string | null;
};

function normalizeCookie(
  cookie?: string | null | { cookie?: string | null },
): string | null {
  if (!cookie) return null;
  if (typeof cookie === "string") return cookie;
  return cookie.cookie ?? null;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function requestJson(
  method: string,
  url: string,
  opts?: {
    body?: unknown;
    cookie?: string | null | { cookie?: string | null };
  },
): Promise<HttpResult> {
  const cookie = normalizeCookie(opts?.cookie);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(url, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  return {
    ok: res.ok,
    status: res.status,
    body: await parseBody(res),
    setCookie: res.headers.get("set-cookie"),
  };
}

export async function postJson(
  url: string,
  body: unknown,
  cookie?: string | null | { cookie?: string | null },
): Promise<HttpResult> {
  return requestJson("POST", url, { body, cookie });
}

export async function getJson(
  url: string,
  cookie?: string | null | { cookie?: string | null },
): Promise<HttpResult> {
  return requestJson("GET", url, { cookie });
}

export async function putJson(
  url: string,
  body: unknown,
  cookie?: string | null | { cookie?: string | null },
): Promise<HttpResult> {
  return requestJson("PUT", url, { body, cookie });
}

export async function patchJson(
  url: string,
  body: unknown,
  cookie?: string | null | { cookie?: string | null },
): Promise<HttpResult> {
  return requestJson("PATCH", url, { body, cookie });
}

export async function deleteJson(
  url: string,
  cookie?: string | null | { cookie?: string | null },
): Promise<HttpResult> {
  return requestJson("DELETE", url, { cookie });
}

/** Extrae cookie de sesión staff desde Set-Cookie. */
export function extractSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = /scheduly_session=([^;]+)/i.exec(setCookie);
  return match ? `scheduly_session=${match[1]}` : null;
}
