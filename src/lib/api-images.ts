import { entitlementsFor, PRO_HISTORY_PAGE } from "./entitlements";
import { isValidSlug } from "./slug";
import type { ImageRow } from "../types";

export type PublicImage = {
  id: string;
  url: string;
  image_url: string;
  created_at: string;
  expires_at: string;
};

export type PublicImageList = {
  data: PublicImage[];
  next_cursor: string | null;
};

export function toIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

export function toPublicImage(
  origin: string,
  row: { slug: string; created_at: number; expires_at: number },
): PublicImage {
  const base = origin.replace(/\/$/, "");
  return {
    id: row.slug,
    url: `${base}/${row.slug}`,
    image_url: `${base}/i/${row.slug}`,
    created_at: toIso(row.created_at),
    expires_at: toIso(row.expires_at),
  };
}

export function publicImageFromUpload(
  origin: string,
  body: { slug: string; expiresAt: number },
  createdAt: number,
): PublicImage {
  return toPublicImage(origin, {
    slug: body.slug,
    created_at: createdAt,
    expires_at: body.expiresAt,
  });
}

export async function getOwnedLiveImage(
  db: D1Database,
  userId: string,
  slug: string,
): Promise<ImageRow | null> {
  if (!isValidSlug(slug)) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT * FROM images
       WHERE slug = ? AND user_id = ? AND deleted_at IS NULL AND expires_at > ?
       LIMIT 1`,
    )
    .bind(slug, userId, now)
    .first<ImageRow>();
  return row ?? null;
}

export async function listOwnedLiveImages(
  env: Cloudflare.Env,
  userId: string,
  origin: string,
  cursorRaw: string | null,
): Promise<PublicImageList> {
  const entitlements = await entitlementsFor(env, userId);
  const now = Math.floor(Date.now() / 1000);
  const cursor = cursorRaw ? Number(cursorRaw) : NaN;
  const useCursor = Number.isFinite(cursor) && cursor > 0;
  const pageSize =
    entitlements.historyLimit == null ? PRO_HISTORY_PAGE : entitlements.historyLimit;

  const rows = await env.DB.prepare(
    `SELECT slug, created_at, expires_at
     FROM images
     WHERE user_id = ? AND deleted_at IS NULL AND expires_at > ?
       AND (? = 0 OR created_at < ?)
     ORDER BY created_at DESC, slug DESC
     LIMIT ?`,
  )
    .bind(userId, now, useCursor ? 1 : 0, useCursor ? cursor : 0, pageSize + 1)
    .all<{ slug: string; created_at: number; expires_at: number }>();

  const list = rows.results ?? [];
  const hasMore = list.length > pageSize;
  const page = hasMore ? list.slice(0, pageSize) : list;
  const nextCursor =
    entitlements.historyLimit == null && hasMore
      ? String(page[page.length - 1]!.created_at)
      : null;

  return {
    data: page.map((row) => toPublicImage(origin, row)),
    next_cursor: nextCursor,
  };
}
