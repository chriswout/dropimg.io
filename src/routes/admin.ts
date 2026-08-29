import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import {
  adminCookieSecure,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  timingSafeTokenEqual,
  verifyAdminSession,
} from "../lib/admin-auth";
import { removeImage } from "../lib/remove-image";
import type { ImageRow } from "../types";
import {
  adminHtmlResponse,
  renderAdminLogin,
  renderAdminReports,
  type AdminReportRow,
} from "../views/admin";

type Env = {
  Bindings: Cloudflare.Env;
};

export const adminRoutes = new Hono<Env>();

async function requireAdmin(c: Context<Env>): Promise<boolean> {
  const token = c.env.ADMIN_TOKEN?.trim() ?? "";
  if (!token) return false;
  return verifyAdminSession(token, c.req.header("cookie"));
}

adminRoutes.get("/admin", async (c) => {
  if (await requireAdmin(c)) return c.redirect("/admin/reports", 302);
  return c.redirect("/admin/login", 302);
});

adminRoutes.get("/admin/login", async (c) => {
  if (await requireAdmin(c)) return c.redirect("/admin/reports", 302);
  return adminHtmlResponse(renderAdminLogin({}));
});

adminRoutes.post("/admin/login", async (c) => {
  const expected = c.env.ADMIN_TOKEN?.trim() ?? "";
  if (!expected) {
    return adminHtmlResponse(
      renderAdminLogin({ error: "Admin not configured" }),
      503,
    );
  }

  let submitted = "";
  try {
    const form = await c.req.parseBody();
    submitted = String(form.token ?? "").trim();
  } catch {
    return adminHtmlResponse(renderAdminLogin({ error: "Invalid form" }), 400);
  }

  if (!submitted || !timingSafeTokenEqual(submitted, expected)) {
    return adminHtmlResponse(
      renderAdminLogin({ error: "Invalid token" }),
      401,
    );
  }

  const cookie = await createAdminSessionCookie(
    expected,
    adminCookieSecure(c.env),
  );
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin/reports",
      "Set-Cookie": cookie,
      "Cache-Control": "private, no-store",
    },
  });
});

adminRoutes.post("/admin/logout", async (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin/login",
      "Set-Cookie": clearAdminSessionCookie(adminCookieSecure(c.env)),
    },
  });
});

adminRoutes.get("/admin/reports", async (c) => {
  if (!(await requireAdmin(c))) return c.redirect("/admin/login", 302);

  const message = c.req.query("msg") || undefined;
  const reports = await loadOpenReports(c.env);
  return adminHtmlResponse(renderAdminReports({ reports, message }));
});

adminRoutes.post("/admin/reports/:id/remove", async (c) => {
  if (!(await requireAdmin(c))) return c.redirect("/admin/login", 302);

  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.redirect("/admin/reports", 302);

  const report = await c.env.DB.prepare(
    `SELECT id, slug FROM reports WHERE id = ? LIMIT 1`,
  )
    .bind(id)
    .first<{ id: number; slug: string }>();

  if (!report) return c.redirect("/admin/reports?msg=Report+not+found", 302);

  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? LIMIT 1`,
  )
    .bind(report.slug)
    .first<ImageRow>();

  const now = Math.floor(Date.now() / 1000);

  if (row && !row.deleted_at) {
    await removeImage(c.env, row, "moderation", now);
    track(c.env.ANALYTICS, "delete_moderation", {
      slug: row.slug,
      mime: row.mime,
      size: row.size,
    });
  }

  await c.env.DB.prepare(
    `UPDATE reports
     SET handled_at = ?, resolution = 'removed'
     WHERE id = ?`,
  )
    .bind(now, id)
    .run();

  // Also resolve other open reports for the same slug
  await c.env.DB.prepare(
    `UPDATE reports
     SET handled_at = ?, resolution = 'removed'
     WHERE slug = ? AND handled_at IS NULL`,
  )
    .bind(now, report.slug)
    .run();

  return c.redirect("/admin/reports?msg=Image+removed", 302);
});

adminRoutes.post("/admin/reports/:id/dismiss", async (c) => {
  if (!(await requireAdmin(c))) return c.redirect("/admin/login", 302);

  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.redirect("/admin/reports", 302);

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `UPDATE reports
     SET handled_at = ?, resolution = 'dismissed'
     WHERE id = ? AND handled_at IS NULL`,
  )
    .bind(now, id)
    .run();

  return c.redirect("/admin/reports?msg=Report+dismissed", 302);
});

async function loadOpenReports(env: Cloudflare.Env): Promise<AdminReportRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, reason, detail, created_at, handled_at, resolution, admin_note
     FROM reports
     WHERE handled_at IS NULL
     ORDER BY created_at DESC
     LIMIT 100`,
  ).all<{
    id: number;
    slug: string;
    reason: string;
    detail: string | null;
    created_at: number;
    handled_at: number | null;
    resolution: string | null;
    admin_note: string | null;
  }>();

  if (!results?.length) return [];

  const now = Math.floor(Date.now() / 1000);
  const out: AdminReportRow[] = [];
  for (const r of results) {
    const img = await env.DB.prepare(
      `SELECT deleted_at, expires_at FROM images WHERE slug = ? LIMIT 1`,
    )
      .bind(r.slug)
      .first<{ deleted_at: number | null; expires_at: number }>();

    const image_live = Boolean(
      img && !img.deleted_at && img.expires_at > now,
    );
    out.push({ ...r, image_live });
  }
  return out;
}
