/**
 * Drives one real Stripe test-mode subscription purchase against the local dev
 * server: sign in, open checkout, pay with a test card, then wait for the
 * webhook to turn the account Pro. Run `stripe listen` first.
 *
 *   node scripts/stripe-e2e-check.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const IP = "203.0.113.77";
const CARD = "4242424242424242";

const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  extraHTTPHeaders: { "CF-Connecting-IP": IP },
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

try {
  const email = `stripe-e2e-${Date.now()}@example.com`;
  const started = await context.request.post(`${BASE}/login`, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    data: { email },
  });
  const { devMagicUrl } = await started.json();
  if (!devMagicUrl) throw new Error("no dev magic url");
  await page.goto(devMagicUrl);
  log(`signed in as ${email}`);

  const me = await (await context.request.get(`${BASE}/api/account/me`)).json();
  log(`plan before: ${me.entitlements?.plan}`);
  if (me.entitlements?.plan !== "free") throw new Error("expected a free plan");

  await page.goto(`${BASE}/pro`);
  const html = await page.content();
  for (const needle of ["€2.99", "€24.99"]) {
    if (!html.includes(needle)) throw new Error(`pro page missing ${needle}`);
  }
  if (html.includes("paddle")) throw new Error("pro page still references Paddle");
  log("pro page shows euro pricing and no Paddle");

  const res = await context.request.post(`${BASE}/api/billing/checkout`, {
    headers: { "Content-Type": "application/json", Origin: BASE },
    data: { interval: "annual" },
  });
  if (!res.ok()) throw new Error(`checkout failed: ${res.status()} ${await res.text()}`);
  const { url } = await res.json();
  log(`checkout session: ${url.slice(0, 60)}…`);

  await page.goto(url);
  await page.waitForLoadState("networkidle");

  const shown = await page.locator("body").innerText();
  const total = shown.match(/€\s?\d+[.,]\d{2}/g);
  log(`amounts on Stripe's page: ${[...new Set(total ?? [])].join(", ")}`);
  if (/Link/i.test(shown)) log("checkout is branded via Link (merchant of record)");

  /** The card fields only. Re-touching the prefilled email or country makes
   *  Link re-render the form and swallow the submit. */
  await page.fill('input[name="cardNumber"]', CARD);
  await page.fill('input[name="cardExpiry"]', "12 / 34");
  await page.fill('input[name="cardCvc"]', "123");
  await page.fill('input[name="billingName"]', "DropIMG Tester");

  await page.getByTestId("hosted-payment-submit-button").first().click();
  log("submitted the test card, waiting for the return trip…");

  let returned = false;
  for (let i = 0; i < 48; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const here = page.url();
    if (here.includes("checkout=success") || here.startsWith(`${BASE}/app`)) {
      returned = true;
      log(`returned to ${here}`);
      break;
    }
  }
  if (!returned) {
    const err = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
    if (err.length) log(`page reported: ${err.join(" | ")}`);
    throw new Error(`checkout did not return to the site, stuck on ${page.url()}`);
  }

  let plan = "free";
  for (let i = 0; i < 40; i++) {
    const body = await (await context.request.get(`${BASE}/api/account/me`)).json();
    plan = body.entitlements?.plan;
    if (plan === "pro") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  log(`plan after: ${plan}`);
  if (plan !== "pro") throw new Error("webhook never granted Pro");

  const after = await (await context.request.get(`${BASE}/api/account/me`)).json();
  log(
    `entitlements: max ${after.entitlements.maxUploadBytes / 1024 / 1024} MB, ` +
      `expiries ${after.entitlements.allowedExpirySeconds.join("/")}, ` +
      `password ${after.entitlements.passwordProtection}`,
  );

  const portal = await context.request.post(`${BASE}/api/billing/portal`, {
    headers: { "Content-Type": "application/json", Origin: BASE },
  });
  if (!portal.ok()) throw new Error(`portal failed: ${portal.status()} ${await portal.text()}`);
  const { url: portalUrl } = await portal.json();
  log(`portal: ${portalUrl.slice(0, 60)}…`);

  /**
   * Deleting the account has to cancel the live subscription at Stripe first,
   * or someone keeps paying for an account that no longer exists.
   */
  const del = await context.request.post(`${BASE}/api/account/delete`, {
    headers: { "Content-Type": "application/json", Origin: BASE },
  });
  if (!del.ok()) throw new Error(`delete failed: ${del.status()} ${await del.text()}`);
  log("account deleted");

  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");
    const customers = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: auth } },
    ).then((r) => r.json());
    const customerId = customers.data?.[0]?.id;
    if (!customerId) throw new Error("no Stripe customer for the buyer");
    const subs = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=all`,
      { headers: { Authorization: auth } },
    ).then((r) => r.json());
    const states = (subs.data ?? []).map((s) => s.status);
    log(`subscription state at Stripe: ${states.join(", ") || "none"}`);
    if (states.length === 0 || !states.every((s) => s === "canceled")) {
      throw new Error(`account deletion left a live subscription behind: ${states}`);
    }
  } else {
    log("skipped the Stripe-side cancel check (no STRIPE_SECRET_KEY in env)");
  }

  log("\nPASS — checkout, webhook, entitlements, portal and cancel-on-delete all work.");
} catch (err) {
  console.error("\nFAIL —", err.message);
  await page.screenshot({ path: "/tmp/stripe-e2e-fail.png", fullPage: true });
  console.error("screenshot: /tmp/stripe-e2e-fail.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
