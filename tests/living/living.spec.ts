import { test, expect, type Page } from "@playwright/test";

/**
 * Pearl Living Layer browser proofs. Normal mode must show bounded ambient
 * motion over the real substrate primitives; reduced motion must be provably
 * inert (zero animations, zero engines, content intact). Amplitude bounds
 * (tilt ≤ 2°) are read from the runtime-driven CSS custom properties.
 */

const SCRATCH = "/tmp/claude-0/-home-user-ttx-operator-shell/20d0cf26-cc39-5db2-8635-9cbac48cfff6/scratchpad/pearl";

interface Snap {
  livingState: string;
  enginesActive: number;
  frameLoops: number;
  timers: number;
  motes: number;
  decorativeNodes: number;
}
async function snapshot(page: Page): Promise<Snap> {
  return page.evaluate(() => (window as unknown as { __pearlLiving: { getSnapshot(): Snap } }).__pearlLiving.getSnapshot());
}

test("normal: substrate renders with bounded ambient motion, no errors, no overflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/pearl-living-preview.html", { waitUntil: "networkidle" });

  // All substrate content present.
  await expect(page.getByRole("button", { name: "Start Diagnostic" })).toBeVisible();
  for (const name of ["BEACON", "AURELIUS", "HSX", "GHOST LAYER"]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Agent Load" })).toBeVisible();

  // Ambient motion is live (this is the "breath").
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);

  const snap = await snapshot(page);
  expect(snap.livingState).toBe("active");
  expect(snap.enginesActive).toBeGreaterThanOrEqual(1); // motes always; +halo on fine pointers
  expect(snap.frameLoops).toBeLessThanOrEqual(1); // one shared rAF coordinator
  expect(snap.motes).toBeLessThanOrEqual(16); // hard cap

  // No horizontal overflow.
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(noOverflow, "no horizontal overflow").toBe(true);
  expect(errors, "no uncaught browser errors").toEqual([]);

  const path = testInfo.project.name === "desktop"
    ? `${SCRATCH}/pearl-living-desktop.png`
    : `${SCRATCH}/pearl-living-mobile.png`;
  await page.screenshot({ path, fullPage: true });
});

test("desktop only: pointer parallax stays within ±2° tilt", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "parallax is disabled on coarse pointers");
  await page.goto("/pearl-living-preview.html", { waitUntil: "networkidle" });
  const panel = page.locator(".pearl-living-panel").first();
  const box = await panel.boundingBox();
  if (!box) throw new Error("panel not found");

  // Sweep the pointer across the panel corners.
  for (const [fx, fy] of [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9], [0.5, 0.5]]) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(40);
  }

  const tilt = await panel.evaluate((el) => {
    const s = getComputedStyle(el);
    const parse = (v: string) => Math.abs(parseFloat(v.replace("deg", "")) || 0);
    return { x: parse(s.getPropertyValue("--tilt-x")), y: parse(s.getPropertyValue("--tilt-y")) };
  });
  expect(tilt.x).toBeLessThanOrEqual(2.001);
  expect(tilt.y).toBeLessThanOrEqual(2.001);
});

test("keyboard: governance action is focusable with a visible focus ring", async ({ page }) => {
  await page.goto("/pearl-living-preview.html", { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: "Start Diagnostic" });
  await btn.focus();
  await expect(btn).toBeFocused();
  const outline = await btn.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline, "focus-visible outline applied").not.toBe("none");
});

test("theme boundary: pearl scope present; op-* theme not leaked", async ({ page }) => {
  await page.goto("/pearl-living-preview.html", { waitUntil: "networkidle" });
  await expect(page.locator('[data-theme="pearl"]')).toHaveCount(1);
  const opAccent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-op-accent").trim(),
  );
  expect(opAccent, "op-* theme is not loaded on the pearl preview").toBe("");
});

test("reduced motion: Living Layer is provably inert; pointer wakes nothing; content intact", async ({ browser }, testInfo) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/pearl-living-preview.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Substrate fully present.
  await expect(page.getByRole("button", { name: "Start Diagnostic" })).toBeVisible();
  await expect(page.getByText("GHOST LAYER", { exact: true })).toBeVisible();

  // No gate, no motion, no engines.
  await expect(page.locator('[data-living="on"]')).toHaveCount(0);
  const before = await snapshot(page);
  expect(before.livingState).toBe("reduced");
  expect(before.enginesActive).toBe(0);
  expect(before.frameLoops).toBe(0);
  expect(before.timers).toBe(0);
  expect(before.motes).toBe(0);
  expect(before.decorativeNodes).toBe(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

  // Pointer movement must wake nothing.
  await page.mouse.move(400, 300);
  await page.mouse.move(700, 500);
  await page.waitForTimeout(200);
  const after = await snapshot(page);
  expect(after.enginesActive).toBe(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

  if (testInfo.project.name === "desktop") {
    await page.screenshot({ path: `${SCRATCH}/pearl-living-reduced-motion.png`, fullPage: true });
  }
  await ctx.close();
});
