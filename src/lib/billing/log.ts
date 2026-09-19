/** Structured billing logs. Never include payer secrets or credentials. */

export function billingLog(
  event: string,
  fields: {
    userId?: string | null;
    subscriptionId?: string | null;
    product?: string | null;
    planId?: string | null;
    eventId?: string | null;
    transition?: string | null;
    result?: string | null;
    [key: string]: unknown;
  },
): void {
  const safe: Record<string, unknown> = { scope: "billing", event };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === "string" && /secret|password|token|cvv|pan/i.test(key)) {
      continue;
    }
    safe[key] = value;
  }
  console.log(JSON.stringify(safe));
}
