import { describe, expect, it } from "vitest";
import {
  beginSocialOAuth,
  findOrLinkSocialUser,
  finishSocialOAuth,
  isGithubNoreply,
  isSocialCallbackProbe,
  pickGitHubEmail,
  profileFromGoogleUserinfo,
  publicOrigin,
  usableSocialEmail,
  type SocialProfile,
} from "../../src/lib/auth/social";

const now = 1_700_000_000;
const env = {
  ENVIRONMENT: "development",
  IP_HASH_SECRET: "unit-test-ip-hash-secret",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GITHUB_CLIENT_ID: "github-id",
  GITHUB_CLIENT_SECRET: "github-secret",
};

function profile(over: Partial<SocialProfile> = {}): SocialProfile {
  return {
    provider: "google",
    providerUserId: "g-1",
    emailNorm: "user@example.com",
    ...over,
  };
}

describe("social email rules", () => {
  it("rejects GitHub noreply and unverified-looking addresses", () => {
    expect(isGithubNoreply("1+dev@users.noreply.github.com")).toBe(true);
    expect(usableSocialEmail("1+dev@users.noreply.github.com")).toBe(false);
    expect(usableSocialEmail("not-an-email")).toBe(false);
    expect(usableSocialEmail("ok@example.com")).toBe(true);
  });

  it("picks a verified GitHub email and ignores noreply", () => {
    expect(
      pickGitHubEmail([
        { email: "1+dev@users.noreply.github.com", primary: true, verified: true },
        { email: "work@example.com", primary: false, verified: true },
      ]),
    ).toBe("work@example.com");
    expect(
      pickGitHubEmail([{ email: "hidden@example.com", primary: true, verified: false }]),
    ).toBeNull();
  });

  it("requires a verified Google email", () => {
    expect(
      profileFromGoogleUserinfo({
        sub: "abc",
        email: "user@example.com",
        email_verified: true,
      }),
    ).toEqual({
      provider: "google",
      providerUserId: "abc",
      emailNorm: "user@example.com",
    });
    expect(
      profileFromGoogleUserinfo({
        sub: "abc",
        email: "user@example.com",
        email_verified: false,
      }),
    ).toEqual({ error: "no_email" });
  });
});

describe("findOrLinkSocialUser", () => {
  it("creates a user and identity on first login", async () => {
    const db = memoryDb();
    const linked = await findOrLinkSocialUser(db, profile(), { now });
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    expect(linked.user.email).toBe("user@example.com");
    expect(db.identities).toHaveLength(1);
    expect(db.identities[0]?.provider_user_id).toBe("g-1");
  });

  it("reattaches to the same user by provider id", async () => {
    const db = memoryDb();
    const first = await findOrLinkSocialUser(db, profile(), { now });
    if (!first.ok) throw new Error("setup");
    const second = await findOrLinkSocialUser(
      db,
      profile({ emailNorm: "other@example.com" }),
      { now },
    );
    expect(second).toEqual(first);
    expect(db.users).toHaveLength(1);
  });

  it("links a new identity onto an existing email account", async () => {
    const db = memoryDb();
    db.users.push({
      id: "u-existing",
      email: "user@example.com",
      email_norm: "user@example.com",
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    const linked = await findOrLinkSocialUser(db, profile(), { now });
    expect(linked).toEqual({
      ok: true,
      user: { id: "u-existing", email: "user@example.com" },
    });
    expect(db.identities[0]?.user_id).toBe("u-existing");
  });

  it("does not revive a deleted email", async () => {
    const db = memoryDb();
    db.users.push({
      id: "u-gone",
      email: "deleted.u-gone@deleted.dropimg.invalid",
      email_norm: "user@example.com",
      deleted_at: now,
      created_at: now,
      updated_at: now,
    });
    const linked = await findOrLinkSocialUser(db, profile(), { now });
    expect(linked).toEqual({ ok: false, reason: "account_gone" });
  });

  it("connects to the signed-in user even when emails differ", async () => {
    const db = memoryDb();
    db.users.push({
      id: "u-session",
      email: "me@example.com",
      email_norm: "me@example.com",
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    const linked = await findOrLinkSocialUser(db, profile(), {
      attachToUserId: "u-session",
      now,
    });
    expect(linked).toEqual({
      ok: true,
      user: { id: "u-session", email: "me@example.com" },
    });
    expect(db.identities[0]?.user_id).toBe("u-session");
  });

  it("refuses to steal an identity from another user", async () => {
    const db = memoryDb();
    const first = await findOrLinkSocialUser(db, profile(), { now });
    if (!first.ok) throw new Error("setup");
    db.users.push({
      id: "u-other",
      email: "other@example.com",
      email_norm: "other@example.com",
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    const stolen = await findOrLinkSocialUser(db, profile(), {
      attachToUserId: "u-other",
      now,
    });
    expect(stolen).toEqual({ ok: false, reason: "identity_taken" });
  });

  it("refuses a second Google on the same user", async () => {
    const db = memoryDb();
    const first = await findOrLinkSocialUser(db, profile(), { now });
    if (!first.ok) throw new Error("setup");
    const second = await findOrLinkSocialUser(
      db,
      profile({ providerUserId: "g-2", emailNorm: "alt@example.com" }),
      { attachToUserId: first.user.id, now },
    );
    expect(second).toEqual({ ok: false, reason: "already_linked" });
  });
});

describe("social OAuth start and callback", () => {
  it("sends Google and GitHub to the right authorize hosts", async () => {
    const google = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    expect(google.ok).toBe(true);
    if (!google.ok) return;
    expect(google.location).toContain("accounts.google.com");
    expect(google.location).toContain("code_challenge");
    expect(google.location).toContain(
      encodeURIComponent("https://dropimg.io/auth/google/callback"),
    );

    const github = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "github",
      intent: "login",
    });
    expect(github.ok).toBe(true);
    if (!github.ok) return;
    expect(github.location).toContain("github.com/login/oauth/authorize");
    expect(github.location).toContain("user%3Aemail");
  });

  it("finishes Google login from a mocked token exchange", async () => {
    const db = memoryDb();
    const started = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    if (!started.ok) throw new Error("start");
    const authorize = new URL(started.location);
    const callback = new URL("https://dropimg.io/auth/google/callback");
    callback.searchParams.set("code", "ok-code");
    callback.searchParams.set("state", authorize.searchParams.get("state") || "");

    const finished = await finishSocialOAuth({
      env,
      db,
      origin: "https://dropimg.io",
      provider: "google",
      url: callback,
      cookieHeader: cookieHeader(started.cookie),
      fetcher: mockFetch({
        tokenUrl: "https://oauth2.googleapis.com/token",
        token: { access_token: "ya29.token" },
        userUrl: "https://openidconnect.googleapis.com/v1/userinfo",
        user: { sub: "g-99", email: "dev@example.com", email_verified: true },
      }),
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.intent).toBe("login");
    expect(finished.user.email).toBe("dev@example.com");
    expect(db.identities[0]?.provider_user_id).toBe("g-99");
  });

  it("keeps the Cloudflare fetch receiver when no test fetcher is supplied", async () => {
    const db = memoryDb();
    const started = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    if (!started.ok) throw new Error("start");
    const authorize = new URL(started.location);
    const callback = new URL("https://dropimg.io/auth/google/callback");
    callback.searchParams.set("code", "ok-code");
    callback.searchParams.set("state", authorize.searchParams.get("state") || "");

    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async function (
      this: typeof globalThis,
      input: RequestInfo | URL,
    ) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      calls += 1;
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "ya29.token" }));
      }
      if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
        return new Response(
          JSON.stringify({
            sub: "g-receiver",
            email: "receiver@example.com",
            email_verified: true,
          }),
        );
      }
      return new Response("missing", { status: 404 });
    }) as typeof fetch;

    try {
      const finished = await finishSocialOAuth({
        env,
        db,
        origin: "https://dropimg.io",
        provider: "google",
        url: callback,
        cookieHeader: cookieHeader(started.cookie),
      });
      expect(finished.ok).toBe(true);
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("treats a thrown token exchange as a failed sign-in", async () => {
    const db = memoryDb();
    const started = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    if (!started.ok) throw new Error("start");
    const authorize = new URL(started.location);
    const callback = new URL("https://dropimg.io/auth/google/callback");
    callback.searchParams.set("code", "ok-code");
    callback.searchParams.set("state", authorize.searchParams.get("state") || "");

    const finished = await finishSocialOAuth({
      env,
      db,
      origin: "https://dropimg.io",
      provider: "google",
      url: callback,
      cookieHeader: cookieHeader(started.cookie),
      fetcher: (async () => {
        throw new TypeError("Failed to parse body as FormData.");
      }) as typeof fetch,
    });
    expect(finished).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a callback with an unsigned state and no cookie", async () => {
    const db = memoryDb();
    const url = new URL("https://dropimg.io/auth/google/callback?code=x&state=y");
    const finished = await finishSocialOAuth({
      env,
      db,
      origin: "https://dropimg.io",
      provider: "google",
      url,
      cookieHeader: undefined,
    });
    expect(finished).toEqual({ ok: false, reason: "invalid" });
  });

  it("finishes Google login from the signed state in the URL without a cookie", async () => {
    const db = memoryDb();
    const started = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    if (!started.ok) throw new Error("start");
    const authorize = new URL(started.location);
    const callback = new URL("https://dropimg.io/auth/google/callback");
    callback.searchParams.set("code", "ok-code");
    callback.searchParams.set("state", authorize.searchParams.get("state") || "");

    const finished = await finishSocialOAuth({
      env,
      db,
      origin: "https://dropimg.io",
      provider: "google",
      url: callback,
      cookieHeader: undefined,
      fetcher: mockFetch({
        tokenUrl: "https://oauth2.googleapis.com/token",
        token: { access_token: "ya29.token" },
        userUrl: "https://openidconnect.googleapis.com/v1/userinfo",
        user: { sub: "g-99", email: "dev@example.com", email_verified: true },
      }),
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.user.email).toBe("dev@example.com");
  });

  it("reads Google identity from the id_token when userinfo is missing", async () => {
    const db = memoryDb();
    const started = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    if (!started.ok) throw new Error("start");
    const authorize = new URL(started.location);
    const callback = new URL("https://dropimg.io/auth/google/callback");
    callback.searchParams.set("code", "ok-code");
    callback.searchParams.set("state", authorize.searchParams.get("state") || "");

    const idToken = fakeGoogleIdToken({
      iss: "https://accounts.google.com",
      aud: "google-id",
      sub: "g-idtok",
      email: "idtok@example.com",
      email_verified: true,
    });

    const finished = await finishSocialOAuth({
      env,
      db,
      origin: "https://dropimg.io",
      provider: "google",
      url: callback,
      cookieHeader: cookieHeader(started.cookie),
      fetcher: mockFetch({
        tokenUrl: "https://oauth2.googleapis.com/token",
        token: { id_token: idToken },
        userUrl: "https://openidconnect.googleapis.com/v1/userinfo",
        user: {},
        userStatus: 401,
      }),
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.user.email).toBe("idtok@example.com");
    expect(db.identities[0]?.provider_user_id).toBe("g-idtok");
  });

  it("ignores Google's cross-site callback probe and pins production origin", () => {
    expect(publicOrigin("https://preview.example", { ENVIRONMENT: "production" })).toBe(
      "https://dropimg.io",
    );
    expect(publicOrigin("http://localhost:8787", { ENVIRONMENT: "development" })).toBe(
      "http://localhost:8787",
    );
    expect(
      isSocialCallbackProbe(
        new Request("https://dropimg.io/auth/google/callback?code=x&state=y", {
          headers: {
            Origin: "https://accounts.google.com",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
          },
        }),
      ),
    ).toBe(true);
    expect(
      isSocialCallbackProbe(
        new Request("https://dropimg.io/auth/google/callback?code=x&state=y", {
          headers: {
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Dest": "document",
          },
        }),
      ),
    ).toBe(false);
  });

  it("does not invent a URL when Google returns no verified email", async () => {
    const db = memoryDb();
    const started = await beginSocialOAuth({
      env,
      origin: "https://dropimg.io",
      provider: "google",
      intent: "login",
    });
    if (!started.ok) throw new Error("start");
    const authorize = new URL(started.location);
    const callback = new URL("https://dropimg.io/auth/google/callback");
    callback.searchParams.set("code", "ok-code");
    callback.searchParams.set("state", authorize.searchParams.get("state") || "");

    const finished = await finishSocialOAuth({
      env,
      db,
      origin: "https://dropimg.io",
      provider: "google",
      url: callback,
      cookieHeader: cookieHeader(started.cookie),
      fetcher: mockFetch({
        tokenUrl: "https://oauth2.googleapis.com/token",
        token: { access_token: "ya29.token" },
        userUrl: "https://openidconnect.googleapis.com/v1/userinfo",
        user: { sub: "g-99", email: "dev@example.com", email_verified: false },
      }),
    });
    expect(finished).toEqual({ ok: false, reason: "no_email" });
    expect(db.users).toHaveLength(0);
  });
});

type UserRow = {
  id: string;
  email: string;
  email_norm: string;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
};

type IdentityRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  email_norm: string;
  created_at: number;
};

function memoryDb() {
  const users: UserRow[] = [];
  const identities: IdentityRow[] = [];

  const db = {
    users,
    identities,
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first() {
              if (sql.includes("FROM users WHERE email_norm")) {
                return users.find((u) => u.email_norm === args[0]) ?? null;
              }
              if (sql.includes("FROM users WHERE id")) {
                return users.find((u) => u.id === args[0]) ?? null;
              }
              if (sql.includes("FROM auth_identities") && sql.includes("provider_user_id")) {
                const row = identities.find(
                  (i) => i.provider === args[0] && i.provider_user_id === args[1],
                );
                return row ? { user_id: row.user_id } : null;
              }
              return null;
            },
            async all() {
              if (sql.includes("SELECT provider FROM auth_identities")) {
                return {
                  results: identities
                    .filter((i) => i.user_id === args[0])
                    .map((i) => ({ provider: i.provider })),
                };
              }
              return { results: [] };
            },
            async run() {
              if (sql.includes("INSERT INTO users")) {
                users.push({
                  id: String(args[0]),
                  email: String(args[1]),
                  email_norm: String(args[2]),
                  created_at: Number(args[3]),
                  updated_at: Number(args[4]),
                  deleted_at: null,
                });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("INSERT INTO auth_identities")) {
                const row: IdentityRow = {
                  id: String(args[0]),
                  user_id: String(args[1]),
                  provider: String(args[2]),
                  provider_user_id: String(args[3]),
                  email_norm: String(args[4]),
                  created_at: Number(args[5]),
                };
                const taken = identities.some(
                  (i) =>
                    (i.provider === row.provider &&
                      i.provider_user_id === row.provider_user_id) ||
                    (i.user_id === row.user_id && i.provider === row.provider),
                );
                if (taken) throw new Error("UNIQUE constraint failed");
                identities.push(row);
                return { meta: { changes: 1 } };
              }
              if (sql.includes("DELETE FROM auth_identities") && sql.includes("provider")) {
                const keep = identities.filter(
                  (i) => !(i.user_id === args[0] && i.provider === args[1]),
                );
                identities.length = 0;
                identities.push(...keep);
                return { meta: { changes: 1 } };
              }
              if (sql.includes("DELETE FROM auth_identities")) {
                const keep = identities.filter((i) => i.user_id !== args[0]);
                identities.length = 0;
                identities.push(...keep);
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  };
  return db as typeof db & D1Database;
}

function cookieHeader(setCookie: string): string {
  return setCookie.split(";")[0] ?? "";
}

function mockFetch(opts: {
  tokenUrl: string;
  token: unknown;
  userUrl: string;
  user: unknown;
  userStatus?: number;
  extra?: Array<{ url: string; body: unknown }>;
}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === opts.tokenUrl) {
      return new Response(JSON.stringify(opts.token), { status: 200 });
    }
    if (url === opts.userUrl) {
      return new Response(JSON.stringify(opts.user), {
        status: opts.userStatus ?? 200,
      });
    }
    for (const row of opts.extra ?? []) {
      if (url === row.url) {
        return new Response(JSON.stringify(row.body), { status: 200 });
      }
    }
    return new Response("missing", { status: 404 });
  }) as typeof fetch;
}

function fakeGoogleIdToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `hdr.${payload}.sig`;
}
