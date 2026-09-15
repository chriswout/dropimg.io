import { Hono } from "hono";
import { mediaEnabled } from "../lib/media-config";
import { actorRef, requireOrg, requireProject, resolveMediaCaller } from "../lib/media-auth";
import { mediaApiError, mediaJson, mediaRequestId } from "../lib/media-http";
import { isUuid } from "../lib/media-path";
import {
  createMediaAsset,
  listAssetVersions,
  listProjectAssets,
  loadIdempotentResponse,
  loadLiveAsset,
  parseIdempotencyKey,
  publicAssetFromRow,
  replaceMediaAsset,
  saveIdempotentResponse,
} from "../lib/media-store";
import { createProjectCredential } from "../lib/project-credential";
import {
  createProject,
  ensurePersonalOrg,
  listOrgsForUser,
  listProjectsForOrg,
  loadLiveOrg,
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
  return mediaJson(201, { project: serializeProject(created) }, requestId);
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
  return mediaJson(200, { projects: visible.map(serializeProject) }, requestId);
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

mediaApiRoutes.post("/api/v1/media/projects/:projectId/assets", async (c) => {
  const requestId = mediaRequestId(c.req.raw);
  const actor = await requireProject(c.req.raw, c.env.DB, c.req.param("projectId"), "write");
  if (actor instanceof Response) return actor;

  const idempotencyKey = parseIdempotencyKey(c.req.header("idempotency-key") ?? undefined);
  if (idempotencyKey) {
    const replay = await loadIdempotentResponse(c.env.DB, actor.org.id, idempotencyKey);
    if (replay) return mediaJson(replay.status, replay.body, requestId);
  }

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
  if (idempotencyKey) {
    await saveIdempotentResponse(c.env.DB, actor.org.id, idempotencyKey, 201, body, Math.floor(Date.now() / 1000));
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

  const idempotencyKey = parseIdempotencyKey(c.req.header("idempotency-key") ?? undefined);
  if (idempotencyKey) {
    const replay = await loadIdempotentResponse(c.env.DB, actor.org.id, idempotencyKey);
    if (replay) return mediaJson(replay.status, replay.body, requestId);
  }

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
  if (idempotencyKey) {
    await saveIdempotentResponse(c.env.DB, actor.org.id, idempotencyKey, 201, body, Math.floor(Date.now() / 1000));
  }
  return mediaJson(201, body, requestId);
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

function serializeProject(project: {
  id: string;
  org_id: string;
  slug: string;
  name: string;
}): { id: string; orgId: string; slug: string; name: string } {
  return {
    id: project.id,
    orgId: project.org_id,
    slug: project.slug,
    name: project.name,
  };
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
