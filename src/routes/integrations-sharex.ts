import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import { EXPIRY_HEADER } from "../lib/entitlements";
import { readBearerToken, resolveIntegrationToken } from "../lib/integration-token";
import {
  executeOwnedDirectUpload,
  parseSharexExpiry,
  SHAREX_MULTIPART_MAX_BYTES,
} from "../lib/owned-upload";
import { uploadRoutes } from "./upload";

type Env = {
  Bindings: Cloudflare.Env;
};

/**
 * ShareX typically posts multipart/form-data.
 * Anonymous requests adapt to /api/upload.
 * Bearer tokens use the owned upload path without becoming a 50 MB uploader.
 */
export const sharexRoutes = new Hono<Env>();

sharexRoutes.post("/api/integrations/sharex", async (c) => {
  if (readBearerToken(c.req.raw)) {
    return authenticatedSharex(c);
  }
  return anonymousSharex(c);
});

async function authenticatedSharex(c: Context<Env>): Promise<Response> {
  const auth = await resolveIntegrationToken(c.req.raw, c.env.DB, {
    waitUntil: (p) => c.executionCtx.waitUntil(p),
  });
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const parsed = await readSharexBody(c);
  if (!parsed.ok) return parsed.response;

  let expiry: number | null = null;
  if (parsed.expiry) {
    expiry = parseSharexExpiry(parsed.expiry);
    if (expiry == null) {
      return c.json({ error: "That expiry is not available." }, 400);
    }
  }

  const res = await executeOwnedDirectUpload(c, {
    userId: auth.userId,
    bytes: parsed.bytes,
    expirySeconds: expiry,
    maxBytesCap: SHAREX_MULTIPART_MAX_BYTES,
    client: "sharex",
  });
  if (res.status === 201) {
    track(c.env.ANALYTICS, "integration_upload_ok", { client: "sharex" });
  }
  return res;
}

async function anonymousSharex(c: Context<Env>): Promise<Response> {
  const parsed = await readSharexBody(c);
  if (!parsed.ok) return parsed.response;

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    "";

  // Omitting the header lets /api/upload apply the anonymous default, which is
  // what every existing ShareX config sends.
  const expiry = parsed.expiry ? parseSharexExpiry(parsed.expiry) : null;

  const upstream = new Request(new URL("/api/upload", c.req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(parsed.bytes.byteLength),
      "X-Dropimg-Client": "sharex",
      ...(expiry != null ? { [EXPIRY_HEADER]: String(expiry) } : {}),
      ...(ip ? { "CF-Connecting-IP": ip.split(",")[0]!.trim() } : {}),
    },
    body: parsed.bytes,
  });

  return uploadRoutes.fetch(upstream, c.env, c.executionCtx);
}

async function readSharexBody(
  c: Context<Env>,
): Promise<
  | { ok: true; bytes: ArrayBuffer; expiry: string | null }
  | { ok: false; response: Response }
> {
  const contentType = c.req.header("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await c.req.parseBody({ all: true });
      const file = pickFile(form);
      if (!file) {
        return {
          ok: false,
          response: c.json({ error: "No image file in request", code: "invalid_image" }, 400),
        };
      }
      const bytes = await file.arrayBuffer();
      if (!bytes.byteLength) {
        return {
          ok: false,
          response: c.json({ error: "No image file in request", code: "invalid_image" }, 400),
        };
      }
      return { ok: true, bytes, expiry: pickExpiry(form) };
    } catch {
      return {
        ok: false,
        response: c.json({ error: "Invalid multipart body", code: "invalid_image" }, 400),
      };
    }
  }

  try {
    const bytes = await c.req.arrayBuffer();
    if (!bytes.byteLength) {
      return {
        ok: false,
        response: c.json({ error: "No image file in request", code: "invalid_image" }, 400),
      };
    }
    return { ok: true, bytes, expiry: null };
  } catch {
    return {
      ok: false,
      response: c.json({ error: "Could not read body", code: "invalid_image" }, 400),
    };
  }
}

function pickExpiry(
  form: Record<string, string | File | (string | File)[]>,
): string | null {
  const v = form.expiry;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const first = v.find((x): x is string => typeof x === "string");
    return first ?? null;
  }
  return null;
}

function pickFile(
  form: Record<string, string | File | (string | File)[]>,
): File | null {
  const keys = ["file", "image", "screenshot", "upload"];
  for (const key of keys) {
    const v = form[key];
    if (v instanceof File) return v;
    if (Array.isArray(v)) {
      const f = v.find((x): x is File => x instanceof File);
      if (f) return f;
    }
  }
  for (const v of Object.values(form)) {
    if (v instanceof File) return v;
    if (Array.isArray(v)) {
      const f = v.find((x): x is File => x instanceof File);
      if (f) return f;
    }
  }
  return null;
}
