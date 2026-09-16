import { describe, expect, it } from "vitest";
import { allowCtaReason, SENSITIVE_ANALYTICS_KEYS } from "../../src/lib/analytics";
import { mediaEnabled } from "../../src/lib/media-config";

describe("Web Assets funnel events (KON-81)", () => {
  it("allowlists CTA reasons without accepting tokens or paths", () => {
    expect(allowCtaReason("developer")).toBe("developer");
    expect(allowCtaReason("cursor")).toBe("cursor");
    expect(allowCtaReason("dropimg_pk_secret")).toBe("");
    expect(allowCtaReason("/m/acme/secret/path")).toBe("");
    expect(allowCtaReason("https://dropimg.io/m/x")).toBe("");
  });

  it("does not record secrets as analytics dimensions", () => {
    expect(SENSITIVE_ANALYTICS_KEYS).toEqual(
      expect.arrayContaining(["token", "password", "path", "alias", "key"]),
    );
  });

  it("keeps production Media off in the default helper", () => {
    expect(mediaEnabled({})).toBe(false);
    expect(mediaEnabled({ MEDIA_ENABLED: "false" })).toBe(false);
    expect(mediaEnabled({ MEDIA_ENABLED: "true" })).toBe(true);
  });
});
