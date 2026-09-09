export const UPLOAD_BYTE_CAP = 70;
export const CHECKING_START = 70;
export const CHECKING_END = 95;
export const CHECKING_MS = 18_000;

/** Map XHR byte progress onto the first ~70% of the bar. */
export function byteFractionToBar(loaded: number, total: number): number {
  if (!(total > 0) || loaded <= 0) return 0;
  return Math.min(UPLOAD_BYTE_CAP, Math.round((loaded / total) * UPLOAD_BYTE_CAP));
}

/** After bytes are sent, crawl 70 → 95 while the Worker classifies. */
export function checkingBarAt(elapsedMs: number, durationMs = CHECKING_MS): number {
  if (elapsedMs <= 0) return CHECKING_START;
  const t = Math.min(1, elapsedMs / durationMs);
  return Math.round(CHECKING_START + t * (CHECKING_END - CHECKING_START));
}
