import { mediaEnabled } from "./media-config";
import { track } from "./analytics";
import { mediaAliasUrl } from "./media-path";
import {
  createMediaUploadIntent,
  type MediaUploadIntentPublic,
} from "./media-upload-intent";
import {
  listProjectAssets,
  loadLiveAsset,
  publicAssetFromRow,
  type MediaAssetPublic,
} from "./media-store";
import {
  credentialHasScope,
  type ProjectCredentialAuth,
} from "./project-credential";
import {
  createProject,
  ensurePersonalOrg,
  listProjectsForOrg,
  loadLiveOrg,
  loadLiveProject,
  loadMembership,
  roleCanWrite,
} from "./tenancy";
import type { McpToolContext } from "./mcp-tools";

export type MediaMcpContext = McpToolContext & {
  mediaAuth: ProjectCredentialAuth | null;
};

function text(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

function compactAsset(asset: MediaAssetPublic): Record<string, unknown> {
  return {
    asset_id: asset.id,
    project_id: asset.projectId,
    path: asset.path,
    url: asset.url,
    version_id: asset.versionId,
    mime: asset.mime,
    asset_type: asset.assetType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    status: "ready",
  };
}

function compactIntent(intent: MediaUploadIntentPublic): Record<string, unknown> {
  return {
    intent_id: intent.id,
    upload_url: intent.uploadUrl,
    method: intent.method,
    headers: intent.headers,
    expires_at: intent.expiresAt,
    max_bytes: intent.maxBytes,
    operation: intent.operation,
    project_id: intent.projectId,
    path: intent.path,
    asset_id: intent.assetId,
  };
}

function mediaOff(): string {
  return "Media is not enabled on this environment.";
}

async function resolveProjectForTool(
  input: MediaMcpContext,
  projectId: string,
  access: "read" | "write",
): Promise<
  | { ok: true; orgId: string; projectId: string; orgSlug: string; projectSlug: string }
  | { ok: false; error: string }
> {
  if (!mediaEnabled(input.env)) return { ok: false, error: mediaOff() };
  const project = await loadLiveProject(input.env.DB, projectId);
  if (!project) return { ok: false, error: "Not found." };
  const org = await loadLiveOrg(input.env.DB, project.org_id);
  if (!org) return { ok: false, error: "Not found." };

  if (input.mediaAuth) {
    if (input.mediaAuth.projectId !== project.id || input.mediaAuth.orgId !== org.id) {
      return { ok: false, error: "Not found." };
    }
    const scope = access === "write" ? "media:write" : "media:read";
    if (!credentialHasScope(input.mediaAuth, scope)) {
      return { ok: false, error: `Missing scope ${scope}.` };
    }
    return {
      ok: true,
      orgId: org.id,
      projectId: project.id,
      orgSlug: org.slug,
      projectSlug: project.slug,
    };
  }

  const membership = await loadMembership(input.env.DB, org.id, input.auth.userId);
  if (!membership) return { ok: false, error: "Not found." };
  if (access === "write" && !roleCanWrite(membership.role)) {
    return { ok: false, error: "Forbidden." };
  }
  return {
    ok: true,
    orgId: org.id,
    projectId: project.id,
    orgSlug: org.slug,
    projectSlug: project.slug,
  };
}

export async function mcpListMediaProjects(input: MediaMcpContext): Promise<string> {
  if (!mediaEnabled(input.env)) return mediaOff();
  if (input.mediaAuth) {
    const project = await loadLiveProject(input.env.DB, input.mediaAuth.projectId);
    const org = project ? await loadLiveOrg(input.env.DB, project.org_id) : null;
    if (!project || !org) return "[]";
    return text([
      {
        project_id: project.id,
        project_slug: project.slug,
        name: project.name,
        org_id: org.id,
        url: mediaAliasUrl(input.origin, org.slug, project.slug, "").replace(/\/?$/, "/"),
      },
    ]);
  }
  const org = await ensurePersonalOrg(input.env.DB, input.auth.userId);
  const projects = await listProjectsForOrg(input.env.DB, org.id);
  return text(
    projects.map((project) => ({
      project_id: project.id,
      project_slug: project.slug,
      name: project.name,
      org_id: org.id,
      url: mediaAliasUrl(input.origin, org.slug, project.slug, "").replace(/\/?$/, "/"),
    })),
  );
}

export async function mcpCreateMediaProject(
  input: MediaMcpContext,
  args: { slug: string; name?: string },
): Promise<string> {
  if (!mediaEnabled(input.env)) return mediaOff();
  if (input.mediaAuth) {
    return "A project key cannot create projects. Sign in with an account token or OAuth.";
  }
  const org = await ensurePersonalOrg(input.env.DB, input.auth.userId);
  const created = await createProject(input.env.DB, {
    orgId: org.id,
    slug: args.slug,
    name: args.name || args.slug,
  });
  if ("error" in created) {
    return created.error === "bad_slug" ? "Invalid project slug." : "Project slug already exists.";
  }
  track(input.env.ANALYTICS, "media_project_created", { client: "mcp" });
  return text({
    project_id: created.id,
    project_slug: created.slug,
    name: created.name,
    org_id: org.id,
    url: mediaAliasUrl(input.origin, org.slug, created.slug, "").replace(/\/?$/, "/"),
  });
}

export async function mcpListMediaAssets(
  input: MediaMcpContext,
  args: { project_id: string },
): Promise<string> {
  const scoped = await resolveProjectForTool(input, args.project_id, "read");
  if (!scoped.ok) return scoped.error;
  const rows = await listProjectAssets(input.env.DB, scoped.orgId, scoped.projectId);
  return text(
    rows.map((row) =>
      compactAsset(
        publicAssetFromRow(input.origin, { orgSlug: scoped.orgSlug, projectSlug: scoped.projectSlug }, row),
      ),
    ),
  );
}

export async function mcpGetMediaAsset(
  input: MediaMcpContext,
  args: { project_id: string; asset_id: string },
): Promise<string> {
  const scoped = await resolveProjectForTool(input, args.project_id, "read");
  if (!scoped.ok) return scoped.error;
  const row = await loadLiveAsset(input.env.DB, args.asset_id, scoped.orgId, scoped.projectId);
  if (!row) return "Not found.";
  return text(
    compactAsset(
      publicAssetFromRow(input.origin, { orgSlug: scoped.orgSlug, projectSlug: scoped.projectSlug }, row),
    ),
  );
}

export async function mcpUploadMediaAsset(
  input: MediaMcpContext,
  args: { project_id: string; path: string; name?: string },
): Promise<string> {
  const scoped = await resolveProjectForTool(input, args.project_id, "write");
  if (!scoped.ok) return scoped.error;
  const created = await createMediaUploadIntent(input.env.DB, {
    orgId: scoped.orgId,
    projectId: scoped.projectId,
    operation: "create",
    path: args.path,
    name: args.name ?? null,
    actorUserId: input.mediaAuth?.userId ?? input.auth.userId,
    actorCredentialId: input.mediaAuth?.credentialId ?? null,
    origin: input.origin,
  });
  if (!created.ok) return created.error;
  return text({
    ...compactIntent(created.intent),
    next: "POST the image bytes to upload_url with the returned headers. Do not put the file in this MCP tool.",
  });
}

export async function mcpReplaceMediaAsset(
  input: MediaMcpContext,
  args: { project_id: string; asset_id: string; confirm?: boolean },
): Promise<string> {
  if (args.confirm !== true) {
    return "Replacement requires confirm: true. The stable /m/... URL will keep serving the new version.";
  }
  const scoped = await resolveProjectForTool(input, args.project_id, "write");
  if (!scoped.ok) return scoped.error;
  const created = await createMediaUploadIntent(input.env.DB, {
    orgId: scoped.orgId,
    projectId: scoped.projectId,
    operation: "replace",
    assetId: args.asset_id,
    actorUserId: input.mediaAuth?.userId ?? input.auth.userId,
    actorCredentialId: input.mediaAuth?.credentialId ?? null,
    origin: input.origin,
  });
  if (!created.ok) return created.error;
  return text({
    ...compactIntent(created.intent),
    next: "POST the image bytes to upload_url with the returned headers. The public alias does not change.",
  });
}
