#!/usr/bin/env node
/**
 * Apply minimal dropimg.io WAF config.
 *
 * Requires API token permissions:
 *   - Zone → Zone WAF → Edit
 *   - Zone → Zone → Read (to resolve zone id)
 *
 *   export CLOUDFLARE_API_TOKEN=...
 *   node scripts/apply-waf.mjs
 *
 * Does NOT enable Bot Fight Mode.
 */

import {
  CUSTOM_RULES,
  FREE_MANAGED_RULESET_ID,
  RATE_LIMIT_RULES,
  ZONE_NAME,
} from "./waf-config.mjs";

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!token || token === "..." || !/^[A-Za-z0-9_-]{20,}$/.test(token)) {
  console.error(`Set a real Cloudflare API token (not "...").

  1. https://dash.cloudflare.com/profile/api-tokens
  2. Create Token → custom: Zone WAF Edit + Zone Read (dropimg.io only)
  3. export CLOUDFLARE_API_TOKEN='paste_token_here'
  4. npm run waf:apply
`);
  process.exit(1);
}

async function cf(method, path, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    const msg = (json.errors || [])
      .map((e) => `${e.code}: ${e.message}`)
      .join("; ");
    const err = new Error(`${method} ${path} → ${res.status} ${msg}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json.result;
}

async function getEntrypoint(zoneId, phase) {
  try {
    return await cf(
      "GET",
      `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`,
    );
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

function hasManagedExecute(rules = []) {
  return rules.some(
    (r) =>
      r.action === "execute" &&
      r.action_parameters?.id === FREE_MANAGED_RULESET_ID &&
      r.enabled !== false,
  );
}

async function ensureManaged(zoneId) {
  const phase = "http_request_firewall_managed";
  const existing = await getEntrypoint(zoneId, phase);
  if (!existing) {
    const created = await cf("POST", `/zones/${zoneId}/rulesets`, {
      name: "Managed WAF entry point",
      description: "dropimg.io Free Managed Ruleset",
      kind: "zone",
      phase,
      rules: [
        {
          action: "execute",
          action_parameters: { id: FREE_MANAGED_RULESET_ID },
          expression: "true",
          description: "Execute Cloudflare Free Managed Ruleset",
          enabled: true,
        },
      ],
    });
    console.log("✓ Created managed WAF entry point", created.id);
    return;
  }
  if (hasManagedExecute(existing.rules)) {
    console.log("✓ Free Managed Ruleset already enabled");
    return;
  }
  await cf("POST", `/zones/${zoneId}/rulesets/${existing.id}/rules`, {
    action: "execute",
    action_parameters: { id: FREE_MANAGED_RULESET_ID },
    expression: "true",
    description: "Execute Cloudflare Free Managed Ruleset",
    enabled: true,
  });
  console.log("✓ Added Free Managed Ruleset execute rule");
}

async function upsertPhaseRules(zoneId, phase, desiredRules, mapRule) {
  const existing = await getEntrypoint(zoneId, phase);
  const byDesc = new Map(
    (existing?.rules || []).map((r) => [r.description, r]),
  );

  const nextRules = desiredRules.map((spec) => {
    const prev = byDesc.get(spec.description);
    const mapped = mapRule(spec);
    if (prev?.id) mapped.id = prev.id;
    return mapped;
  });

  // Keep unrelated existing rules (other descriptions) so we don't wipe them.
  for (const r of existing?.rules || []) {
    if (!desiredRules.some((d) => d.description === r.description)) {
      nextRules.push({
        id: r.id,
        action: r.action,
        action_parameters: r.action_parameters,
        expression: r.expression,
        description: r.description,
        enabled: r.enabled,
        ratelimit: r.ratelimit,
      });
    }
  }

  if (!existing) {
    const created = await cf("POST", `/zones/${zoneId}/rulesets`, {
      name: `${phase} entry point`,
      description: "dropimg.io WAF",
      kind: "zone",
      phase,
      rules: nextRules.map(({ id, ...rest }) => rest),
    });
    console.log(`✓ Created ${phase} ruleset`, created.id);
    return;
  }

  await cf("PUT", `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`, {
    rules: nextRules,
  });
  console.log(`✓ Upserted ${nextRules.length} rule(s) in ${phase}`);
}

async function main() {
  const zones = await cf("GET", `/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const z = Array.isArray(zones) ? zones[0] : null;
  if (!z) throw new Error(`Zone not found: ${ZONE_NAME}`);
  console.log(
    `Zone ${z.name} (${z.id}) plan=${z.plan?.legacy_id || z.plan?.name || "?"}`,
  );

  await ensureManaged(z.id);

  await upsertPhaseRules(
    z.id,
    "http_request_firewall_custom",
    CUSTOM_RULES,
    (spec) => ({
      action: spec.action,
      expression: spec.expression,
      description: spec.description,
      enabled: spec.enabled,
    }),
  );

  await upsertPhaseRules(
    z.id,
    "http_ratelimit",
    RATE_LIMIT_RULES,
    (spec) => ({
      action: spec.action,
      expression: spec.expression,
      description: spec.description,
      enabled: spec.enabled,
      ratelimit: {
        characteristics: spec.ratelimit.characteristics,
        period: spec.ratelimit.period,
        requests_per_period: spec.ratelimit.requests_per_period,
        mitigation_timeout: spec.ratelimit.mitigation_timeout,
        // Free plan: no counting_expression (needs Advanced Rate Limiting).
        // Path-only counters; threshold is loose enough for normal viewing.
      },
    }),
  );

  console.log(
    "\nBot Fight Mode: left OFF (do not enable — challenges API uploads).",
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.payload) console.error(JSON.stringify(err.payload, null, 2));
  process.exit(1);
});
