import { describe, expect, it } from "vitest";
import {
  cancelPaypalSubscriptionImmediately,
  createCheckoutSession,
  parsePaypalSubscriptionId,
  syncSubscriptionFromPaypal,
} from "../../src/lib/billing/paypal";

const env = {
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "client-id",
  PAYPAL_CLIENT_SECRET: "client-secret",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("cancelPaypalSubscriptionImmediately", () => {
  it("fails closed when there is no usable credential", async () => {
    expect(await cancelPaypalSubscriptionImmediately({}, "I-01test")).toEqual({
      ok: false,
      error: "paypal_unconfigured",
    });
  });

  it("cancels immediately rather than scheduling the end of the period", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      if (String(input).includes("/oauth2/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 300 });
      }
      return new Response(null, { status: 204 });
    };
    const ok = await cancelPaypalSubscriptionImmediately(env, "I-01test", fakeFetch);
    expect(ok).toEqual({ ok: true });
    expect(calls[1]?.url).toBe(
      "https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-01test/cancel",
    );
    expect(calls[1]?.init.method).toBe("POST");
  });

  it("treats an already-gone subscription as cancelled", async () => {
    const res = await cancelPaypalSubscriptionImmediately(
      env,
      "I-01test",
      async (input) => {
        if (String(input).includes("/oauth2/token")) {
          return jsonResponse({ access_token: "tok", expires_in: 300 });
        }
        return jsonResponse({ name: "RESOURCE_NOT_FOUND" }, 404);
      },
    );
    expect(res).toEqual({ ok: true });
  });

  it("reports a real failure so account deletion stops", async () => {
    const res = await cancelPaypalSubscriptionImmediately(
      env,
      "I-01test",
      async (input) => {
        if (String(input).includes("/oauth2/token")) {
          return jsonResponse({ access_token: "tok", expires_in: 300 });
        }
        return new Response("nope", { status: 500 });
      },
    );
    expect(res).toEqual({ ok: false, error: "paypal_cancel_failed" });
  });
});

describe("createCheckoutSession", () => {
  it("returns the PayPal approve URL", async () => {
    const fakeFetch: typeof fetch = async (input) => {
      if (String(input).includes("/oauth2/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 300 });
      }
      return jsonResponse({
        id: "I-01new",
        links: [
          { rel: "self", href: "https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-01new" },
          { rel: "approve", href: "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-1" },
        ],
      });
    };
    const res = await createCheckoutSession(
      env,
      {
        userId: "user-1",
        email: "buyer@example.com",
        priceId: "P-monthly",
        successUrl: "https://dropimg.io/pro?checkout=success",
        cancelUrl: "https://dropimg.io/pro",
      },
      fakeFetch,
    );
    expect(res).toEqual({
      ok: true,
      data: {
        id: "I-01new",
        url: "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-1",
      },
    });
  });
});

describe("syncSubscriptionFromPaypal", () => {
  it("accepts only PayPal subscription ids", () => {
    expect(parsePaypalSubscriptionId("I-BW452GLLEP1G")).toBe("I-BW452GLLEP1G");
    expect(parsePaypalSubscriptionId("sub_01")).toBeNull();
    expect(parsePaypalSubscriptionId("")).toBeNull();
  });

  it("refuses a subscription that belongs to someone else", async () => {
    const fakeFetch: typeof fetch = async (input) => {
      if (String(input).includes("/oauth2/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 300 });
      }
      return jsonResponse({
        id: "I-01sync",
        status: "ACTIVE",
        custom_id: "other-user",
      });
    };
    const res = await syncSubscriptionFromPaypal(
      env,
      {} as D1Database,
      { subscriptionId: "I-01sync", expectedUserId: "user-1" },
      fakeFetch,
    );
    expect(res).toEqual({ ok: false, error: "user_mismatch" });
  });
});
