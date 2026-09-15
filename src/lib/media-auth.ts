import { csrfOriginOk } from "./auth/csrf";
import { resolveSession } from "./auth/session";
import { mediaEnabled } from "./media-config";
import { mediaApiError, mediaRequestId } from "./media-http";
import { isUuid } from "./media-path";
import {
  credentialHasScope,
  resolveProjectCredential,
  type ProjectCredentialAuth,
} from "./project-credential";
import {
  loadLiveOrg,
  loadLiveProject,
  loadLiveProjectInOrg,
  loadMembership,
  orgWritesAllowed,
  roleCanRead,
  roleCanWrite,
  type OrganizationRow,
  type ProjectRow,
} from "./tenancy";
import { readBearerToken } from "./integration-token";
import type { MediaScope } from "./media-config";

export type MediaSessionActor = {
  kind: "session";
  userId: string;
  credentialId: null;
  org: OrganizationRow;
  role: NonNullable<Awaited<ReturnType<typeof loadMembership>>>["role"];
};

export type MediaCredentialActor = {
  kind: "credential";
  userId: string | null;
  credentialId: string;
  org: OrganizationRow;
  credential: ProjectCredentialAuth;
};

export type MediaOrgActor = MediaSessionActor | MediaCredentialActor;

export function mediaFlagOff(env: { MEDIA_ENABLED?: string }, requestId: string): Response | null {
  if (mediaEnabled(env)) return null;
  return mediaApiError(404, "not_found", "Not found", requestId);
}

export async function resolveMediaCaller(
  req: Request,
  db: D1Database,
): Promise<
  | { kind: "session"; userId: string }
  | { kind: "credential"; credential: ProjectCredentialAuth }
  | { kind: "none" }
  | { kind: "error"; response: Response }
> {
  const requestId = mediaRequestId(req);
  const bearer = readBearerToken(req);
  if (bearer) {
    const credential = await resolveProjectCredential(db, bearer);
    if (!credential) {
      return { kind: "error", response: mediaApiError(401, "unauthorized", "Unauthorized", requestId) };
    }
    return { kind: "credential", credential };
  }

  if (req.method !== "GET" && req.method !== "HEAD" && !csrfOriginOk(req)) {
    return { kind: "error", response: mediaApiError(403, "forbidden", "Invalid origin", requestId) };
  }

  const session = await resolveSession(db, req.headers.get("cookie"));
  if (!session) {
    return { kind: "error", response: mediaApiError(401, "unauthorized", "Unauthorized", requestId) };
  }
  return { kind: "session", userId: session.id };
}

export async function requireOrg(
  req: Request,
  db: D1Database,
  orgId: string,
  access: "read" | "write",
): Promise<MediaOrgActor | Response> {
  const requestId = mediaRequestId(req);
  if (!isUuid(orgId)) return mediaApiError(404, "not_found", "Not found", requestId);

  const caller = await resolveMediaCaller(req, db);
  if (caller.kind === "error") return caller.response;
  if (caller.kind === "none") {
    return mediaApiError(401, "unauthorized", "Unauthorized", requestId);
  }

  const org = await loadLiveOrg(db, orgId);
  if (!org) return mediaApiError(404, "not_found", "Not found", requestId);

  if (caller.kind === "credential") {
    if (caller.credential.orgId !== org.id) {
      return mediaApiError(404, "not_found", "Not found", requestId);
    }
    const scope: MediaScope = access === "write" ? "media:write" : "media:read";
    if (!credentialHasScope(caller.credential, scope)) {
      return mediaApiError(403, "forbidden", "This key is missing the required scope.", requestId);
    }
    if (access === "write" && !orgWritesAllowed(org.lifecycle_status)) {
      return mediaApiError(403, "forbidden", "Organization is read-only.", requestId);
    }
    return {
      kind: "credential",
      userId: caller.credential.userId,
      credentialId: caller.credential.credentialId,
      org,
      credential: caller.credential,
    };
  }

  const membership = await loadMembership(db, org.id, caller.userId);
  if (!membership) return mediaApiError(404, "not_found", "Not found", requestId);
  if (access === "read" && !roleCanRead(membership.role)) {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  if (access === "write" && !roleCanWrite(membership.role)) {
    return mediaApiError(403, "forbidden", "Forbidden", requestId);
  }
  if (access === "write" && !orgWritesAllowed(org.lifecycle_status)) {
    return mediaApiError(403, "forbidden", "Organization is read-only.", requestId);
  }
  return {
    kind: "session",
    userId: caller.userId,
    credentialId: null,
    org,
    role: membership.role,
  };
}

export async function requireProject(
  req: Request,
  db: D1Database,
  projectId: string,
  access: "read" | "write",
): Promise<(MediaOrgActor & { project: ProjectRow }) | Response> {
  const requestId = mediaRequestId(req);
  if (!isUuid(projectId)) return mediaApiError(404, "not_found", "Not found", requestId);

  const project = await loadLiveProject(db, projectId);
  if (!project) return mediaApiError(404, "not_found", "Not found", requestId);

  const actor = await requireOrg(req, db, project.org_id, access);
  if (actor instanceof Response) return actor;

  const scoped = await loadLiveProjectInOrg(db, project.id, actor.org.id);
  if (!scoped) return mediaApiError(404, "not_found", "Not found", requestId);

  if (actor.kind === "credential" && actor.credential.projectId !== scoped.id) {
    return mediaApiError(404, "not_found", "Not found", requestId);
  }

  return { ...actor, project: scoped };
}

export function actorRef(actor: MediaOrgActor): { userId: string | null; credentialId: string | null } {
  return {
    userId: actor.userId,
    credentialId: actor.kind === "credential" ? actor.credentialId : null,
  };
}
