import { describe, expect, it } from "vitest";
import {
  allowInterval,
  allowPlan,
  ANALYTICS_INTERVALS,
  ANALYTICS_PLANS,
  SENSITIVE_ANALYTICS_KEYS,
  track,
  type AnalyticsEvent,
} from "../../src/lib/analytics";
import { normalizePageIntent, PAGE_INTENTS } from "../../src/lib/page-intent";
import {
  isKnownUploadClient,
  normalizeUploadClient,
} from "../../src/lib/upload-client";

const FUNNEL_EVENTS: AnalyticsEvent[] = [
  "home_view",
  "landing_view",
  "upload_start",
  "upload_ok",
  "upload_fail",
  "auth_requested",
  "auth_completed",
  "pro_page_view",
  "pro_cta_click",
  "checkout_started",
  "checkout_completed_client",
  "pro_activated",
  "pro_canceled",
  "dashboard_open",
  "dashboard_copy",
  "dashboard_delete",
  "integration_token_created",
  "integration_token_revoked",
  "integration_connected_extension",
  "integration_upload_ok",
  "password_protection_used",
  "unlock_ok",
  "unlock_fail",
];

describe("normalizeUploadClient", () => {
  it("defaults empty to web", () => {
    expect(normalizeUploadClient(undefined)).toBe("web");
    expect(normalizeUploadClient("")).toBe("web");
  });

  it("allowlists known clients", () => {
    expect(normalizeUploadClient("sharex")).toBe("sharex");
    expect(normalizeUploadClient("Chrome-Extension")).toBe("chrome-extension");
    expect(isKnownUploadClient("edge-extension")).toBe(true);
  });

  it("maps unknown to other", () => {
    expect(normalizeUploadClient("evil-bot")).toBe("other");
    expect(normalizeUploadClient("https://evil.example")).toBe("other");
  });
});

describe("normalizePageIntent", () => {
  it("accepts only allowlisted IDs", () => {
    for (const id of PAGE_INTENTS) {
      expect(normalizePageIntent(id)).toBe(id);
    }
    expect(normalizePageIntent("HOME")).toBe("home");
  });

  it("rejects URLs and free-form values", () => {
    expect(normalizePageIntent("https://dropimg.io/foo")).toBe("");
    expect(normalizePageIntent("/temporary-image-hosting")).toBe("");
    expect(normalizePageIntent("custom-campaign")).toBe("");
    expect(normalizePageIntent(undefined)).toBe("");
  });

  it("includes the Pro page intent", () => {
    expect(PAGE_INTENTS).toContain("pro");
    expect(normalizePageIntent("pro")).toBe("pro");
  });
});

describe("analytics allowlist", () => {
  it("covers the V2 funnel events", () => {
    for (const event of FUNNEL_EVENTS) {
      expect(event).toMatch(/^[a-z_]+$/);
    }
    expect(ANALYTICS_PLANS).toEqual(["anonymous", "free", "pro"]);
    expect(ANALYTICS_INTERVALS).toEqual(["monthly", "annual"]);
  });

  it("drops unknown plan and interval values", () => {
    expect(allowPlan("pro")).toBe("pro");
    expect(allowPlan("enterprise")).toBe("");
    expect(allowPlan("user_abc")).toBe("");
    expect(allowInterval("annual")).toBe("annual");
    expect(allowInterval("lifetime")).toBe("");
  });

  it("forbids sensitive dimension names", () => {
    expect(SENSITIVE_ANALYTICS_KEYS).toEqual(
      expect.arrayContaining([
        "email",
        "user_id",
        "token",
        "token_id",
        "password",
        "label",
        "ip",
      ]),
    );
  });

  it("writes only low-cardinality blobs", () => {
    const writes: Array<{ indexes: string[]; blobs: string[]; doubles: number[] }> =
      [];
    track(
      {
        writeDataPoint(point) {
          writes.push({
            indexes: point.indexes as string[],
            blobs: point.blobs as string[],
            doubles: point.doubles as number[],
          });
        },
      } as AnalyticsEngineDataset,
      "pro_cta_click",
      {
        plan: "free",
        interval: "annual",
        client: "web",
        pageIntent: "pro",
        slug: "should-be-optional",
      },
    );
    expect(writes).toHaveLength(1);
    const blobs = writes[0]!.blobs;
    expect(blobs).toHaveLength(7);
    expect(blobs).toContain("free");
    expect(blobs).toContain("annual");
    expect(blobs).toContain("web");
    expect(blobs).toContain("pro");
    expect(blobs.join(" ")).not.toMatch(/@/);
    expect(blobs.join(" ")).not.toMatch(/dropimg_it_/);
  });
});
