import { describe, expect, it } from "vitest";
import { cancelStripeSubscriptionImmediately } from "../../src/lib/billing/stripe";

const env = { STRIPE_SECRET_KEY: "sk_test_abc" };

describe("cancelStripeSubscriptionImmediately", () => {
  it("fails closed when there is no usable key", async () => {
    expect(await cancelStripeSubscriptionImmediately({}, "sub_01test")).toEqual({
      ok: false,
      error: "stripe_unconfigured",
    });
  });

  it("deletes the subscription rather than scheduling the end of the period", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(JSON.stringify({ id: "sub_01test" }), { status: 200 });
    };
    const ok = await cancelStripeSubscriptionImmediately(env, "sub_01test", fakeFetch);
    expect(ok).toEqual({ ok: true });
    expect(calls[0]?.url).toBe("https://api.stripe.com/v1/subscriptions/sub_01test");
    expect(calls[0]?.init.method).toBe("DELETE");
  });

  it("treats an already-gone subscription as cancelled", async () => {
    const res = await cancelStripeSubscriptionImmediately(
      env,
      "sub_01test",
      async () =>
        new Response(JSON.stringify({ error: { code: "resource_missing" } }), {
          status: 404,
        }),
    );
    expect(res).toEqual({ ok: true });
  });

  it("reports a real failure so account deletion stops", async () => {
    const res = await cancelStripeSubscriptionImmediately(
      env,
      "sub_01test",
      async () => new Response("nope", { status: 500 }),
    );
    expect(res).toEqual({ ok: false, error: "stripe_cancel_failed" });
  });
});
