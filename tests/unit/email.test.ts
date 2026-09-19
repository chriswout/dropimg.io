import { describe, expect, it } from "vitest";
import { dunningEmail, receiptEmail } from "../../src/lib/billing/notifications";
import { magicLinkEmail, parseFromAddress } from "../../src/lib/email";

const BRAND = {
  logo: "https://dropimg.io/brand/logo-64.png",
  wordmark: "dropimg.io",
  card: "border-radius:20px",
};

describe("parseFromAddress", () => {
  it("parses display name plus address", () => {
    expect(parseFromAddress("DropIMG <signin@dropimg.io>")).toEqual({
      email: "signin@dropimg.io",
      name: "DropIMG",
    });
  });

  it("accepts a bare address", () => {
    expect(parseFromAddress("signin@dropimg.io")).toEqual({
      email: "signin@dropimg.io",
    });
  });
});

describe("magicLinkEmail", () => {
  it("wraps the sign-in link in the branded layout", () => {
    const msg = magicLinkEmail({
      url: "https://dropimg.io/auth/callback?token=abc&x=1",
      minutes: 15,
    });
    expect(msg.subject).toBe("Sign in to DropIMG");
    expect(msg.text).toContain("https://dropimg.io/auth/callback?token=abc&x=1");
    expect(msg.html).toContain(BRAND.logo);
    expect(msg.html).toContain('alt="dropimg.io"');
    expect(msg.html).toContain(BRAND.card);
    expect(msg.html).toContain("Sign in");
    expect(msg.html).toContain("https://dropimg.io/auth/callback?token=abc&amp;x=1");
    expect(msg.html).not.toContain("token=abc&x=1");
    expect(msg.html).not.toContain("/app/billing");
  });
});

describe("branded dunning html", () => {
  it("brands every lifecycle notice and escapes product copy", () => {
    const types = [
      "payment_failed",
      "subscription_suspended",
      "payment_recovered",
      "subscription_ended",
    ] as const;
    for (const type of types) {
      const msg = dunningEmail({
        type,
        productLabel: 'Web Assets <Pro> & "Developer"',
        manageUrl: "https://www.paypal.com/myaccount/autopay",
      });
      expect(msg.html).toContain(BRAND.logo);
      expect(msg.html).toContain(BRAND.wordmark);
      expect(msg.html).toContain("Web Assets &lt;Pro&gt; &amp; &quot;Developer&quot;");
      expect(msg.html).not.toContain("Web Assets <Pro>");
    }
  });
});

describe("receiptEmail", () => {
  it("brands a receipt table and never calls it an invoice", () => {
    const msg = receiptEmail({
      kind: "paid",
      productLabel: "Web Assets Developer — $9/month",
      amountLabel: "$9.00",
      dateLabel: "19 Sep 2026",
      receiptUrl: "https://www.paypal.com/activity/payment/SALE123",
    });
    expect(msg.subject).toBe("Your DropIMG receipt — $9.00");
    expect(msg.text).toContain("Web Assets Developer");
    expect(msg.text).toContain("$9.00");
    expect(msg.html).toContain(BRAND.logo);
    expect(msg.html).toContain("Here's your receipt");
    expect(msg.html).toContain("View in PayPal");
    expect(msg.html).not.toMatch(/invoice/i);
    expect(msg.text).not.toMatch(/invoice/i);
  });
});
