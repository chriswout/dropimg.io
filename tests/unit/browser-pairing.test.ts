import { describe, expect, it } from "vitest";
import { safeNextPath } from "../../src/lib/auth/next-path";
import {
  PAIRING_HANDOFF_TTL_SECONDS,
  PAIRING_PENDING_TTL_SECONDS,
  extensionPairingLabel,
  pairingPublicStatus,
} from "../../src/lib/browser-pairing";

describe("browser pairing helpers", () => {
  it("uses a 2-minute pending window and a 60-second credential handoff", () => {
    expect(PAIRING_PENDING_TTL_SECONDS).toBe(120);
    expect(PAIRING_HANDOFF_TTL_SECONDS).toBe(60);
  });

  it("allows only the pairing approval path as a login next", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(safeNextPath(`/connect/browser/${id}`)).toBe(`/connect/browser/${id}`);
    expect(safeNextPath("/connect/browser/not-a-uuid")).toBeNull();
    expect(safeNextPath("/connect/browser/../../admin")).toBeNull();
    expect(safeNextPath("/app/integrations")).toBeNull();
    expect(safeNextPath("/oauth/authorize?client_id=x")).toContain("/oauth/authorize");
  });

  it("labels Chrome on macOS from a desktop UA", () => {
    expect(
      extensionPairingLabel(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129.0.0.0",
        "chrome-extension",
      ),
    ).toBe("Chrome on macOS");
    expect(
      extensionPairingLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/129.0.0.0",
        "edge-extension",
      ),
    ).toBe("Edge on Windows");
  });

  it("maps pairing rows to public statuses", () => {
    const now = 1_000_000;
    const base = {
      expires_at: now + 60,
      cancelled_at: null,
      consumed_at: null,
      approved_at: null,
    };
    expect(pairingPublicStatus(base, now)).toBe("pending");
    expect(pairingPublicStatus({ ...base, approved_at: now }, now)).toBe("approved");
    expect(pairingPublicStatus({ ...base, consumed_at: now }, now)).toBe("consumed");
    expect(pairingPublicStatus({ ...base, cancelled_at: now }, now)).toBe("cancelled");
    expect(pairingPublicStatus({ ...base, expires_at: now - 1 }, now)).toBe("expired");
    expect(
      pairingPublicStatus({ ...base, approved_at: now - 10, expires_at: now - 1 }, now),
    ).toBe("expired");
    expect(
      pairingPublicStatus(
        { ...base, approved_at: now - 10, consumed_at: now - 5, expires_at: now - 1 },
        now,
      ),
    ).toBe("consumed");
  });
});
