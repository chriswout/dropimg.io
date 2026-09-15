import { randomToken, sha256Bytes } from "./auth/crypto";
import { PROJECT_KEY_PREFIX, type MediaScope } from "./media-config";
import { validateIntegrationLabel } from "./integration-token";

export type ProjectCredentialAuth = {
  credentialId: string;
  orgId: string;
  projectId: string;
  userId: string | null;
  scopes: MediaScope[];
};

export function generateProjectToken(): string {
  return `${PROJECT_KEY_PREFIX}${randomToken()}`;
}

export function projectTokenFormatOk(token: string): boolean {
  if (!token.startsWith(PROJECT_KEY_PREFIX)) return false;
  const rest = token.slice(PROJECT_KEY_PREFIX.length);
  return rest.length >= 22 && rest.length <= 128 && /^[A-Za-z0-9_-]+$/.test(rest);
}

export function credentialHasScope(auth: ProjectCredentialAuth, scope: MediaScope): boolean {
  return auth.scopes.includes(scope);
}

export async function createProjectCredential(
  db: D1Database,
  input: {
    orgId: string;
    projectId: string;
    createdBy: string | null;
    label: string;
    scopes?: MediaScope[];
    now?: number;
  },
): Promise<{ id: string; token: string; label: string; scopes: MediaScope[] } | { error: "bad_label" }> {
  const label = validateIntegrationLabel(input.label);
  if (!label) return { error: "bad_label" };
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const scopes: MediaScope[] = input.scopes?.length ? input.scopes : ["media:read", "media:write"];
  const token = generateProjectToken();
  const id = crypto.randomUUID();
  const hash = await sha256Bytes(token);
  await db
    .prepare(
      `INSERT INTO project_credentials
        (id, org_id, project_id, token_hash, label, scopes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.orgId,
      input.projectId,
      new Uint8Array(hash),
      label,
      JSON.stringify(scopes),
      input.createdBy,
      now,
    )
    .run();
  return { id, token, label, scopes };
}

export async function resolveProjectCredential(
  db: D1Database,
  token: string,
  now = Math.floor(Date.now() / 1000),
): Promise<ProjectCredentialAuth | null> {
  if (!projectTokenFormatOk(token)) return null;
  const hash = await sha256Bytes(token);
  const row = await db
    .prepare(
      `SELECT id, org_id, project_id, scopes, created_by, revoked_at, expires_at
       FROM project_credentials WHERE token_hash = ? LIMIT 1`,
    )
    .bind(new Uint8Array(hash))
    .first<{
      id: string;
      org_id: string;
      project_id: string;
      scopes: string;
      created_by: string | null;
      revoked_at: number | null;
      expires_at: number | null;
    }>();
  if (!row || row.revoked_at) return null;
  if (row.expires_at != null && row.expires_at <= now) return null;
  let scopes: MediaScope[] = [];
  try {
    const parsed = JSON.parse(row.scopes) as unknown;
    if (Array.isArray(parsed)) {
      scopes = parsed.filter((s): s is MediaScope => s === "media:read" || s === "media:write");
    }
  } catch {
    return null;
  }
  if (!scopes.length) return null;
  await db
    .prepare(`UPDATE project_credentials SET last_used_at = ? WHERE id = ? AND revoked_at IS NULL`)
    .bind(now, row.id)
    .run();
  return {
    credentialId: row.id,
    orgId: row.org_id,
    projectId: row.project_id,
    userId: row.created_by,
    scopes,
  };
}

/** Revoke keys this user minted or that belong to orgs they still own. */
export async function revokeProjectCredentialsForUser(
  db: D1Database,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  await db
    .prepare(
      `UPDATE project_credentials
       SET revoked_at = ?
       WHERE revoked_at IS NULL
         AND (
           created_by = ?
           OR org_id IN (
             SELECT o.id
             FROM organizations o
             JOIN organization_memberships m
               ON m.org_id = o.id
              AND m.user_id = ?
              AND m.role = 'owner'
              AND m.revoked_at IS NULL
             WHERE o.deleted_at IS NULL
           )
         )`,
    )
    .bind(now, userId, userId)
    .run();
}
