import {
  API_ORIGIN,
  chooseExpirySeconds,
  EXPIRY_7D,
  mapError,
  type CaptureResult,
  type UploadErrorBody,
  type UploadResponse,
} from "./shared";

/**
 * No expiry header, so the server applies its own anonymous default. The popup
 * has no lifetime control until a token is connected, and inventing one here
 * would let the extension drift from whatever the server actually allows.
 */
export async function uploadAnonymous(
  bytes: ArrayBuffer,
  client: string,
  origin = API_ORIGIN,
): Promise<CaptureResult> {
  return postBytes(`${origin}/api/upload`, bytes, {
    "Content-Type": "application/octet-stream",
    "X-Dropimg-Client": client,
  });
}

export async function uploadWithIntegrationToken(input: {
  token: string;
  bytes: ArrayBuffer;
  expirySeconds: number;
  client: string;
  origin?: string;
}): Promise<CaptureResult> {
  const origin = input.origin ?? API_ORIGIN;
  try {
    const intentRes = await fetch(`${origin}/api/integrations/upload-intent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
        "X-Dropimg-Client": input.client,
      },
      body: JSON.stringify({ expiry: input.expirySeconds }),
    });
    if (intentRes.status === 401) {
      return {
        ok: false,
        error: mapError("account_expired"),
        code: "account_expired",
      };
    }
    if (!intentRes.ok) {
      return await failFrom(intentRes);
    }
    const intent = (await intentRes.json()) as { uploadUrl?: string };
    if (!intent.uploadUrl) {
      return { ok: false, error: mapError("server_error"), code: "server_error" };
    }
    const uploadUrl = intent.uploadUrl.startsWith("http")
      ? intent.uploadUrl
      : `${origin}${intent.uploadUrl}`;
    return postBytes(uploadUrl, input.bytes, {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/octet-stream",
      "X-Dropimg-Client": input.client,
    });
  } catch {
    return { ok: false, error: mapError("network"), code: "network" };
  }
}

export async function validateIntegrationToken(
  token: string,
  origin = API_ORIGIN,
): Promise<
  | {
      ok: true;
      emailMasked: string;
      plan: "free" | "pro" | "anonymous";
      maxUploadBytes: number;
      allowedExpirySeconds: number[];
      defaultExpirySeconds: number;
    }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${origin}/api/integrations/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { ok: false, error: mapError("account_expired") };
    }
    const body = (await res.json()) as {
      user?: { emailMasked?: string };
      entitlements?: {
        plan?: "free" | "pro" | "anonymous";
        maxUploadBytes?: number;
        allowedExpirySeconds?: number[];
        defaultExpirySeconds?: number;
      };
    };
    const allowedExpirySeconds = body.entitlements?.allowedExpirySeconds?.length
      ? body.entitlements.allowedExpirySeconds
      : [EXPIRY_7D];
    return {
      ok: true,
      emailMasked: body.user?.emailMasked || "",
      plan: body.entitlements?.plan === "pro" ? "pro" : "free",
      maxUploadBytes: body.entitlements?.maxUploadBytes || 10 * 1024 * 1024,
      allowedExpirySeconds,
      defaultExpirySeconds: chooseExpirySeconds(
        allowedExpirySeconds,
        undefined,
        body.entitlements?.defaultExpirySeconds,
      ),
    };
  } catch {
    return { ok: false, error: mapError("network") };
  }
}

async function postBytes(
  url: string,
  bytes: ArrayBuffer,
  headers: Record<string, string>,
): Promise<CaptureResult> {
  try {
    const res = await fetch(url, { method: "POST", headers, body: bytes });
    if (res.status === 401 && headers.Authorization) {
      return {
        ok: false,
        error: mapError("account_expired"),
        code: "account_expired",
      };
    }
    if (!res.ok) return failFrom(res);
    const data = (await res.json()) as UploadResponse;
    return {
      ok: true,
      url: data.url,
      expiresAt: data.expiresAt,
      slug: data.slug,
      deleteToken: data.deleteToken,
    };
  } catch {
    return { ok: false, error: mapError("network"), code: "network" };
  }
}

async function failFrom(res: Response): Promise<CaptureResult> {
  let code: string | undefined;
  let errText = `Upload failed (${res.status})`;
  try {
    const err = (await res.json()) as UploadErrorBody;
    code = err.code;
    if (err.error) errText = err.error;
  } catch {
    // ignore
  }
  return { ok: false, error: mapError(code, errText), code };
}
