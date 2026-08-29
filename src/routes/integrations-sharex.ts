import { Hono } from "hono";
import { uploadRoutes } from "./upload";

type Env = {
  Bindings: Cloudflare.Env;
};

/**
 * ShareX typically posts multipart/form-data.
 * Adapt to the main octet-stream /api/upload pipeline without loosening it.
 */
export const sharexRoutes = new Hono<Env>();

sharexRoutes.post("/api/integrations/sharex", async (c) => {
  let bytes: ArrayBuffer | null = null;

  const contentType = c.req.header("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await c.req.parseBody({ all: true });
      const file = pickFile(form);
      if (file) {
        bytes = await file.arrayBuffer();
      }
    } catch {
      return c.json({ error: "Invalid multipart body", code: "invalid_image" }, 400);
    }
  } else {
    // Allow raw body as a convenience (same as /api/upload)
    try {
      bytes = await c.req.arrayBuffer();
    } catch {
      return c.json({ error: "Could not read body", code: "invalid_image" }, 400);
    }
  }

  if (!bytes || bytes.byteLength === 0) {
    return c.json(
      { error: "No image file in request", code: "invalid_image" },
      400,
    );
  }

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    "";

  const upstream = new Request(new URL("/api/upload", c.req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "X-Dropimg-Client": "sharex",
      ...(ip ? { "CF-Connecting-IP": ip.split(",")[0]!.trim() } : {}),
    },
    body: bytes,
  });

  return uploadRoutes.fetch(upstream, c.env, c.executionCtx);
});

function pickFile(
  form: Record<string, string | File | (string | File)[]>,
): File | null {
  const keys = ["file", "image", "screenshot", "upload"];
  for (const key of keys) {
    const v = form[key];
    if (v instanceof File) return v;
    if (Array.isArray(v)) {
      const f = v.find((x): x is File => x instanceof File);
      if (f) return f;
    }
  }
  for (const v of Object.values(form)) {
    if (v instanceof File) return v;
    if (Array.isArray(v)) {
      const f = v.find((x): x is File => x instanceof File);
      if (f) return f;
    }
  }
  return null;
}
