import { generateOrgSlug, isOrgProjectSlug } from "./media-path";

export type OrgRole = "owner" | "admin" | "developer" | "viewer" | "billing";

export type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  personal_user_id: string | null;
  lifecycle_status: string;
  created_at: number;
  deleted_at: number | null;
};

export type ProjectRow = {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  created_at: number;
};

export type MembershipRow = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
};

const WRITE_ROLES = new Set<OrgRole>(["owner", "admin", "developer"]);
const READ_ROLES = new Set<OrgRole>(["owner", "admin", "developer", "viewer", "billing"]);

export function roleCanWrite(role: OrgRole): boolean {
  return WRITE_ROLES.has(role);
}

export function roleCanRead(role: OrgRole): boolean {
  return READ_ROLES.has(role);
}

export async function ensurePersonalOrg(
  db: D1Database,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<OrganizationRow> {
  const existing = await loadPersonalOrg(db, userId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = crypto.randomUUID();
    const slug = generateOrgSlug();
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO organizations (id, slug, name, personal_user_id, lifecycle_status, created_at)
             VALUES (?, ?, 'Personal', ?, 'active', ?)`,
          )
          .bind(id, slug, userId, now),
        db
          .prepare(
            `INSERT INTO organization_memberships (id, org_id, user_id, role, created_at)
             VALUES (?, ?, ?, 'owner', ?)`,
          )
          .bind(crypto.randomUUID(), id, userId, now),
      ]);
      return {
        id,
        slug,
        name: "Personal",
        personal_user_id: userId,
        lifecycle_status: "active",
        created_at: now,
        deleted_at: null,
      };
    } catch {
      const raced = await loadPersonalOrg(db, userId);
      if (raced) return raced;
    }
  }
  throw new Error("Could not create organization");
}

async function loadPersonalOrg(
  db: D1Database,
  userId: string,
): Promise<OrganizationRow | null> {
  return db
    .prepare(
      `SELECT id, slug, name, personal_user_id, lifecycle_status, created_at, deleted_at
       FROM organizations
       WHERE personal_user_id = ? AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(userId)
    .first<OrganizationRow>();
}

export async function loadMembership(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<MembershipRow | null> {
  const row = await db
    .prepare(
      `SELECT id, org_id, user_id, role
       FROM organization_memberships
       WHERE org_id = ? AND user_id = ? AND revoked_at IS NULL
       LIMIT 1`,
    )
    .bind(orgId, userId)
    .first<{ id: string; org_id: string; user_id: string; role: string }>();
  if (!row) return null;
  if (!isOrgRole(row.role)) return null;
  return { id: row.id, org_id: row.org_id, user_id: row.user_id, role: row.role };
}

function isOrgRole(raw: string): raw is OrgRole {
  return (
    raw === "owner" ||
    raw === "admin" ||
    raw === "developer" ||
    raw === "viewer" ||
    raw === "billing"
  );
}

export async function loadLiveOrg(
  db: D1Database,
  orgId: string,
): Promise<OrganizationRow | null> {
  return db
    .prepare(
      `SELECT id, slug, name, personal_user_id, lifecycle_status, created_at, deleted_at
       FROM organizations WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(orgId)
    .first<OrganizationRow>();
}

export async function loadLiveProject(
  db: D1Database,
  projectId: string,
): Promise<ProjectRow | null> {
  return db
    .prepare(
      `SELECT id, org_id, slug, name, created_at
       FROM projects WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(projectId)
    .first<ProjectRow>();
}

export async function createProject(
  db: D1Database,
  input: { orgId: string; slug: string; name: string; now?: number },
): Promise<ProjectRow | { error: "bad_slug" | "conflict" }> {
  const slug = input.slug.trim().toLowerCase();
  if (!isOrgProjectSlug(slug)) return { error: "bad_slug" };
  const name = input.name.trim().slice(0, 80) || slug;
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        `INSERT INTO projects (id, org_id, slug, name, created_at) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, input.orgId, slug, name, now)
      .run();
  } catch {
    return { error: "conflict" };
  }
  return { id, org_id: input.orgId, slug, name, created_at: now };
}

export function orgWritesAllowed(status: string): boolean {
  return status === "active";
}

export async function listOrgsForUser(
  db: D1Database,
  userId: string,
): Promise<OrganizationRow[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.slug, o.name, o.personal_user_id, o.lifecycle_status, o.created_at, o.deleted_at
       FROM organizations o
       JOIN organization_memberships m ON m.org_id = o.id
       WHERE m.user_id = ? AND m.revoked_at IS NULL AND o.deleted_at IS NULL
       ORDER BY o.created_at ASC`,
    )
    .bind(userId)
    .all<OrganizationRow>();
  return results ?? [];
}

export async function listProjectsForOrg(
  db: D1Database,
  orgId: string,
): Promise<ProjectRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, org_id, slug, name, created_at
       FROM projects
       WHERE org_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
    )
    .bind(orgId)
    .all<ProjectRow>();
  return results ?? [];
}

export async function loadLiveProjectInOrg(
  db: D1Database,
  projectId: string,
  orgId: string,
): Promise<ProjectRow | null> {
  return db
    .prepare(
      `SELECT id, org_id, slug, name, created_at
       FROM projects
       WHERE id = ? AND org_id = ? AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(projectId, orgId)
    .first<ProjectRow>();
}

/** True when the user is the only live owner of an org that still has assets. */
export async function ownerHasProductionAssets(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT o.id
       FROM organizations o
       JOIN organization_memberships m
         ON m.org_id = o.id AND m.user_id = ? AND m.role = 'owner' AND m.revoked_at IS NULL
       WHERE o.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM assets a
           WHERE a.org_id = o.id AND a.deleted_at IS NULL
         )
         AND NOT EXISTS (
           SELECT 1 FROM organization_memberships m2
           WHERE m2.org_id = o.id
             AND m2.user_id != ?
             AND m2.role = 'owner'
             AND m2.revoked_at IS NULL
         )
       LIMIT 1`,
    )
    .bind(userId, userId)
    .first<{ id: string }>();
  return Boolean(row);
}
