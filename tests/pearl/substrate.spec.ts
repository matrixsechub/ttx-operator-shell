import { test, expect } from "@playwright/test";

/**
 * Pearl substrate browser proofs. This phase has NO Living Layer motion, so the
 * reduced-motion run proves the static interface is complete AND that no
 * animation is present at all.
 */

const SCRATCH = "/tmp/claude-0/-home-user-ttx-operator-shell/20d0cf26-cc39-5db2-8635-9cbac48cfff6/scratchpad/pearl";

test("desktop: renders, no console errors, no horizontal overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/pearl-preview.html", { waitUntil: "networkidle" });

  await expect(page.getByRole("button", { name: "Start Diagnostic" })).toBeVisible();
  await expect(page.getByText("BEACON", { exact: true })).toBeVisible();
  await expect(page.getByText("AURELIUS", { exact: true })).toBeVisible();
  await expect(page.getByText("HSX", { exact: true })).toBeVisible();
  await expect(page.getByText("GHOST LAYER", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Agent Load" })).toBeVisible();

  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(noOverflow, "no horizontal overflow").toBe(true);
  expect(errors, "no uncaught browser errors").toEqual([]);

  if (test.info().project.name === "desktop") {
    await page.screenshot({ path: `${SCRATCH}/pearl-substrate-desktop.png`, fullPage: true });
  } else {
    await page.screenshot({ path: `${SCRATCH}/pearl-substrate-mobile.png`, fullPage: true });
  }
});

test("theme boundary: pearl scope present; op-* theme not leaked", async ({ page }) => {
  await page.goto("/pearl-preview.html", { waitUntil: "networkidle" });
  await expect(page.locator('[data-theme="pearl"]')).toHaveCount(1);
  // The preview imports only the pearl theme; the op-* accent token must be absent.
  const opAccent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-op-accent").trim(),
  );
  expect(opAccent, "op-* theme is not loaded on the pearl preview").toBe("");
});

test("keyboard: governance action is focusable with a visible focus ring", async ({ page }) => {
  await page.goto("/pearl-preview.html", { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: "Start Diagnostic" });
  await btn.focus();
  await expect(btn).toBeFocused();
  const outline = await btn.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline, "focus-visible outline applied").not.toBe("none");
});

test("reduced-motion: static substrate complete AND zero animations present", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/pearl-preview.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Substrate is fully legible under reduced motion.
  await expect(page.getByRole("button", { name: "Start Diagnostic" })).toBeVisible();
  await expect(page.getByText("GHOST LAYER")).toBeVisible();

  // This phase ships no motion: there must be zero running animations.
  const animCount = await page.evaluate(() => document.getAnimations().length);
  expect(animCount, "no animations present in the substrate phase").toBe(0);

  if (test.info().project.name === "desktop") {
    await page.screenshot({ path: `${SCRATCH}/pearl-substrate-reduced-motion.png`, fullPage: true });
  }
  await ctx.close();
});
