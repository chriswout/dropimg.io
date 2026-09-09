import { getOwnedLiveImage, listOwnedLiveImages, toIso, toPublicImage } from "./api-images";
import { createDrop } from "./create-drop";
import { clientIp, hashIp } from "./ip";
import { tokenHasScope, type IntegrationAuth } from "./integration-token";
import { removeImage } from "./remove-image";
import { resolveIpHashSecret } from "./secrets";
import { isValidSlug } from "./slug";

export type McpToolContext = {
  env: Cloudflare.Env;
  ctx: ExecutionContext;
  auth: IntegrationAuth;
  origin: string;
  request: Request;
};

export function decodeImagePayload(raw: string): ArrayBuffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const comma = trimmed.indexOf(",");
  const b64 =
    trimmed.startsWith("data:") && comma > 0 ? trimmed.slice(comma + 1) : trimmed;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.byteLength ? bytes.buffer : null;
  } catch {
    return null;
  }
}

export async function mcpUploadImage(
  input: McpToolContext,
  args: { image: string; expiry?: string },
): Promise<string> {
  if (!tokenHasScope(input.auth, "images:write")) {
    return "Missing scope images:write.";
  }
  const bytes = decodeImagePayload(args.image);
  if (!bytes) return "Could not decode the image. Send base64 or a data URL.";

  const secretResolved = resolveIpHashSecret(input.env);
  if (!secretResolved.ok) return "Upload temporarily unavailable.";
  const ipHash = await hashIp(clientIp(input.request), secretResolved.secret);

  const stored = await createDrop(input.env, input.ctx, {
    userId: input.auth.userId,
    source: "mcp",
    bytes,
    expiry: args.expiry,
    origin: input.origin,
    ipHash,
    pageIntent: "mcp",
  });
  if (!stored.ok) return stored.error;
  return `${stored.body.url} (expires ${toIso(stored.body.expiresAt)})`;
}

export async function mcpGetImage(input: McpToolContext, id: string): Promise<string> {
  if (!tokenHasScope(input.auth, "images:read")) {
    return "Missing scope images:read.";
  }
  if (!isValidSlug(id)) return "Not found.";
  const row = await getOwnedLiveImage(input.env.DB, input.auth.userId, id);
  if (!row) return "Not found.";
  const image = toPublicImage(input.origin, row);
  return `${image.url} — created ${image.created_at}, expires ${image.expires_at}`;
}

export async function mcpListImages(input: McpToolContext, cursor?: string): Promise<string> {
  if (!tokenHasScope(input.auth, "images:read")) {
    return "Missing scope images:read.";
  }
  const listed = await listOwnedLiveImages(
    input.env,
    input.auth.userId,
    input.origin,
    cursor ?? null,
  );
  if (!listed.data.length) return "No live images.";
  const lines = listed.data.map(
    (row) => `${row.id} ${row.url} expires ${row.expires_at}`,
  );
  if (listed.next_cursor) lines.push(`next_cursor ${listed.next_cursor}`);
  return lines.join("\n");
}

export async function mcpDeleteImage(input: McpToolContext, id: string): Promise<string> {
  if (!tokenHasScope(input.auth, "images:delete")) {
    return "Missing scope images:delete.";
  }
  if (!isValidSlug(id)) return "Not found.";
  const row = await getOwnedLiveImage(input.env.DB, input.auth.userId, id);
  if (!row) return "Not found.";
  await removeImage(input.env, row, "user");
  return `Deleted ${id}.`;
}
