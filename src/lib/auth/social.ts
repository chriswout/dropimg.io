import { findOrCreateUser, isValidEmail, normalizeEmail } from "./magic-link";
import {
  base64Url,
  cookieSecure,
  randomToken,
  sha256Bytes,
  timingSafeEqualBytes,
} from "./crypto";
import { resolveIpHashSecret } from "../secrets";
import { uuid } from "../tokens";

export const SOCIAL_PROVIDERS = ["google", "github"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type SocialIntent = "login" | "connect";

export type SocialEnv = {
  ENVIRONMENT?: string;
  IP_HASH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export type SocialProfile = {
  provider: SocialProvider;
  providerUserId: string;
  emailNorm: string;
};

export type SocialUser = { id: string; email: string };

export type SocialLinkOk = { ok: true; user: SocialUser };
export type SocialLinkFail = {
  ok: false;
  reason:
    | "account_gone"
    | "identity_taken"
    | "already_linked"
    | "no_email";
};
export type SocialLinkResult = SocialLinkOk | SocialLinkFail;

export type SocialFailReason =
  | "invalid"
  | "unavailable"
  | "no_email"
  | "account_gone"
  | "identity_taken"
  | "already_linked"
  | "session_required";

export const OAUTH_STATE_COOKIE = "dropimg_oauth";
const OAUTH_STATE_TTL = 600;

const GITHUB_NOREPLY = /(^|\.)users\.noreply\.github\.com$|^noreply\.github\.com$/i;

export function isSocialProvider(value: string): value is SocialProvider {
  return (SOCIAL_PROVIDERS as readonly string[]).includes(value);
}

export function isGithubNoreply(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return GITHUB_NOREPLY.test(domain);
}

export function usableSocialEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  return isValidEmail(norm) && !isGithubNoreply(norm);
}

export function pickGitHubEmail(
  emails: Array<{ email?: string; primary?: boolean; verified?: boolean }>,
): string | null {
  const usable = emails.filter(
    (row) => row.verified && row.email && usableSocialEmail(row.email),
  );
  const primary = usable.find((row) => row.primary);
  const chosen = primary?.email ?? usable[0]?.email;
  return chosen ? normalizeEmail(chosen) : null;
}

export function profileFromGoogleUserinfo(
  raw: Record<string, unknown>,
): SocialProfile | { error: "no_email" } {
  const id = String(raw.sub ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const verified = raw.email_verified === true || raw.email_verified === "true";
  if (!id || !verified || !usableSocialEmail(email)) {
    return { error: "no_email" };
  }
  return {
    provider: "google",
    providerUserId: id,
    emailNorm: normalizeEmail(email),
  };
}

export function socialClient(
  env: SocialEnv,
  provider: SocialProvider,
): { id: string; secret: string } | null {
  const id =
    provider === "google"
      ? env.GOOGLE_CLIENT_ID?.trim()
      : env.GITHUB_CLIENT_ID?.trim();
  const secret =
    provider === "google"
      ? env.GOOGLE_CLIENT_SECRET?.trim()
      : env.GITHUB_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

export function socialEnabled(
  env: SocialEnv,
  provider: SocialProvider,
): boolean {
  return socialClient(env, provider) != null;
}

export function enabledSocialProviders(env: SocialEnv): {
  google: boolean;
  github: boolean;
} {
  return {
    google: socialEnabled(env, "google"),
    github: socialEnabled(env, "github"),
  };
}

export async function findOrLinkSocialUser(
  db: D1Database,
  profile: SocialProfile,
  opts: { attachToUserId?: string; now?: number } = {},
): Promise<SocialLinkResult> {
  if (!usableSocialEmail(profile.emailNorm)) {
    return { ok: false, reason: "no_email" };
  }

  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const existing = await identityRow(
    db,
    profile.provider,
    profile.providerUserId,
  );

  if (opts.attachToUserId) {
    if (existing) {
      if (existing.user_id !== opts.attachToUserId) {
        return { ok: false, reason: "identity_taken" };
      }
      const user = await userById(db, existing.user_id);
      if (!user || user.deleted_at) return { ok: false, reason: "account_gone" };
      return { ok: true, user: { id: user.id, email: user.email } };
    }

    const attached = await userById(db, opts.attachToUserId);
    if (!attached || attached.deleted_at) {
      return { ok: false, reason: "account_gone" };
    }
    const inserted = await insertIdentity(db, {
      userId: attached.id,
      profile,
      now,
    });
    if (!inserted.ok) return inserted;
    return { ok: true, user: { id: attached.id, email: attached.email } };
  }

  if (existing) {
    const user = await userById(db, existing.user_id);
    if (!user || user.deleted_at) return { ok: false, reason: "account_gone" };
    return { ok: true, user: { id: user.id, email: user.email } };
  }

  const user = await findOrCreateUser(db, profile.emailNorm, now);
  if (!user) return { ok: false, reason: "account_gone" };

  const inserted = await insertIdentity(db, {
    userId: user.id,
    profile,
    now,
  });
  if (!inserted.ok) {
    if (inserted.reason === "identity_taken") {
      const raced = await identityRow(
        db,
        profile.provider,
        profile.providerUserId,
      );
      if (raced) {
        const owner = await userById(db, raced.user_id);
        if (!owner || owner.deleted_at) {
          return { ok: false, reason: "account_gone" };
        }
        if (owner.id === user.id) {
          return { ok: true, user: { id: owner.id, email: owner.email } };
        }
        return { ok: false, reason: "identity_taken" };
      }
    }
    return inserted;
  }
  return { ok: true, user };
}

export async function listIdentities(
  db: D1Database,
  userId: string,
): Promise<SocialProvider[]> {
  const rows = await db
    .prepare(
      `SELECT provider FROM auth_identities WHERE user_id = ? ORDER BY provider`,
    )
    .bind(userId)
    .all<{ provider: string }>();
  return (rows.results ?? [])
    .map((row) => row.provider)
    .filter(isSocialProvider);
}

export async function detachIdentity(
  db: D1Database,
  userId: string,
  provider: SocialProvider,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM auth_identities WHERE user_id = ? AND provider = ?`,
    )
    .bind(userId, provider)
    .run();
}

export async function deleteIdentitiesForUser(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db
    .prepare(`DELETE FROM auth_identities WHERE user_id = ?`)
    .bind(userId)
    .run();
}

export function publicOrigin(
  origin: string,
  env: { ENVIRONMENT?: string },
): string {
  if (env.ENVIRONMENT === "production") return "https://dropimg.io";
  return origin;
}

export function redirectUri(origin: string, provider: SocialProvider): string {
  return `${origin}/auth/${provider}/callback`;
}

/** Google's consent UI fetches the redirect URI cross-site before navigating. */
export function isSocialCallbackProbe(request: Request): boolean {
  const mode = (request.headers.get("sec-fetch-mode") || "").toLowerCase();
  const dest = (request.headers.get("sec-fetch-dest") || "").toLowerCase();
  if (mode === "navigate" || dest === "document") return false;
  const origin = request.headers.get("origin");
  if (!origin || (mode !== "cors" && mode !== "no-cors")) return false;
  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    return true;
  }
}

export async function beginSocialOAuth(opts: {
  env: SocialEnv;
  origin: string;
  provider: SocialProvider;
  intent: SocialIntent;
  userId?: string;
}): Promise<
  { ok: true; location: string; cookie: string } | { ok: false; reason: "unavailable" }
> {
  const client = socialClient(opts.env, opts.provider);
  if (!client) return { ok: false, reason: "unavailable" };
  if (opts.intent === "connect" && !opts.userId) {
    return { ok: false, reason: "unavailable" };
  }

  const origin = publicOrigin(opts.origin, opts.env);
  const verifier = randomToken();
  const challenge = base64Url(new Uint8Array(await sha256Bytes(verifier)));
  const ctx: OAuthState = {
    state: randomToken(),
    provider: opts.provider,
    intent: opts.intent,
    verifier,
    userId: opts.intent === "connect" ? opts.userId : undefined,
    exp: Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL,
  };
  const signed = await signOAuthState(ctx, opts.env);
  if (!signed) return { ok: false, reason: "unavailable" };

  const location =
    opts.provider === "google"
      ? googleAuthorizeUrl({
          clientId: client.id,
          redirectUri: redirectUri(origin, "google"),
          state: signed,
          challenge,
        })
      : githubAuthorizeUrl({
          clientId: client.id,
          redirectUri: redirectUri(origin, "github"),
          state: signed,
          challenge,
        });

  return { ok: true, location, cookie: oauthCookieHeader(signed, opts.env, OAUTH_STATE_TTL) };
}

export async function finishSocialOAuth(opts: {
  env: SocialEnv;
  db: D1Database;
  origin: string;
  provider: SocialProvider;
  url: URL;
  cookieHeader: string | undefined;
  sessionUserId?: string | null;
  fetcher?: typeof fetch;
}): Promise<
  | { ok: true; user: SocialUser; intent: SocialIntent }
  | { ok: false; reason: SocialFailReason }
> {
  const origin = publicOrigin(opts.origin, opts.env);
  const ctx = await resolveOAuthState({
    env: opts.env,
    provider: opts.provider,
    urlState: (opts.url.searchParams.get("state") || "").trim(),
    cookieHeader: opts.cookieHeader,
  });
  if (!ctx) {
    socialOAuthWarning(opts.provider, "state");
    return { ok: false, reason: "invalid" };
  }
  if (opts.url.searchParams.get("error")) {
    socialOAuthWarning(opts.provider, "provider_denied");
    return { ok: false, reason: "invalid" };
  }

  const code = (opts.url.searchParams.get("code") || "").trim();
  if (!code) {
    socialOAuthWarning(opts.provider, "missing_code");
    return { ok: false, reason: "invalid" };
  }

  const client = socialClient(opts.env, opts.provider);
  if (!client) return { ok: false, reason: "unavailable" };

  // Workerd's native fetch validates its receiver. Wrapping it prevents the
  // production-only "Illegal invocation" caused by storing fetch in a variable.
  const fetchFn: typeof fetch =
    opts.fetcher ?? ((input, init) => globalThis.fetch(input, init));
  let profile: Awaited<ReturnType<typeof fetchSocialProfile>>;
  try {
    profile = await fetchSocialProfile({
      provider: opts.provider,
      client,
      origin,
      code,
      verifier: ctx.verifier,
      fetchFn,
    });
  } catch (error) {
    socialOAuthWarning(opts.provider, "profile_exception", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, reason: "invalid" };
  }
  if (!profile.ok) return profile;

  if (ctx.intent === "connect") {
    const attachTo = ctx.userId || opts.sessionUserId;
    if (!attachTo) return { ok: false, reason: "session_required" };
    if (opts.sessionUserId && opts.sessionUserId !== attachTo) {
      return { ok: false, reason: "session_required" };
    }
    const linked = await findOrLinkSocialUser(opts.db, profile.profile, {
      attachToUserId: attachTo,
    });
    if (!linked.ok) return linked;
    return { ok: true, user: linked.user, intent: "connect" };
  }

  const linked = await findOrLinkSocialUser(opts.db, profile.profile);
  if (!linked.ok) return linked;
  return { ok: true, user: linked.user, intent: "login" };
}

export function oauthStateClearCookie(env: { ENVIRONMENT?: string }): string {
  return oauthCookieHeader("", env, 0);
}

type OAuthState = {
  state: string;
  provider: SocialProvider;
  intent: SocialIntent;
  verifier: string;
  userId?: string;
  exp?: number;
};

function googleAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

function githubAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function fetchSocialProfile(opts: {
  provider: SocialProvider;
  client: { id: string; secret: string };
  origin: string;
  code: string;
  verifier: string;
  fetchFn: typeof fetch;
}): Promise<{ ok: true; profile: SocialProfile } | { ok: false; reason: SocialFailReason }> {
  if (opts.provider === "google") {
    const tokens = await exchangeGoogleCode(opts);
    if (!tokens) return { ok: false, reason: "invalid" };
    if (tokens.accessToken) {
      const res = await opts.fetchFn("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (res.ok) {
        const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (raw) {
          const profile = profileFromGoogleUserinfo(raw);
          if ("error" in profile) return { ok: false, reason: "no_email" };
          return { ok: true, profile };
        }
      } else {
        socialOAuthWarning("google", "userinfo", { status: res.status });
      }
    }
    const fromId = profileFromGoogleIdToken(tokens.idToken, opts.client.id);
    if (fromId === "no_email") return { ok: false, reason: "no_email" };
    if (fromId) return { ok: true, profile: fromId };
    return { ok: false, reason: "invalid" };
  }

  const token = await exchangeGithubCode(opts);
  if (!token) return { ok: false, reason: "invalid" };
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "DropIMG (https://dropimg.io)",
  };
  const userRes = await opts.fetchFn("https://api.github.com/user", { headers });
  if (!userRes.ok) return { ok: false, reason: "invalid" };
  const user = (await userRes.json()) as { id?: number | string };
  const id = String(user.id ?? "").trim();
  if (!id) return { ok: false, reason: "invalid" };

  const emailRes = await opts.fetchFn("https://api.github.com/user/emails", {
    headers,
  });
  if (!emailRes.ok) return { ok: false, reason: "no_email" };
  const emails = (await emailRes.json()) as Array<{
    email?: string;
    primary?: boolean;
    verified?: boolean;
  }>;
  const emailNorm = pickGitHubEmail(Array.isArray(emails) ? emails : []);
  if (!emailNorm) return { ok: false, reason: "no_email" };
  return {
    ok: true,
    profile: { provider: "github", providerUserId: id, emailNorm },
  };
}

async function exchangeGoogleCode(opts: {
  client: { id: string; secret: string };
  origin: string;
  code: string;
  verifier: string;
  fetchFn: typeof fetch;
}): Promise<{ accessToken: string | null; idToken: string | null } | null> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.client.id,
    client_secret: opts.client.secret,
    redirect_uri: redirectUri(opts.origin, "google"),
    grant_type: "authorization_code",
    code_verifier: opts.verifier,
  });
  const res = await opts.fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    id_token?: string;
    error?: string;
  } | null;
  if (!res.ok) {
    socialOAuthWarning("google", "token", {
      status: res.status,
      oauthError: json?.error || "unknown",
    });
    return null;
  }
  const accessToken = json?.access_token?.trim() || null;
  const idToken = json?.id_token?.trim() || null;
  if (!accessToken && !idToken) {
    socialOAuthWarning("google", "token_payload");
    return null;
  }
  return { accessToken, idToken };
}

function profileFromGoogleIdToken(
  idToken: string | null,
  clientId: string,
): SocialProfile | "no_email" | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[1]!)),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
  const iss = String(claims.iss || "");
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") {
    return null;
  }
  if (String(claims.aud || "") !== clientId) return null;
  const profile = profileFromGoogleUserinfo(claims);
  if ("error" in profile) return "no_email";
  return profile;
}

async function exchangeGithubCode(opts: {
  client: { id: string; secret: string };
  origin: string;
  code: string;
  verifier: string;
  fetchFn: typeof fetch;
}): Promise<string | null> {
  const res = await opts.fetchFn("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DropIMG (https://dropimg.io)",
    },
    body: JSON.stringify({
      client_id: opts.client.id,
      client_secret: opts.client.secret,
      code: opts.code,
      redirect_uri: redirectUri(opts.origin, "github"),
      code_verifier: opts.verifier,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token?.trim() || null;
}

type IdentityRow = { user_id: string };

async function identityRow(
  db: D1Database,
  provider: SocialProvider,
  providerUserId: string,
): Promise<IdentityRow | null> {
  return db
    .prepare(
      `SELECT user_id FROM auth_identities
       WHERE provider = ? AND provider_user_id = ? LIMIT 1`,
    )
    .bind(provider, providerUserId)
    .first<IdentityRow>();
}

async function userById(
  db: D1Database,
  userId: string,
): Promise<{ id: string; email: string; deleted_at: number | null } | null> {
  return db
    .prepare(`SELECT id, email, deleted_at FROM users WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<{ id: string; email: string; deleted_at: number | null }>();
}

async function insertIdentity(
  db: D1Database,
  opts: { userId: string; profile: SocialProfile; now: number },
): Promise<{ ok: true } | SocialLinkFail> {
  try {
    await db
      .prepare(
        `INSERT INTO auth_identities
          (id, user_id, provider, provider_user_id, email_norm, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        uuid(),
        opts.userId,
        opts.profile.provider,
        opts.profile.providerUserId,
        opts.profile.emailNorm,
        opts.now,
      )
      .run();
    return { ok: true };
  } catch {
    const existing = await identityRow(
      db,
      opts.profile.provider,
      opts.profile.providerUserId,
    );
    if (existing && existing.user_id !== opts.userId) {
      return { ok: false, reason: "identity_taken" };
    }
    if (existing && existing.user_id === opts.userId) return { ok: true };
    return { ok: false, reason: "already_linked" };
  }
}

async function signOAuthState(
  ctx: OAuthState,
  env: SocialEnv,
): Promise<string | null> {
  const secret = resolveIpHashSecret(env);
  if (!secret.ok) return null;
  const payload = JSON.stringify(ctx);
  const sig = await hmacHex(secret.secret, payload);
  return `${base64Url(new TextEncoder().encode(payload))}.${sig}`;
}

async function resolveOAuthState(opts: {
  env: SocialEnv;
  provider: SocialProvider;
  urlState: string;
  cookieHeader: string | undefined;
}): Promise<OAuthState | null> {
  const fromUrl = await parseSignedOAuthState(opts.urlState, opts.env);
  if (fromUrl && fromUrl.provider === opts.provider) return fromUrl;

  const fromCookie = await readOAuthStateCookie(opts.cookieHeader, opts.env);
  if (
    fromCookie &&
    fromCookie.provider === opts.provider &&
    opts.urlState &&
    opts.urlState === fromCookie.state
  ) {
    return fromCookie;
  }
  return null;
}

async function readOAuthStateCookie(
  header: string | undefined,
  env: SocialEnv,
): Promise<OAuthState | null> {
  if (!header) return null;
  const m = new RegExp(`(?:^|;\\s*)${OAUTH_STATE_COOKIE}=([^;]+)`).exec(header);
  if (!m) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(m[1]!);
  } catch {
    return null;
  }
  return parseSignedOAuthState(raw, env);
}

async function parseSignedOAuthState(
  raw: string,
  env: SocialEnv,
): Promise<OAuthState | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const secret = resolveIpHashSecret(env);
  if (!secret.ok) return null;
  let payload: string;
  try {
    payload = new TextDecoder().decode(base64UrlDecode(payloadB64));
  } catch {
    return null;
  }
  const expected = await hmacHex(secret.secret, payload);
  const a = new TextEncoder().encode(sig);
  const b = new TextEncoder().encode(expected);
  if (a.byteLength !== b.byteLength) return null;
  if (!timingSafeEqualBytes(a.buffer, b.buffer)) return null;
  try {
    const parsed = JSON.parse(payload) as OAuthState;
    if (!isSocialProvider(parsed.provider)) return null;
    if (parsed.intent !== "login" && parsed.intent !== "connect") return null;
    if (!parsed.state || !parsed.verifier) return null;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function oauthCookieHeader(
  value: string,
  env: { ENVIRONMENT?: string },
  maxAge: number,
): string {
  const parts = [
    `${OAUTH_STATE_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure(env)) parts.push("Secure");
  return parts.join("; ");
}

function socialOAuthWarning(
  provider: SocialProvider,
  stage: string,
  details: Record<string, string | number> = {},
): void {
  console.warn("social_oauth_failed", { provider, stage, ...details });
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
