import { Hono } from "hono";
import type { Context } from "hono";
import {
  getOwnedLiveImage,
  listOwnedLiveImages,
  publicImageFromUpload,
  toPublicImage,
} from "../lib/api-images";
import { createDrop, dropFailResponse } from "../lib/create-drop";
import { clientIp, hashIp } from "../lib/ip";
import {
  resolveIntegrationToken,
  tokenHasScope,
  type ImageScope,
  type IntegrationAuth,
} from "../lib/integration-token";
import { removeImage } from "../lib/remove-image";
import { resolveIpHashSecret } from "../lib/secrets";
import { isValidSlug } from "../lib/slug";

type Env = {
  Bindings: Cloudflare.Env;
};

export const apiV1Routes = new Hono<Env>();

apiV1Routes.post("/api/v1/images", async (c) => {
  const auth = await requireScope(c, "images:write");
  if (auth instanceof Response) return auth;

  const parsed = await readMultipartImage(c);
  if (!parsed.ok) return parsed.response;

  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) {
    return apiError(500, "server_error", "Upload temporarily unavailable");
  }
  const ipHash = await hashIp(clientIp(c.req.raw), secretResolved.secret);
  const origin = new URL(c.req.url).origin;
  const createdAt = Math.floor(Date.now() / 1000);

  const stored = await createDrop(c.env, c.executionCtx, {
    userId: auth.userId,
    source: "api",
    bytes: parsed.bytes,
    expiry: parsed.expiry,
    origin,
    ipHash,
    pageIntent: "developers",
  });
  if (!stored.ok) return dropFailResponse(stored);
  return c.json(publicImageFromUpload(origin, stored.body, createdAt), 201);
});

apiV1Routes.get("/api/v1/images/:id", async (c) => {
  const auth = await requireScope(c, "images:read");
  if (auth instanceof Response) return auth;

  const slug = c.req.param("id");
  if (!isValidSlug(slug)) return apiError(404, "not_found", "Not found");

  const row = await getOwnedLiveImage(c.env.DB, auth.userId, slug);
  if (!row) return apiError(404, "not_found", "Not found");
  return c.json(toPublicImage(new URL(c.req.url).origin, row));
});

apiV1Routes.get("/api/v1/images", async (c) => {
  const auth = await requireScope(c, "images:read");
  if (auth instanceof Response) return auth;

  const listed = await listOwnedLiveImages(
    c.env,
    auth.userId,
    new URL(c.req.url).origin,
    c.req.query("cursor") ?? null,
  );
  return c.json(listed);
});

apiV1Routes.delete("/api/v1/images/:id", async (c) => {
  const auth = await requireScope(c, "images:delete");
  if (auth instanceof Response) return auth;

  const slug = c.req.param("id");
  if (!isValidSlug(slug)) return apiError(404, "not_found", "Not found");

  const row = await getOwnedLiveImage(c.env.DB, auth.userId, slug);
  if (!row) return apiError(404, "not_found", "Not found");

  const result = await removeImage(c.env, row, "user");
  return c.json({ ok: true, already_deleted: result.alreadyDeleted });
});

async function requireScope(
  c: Context<Env>,
  scope: ImageScope,
): Promise<IntegrationAuth | Response> {
  const token = c.req.header("authorization");
  if (!token) return apiError(401, "unauthorized", "Unauthorized");

  const auth = await resolveIntegrationToken(c.req.raw, c.env.DB, {
    waitUntil: (p) => c.executionCtx.waitUntil(p),
  });
  if (!auth) return apiError(401, "unauthorized", "Unauthorized");
  if (!tokenHasScope(auth, scope)) {
    return apiError(403, "forbidden", "This key is missing the required scope.");
  }
  return auth;
}

async function readMultipartImage(
  c: Context<Env>,
): Promise<
  | { ok: true; bytes: ArrayBuffer; expiry: string | null }
  | { ok: false; response: Response }
> {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      response: apiError(400, "invalid_image", "Send a multipart file field named file."),
    };
  }
  try {
    const form = await c.req.parseBody({ all: true });
    const file = form.file;
    if (!(file instanceof File) || !file.size) {
      return {
        ok: false,
        response: apiError(400, "invalid_image", "Send a multipart file field named file."),
      };
    }
    const expiryRaw = form.expiry;
    const expiry = typeof expiryRaw === "string" ? expiryRaw : null;
    return { ok: true, bytes: await file.arrayBuffer(), expiry };
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_image", "Invalid multipart body"),
    };
  }
}

function apiError(status: 400 | 401 | 403 | 404 | 500, code: string, error: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
