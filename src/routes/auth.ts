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
import { magicLinkEmail, sendMail } from "../lib/email";
import { clientIp, hashIp } from "../lib/ip";
import { resolveIpHashSecret } from "../lib/secrets";
import { LOGIN_COPY, loginHtmlResponse } from "../views/login";

type Env = {
  Bindings: Cloudflare.Env;
};

export const authRoutes = new Hono<Env>();

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
  const user = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (user) return c.redirect("/", 302);
  return loginHtmlResponse({ locale, env: c.env, state: "form" });
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
    return loginHtmlResponse(
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
      return loginHtmlResponse(
        { locale, env: c.env, state: "rate_limited" },
        429,
      );
    }
  }

  const d1Limit = await checkAuthD1Limits(c.env.DB, emailNorm, ipHash);
  if (!d1Limit.ok) {
    track(c.env.ANALYTICS, "rate_limited", { reason: `auth_${d1Limit.reason}` });
    if (json) return c.json({ error: "Try again shortly." }, 429);
    return loginHtmlResponse(
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
    return loginHtmlResponse(
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

  return loginHtmlResponse({
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
    return loginHtmlResponse(
      { locale, env: c.env, state: "invalid" },
      400,
    );
  }

  const consumed = await consumeMagicLink(c.env.DB, token);
  if (!consumed.ok) {
    return loginHtmlResponse(
      { locale, env: c.env, state: consumed.reason },
      400,
    );
  }

  const user = await findOrCreateUser(c.env.DB, consumed.emailNorm);
  if (!user) {
    return loginHtmlResponse(
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

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
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
