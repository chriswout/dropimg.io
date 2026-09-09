import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import {
  checkAuthD1Limits,
  consumeMagicLink,
  findOrCreateUser,
  insertMagicLink,
  isValidEmail,
  maskEmail,
  MAGIC_TTL_SECONDS,
  normalizeEmail,
} from "../lib/auth/magic-link";
import {
  clearSessionCookie,
  createSession,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  sessionCookieHeader,
} from "../lib/auth/session";
import { cookieSecure } from "../lib/auth/crypto";
import { safeNextPath } from "../lib/auth/next-path";
import {
  beginSocialOAuth,
  enabledSocialProviders,
  finishSocialOAuth,
  isSocialCallbackProbe,
  isSocialProvider,
  oauthStateClearCookie,
  type SocialProvider,
} from "../lib/auth/social";
import { magicLinkEmail, sendMail } from "../lib/email";
import { clientIp, hashIp } from "../lib/ip";
import { resolveIpHashSecret } from "../lib/secrets";
import { LOGIN_COPY, loginHtmlResponse, loginSocialError } from "../views/login";

type Env = {
  Bindings: Cloudflare.Env;
};

export const authRoutes = new Hono<Env>();

function loginPage(
  opts: Parameters<typeof loginHtmlResponse>[0],
  status?: number,
): Response {
  return loginHtmlResponse(
    { ...opts, social: enabledSocialProviders(opts.env) },
    status,
  );
}

function wantsJson(c: { req: { header: (n: string) => string | undefined } }) {
  const accept = c.req.header("accept") || "";
  const ct = c.req.header("content-type") || "";
  return ct.includes("application/json") || accept.includes("application/json");
}

function authDevEcho(env: Cloudflare.Env): boolean {
  return env.ENVIRONMENT === "development";
}

authRoutes.get("/login", async (c) => {
  const locale = resolveRequestLocale(c.req.raw);
  const next = safeNextPath(c.req.query("next"));
  const user = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (user) return c.redirect(next ?? "/", 302);
  const page = loginPage({
    locale,
    env: c.env,
    state: "form",
    social: enabledSocialProviders(c.env),
  });
  if (!next) return page;
  const headers = new Headers(page.headers);
  headers.append("Set-Cookie", nextCookie(next, c.env));
  return new Response(page.body, { status: page.status, headers });
});

authRoutes.post("/login", async (c) => {
  const locale = resolveRequestLocale(c.req.raw);
  let emailRaw = "";
  if ((c.req.header("content-type") || "").includes("application/json")) {
    try {
      const body = (await c.req.json()) as { email?: string };
      emailRaw = String(body.email ?? "");
    } catch {
      emailRaw = "";
    }
  } else {
    try {
      const form = await c.req.parseBody();
      emailRaw = String(form.email ?? "");
    } catch {
      emailRaw = "";
    }
  }

  const emailNorm = normalizeEmail(emailRaw);
  const json = wantsJson(c);

  if (!isValidEmail(emailNorm)) {
    if (json) return c.json({ error: "Invalid email" }, 400);
    return loginPage(
      { locale, env: c.env, state: "form", error: LOGIN_COPY[locale].invalidEmail },
      400,
    );
  }

  const secretResolved = resolveIpHashSecret(c.env);
  const ip = clientIp(c.req.raw);
  const ipHash = secretResolved.ok
    ? await hashIp(ip, secretResolved.secret)
    : "unknown";

  const limiter = c.env.AUTH_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `auth:${ipHash}` });
    if (!success) {
      track(c.env.ANALYTICS, "rate_limited", { reason: "auth_burst" });
      if (json) return c.json({ error: "Try again shortly." }, 429);
      return loginPage(
        { locale, env: c.env, state: "rate_limited" },
        429,
      );
    }
  }

  const d1Limit = await checkAuthD1Limits(c.env.DB, emailNorm, ipHash);
  if (!d1Limit.ok) {
    track(c.env.ANALYTICS, "rate_limited", { reason: `auth_${d1Limit.reason}` });
    if (json) return c.json({ error: "Try again shortly." }, 429);
    return loginPage(
      { locale, env: c.env, state: "rate_limited" },
      429,
    );
  }

  const { token } = await insertMagicLink(c.env.DB, emailNorm, ipHash);
  const origin = new URL(c.req.url).origin;
  const magicUrl = `${origin}/auth/callback?token=${encodeURIComponent(token)}`;

  const mail = magicLinkEmail({
    url: magicUrl,
    minutes: MAGIC_TTL_SECONDS / 60,
  });
  mail.to = emailNorm;
  const mailed = await sendMail(c.env, mail);

  track(c.env.ANALYTICS, "auth_requested", { reason: "magic_link" });

  const masked = maskEmail(emailNorm);
  const echo = authDevEcho(c.env) ? magicUrl : undefined;

  if (!mailed.sent && !echo) {
    if (json) {
      return c.json({ error: "Could not send email. Try again shortly." }, 503);
    }
    return loginPage(
      {
        locale,
        env: c.env,
        state: "form",
        error: LOGIN_COPY[locale].sendFailed,
      },
      503,
    );
  }

  if (json) {
    return c.json({
      ok: true,
      maskedEmail: masked,
      ...(echo ? { devMagicUrl: echo } : {}),
    });
  }

  return loginPage({
    locale,
    env: c.env,
    state: "sent",
    email: emailNorm,
    maskedEmail: masked,
    devMagicUrl: echo,
  });
});

authRoutes.get("/auth/callback", async (c) => {
  const token = (c.req.query("token") || "").trim();
  const locale = resolveRequestLocale(c.req.raw);
  if (!token) {
    return loginPage(
      { locale, env: c.env, state: "invalid" },
      400,
    );
  }

  const consumed = await consumeMagicLink(c.env.DB, token);
  if (!consumed.ok) {
    return loginPage(
      { locale, env: c.env, state: consumed.reason },
      400,
    );
  }

  const user = await findOrCreateUser(c.env.DB, consumed.emailNorm);
  if (!user) {
    return loginPage(
      {
        locale,
        env: c.env,
        state: "form",
        error: LOGIN_COPY[locale].accountGone,
      },
      403,
    );
  }

  const { token: sessionToken } = await createSession(c.env.DB, user.id);
  track(c.env.ANALYTICS, "auth_completed", { reason: "magic_link" });
  const next = safeNextPath(readNextCookie(c.req.header("cookie")));

  return new Response(null, {
    status: 302,
    headers: {
      Location: next ?? "/",
      "Set-Cookie": sessionCookieHeader(sessionToken, c.env),
      "Cache-Control": "private, no-store",
    },
  });
});

authRoutes.post("/api/auth/logout", async (c) => {
  if (!csrfOriginOk(c.req.raw)) {
    return c.json({ error: "Invalid origin" }, 403);
  }
  const user = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (user) await revokeSession(c.env.DB, user.sessionId);
  const formLogout = (c.req.header("content-type") || "").includes(
    "application/x-www-form-urlencoded",
  );
  if (formLogout && !wantsJson(c)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": clearSessionCookie(c.env),
        "Cache-Control": "private, no-store",
      },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearSessionCookie(c.env),
    },
  });
});

authRoutes.get("/auth/:provider", async (c) => {
  const provider = c.req.param("provider");
  if (!isSocialProvider(provider)) return c.notFound();
  return startSocial(c, provider);
});

authRoutes.get("/auth/:provider/callback", async (c) => {
  const provider = c.req.param("provider");
  if (!isSocialProvider(provider)) return c.notFound();
  return completeSocial(c, provider);
});

async function startSocial(
  c: { req: { raw: Request; header: (n: string) => string | undefined; url: string }; env: Cloudflare.Env },
  provider: SocialProvider,
): Promise<Response> {
  const locale = resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  const secretResolved = resolveIpHashSecret(c.env);
  const ip = clientIp(c.req.raw);
  const ipHash = secretResolved.ok
    ? await hashIp(ip, secretResolved.secret)
    : "unknown";
  const limiter = c.env.AUTH_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `auth:${ipHash}` });
    if (!success) {
      track(c.env.ANALYTICS, "rate_limited", { reason: "auth_burst" });
      return loginPage({ locale, env: c.env, state: "rate_limited" }, 429);
    }
  }

  const started = await beginSocialOAuth({
    env: c.env,
    origin: new URL(c.req.url).origin,
    provider,
    intent: session ? "connect" : "login",
    userId: session?.id,
  });
  if (!started.ok) {
    return loginPage(
      {
        locale,
        env: c.env,
        state: "form",
        error: LOGIN_COPY[locale].socialUnavailable,
      },
      503,
    );
  }
  track(c.env.ANALYTICS, "auth_requested", { reason: provider });
  return new Response(null, {
    status: 302,
    headers: {
      Location: started.location,
      "Set-Cookie": started.cookie,
      "Cache-Control": "private, no-store",
    },
  });
}

async function completeSocial(
  c: { req: { raw: Request; header: (n: string) => string | undefined; url: string }; env: Cloudflare.Env },
  provider: SocialProvider,
): Promise<Response> {
  if (isSocialCallbackProbe(c.req.raw)) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const locale = resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  let finished: Awaited<ReturnType<typeof finishSocialOAuth>>;
  try {
    finished = await finishSocialOAuth({
      env: c.env,
      db: c.env.DB,
      origin: new URL(c.req.url).origin,
      provider,
      url: new URL(c.req.url),
      cookieHeader: c.req.header("cookie"),
      sessionUserId: session?.id,
    });
  } catch (error) {
    console.error("social_oauth_callback_exception", {
      provider,
      error: error instanceof Error ? error.name : "unknown",
    });
    finished = { ok: false, reason: "invalid" };
  }

  const clearOauth = oauthStateClearCookie(c.env);
  if (!finished.ok) {
    console.warn("social_oauth_callback_failed", {
      provider,
      reason: finished.reason,
    });
    if (finished.reason === "session_required" || session) {
      const q =
        finished.reason === "identity_taken"
          ? "taken"
          : finished.reason === "already_linked"
            ? "already"
            : finished.reason === "no_email"
              ? "no_email"
              : finished.reason === "account_gone"
                ? "gone"
                : "failed";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/app/account?link=${q}`,
          "Set-Cookie": clearOauth,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return appendCookies(
      loginPage(
        {
          locale,
          env: c.env,
          state: "form",
          error: loginSocialError(locale, finished.reason),
        },
        400,
      ),
      [clearOauth],
    );
  }

  if (finished.intent === "connect") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/app/account",
        "Set-Cookie": clearOauth,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { token: sessionToken } = await createSession(c.env.DB, finished.user.id);
  track(c.env.ANALYTICS, "auth_completed", { reason: provider });
  const next = safeNextPath(readNextCookie(c.req.header("cookie")));
  return new Response(null, {
    status: 302,
    headers: socialLoginHeaders(next ?? "/", sessionToken, clearOauth, c.env),
  });
}

function socialLoginHeaders(
  location: string,
  sessionToken: string,
  clearOauth: string,
  env: Cloudflare.Env,
): Headers {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "private, no-store",
  });
  headers.append("Set-Cookie", sessionCookieHeader(sessionToken, env));
  headers.append("Set-Cookie", clearOauth);
  return headers;
}

function appendCookies(res: Response, cookies: string[]): Response {
  const headers = new Headers(res.headers);
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(res.body, { status: res.status, headers });
}

authRoutes.post("/api/auth/logout-all", async (c) => {
  if (!csrfOriginOk(c.req.raw)) {
    return c.json({ error: "Invalid origin" }, 403);
  }
  const user = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await revokeAllSessions(c.env.DB, user.id);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearSessionCookie(c.env),
    },
  });
});

function nextCookie(next: string, env: Cloudflare.Env): string {
  return [
    `dropimg_next=${encodeURIComponent(next)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=900",
    cookieSecure(env) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function readNextCookie(header: string | undefined): string | null {
  if (!header) return null;
  const m = /(?:^|;\s*)dropimg_next=([^;]+)/.exec(header);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return null;
  }
}
