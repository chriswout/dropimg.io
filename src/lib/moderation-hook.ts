/**
 * Extension point for automated safety scanning after metadata strip.
 * V1: no-op. Wire a provider here later without changing the upload route shape.
 */
export async function runPostStripSafetyScan(_opts: {
  bytes: ArrayBuffer;
  mime: string;
  slug?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  return { ok: true };
}
