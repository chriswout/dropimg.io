import { expect, test, type Page } from "@playwright/test";
import { asPro, seedOwnedDrops, settle, signIn } from "./fixtures";

/**
 * Temporary Pass 7 instrument. Walks every surface at every reference width in
 * both themes and reports anything that overflows or clips, so the sweep is
 * driven by measurements rather than by eyeballing screenshots.
 */

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440] as const;

const PAGES = [
  "/",
  "/es",
  "/pt-br",
  "/de",
  "/pro",
  "/de/pro",
  "/login",
  "/browser-extension",
  "/image-to-url",
  "/es/imagen-a-url",
  "/pt-br/imagem-para-url",
  "/screenshot-to-link",
  "/es/captura-de-pantalla-a-enlace",
  "/pt-br/colar-print-online",
  "/temporary-image-hosting",
  "/de/temporaeres-bildhosting",
  "/anonymous-image-hosting",
  "/expiring-image-link",
  "/privacy.html",
  "/terms.html",
  "/abuse",
] as const;

type Problem = { page: string; width: number; theme: string; detail: string };

const problems: Problem[] = [];

test.afterAll(() => {
  if (problems.length) {
    console.log(`\n=== ${problems.length} layout problems ===`);
    for (const p of problems) {
      console.log(`${p.width}px ${p.theme} ${p.page}: ${p.detail}`);
    }
  } else {
    console.log("\n=== no layout problems ===");
  }
});

async function prepare(page: Page, theme: string, width: number) {
  await page.addInitScript((value) => {
    localStorage.setItem("dropimg:theme", value as string);
  }, theme);
  await page.emulateMedia({
    colorScheme: theme as "light" | "dark",
    reducedMotion: "reduce",
  });
  await page.setViewportSize({ width, height: 900 });
}

async function inspect(page: Page, label: string, width: number, theme: string) {
  // Vite injects the stylesheet from a module, so measuring before the page
  // settles reports the unstyled layout.
  await settle(page);

  const found = await page.evaluate((vw) => {
    const out: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      out.push(`document scrollWidth ${root.scrollWidth} > ${root.clientWidth}`);
    }
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.opacity === "0") continue;
      // Popovers only matter once they are open.
      if (
        el.closest("details:not([open])")?.contains(el) &&
        !el.matches("summary, summary *")
      ) {
        continue;
      }
      // Deliberately scrollable strips carry their own children off-screen.
      let scroller: HTMLElement | null = el.parentElement;
      let inScroller = false;
      while (scroller && scroller !== document.body) {
        const overflowX = getComputedStyle(scroller).overflowX;
        if (overflowX === "auto" || overflowX === "scroll") {
          inScroller = true;
          break;
        }
        scroller = scroller.parentElement;
      }
      if (inScroller) continue;

      const name = () => {
        const id = el.id ? `#${el.id}` : "";
        const cls =
          el.className && typeof el.className === "string"
            ? `.${el.className.trim().split(/\s+/).join(".")}`
            : "";
        return `${el.tagName.toLowerCase()}${id}${cls}`;
      };

      if (rect.right > vw + 1 || rect.left < -1) {
        out.push(
          `overflow ${name()} [${Math.round(rect.left)}..${Math.round(rect.right)}]`,
        );
      }
      // Text squeezed narrower than its own content. Only text: several
      // controls overflow by design through an inset ::before hit area.
      if (
        el.children.length === 0 &&
        (el.textContent ?? "").trim().length > 0 &&
        el.scrollWidth > el.clientWidth + 2 &&
        cs.overflowX === "visible"
      ) {
        out.push(
          `clipped ${name()} ${el.scrollWidth}>${el.clientWidth}: ` +
            `${(el.textContent ?? "").trim().slice(0, 40)}`,
        );
      }
      // Controls small enough to be awkward to hit. Several deliberately
      // paint smaller than they respond, via an inset ::before, so this only
      // flags what is genuinely tiny.
      if (
        el.matches("button, a.btn, [role='radio'], [role='switch']") &&
        rect.height > 0 &&
        rect.height < 22
      ) {
        out.push(`small target ${name()} ${Math.round(rect.height)}px tall`);
      }
    }
    return Array.from(new Set(out));
  }, width);

  for (const detail of found) {
    problems.push({ page: label, width, theme, detail });
  }
}

test.describe("public pages @sweep", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const width of WIDTHS) {
      test(`${theme} ${width}px`, async ({ page }) => {
        await prepare(page, theme, width);
        for (const path of PAGES) {
          const res = await page.goto(path);
          if (!res?.ok()) {
            problems.push({ page: path, width, theme, detail: `status ${res?.status()}` });
            continue;
          }
          await inspect(page, path, width, theme);
        }
        expect(true).toBe(true);
      });
    }
  }
});

/** The surfaces that actually carry the Pass 5.5 controls. */
test.describe("stateful surfaces @sweep", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [320, 390, 768, 1440] as const) {
      test(`pro uploader ${theme} ${width}px`, async ({ page }) => {
        await prepare(page, theme, width);
        await asPro(page);
        await page.goto("/");
        await page.locator("#pro-password-wrap").waitFor({ state: "visible" });
        await inspect(page, "/ (pro uploader)", width, theme);

        // The password field only exists once Protect is armed.
        const protect = page.locator("#pro-password-toggle");
        if (await protect.count()) {
          await protect.click();
          await inspect(page, "/ (pro uploader, password on)", width, theme);
        }
      });

      test(`my drops ${theme} ${width}px`, async ({ page, request, baseURL }) => {
        await prepare(page, theme, width);
        await signIn(page, request);
        await seedOwnedDrops(page, baseURL!, 2);
        await page.goto("/app");
        await inspect(page, "/app", width, theme);

        for (const path of ["/app/integrations", "/app/billing", "/app/account"]) {
          await page.goto(path);
          await inspect(page, path, width, theme);
        }
      });
    }
  }
});
