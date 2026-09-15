import { Hono } from "hono";
import { mediaEnabled } from "../lib/media-config";
import { actorRef, requireOrg, requireProject, resolveMediaCaller } from "../lib/media-auth";
import { mediaApiError, mediaJson, mediaRequestId } from "../lib/media-http";
import { isUuid, mediaAliasUrl } from "../lib/media-path";
import {
  createMediaAsset,
  deleteMediaAsset,
  listAssetVersions,
  listProjectAssets,
  loadIdempotentResponse,
  loadLiveAsset,
  parseIdempotencyHeader,
  publicAssetFromRow,
  replaceMediaAsset,
  saveIdempotentResponse,
} from "../lib/media-store";
import {
  consumeMediaUploadIntent,
  createMediaUploadIntent,
  readIntentBearer,
} from "../lib/media-upload-intent";
import {
  createProjectCredential,
  listProjectCredentials,
  revokeProjectCredential,
} from "../lib/project-credential";
import {
  createProject,
  ensurePersonalOrg,
  listOrgsForUser,
  listProjectsForOrg,
  loadLiveOrg,
  loadLiveProject,
  roleCanWrite,
} from "../lib/tenancy";

type Env = {
  Bindings: Cloudflare.Env;
};

export const mediaApiRoutes = new Hono<Env>();

mediaApiRoutes.use("/api/v1/media/*", async (c, next) => {
  const requestId = mediaRequestId(c.req.raw);
  if (!mediaEnabled(c.env)) {
    return mediaApiError(404, "not_found", "Not found", requestId);
  }
  await next();
  c.header("X-Request-Id", requestId);
});

mediaApiRoutes.post("/api/v1/media/orgs", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const caller = await resolveMediaCaller(c.req.raw, c.env.DB);
  if (caller.kind === "error") return caller.response;
  if (caller.kind !== "session") {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  try {
    const org = await ensurePersonalOrg(c.env.DB, caller.userId);
    return mediaJson(200, { org: serializeOrg(org) }, requestId);
  } catch {
    return mediaApiError(500, "server_error", "Could not create organization", requestId);
  }
});

mediaApiRoutes.get("/api/v1/media/orgs", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const caller = await resolveMediaCaller(c.req.raw, c.env.DB);
  if (caller.kind === "error") return caller.response;
  if (caller.kind === "credential") {
    const org = await loadLiveOrg(c.env.DB, caller.credential.orgId);
    if (!org) return mediaApiError(404, "not_found", "Not found", requestId);
    return mediaJson(200, { orgs: [serializeOrg(org)] }, requestId);
  }
  if (caller.kind !== "session") {
    return mediaApiError(401, "unauthorized", "Unauthorized", requestId);
  }
  const orgs = await listOrgsForUser(c.env.DB, caller.userId);
  return mediaJson(200, { orgs: orgs.map(serializeOrg) }, requestId);
});

mediaApiRoutes.post("/api/v1/media/orgs/:orgId/projects", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireOrg(c.req.raw, c.env.DB, c.req.param("orgId"), "write");
  if (actor instanceof Response) return actor;
  if (actor.kind !== "session" || !roleCanWrite(actor.role)) {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  const body = await readJson(c.req.raw);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const name = typeof body?.name === "string" ? body.name : slug;
  const created = await createProject(c.env.DB, { orgId: actor.org.id, slug, name });
  if ("error" in created) {
    if (created.error === "bad_slug") {
      return mediaApiError(400, "invalid_slug", "Invalid project slug", requestId);
    }
    return mediaApiError(409, "conflict", "Project slug already exists", requestId);
  }
  const origin = new URL(c.req.url).origin;
  return mediaJson(201, { project: serializeProject(created, origin, actor.org.slug) }, requestId);
});

mediaApiRoutes.get("/api/v1/media/orgs/:orgId/projects", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireOrg(c.req.raw, c.env.DB, c.req.param("orgId"), "read");
  if (actor instanceof Response) return actor;
  const projects = await listProjectsForOrg(c.env.DB, actor.org.id);
  const visible =
    actor.kind === "credential"
      ? projects.filter((p) => p.id === actor.credential.projectId)
      : projects;
  const origin = new URL(c.req.url).origin;
  return mediaJson(
    200,
    { projects: visible.map((p) => serializeProject(p, origin, actor.org.slug)) },
    requestId,
  );
});

mediaApiRoutes.post("/api/v1/media/projects/:projectId/keys", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "write");
  if (actor instanceof Response) return actor;
  if (actor.kind !== "session") {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  const body = await readJson(c.req.raw);
  const created = await createProjectCredential(c.env.DB, {
    orgId: actor.org.id,
    projectId: actor.project.id,
    createdBy: actor.userId,
    label: typeof body?.label === "string" ? body.label : "",
  });
  if ("error" in created) {
    return mediaApiError(400, "invalid_label", "Invalid label", requestId);
  }
  return mediaJson(201, created, requestId);
});

mediaApiRoutes.get("/api/v1/media/projects/:projectId/keys", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "read");
  if (actor instanceof Response) return actor;
  if (actor.kind !== "session") {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  const keys = await listProjectCredentials(c.env.DB, actor.org.id, actor.project.id);
  return mediaJson(200, { keys }, requestId);
});

mediaApiRoutes.post("/api/v1/media/projects/:projectId/keys/:keyId/revoke", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "write");
  if (actor instanceof Response) return actor;
  if (actor.kind !== "session") {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  const keyId = c.req.param("keyId");
  if (!isUuid(keyId)) return mediaApiError(404, "not_found", "Not found", requestId);
  const revoked = await revokeProjectCredential(c.env.DB, {
    id: keyId,
    orgId: actor.org.id,
    projectId: actor.project.id,
  });
  if (revoked === "not_found") return mediaApiError(404, "not_found", "Not found", requestId);
  return mediaJson(200, { ok: true }, requestId);
});

mediaApiRoutes.post("/api/v1/media/projects/:projectId/intents", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "write");
  if (actor instanceof Response) return actor;
  const body = await readJson(c.req.raw);
  const operation = body?.operation === "replace" ? "replace" : body?.operation === "create" ? "create" : null;
  if (!operation) {
    return mediaApiError(400, "invalid_operation", "operation must be create or replace", requestId);
  }
  const created = await createMediaUploadIntent(c.env.DB, {
    orgId: actor.org.id,
    projectId: actor.project.id,
    operation,
    path: typeof body?.path === "string" ? body.path : null,
    assetId: typeof body?.assetId === "string" ? body.assetId : typeof body?.asset_id === "string" ? body.asset_id : null,
    name: typeof body?.name === "string" ? body.name : null,
    actorUserId: actor.userId,
    actorCredentialId: actor.kind === "credential" ? actor.credentialId : null,
    origin: new URL(c.req.url).origin,
  });
  if (!created.ok) {
    return mediaApiError(created.status, created.code, created.error, requestId);
  }
  return mediaJson(201, { intent: created.intent }, requestId);
});

mediaApiRoutes.post("/api/v1/media/intents/:intentId", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const token = readIntentBearer(c.req.raw);
  if (!token) return mediaApiError(401, "unauthorized", "Unauthorized", requestId);

  const payload = await readIntentBytes(c.req.raw);
  if (!payload.ok) return mediaApiError(payload.status, payload.code, payload.error, requestId);

  const consumed = await consumeMediaUploadIntent(c.env.DB, {
    intentId: c.req.param("intentId"),
    token,
    claimedPath: payload.path ?? headerClaim(c.req.raw, "x-dropimg-path"),
    claimedAssetId: payload.assetId ?? headerClaim(c.req.raw, "x-dropimg-asset-id"),
    claimedOperation: payload.operation ?? headerClaim(c.req.raw, "x-dropimg-operation"),
    claimedProjectId: payload.projectId ?? headerClaim(c.req.raw, "x-dropimg-project-id"),
  });
  if (!consumed.ok) {
    return mediaApiError(consumed.status, consumed.code, consumed.error, requestId);
  }

  const project = await loadLiveProject(c.env.DB, consumed.intent.projectId);
  const org = project ? await loadLiveOrg(c.env.DB, project.org_id) : null;
  if (!project || !org) return mediaApiError(404, "not_found", "Not found", requestId);

  const actor = {
    userId: consumed.intent.actorUserId,
    credentialId: consumed.intent.actorCredentialId,
  };
  const origin = new URL(c.req.url).origin;
  const slugs = { orgSlug: org.slug, projectSlug: project.slug };

  if (consumed.intent.operation === "create") {
    const stored = await createMediaAsset(c.env, c.executionCtx, {
      orgId: org.id,
      projectId: project.id,
      path: consumed.intent.path || "",
      name: consumed.intent.name,
      bytes: payload.bytes,
      origin,
      slugs,
      actor,
      requestId,
    });
    if (!stored.ok) return mediaApiError(stored.status, stored.code, stored.error, requestId);
    return mediaJson(201, { asset: stored.asset }, requestId);
  }

  const stored = await replaceMediaAsset(c.env, c.executionCtx, {
    orgId: org.id,
    projectId: project.id,
    assetId: consumed.intent.assetId || "",
    bytes: payload.bytes,
    origin,
    slugs,
    actor,
    requestId,
  });
  if (!stored.ok) return mediaApiError(stored.status, stored.code, stored.error, requestId);
  return mediaJson(201, { asset: stored.asset }, requestId);
});

mediaApiRoutes.post("/api/v1/media/projects/:projectId/assets", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "write");
  if (actor instanceof Response) return actor;

  const idem = await beginIdempotency(c, actor.org.id, actor.project.id, "asset.create", requestId);
  if (idem instanceof Response) return idem;

  const parsed = await readMultipartAsset(c.req.raw);
  if (!parsed.ok) return mediaApiError(parsed.status, parsed.code, parsed.error, requestId);

  const stored = await createMediaAsset(c.env, c.executionCtx, {
    orgId: actor.org.id,
    projectId: actor.project.id,
    path: parsed.path,
    name: parsed.name,
    bytes: parsed.bytes,
    origin: new URL(c.req.url).origin,
    slugs: { orgSlug: actor.org.slug, projectSlug: actor.project.slug },
    actor: actorRef(actor),
    requestId,
  });
  if (!stored.ok) {
    return mediaApiError(stored.status, stored.code, stored.error, requestId);
  }
  const body = { asset: stored.asset };
  if (idem.key) {
    await saveIdempotentResponse(c.env.DB, {
      orgId: actor.org.id,
      projectId: actor.project.id,
      operation: "asset.create",
      key: idem.key,
      status: 201,
      body,
      now: Math.floor(Date.now() / 1000),
    });
  }
  return mediaJson(201, body, requestId);
});

mediaApiRoutes.get("/api/v1/media/projects/:projectId/assets", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "read");
  if (actor instanceof Response) return actor;
  const origin = new URL(c.req.url).origin;
  const rows = await listProjectAssets(c.env.DB, actor.org.id, actor.project.id);
  return mediaJson(
    200,
    {
      assets: rows.map((row) =>
        publicAssetFromRow(origin, { orgSlug: actor.org.slug, projectSlug: actor.project.slug }, row),
      ),
    },
    requestId,
  );
});

mediaApiRoutes.post("/api/v1/media/assets/:assetId/versions", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const assetId = c.req.param("assetId");
  if (!isUuid(assetId)) return mediaApiError(404, "not_found", "Not found", requestId);

  const located = await locateAssetProject(c.env.DB, assetId);
  if (!located) return mediaApiError(404, "not_found", "Not found", requestId);

  const actor = await requireProject(c.req.raw, c.env.DB, located.projectId, "write");
  if (actor instanceof Response) return actor;

  const idem = await beginIdempotency(c, actor.org.id, actor.project.id, "asset.replace", requestId);
  if (idem instanceof Response) return idem;

  const parsed = await readMultipartFile(c.req.raw);
  if (!parsed.ok) return mediaApiError(parsed.status, parsed.code, parsed.error, requestId);

  const stored = await replaceMediaAsset(c.env, c.executionCtx, {
    orgId: actor.org.id,
    projectId: actor.project.id,
    assetId,
    bytes: parsed.bytes,
    origin: new URL(c.req.url).origin,
    slugs: { orgSlug: actor.org.slug, projectSlug: actor.project.slug },
    actor: actorRef(actor),
    requestId,
  });
  if (!stored.ok) {
    return mediaApiError(stored.status, stored.code, stored.error, requestId);
  }
  const body = { asset: stored.asset };
  if (idem.key) {
    await saveIdempotentResponse(c.env.DB, {
      orgId: actor.org.id,
      projectId: actor.project.id,
      operation: "asset.replace",
      key: idem.key,
      status: 201,
      body,
      now: Math.floor(Date.now() / 1000),
    });
  }
  return mediaJson(201, body, requestId);
});

mediaApiRoutes.delete("/api/v1/media/assets/:assetId", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const assetId = c.req.param("assetId");
  if (!isUuid(assetId)) return mediaApiError(404, "not_found", "Not found", requestId);

  const located = await locateAssetProject(c.env.DB, assetId);
  if (!located) return mediaApiError(404, "not_found", "Not found", requestId);

  const actor = await requireProject(c.req.raw, c.env.DB, located.projectId, "write");
  if (actor instanceof Response) return actor;

  const deleted = await deleteMediaAsset(c.env, c.executionCtx, {
    orgId: actor.org.id,
    projectId: actor.project.id,
    assetId,
    actor: actorRef(actor),
    requestId,
  });
  if (!deleted.ok) return mediaApiError(deleted.status, deleted.code, deleted.error, requestId);
  return mediaJson(200, { ok: true }, requestId);
});

mediaApiRoutes.get("/api/v1/media/assets/:assetId", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const assetId = c.req.param("assetId");
  if (!isUuid(assetId)) return mediaApiError(404, "not_found", "Not found", requestId);

  const located = await locateAssetProject(c.env.DB, assetId);
  if (!located) return mediaApiError(404, "not_found", "Not found", requestId);

  const actor = await requireProject(c.req.raw, c.env.DB, located.projectId, "read");
  if (actor instanceof Response) return actor;

  const row = await loadLiveAsset(c.env.DB, assetId, actor.org.id, actor.project.id);
  if (!row) return mediaApiError(404, "not_found", "Not found", requestId);
  const versions = await listAssetVersions(c.env.DB, assetId, actor.org.id);
  const origin = new URL(c.req.url).origin;
  return mediaJson(
    200,
    {
      asset: publicAssetFromRow(
        origin,
        { orgSlug: actor.org.slug, projectSlug: actor.project.slug },
        row,
      ),
      versions: versions.map((v) => ({
        id: v.id,
        mime: v.mime,
        size: v.byte_size,
        width: v.width,
        height: v.height,
        createdAt: v.created_at,
        status: v.status,
        url: `${publicAssetFromRow(origin, { orgSlug: actor.org.slug, projectSlug: actor.project.slug }, row).url}?v=${encodeURIComponent(v.id)}`,
      })),
    },
    requestId,
  );
});

async function locateAssetProject(
  db: D1Database,
  assetId: string,
): Promise<{ orgId: string; projectId: string } | null> {
  return db
    .prepare(
      `SELECT org_id AS orgId, project_id AS projectId
       FROM assets
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(assetId)
    .first<{ orgId: string; projectId: string }>();
}

function serializeOrg(org: {
  id: string;
  slug: string;
  name: string;
  lifecycle_status: string;
}): { id: string; slug: string; name: string; lifecycleStatus: string } {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    lifecycleStatus: org.lifecycle_status,
  };
}

function serializeProject(
  project: {
    id: string;
    org_id: string;
    slug: string;
    name: string;
  },
  origin: string,
  orgSlug: string,
): { id: string; orgId: string; slug: string; name: string; url: string } {
  return {
    id: project.id,
    orgId: project.org_id,
    slug: project.slug,
    name: project.name,
    url: mediaAliasUrl(origin, orgSlug, project.slug, "").replace(/\/?$/, "/"),
  };
}

function headerClaim(req: Request, name: string): string | null {
  const value = req.headers.get(name)?.trim();
  return value || null;
}

async function beginIdempotency(
  c: { req: { raw: Request }; env: Cloudflare.Env },
  orgId: string,
  projectId: string,
  operation: "asset.create" | "asset.replace",
  requestId: string,
): Promise<{ key: string | null } | Response> {
  const parsed = parseIdempotencyHeader(c.req.raw.headers.get("idempotency-key") ?? undefined);
  if (parsed.present && !parsed.ok) {
    return mediaApiError(400, parsed.code, parsed.error, requestId);
  }
  if (!parsed.present || !parsed.ok) return { key: null };
  const replay = await loadIdempotentResponse(c.env.DB, {
    orgId,
    projectId,
    operation,
    key: parsed.key,
  });
  if (replay.kind === "replay") return mediaJson(replay.status, replay.body, requestId);
  if (replay.kind === "conflict") {
    return mediaApiError(409, "conflict", replay.error, requestId);
  }
  return { key: parsed.key };
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function readIntentBytes(
  req: Request,
): Promise<
  | {
      ok: true;
      bytes: ArrayBuffer;
      path: string | null;
      assetId: string | null;
      operation: string | null;
      projectId: string | null;
    }
  | { ok: false; status: 400; code: string; error: string }
> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const file = await readMultipartFile(req);
    if (!file.ok) return file;
    const pathRaw = file.form.get("path");
    const assetRaw = file.form.get("asset_id") ?? file.form.get("assetId");
    const operationRaw = file.form.get("operation");
    const projectRaw = file.form.get("project_id") ?? file.form.get("projectId");
    return {
      ok: true,
      bytes: file.bytes,
      path: typeof pathRaw === "string" ? pathRaw : null,
      assetId: typeof assetRaw === "string" ? assetRaw : null,
      operation: typeof operationRaw === "string" ? operationRaw : null,
      projectId: typeof projectRaw === "string" ? projectRaw : null,
    };
  }
  if (contentType.includes("application/octet-stream") || contentType.startsWith("image/")) {
    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength) {
      return { ok: false, status: 400, code: "invalid_image", error: "Empty upload" };
    }
    return { ok: true, bytes, path: null, assetId: null, operation: null, projectId: null };
  }
  return {
    ok: false,
    status: 400,
    code: "invalid_image",
    error: "Send image bytes as application/octet-stream or a multipart file field named file.",
  };
}

async function readMultipartAsset(
  req: Request,
): Promise<
  | { ok: true; bytes: ArrayBuffer; path: string; name: string | null }
  | { ok: false; status: 400; code: string; error: string }
> {
  const file = await readMultipartFile(req);
  if (!file.ok) return file;
  const form = file.form;
  const pathRaw = form.get("path");
  const path = typeof pathRaw === "string" ? pathRaw : "";
  const nameRaw = form.get("name");
  const name = typeof nameRaw === "string" ? nameRaw : null;
  return { ok: true, bytes: file.bytes, path, name };
}

async function readMultipartFile(
  req: Request,
): Promise<
  | { ok: true; bytes: ArrayBuffer; form: FormData }
  | { ok: false; status: 400; code: string; error: string }
> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      status: 400,
      code: "invalid_image",
      error: "Send a multipart file field named file.",
    };
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      return {
        ok: false,
        status: 400,
        code: "invalid_image",
        error: "Send a multipart file field named file.",
      };
    }
    return { ok: true, bytes: await file.arrayBuffer(), form };
  } catch {
    return { ok: false, status: 400, code: "invalid_image", error: "Invalid multipart body" };
  }
}
