import { describe, expect, it } from "vitest";
import { cancelPaddleSubscriptionImmediately } from "../../src/lib/billing/paddle";

describe("cancelPaddleSubscriptionImmediately", () => {
  it("POSTs effective_from=immediately and fails closed without a key", async () => {
    const missing = await cancelPaddleSubscriptionImmediately(
      { PADDLE_ENV: "sandbox" },
      "sub_01test",
    );
    expect(missing).toEqual({ ok: false, error: "paddle_unconfigured" });

    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response("{}", { status: 200 });
    };
    const ok = await cancelPaddleSubscriptionImmediately(
      { PADDLE_ENV: "sandbox", PADDLE_API_KEY: "pdl_sdbx_test" },
      "sub_01test",
      fakeFetch,
    );
    expect(ok).toEqual({ ok: true });
    expect(calls[0]?.url).toBe(
      "https://sandbox-api.paddle.com/subscriptions/sub_01test/cancel",
    );
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(
      JSON.stringify({ effective_from: "immediately" }),
    );

    const failed = await cancelPaddleSubscriptionImmediately(
      { PADDLE_ENV: "sandbox", PADDLE_API_KEY: "pdl_sdbx_test" },
      "sub_01test",
      async () => new Response("nope", { status: 422 }),
    );
    expect(failed).toEqual({ ok: false, error: "paddle_cancel_failed" });
  });
});
