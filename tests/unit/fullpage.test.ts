import { describe, expect, it } from "vitest";
import {
  MAX_FULLPAGE_CANVAS_EDGE,
  MAX_FULLPAGE_CSS_HEIGHT,
  planFullpageCapture,
  shouldHideOverlay,
  tileDrawRect,
} from "../../extension/src/fullpage";

const base = {
  viewportWidth: 800,
  viewportHeight: 600,
  scrollWidth: 800,
  scrollHeight: 1800,
  scrollX: 0,
  scrollY: 120,
  dpr: 1,
};

describe("full-page capture plan", () => {
  it("covers a page taller than the viewport and crops the last tile", () => {
    const planned = planFullpageCapture(base);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.yOffsets[0]).toBe(0);
    expect(planned.plan.yOffsets.at(-1)).toBe(1200);
    expect(planned.plan.yOffsets.length).toBe(3);

    const last = tileDrawRect(
      { yCss: 1200, bitmapWidth: 800, bitmapHeight: 600 },
      planned.plan,
    );
    expect(last).toEqual({
      sx: 0,
      sy: 0,
      sw: 800,
      sh: 600,
      dx: 0,
      dy: 1200,
      dw: 800,
      dh: 600,
    });
  });

  it("rejects pages that would overflow the canvas or tile budget", () => {
    expect(
      planFullpageCapture({ ...base, scrollHeight: MAX_FULLPAGE_CSS_HEIGHT + 1 }).ok,
    ).toBe(false);
    expect(
      planFullpageCapture({
        ...base,
        dpr: 3,
        scrollHeight: Math.floor(MAX_FULLPAGE_CANVAS_EDGE / 2),
      }).ok,
    ).toBe(false);
  });

  it("does not loop forever when height is huge but still under the css cap", () => {
    const planned = planFullpageCapture({
      ...base,
      viewportHeight: 50,
      scrollHeight: 20_000,
    });
    expect(planned.ok).toBe(false);
  });

  it("hides only visible fixed and sticky overlays", () => {
    expect(shouldHideOverlay({ position: "fixed", visibility: "visible", display: "block" })).toBe(
      true,
    );
    expect(shouldHideOverlay({ position: "sticky", visibility: "visible", display: "block" })).toBe(
      true,
    );
    expect(shouldHideOverlay({ position: "relative", visibility: "visible", display: "block" })).toBe(
      false,
    );
    expect(shouldHideOverlay({ position: "fixed", visibility: "hidden", display: "block" })).toBe(
      false,
    );
  });

  it("crops a last tile that hangs past the document height", () => {
    const planned = planFullpageCapture({ ...base, scrollHeight: 1000, dpr: 2 });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const rect = tileDrawRect(
      { yCss: 400, bitmapWidth: 1600, bitmapHeight: 1200 },
      planned.plan,
    );
    expect(rect?.dy).toBe(800);
    expect(rect?.sh).toBe(1200);
    expect(rect?.dh).toBe(1200);
  });
});
