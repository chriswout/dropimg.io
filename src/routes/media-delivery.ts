import { Hono, type Context } from "hono";
import { imageResponseHeaders } from "../lib/headers";
import { mimeToExt } from "../lib/inspect";
import { mediaEnabled } from "../lib/media-config";
import { mediaRequestId } from "../lib/media-http";
import { isUuid, parseMediaDeliveryPath } from "../lib/media-path";
import { IMAGE_CACHE_SECONDS, type AllowedMime } from "../types";

type Env = {
  Bindings: Cloudflare.Env;
};

export const mediaDeliveryRoutes = new Hono<Env>();

mediaDeliveryRoutes.get("/m/*", (c) => serveMediaAlias(c));

async function serveMediaAlias(c: Context<Env>): Promise<Response> {
  const requestId = mediaRequestId(c.req.raw);
  const notFound = () =>
    new Response("Not found", {
      status: 404,
      headers: { "X-Request-Id": requestId },
    });

  if (!mediaEnabled(c.env)) return notFound();

  const parsed = parseMediaDeliveryPath(new URL(c.req.url).pathname);
  if (!parsed) return notFound();

  const versionId = c.req.query("v");
  if (versionId && !isUuid(versionId)) return notFound();

  const row = versionId
    ? await c.env.DB.prepare(
        `SELECT v.r2_key, v.mime, v.id AS version_id, al.path
         FROM organizations o
         JOIN projects p ON p.org_id = o.id AND p.deleted_at IS NULL
         JOIN asset_aliases al ON al.project_id = p.id AND al.org_id = o.id AND al.deleted_at IS NULL
         JOIN assets a ON a.id = al.asset_id AND a.org_id = o.id AND a.deleted_at IS NULL
         JOIN asset_versions v ON v.asset_id = a.id AND v.org_id = o.id AND v.id = ?
         WHERE o.slug = ? AND p.slug = ? AND al.path = ? AND o.deleted_at IS NULL
           AND v.status = 'ready'
         LIMIT 1`,
      )
        .bind(versionId, parsed.orgSlug, parsed.projectSlug, parsed.alias)
        .first<{ r2_key: string; mime: string; version_id: string; path: string }>()
    : await c.env.DB.prepare(
        `SELECT v.r2_key, v.mime, v.id AS version_id, al.path
         FROM organizations o
         JOIN projects p ON p.org_id = o.id AND p.deleted_at IS NULL
         JOIN asset_aliases al ON al.project_id = p.id AND al.org_id = o.id AND al.deleted_at IS NULL
         JOIN assets a ON a.id = al.asset_id AND a.org_id = o.id AND a.deleted_at IS NULL
         JOIN asset_versions v ON v.id = al.current_version_id AND v.org_id = o.id
         WHERE o.slug = ? AND p.slug = ? AND al.path = ? AND o.deleted_at IS NULL
           AND v.status = 'ready'
         LIMIT 1`,
      )
        .bind(parsed.orgSlug, parsed.projectSlug, parsed.alias)
        .first<{ r2_key: string; mime: string; version_id: string; path: string }>();

  if (!row) return notFound();

  const object = await c.env.BUCKET.get(row.r2_key);
  if (!object) return notFound();

  const mime = row.mime as AllowedMime;
  const filename = row.path.split("/").pop() || parsed.alias;
  const headers = imageResponseHeaders({
    mime,
    slug: filename,
    ext: mimeToExt(mime),
    etag: object.httpEtag,
    protected: false,
  });
  headers.set("X-Request-Id", requestId);
  if (versionId) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set(
      "Cache-Control",
      `public, max-age=${IMAGE_CACHE_SECONDS}, s-maxage=${IMAGE_CACHE_SECONDS}`,
    );
  }

  const inm = c.req.raw.headers.get("if-none-match");
  if (object.httpEtag && inm && inm === object.httpEtag) {
    headers.delete("Content-Type");
    headers.delete("Content-Disposition");
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { status: 200, headers });
}
