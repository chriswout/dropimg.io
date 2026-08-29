import { describe, expect, it } from "vitest";
import { renderAccountPage } from "../../src/views/account";
import { renderAppPage } from "../../src/views/app";
import { renderLoginPage } from "../../src/views/login";
import { renderProPage } from "../../src/views/pro";

describe("Account pages share site chrome", () => {
  it("login uses the homepage header/footer shell", () => {
    const html = renderLoginPage({
      locale: "en",
      env: { ENVIRONMENT: "production" },
      state: "form",
    });
    expect(html).toContain('class="page"');
    expect(html).toContain("brand-logo");
    expect(html).toContain('id="account-nav"');
    expect(html).toContain('class="lang"');
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain("dropimg:theme");
    expect(html).toContain('class="foot"');
    expect(html).toContain('href="/site.css"');
    expect(html).toContain("/chrome.js");
    expect(html).toContain("Sign in to DropIMG");
    expect(html).toContain("No password required");
    expect(html).toContain('id="account-plan"');
    expect(html).toContain('class="account-menu"');
    expect(html).toContain('href="/pro"');
    expect(html).toContain("Upgrade to Pro");
    expect(html).toContain("Edit account");
    expect(html).toContain('href="/account"');
  });

  it("account page lists email, plan, and delete", () => {
    const html = renderAccountPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      email: "user@example.com",
      plan: "pro",
      periodEnd: 1_790_721_044,
      cancelAtPeriodEnd: false,
    });
    expect(html).toContain("user@example.com");
    expect(html).toContain("Manage billing");
    expect(html).toContain("Delete account");
    expect(html).toContain("/api/account/delete");
  });

  it("pro page shows plans when not subscribed and a member hero when Pro", async () => {
    const shop = renderProPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      signedIn: true,
      plan: "free",
      billingOn: true,
    });
    expect(shop.status).toBe(200);
    expect(shop.headers.get("Cache-Control")).toBe("private, no-store");
    const html = await shop.text();
    expect(html).toContain("Get monthly");
    expect(html).toContain("Get annual");
    expect(html).toContain("pro-card-featured");

    const member = renderProPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      signedIn: true,
      plan: "pro",
      billingOn: true,
      periodEnd: 1_790_721_044,
      cancelAtPeriodEnd: false,
    });
    const memberHtml = await member.text();
    expect(memberHtml).toContain("You’re on Pro");
    expect(memberHtml).toContain("Manage billing");
    expect(memberHtml).not.toContain("Get monthly");
  });

  it("my drops uses the same shell", () => {
    const html = renderAppPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      origin: "https://dropimg.io",
      email: "user@example.com",
      plan: "free",
      drops: [],
      historyCapped: true,
      nextCursor: null,
    });
    expect(html).toContain('class="page"');
    expect(html).toContain("brand-logo");
    expect(html).toContain("My drops");
    expect(html).toContain('href="/site.css"');
  });

  it("my drops rows include a thumbnail and copy control", () => {
    const html = renderAppPage({
      locale: "en",
      env: { ENVIRONMENT: "staging" },
      origin: "https://dropimg.io",
      email: "user@example.com",
      plan: "free",
      drops: [
        {
          slug: "abc123XY",
          mime: "image/png",
          size: 12_345,
          created_at: 1_700_000_000,
          expires_at: 1_700_086_400,
        },
      ],
      historyCapped: true,
      nextCursor: null,
    });
    expect(html).toContain('src="/i/abc123XY"');
    expect(html).toContain('value="/abc123XY"');
    expect(html).toContain('data-url="https://dropimg.io/abc123XY"');
    expect(html).toContain("drop-url-input");
    expect(html).toContain("drop-copy");
    expect(html).toContain('data-view="grid"');
    expect(html).toContain("drops-view-btn");
  });

  it("loads the Vite client on development pages", () => {
    const html = renderLoginPage({
      locale: "es",
      env: { ENVIRONMENT: "development" },
      state: "form",
    });
    expect(html).toContain("/client/main.ts");
    expect(html).not.toContain("/site.css");
  });
});
