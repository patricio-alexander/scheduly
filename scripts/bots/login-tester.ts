import {
  askConfirm,
  c,
  nowStamp,
} from "../lib/menu-ui";
import {
  extractSessionCookie,
  getJson,
  getSchedulyBaseUrl,
  postJson,
} from "../lib/http";
import { saveTestHistory, stripAnsi } from "../lib/test-history";

export type TestAccount = {
  username: string;
  password: string;
  expectedRole?: string;
  label: string;
};

/** Cuentas bootstrap (tras npm run db:reset). Todas con password 12345678. */
export const SEED_LOGIN_ACCOUNTS: TestAccount[] = [
  {
    username: "andrea",
    password: "Andrea2026",
    expectedRole: "owner",
    label: "Dueña · andrea",
  },
  {
    username: "administrador",
    password: "12345678",
    expectedRole: "programmer",
    label: "Programador · administrador",
  },
  {
    username: "admin_colon",
    password: "12345678",
    expectedRole: "admin",
    label: "Administrador · Cristóbal Colón",
  },
  {
    username: "admin_eguiguren",
    password: "12345678",
    expectedRole: "admin",
    label: "Administrador · Eguiguren",
  },
  {
    username: "admin_loja",
    password: "12345678",
    expectedRole: "admin",
    label: "Administrador · Loja",
  },
  {
    username: "estilista_maria",
    password: "12345678",
    expectedRole: "employee",
    label: "Empleado · María García",
  },
  {
    username: "colorista_camila",
    password: "12345678",
    expectedRole: "employee",
    label: "Empleado · Camila Rojas",
  },
  {
    username: "unas_natalia",
    password: "12345678",
    expectedRole: "employee",
    label: "Empleado · Natalia Ortiz",
  },
];

type LoginCaseResult = {
  username: string;
  label: string;
  ok: boolean;
  detail: string;
};

function roleOf(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const role = (body as { role?: unknown }).role;
  return typeof role === "string" ? role : null;
}

async function runLoginCase(
  baseUrl: string,
  account: TestAccount,
  expectSuccess: boolean,
): Promise<LoginCaseResult> {
  const loginUrl = `${baseUrl}/api/auth/login`;
  const meUrl = `${baseUrl}/api/auth/me`;

  try {
    const login = await postJson(loginUrl, {
      username: account.username,
      password: account.password,
    });

    if (!expectSuccess) {
      if (login.status === 401 || login.status === 400) {
        return {
          username: account.username,
          label: account.label,
          ok: true,
          detail: `rechazado correctamente (HTTP ${login.status})`,
        };
      }
      return {
        username: account.username,
        label: account.label,
        ok: false,
        detail: `se esperaba rechazo, llegó HTTP ${login.status}`,
      };
    }

    if (!login.ok) {
      const msg =
        login.body &&
        typeof login.body === "object" &&
        "message" in login.body
          ? String((login.body as { message: unknown }).message)
          : "";
      return {
        username: account.username,
        label: account.label,
        ok: false,
        detail: `HTTP ${login.status}${msg ? ` · ${msg}` : ""}`,
      };
    }

    const cookie = extractSessionCookie(login.headers);
    if (!cookie) {
      return {
        username: account.username,
        label: account.label,
        ok: false,
        detail: "login OK pero sin cookie de sesión",
      };
    }

    const me = await getJson(meUrl, { cookie });
    if (!me.ok) {
      return {
        username: account.username,
        label: account.label,
        ok: false,
        detail: `cookie puesta pero /api/auth/me → HTTP ${me.status}`,
      };
    }

    const role = roleOf(me.body) ?? roleOf(login.body);
    if (account.expectedRole && role && role !== account.expectedRole) {
      return {
        username: account.username,
        label: account.label,
        ok: false,
        detail: `rol esperado "${account.expectedRole}", llegó "${role}"`,
      };
    }

    return {
      username: account.username,
      label: account.label,
      ok: true,
      detail: `OK · rol=${role ?? "?"} · sesión válida`,
    };
  } catch (error) {
    return {
      username: account.username,
      label: account.label,
      ok: false,
      detail:
        error instanceof Error
          ? `error de red: ${error.message}`
          : "error de red desconocido",
    };
  }
}

export async function runLoginTester() {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  console.log("");
  console.log(
    `${c.dim}[${nowStamp()}]${c.reset} ${c.bold}Bot: Login multi-cuenta${c.reset}`,
  );
  console.log(`${c.dim}Base URL: ${baseUrl}${c.reset}`);
  console.log(`${c.dim}La app debe estar corriendo (npm run dev).${c.reset}`);
  console.log("");

  const includeInvalid = await askConfirm(
    `${c.brightCyan}¿Incluir caso inválido (password incorrecta)?${c.reset}`,
  );

  // Por defecto prueba dueño + admins + muestra de empleados
  let accounts = [...SEED_LOGIN_ACCOUNTS];
  const onlyOwner = await askConfirm(
    `${c.brightCyan}¿Probar solo Administrador (Dueño)?${c.reset}`,
  );
  if (onlyOwner) {
    accounts = SEED_LOGIN_ACCOUNTS.filter((a) => a.username === "Administrador");
  }

  console.log("");
  console.log(`Probando ${accounts.length} cuenta(s)...`);
  console.log("");

  const results: LoginCaseResult[] = [];

  for (const account of accounts) {
    const result = await runLoginCase(baseUrl, account, true);
    results.push(result);
    const mark = result.ok
      ? `${c.green}OK${c.reset}`
      : `${c.red}FAIL${c.reset}`;
    console.log(
      `${c.dim}[${nowStamp()}]${c.reset} [${mark}] ${account.username.padEnd(16)} ${result.detail}`,
    );
  }

  if (includeInvalid) {
    const bad: TestAccount = {
      username: "andrea",
      password: "password-incorrecta",
      label: "Credenciales inválidas",
    };
    const result = await runLoginCase(baseUrl, bad, false);
    results.push(result);
    const mark = result.ok
      ? `${c.green}OK${c.reset}`
      : `${c.red}FAIL${c.reset}`;
    console.log(
      `${c.dim}[${nowStamp()}]${c.reset} [${mark}] ${"Administrador(bad)".padEnd(16)} ${result.detail}`,
    );
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log("");
  console.log("=".repeat(48));
  console.log(
    `Resumen login: ${c.green}${passed} OK${c.reset} · ${failed > 0 ? c.red : c.dim}${failed} FAIL${c.reset} · total ${results.length}`,
  );
  console.log("=".repeat(48));

  if (failed > 0) {
    console.log("");
    console.log("Fallidos:");
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.username}: ${r.detail}`);
    }
  }

  saveTestHistory({
    tester: "login-tester",
    mode: onlyOwner ? "owner-only" : includeInvalid ? "seed+invalid" : "seed",
    baseUrl,
    durationMs: Date.now() - started,
    ok: failed === 0,
    summary: { passed, failed, total: results.length },
    cases: results.map((r) => ({
      username: r.username,
      label: r.label,
      ok: r.ok,
      detail: stripAnsi(r.detail),
    })),
  });
}
