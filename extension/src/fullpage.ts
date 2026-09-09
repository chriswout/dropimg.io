/** Full-page capture planning. Pure so unit tests can cover limits and crops. */

export const FULLPAGE_SETTLE_MS = 180;
export const MAX_FULLPAGE_TILES = 24;
export const MAX_FULLPAGE_CANVAS_EDGE = 16384;
export const MAX_FULLPAGE_CSS_HEIGHT = 20_000;

export type FullpageMeasure = {
  viewportWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  scrollX: number;
  scrollY: number;
  dpr: number;
};

export type FullpagePlan = {
  widthCss: number;
  heightCss: number;
  dpr: number;
  viewportHeightCss: number;
  yOffsets: number[];
};

export type TileDrawRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
};

export function planFullpageCapture(
  measure: FullpageMeasure,
): { ok: true; plan: FullpagePlan } | { ok: false; code: "full_page_too_large" } {
  const dpr = Number.isFinite(measure.dpr) && measure.dpr > 0 ? measure.dpr : 1;
  const viewportHeightCss = Math.max(1, Math.floor(measure.viewportHeight));
  const widthCss = Math.max(1, Math.floor(measure.viewportWidth));
  const heightCss = Math.max(viewportHeightCss, Math.floor(measure.scrollHeight));

  if (heightCss > MAX_FULLPAGE_CSS_HEIGHT) {
    return { ok: false, code: "full_page_too_large" };
  }
  if (widthCss * dpr > MAX_FULLPAGE_CANVAS_EDGE || heightCss * dpr > MAX_FULLPAGE_CANVAS_EDGE) {
    return { ok: false, code: "full_page_too_large" };
  }

  const yOffsets: number[] = [];
  if (heightCss <= viewportHeightCss) {
    yOffsets.push(0);
  } else {
    let y = 0;
    while (y + viewportHeightCss < heightCss) {
      yOffsets.push(y);
      y += viewportHeightCss;
      if (yOffsets.length >= MAX_FULLPAGE_TILES) {
        return { ok: false, code: "full_page_too_large" };
      }
    }
    const last = heightCss - viewportHeightCss;
    if (yOffsets[yOffsets.length - 1] !== last) yOffsets.push(last);
    if (yOffsets.length > MAX_FULLPAGE_TILES) {
      return { ok: false, code: "full_page_too_large" };
    }
  }

  return {
    ok: true,
    plan: { widthCss, heightCss, dpr, viewportHeightCss, yOffsets },
  };
}

/**
 * Where one captured viewport tile is painted on the stitched canvas.
 * The last tile is cropped so pixels past the document height are dropped.
 */
export function tileDrawRect(
  tile: { yCss: number; bitmapWidth: number; bitmapHeight: number },
  plan: FullpagePlan,
): TileDrawRect | null {
  const destW = Math.max(1, Math.round(plan.widthCss * plan.dpr));
  const destH = Math.max(1, Math.round(plan.heightCss * plan.dpr));
  const dy = Math.round(tile.yCss * plan.dpr);
  if (dy >= destH) return null;

  const remaining = destH - dy;
  const sh = Math.min(tile.bitmapHeight, remaining);
  const sw = Math.min(tile.bitmapWidth, destW);
  if (sw < 1 || sh < 1) return null;

  return { sx: 0, sy: 0, sw, sh, dx: 0, dy, dw: sw, dh: sh };
}

export function shouldHideOverlay(style: {
  position: string;
  visibility: string;
  display: string;
}): boolean {
  if (style.display === "none" || style.visibility === "hidden") return false;
  return style.position === "fixed" || style.position === "sticky";
}
