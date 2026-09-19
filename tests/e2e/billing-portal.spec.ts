import { expect, test } from "@playwright/test";
import {
  E2E_PLANS,
  insertPayment,
  insertSubscription,
  signInBilling,
} from "./billing-helpers";

const stamp = Date.now();
const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;

async function noOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test("free account billing portal", async ({ page, request }) => {
  await signInBilling(page, request, `bill-free-${Date.now()}@example.com`);
  await page.goto("/app/billing");
  await expect(page.getByText("Web Assets Free", { exact: false })).toBeVisible();
  await expect(page.getByText("Drops Free", { exact: false })).toBeVisible();
  await expect(page.getByText("No payments yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel renewal" })).toHaveCount(0);
  await noOverflow(page);
});

test("Web Assets Developer billing portal", async ({ page, request }) => {
  const userId = await signInBilling(page, request, `bill-dev-${Date.now()}@example.com`);
  insertSubscription({
    userId,
    id: `I-e2edev-${Date.now()}`,
    product: "web_assets",
    status: "active",
    priceId: E2E_PLANS.waDevMonthly,
    periodEnd,
  });
  await page.goto("/app/billing");
  await expect(page.getByText("Web Assets Developer — $9/month")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change plan" })).toBeVisible();
  await page.getByRole("button", { name: "Change plan" }).click();
  await expect(page.locator("#billing-change-modal")).toBeVisible();
  await expect(page.locator("#billing-change-modal")).toContainText("No prorated charge today");
  await page.locator("#billing-change-close").click();
  await page.getByRole("button", { name: "Cancel renewal" }).click();
  await expect(page.locator("#billing-cancel-modal")).toBeVisible();
  await expect(page.getByText("Keep subscription")).toBeVisible();
  await page.locator("#billing-cancel-keep").click();
  await noOverflow(page);
});

test("Web Assets annual Pro billing portal", async ({ page, request }) => {
  const userId = await signInBilling(page, request, `bill-pro-${Date.now()}@example.com`);
  insertSubscription({
    userId,
    id: `I-e2ewapro-${stamp}`,
    product: "web_assets",
    status: "active",
    priceId: E2E_PLANS.waProAnnual,
    periodEnd,
  });
  await page.goto("/app/billing");
  await expect(page.getByText("Web Assets Pro — $290/year")).toBeVisible();
  await noOverflow(page);
});

test("Drops Pro billing portal", async ({ page, request }) => {
  const userId = await signInBilling(page, request, `bill-drops-${Date.now()}@example.com`);
  insertSubscription({
    userId,
    id: `I-e2edrops-${stamp}`,
    product: "drops_pro",
    status: "active",
    priceId: E2E_PLANS.dropsMonthly,
    periodEnd,
  });
  await page.goto("/app/billing");
  await expect(page.locator(".billing-product[data-product='drops_pro'] .settings-value-lg")).toHaveText(
    "Drops Pro — €2.99/month",
  );
  await noOverflow(page);
});

test("both products, canceled paid-through, suspended, history", async ({
  page,
  request,
}) => {
  const userId = await signInBilling(page, request, `bill-mix-${Date.now()}@example.com`);
  insertSubscription({
    userId,
    id: `I-e2emixwa-${stamp}`,
    product: "web_assets",
    status: "canceled",
    priceId: E2E_PLANS.waDevMonthly,
    periodEnd,
    cancelAtPeriodEnd: 1,
  });
  insertSubscription({
    userId,
    id: `I-e2emixdrops-${stamp}`,
    product: "drops_pro",
    status: "suspended",
    priceId: E2E_PLANS.dropsAnnual,
    periodEnd,
  });
  insertPayment({
    userId,
    id: `TX-e2e-${stamp}`,
    product: "web_assets",
    planId: E2E_PLANS.waDevMonthly,
    amount: "9.00",
    currency: "USD",
  });
  await page.goto("/app/billing");
  await expect(page.getByText("Cancels at period end")).toBeVisible();
  await expect(page.getByText("Status: Suspended")).toBeVisible();
  await expect(page.getByText("Paid")).toBeVisible();
  await expect(page.getByText("$9.00")).toBeVisible();
  await expect(page.getByText("No payments yet.")).toHaveCount(0);
  await noOverflow(page);
});

test("mobile billing portal", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const userId = await signInBilling(page, request, `bill-m-${Date.now()}@example.com`);
  insertSubscription({
    userId,
    id: `I-e2emobile-${stamp}`,
    product: "web_assets",
    status: "active",
    priceId: E2E_PLANS.waDevMonthly,
    periodEnd,
  });
  insertPayment({
    userId,
    id: `TX-e2emobile-${stamp}`,
    product: "web_assets",
    planId: E2E_PLANS.waDevMonthly,
    amount: "9.00",
    currency: "USD",
  });
  await page.goto("/app/billing");
  await expect(page.getByText("Payment history")).toBeVisible();
  await noOverflow(page);
});
