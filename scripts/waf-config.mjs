/**
 * Minimal WAF layer for dropimg.io (Free plan).
 *
 * Apply with a token that has Zone WAF Write + Zone Settings Write:
 *   CLOUDFLARE_API_TOKEN=... node scripts/apply-waf.mjs
 *
 * Intentionally NOT enabling Bot Fight Mode (domain-wide, challenges APIs).
 */

export const ZONE_NAME = "dropimg.io";

/** Free Managed Ruleset — safe default coverage on Free. */
export const FREE_MANAGED_RULESET_ID = "77454fe2d30c4220b5701f6fdfb893ba";

/**
 * Custom rules (http_request_firewall_custom).
 * Free plan: max 5 rules, no regex — use starts_with / len / eq only.
 */
export const CUSTOM_RULES = [
  {
    description: "Block unsupported methods on API routes",
    enabled: true,
    action: "block",
    expression: [
      "(",
      'http.request.uri.path eq "/api/upload" and http.request.method ne "POST"',
      ") or (",
      'starts_with(http.request.uri.path, "/api/i/") and http.request.method ne "DELETE"',
      ") or (",
      'http.request.uri.path eq "/api/report" and http.request.method ne "POST"',
      ")",
    ].join(" "),
  },
  {
    description:
      "Managed Challenge suspicious uploads (threat score) — not broad traffic",
    enabled: true,
    action: "managed_challenge",
    expression: [
      'http.request.uri.path eq "/api/upload"',
      "and http.request.method eq \"POST\"",
      "and cf.threat_score gt 14",
    ].join(" "),
  },
];

/**
 * Rate limiting (http_ratelimit) — slug / image enumeration shield.
 * Free plan: period=10 only; no regex; no counting_expression (needs Advanced RL).
 * `/i/*` covers image probing; 9-char paths cover `/:slug` share pages.
 */
export const RATE_LIMIT_RULES = [
  {
    description: "Challenge burst probing of share/image URLs",
    enabled: true,
    expression: [
      "(",
      'starts_with(http.request.uri.path, "/i/")',
      ") or (",
      // /abcdefgh style share URLs (8-char slug) — Free has no regex
      "len(http.request.uri.path) eq 9",
      'and starts_with(http.request.uri.path, "/")',
      'and not starts_with(http.request.uri.path, "/api")',
      'and not starts_with(http.request.uri.path, "/assets")',
      ")",
    ].join(" "),
    action: "block",
    ratelimit: {
      characteristics: ["cf.colo.id", "ip.src"],
      // Free plan: period must be 10 (seconds); no managed_challenge on RL
      period: 10,
      // Loose enough for normal viewing; tight enough to slow slug scans
      requests_per_period: 10,
      mitigation_timeout: 10,
    },
  },
];
