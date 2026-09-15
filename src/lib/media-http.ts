export function mediaRequestId(req: Request): string {
  const raw = req.headers.get("x-request-id")?.trim();
  if (raw && raw.length <= 128 && /^[\w.-]+$/.test(raw)) return raw;
  return crypto.randomUUID();
}

export function mediaJson(
  status: number,
  body: unknown,
  requestId: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": requestId,
    },
  });
}

export function mediaApiError(
  status: number,
  code: string,
  error: string,
  requestId: string,
): Response {
  return mediaJson(status, { error, code }, requestId);
}
