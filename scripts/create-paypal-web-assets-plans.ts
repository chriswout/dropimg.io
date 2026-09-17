/**
 * Create PayPal Catalog Product + Billing Plans for Web Assets.
 * Uses PAYPAL_ENV / PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from the environment.
 *
 *   PAYPAL_ENV=sandbox npx tsx scripts/create-paypal-web-assets-plans.ts
 */
const SANDBOX = "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";

type PlanSpec = {
  key: string;
  name: string;
  interval: "MONTH" | "YEAR";
  value: string;
};

const PLANS: PlanSpec[] = [
  { key: "PAYPAL_WA_DEVELOPER_MONTHLY", name: "DropIMG Web Assets Developer Monthly", interval: "MONTH", value: "9.00" },
  { key: "PAYPAL_WA_DEVELOPER_ANNUAL", name: "DropIMG Web Assets Developer Annual", interval: "YEAR", value: "90.00" },
  { key: "PAYPAL_WA_PRO_MONTHLY", name: "DropIMG Web Assets Pro Monthly", interval: "MONTH", value: "29.00" },
  { key: "PAYPAL_WA_PRO_ANNUAL", name: "DropIMG Web Assets Pro Annual", interval: "YEAR", value: "290.00" },
];

function basicAuth(id: string, secret: string): string {
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

async function main() {
  const mode = (process.env.PAYPAL_ENV || "").trim().toLowerCase();
  const clientId = (process.env.PAYPAL_CLIENT_ID || "").trim();
  const secret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
  if (mode !== "sandbox" && mode !== "live") {
    throw new Error("PAYPAL_ENV must be sandbox or live");
  }
  if (!clientId || !secret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required");
  }
  const base = mode === "live" ? LIVE : SANDBOX;

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenBody = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error(`paypal token failed: ${tokenBody.error || tokenRes.status}`);
  }
  const auth = { Authorization: `Bearer ${tokenBody.access_token}`, "Content-Type": "application/json" };

  const productRes = await fetch(`${base}/v1/catalogs/products`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "DropIMG Web Assets",
      type: "SERVICE",
      description: "Permanent web-asset hosting with stable /m/ URLs",
      category: "SOFTWARE",
    }),
  });
  const product = (await productRes.json()) as { id?: string; name?: string; message?: string };
  if (!productRes.ok || !product.id) {
    throw new Error(`product create failed: ${product.message || productRes.status}`);
  }

  const ids: Record<string, string> = { PRODUCT: product.id };
  for (const spec of PLANS) {
    const res = await fetch(`${base}/v1/billing/plans`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        product_id: product.id,
        name: spec.name,
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: { interval_unit: spec.interval, interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: spec.value, currency_code: "USD" } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
        },
      }),
    });
    const plan = (await res.json()) as { id?: string; message?: string };
    if (!res.ok || !plan.id) {
      throw new Error(`${spec.key} failed: ${plan.message || res.status}`);
    }
    ids[spec.key] = plan.id;
  }

  console.log(JSON.stringify({ mode, ...ids }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
