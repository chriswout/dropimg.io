import { describe, expect, it } from "vitest";
import {
  FREE_PROGRAMMATIC_DAILY_BYTES,
  FREE_PROGRAMMATIC_DAILY_UPLOADS,
  isProgrammaticSource,
  overProgrammaticDailyQuota,
  programmaticDailyLimits,
  programmaticQuotaMessage,
} from "../../src/lib/programmatic-quota";

function dbReturning(row: { cnt: number; bytes: number }): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return {
            async first() {
              return row;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

describe("programmatic quota", () => {
  it("treats only api and mcp as programmatic", () => {
    expect(isProgrammaticSource("api")).toBe(true);
    expect(isProgrammaticSource("mcp")).toBe(true);
    expect(isProgrammaticSource("web")).toBe(false);
    expect(isProgrammaticSource("sharex")).toBe(false);
    expect(isProgrammaticSource("chrome-extension")).toBe(false);
  });

  it("uses 20/50 MB for Free and 100/500 MB for Pro", () => {
    expect(programmaticDailyLimits("free")).toEqual({
      uploads: FREE_PROGRAMMATIC_DAILY_UPLOADS,
      bytes: FREE_PROGRAMMATIC_DAILY_BYTES,
    });
    expect(programmaticDailyLimits("anonymous")).toEqual({
      uploads: 20,
      bytes: 50 * 1024 * 1024,
    });
    expect(programmaticDailyLimits("pro")).toEqual({
      uploads: 100,
      bytes: 500 * 1024 * 1024,
    });
  });

  it("asks Free users to upgrade", () => {
    expect(programmaticQuotaMessage("free")).toContain("Upgrade to Pro");
    expect(programmaticQuotaMessage("pro")).toContain("100/day");
  });

  it("blocks Free at 20 uploads or 50 MB", async () => {
    expect(
      await overProgrammaticDailyQuota(dbReturning({ cnt: 20, bytes: 100 }), {
        userId: "u1",
        plan: "free",
      }),
    ).toBe(true);
    expect(
      await overProgrammaticDailyQuota(
        dbReturning({ cnt: 1, bytes: 50 * 1024 * 1024 }),
        { userId: "u1", plan: "free" },
      ),
    ).toBe(true);
    expect(
      await overProgrammaticDailyQuota(dbReturning({ cnt: 19, bytes: 1000 }), {
        userId: "u1",
        plan: "free",
      }),
    ).toBe(false);
  });

  it("lets Pro through 20 uploads", async () => {
    expect(
      await overProgrammaticDailyQuota(dbReturning({ cnt: 20, bytes: 100 }), {
        userId: "u1",
        plan: "pro",
      }),
    ).toBe(false);
    expect(
      await overProgrammaticDailyQuota(dbReturning({ cnt: 100, bytes: 100 }), {
        userId: "u1",
        plan: "pro",
      }),
    ).toBe(true);
  });
});
