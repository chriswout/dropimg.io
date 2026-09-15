const ORG_PROJECT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const ALIAS_RE = /^[a-z0-9][a-z0-9/_-]*$/;

export function isOrgProjectSlug(raw: string): boolean {
  return ORG_PROJECT_SLUG_RE.test(raw);
}

export function parseAliasPath(raw: string): string | null {
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed.length > 128) return null;
  if (trimmed.includes("..") || trimmed.includes("//")) return null;
  if (!ALIAS_RE.test(trimmed)) return null;
  return trimmed;
}

export function generateOrgSlug(): string {
  const alphabet = "123456789abcdefghijkmnopqrstuvwxyz";
  const bytes = new Uint8Array(11);
  crypto.getRandomValues(bytes);
  let out = "o";
  for (const b of bytes) out += alphabet[b % alphabet.length]!;
  return out;
}

export function permanentOriginalKey(input: {
  orgId: string;
  projectId: string;
  assetId: string;
  versionId: string;
}): string {
  return `p/${input.orgId}/${input.projectId}/${input.assetId}/${input.versionId}/original`;
}

export function mediaAliasUrl(origin: string, orgSlug: string, projectSlug: string, path: string): string {
  return `${origin.replace(/\/$/, "")}/m/${orgSlug}/${projectSlug}/${path}`;
}

export function mediaVersionUrl(
  origin: string,
  orgSlug: string,
  projectSlug: string,
  path: string,
  versionId: string,
): string {
  return `${mediaAliasUrl(origin, orgSlug, projectSlug, path)}?v=${encodeURIComponent(versionId)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(raw: string): boolean {
  return UUID_RE.test(raw);
}

export function parseMediaDeliveryPath(pathname: string): {
  orgSlug: string;
  projectSlug: string;
  alias: string;
} | null {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length < 4 || parts[0] !== "m") return null;
  const orgSlug = parts[1]!;
  const projectSlug = parts[2]!;
  if (!isOrgProjectSlug(orgSlug) || !isOrgProjectSlug(projectSlug)) return null;
  const alias = parseAliasPath(parts.slice(3).join("/"));
  if (!alias) return null;
  return { orgSlug, projectSlug, alias };
}
