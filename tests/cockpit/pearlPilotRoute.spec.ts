import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * AUTHENTICATED COCKPIT — Pearl pilot route browser evidence (F1-a closure).
 * ---------------------------------------------------------------------------
 * Exercises the REAL built cockpit (operator-shell.html → cockpit-main →
 * cockpitRouter + RequireAuth + AuthProvider) in a living browser. Nothing in
 * production auth/routing/flag logic is modified or bypassed:
 *
 *   - Authentication is represented faithfully by a browser-side fixture — a
 *     well-formed, unexpired bearer token seeded into localStorage (the real
 *     key `msh-operator-token`) plus a stubbed `GET /api/auth/me` response
 *     standing in for the server. The real AuthProvider still rehydrates, the
 *     real RequireAuth still decides allow-vs-redirect from `operator !== null`.
 *   - Unauthenticated = no token / `me` → 401, so RequireAuth really redirects.
 *
 * The served build's flag state (env PEARL_FLAG) selects the expected render:
 *   off → default build → governed "disabled" panel;  on → VITE_PEARL_PILOT=on
 *   build → pilot renders. Auth-boundary + reachability run identically in both.
 */

const FLAG_ON = (process.env.PEARL_FLAG ?? "off").toLowerCase() === "on";

const OPERATOR = { id: "op-e2e", handle: "operator-e2e", role: "operator", access_level: "full" };

/** Well-formed unsigned JWT with a far-future exp — the SPA only decodes exp
 *  client-side (signature is never verified there; the Worker would re-verify a
 *  real request). This faithfully passes the client-side `isTokenExpired` gate. */
function makeToken(): string {
  const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = b64url({ alg: "none", typ: "JWT" });
  const payload = b64url({ sub: OPERATOR.id, exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${header}.${payload}.test-signature`;
}

async function mockAuthApi(page: Page, authenticated: boolean) {
  await page.route("**/api/auth/me", async (route) => {
    if (authenticated) await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ operator: OPERATOR }) });
    else await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
  });
  // Defensive: never let a refresh/logout call reach the network in tests.
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "no refresh in test" }) }));
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
}

async function seedSession(context: BrowserContext) {
  const token = makeToken();
  await context.addInitScript(
    ([tok, ident]) => {
      try {
        localStorage.setItem("msh-operator-token", tok as string);
        localStorage.setItem("msh-operator-identity", ident as string);
      } catch {
        /* storage unavailable — test will surface as an unauth redirect */
      }
    },
    [token, JSON.stringify({ role: OPERATOR.role, access_level: OPERATOR.access_level })],
  );
}

const PILOT_PATH = "/dashboard/pearl-pilot";

async function expectPilotRendered(page: Page) {
  await expect(page.locator('[data-testid="no-target"]')).toHaveCount(3);
  await expect(page.locator("body")).toContainText("PEARL PILOT");
  await expect(page.locator("body")).toContainText("GOVERNED AUTONOMY");
  await expect(page.locator('[data-testid="pilot-disabled"]')).toHaveCount(0);
}

async function expectPilotDisabled(page: Page) {
  await expect(page.locator('[data-testid="pilot-disabled"]')).toHaveCount(1);
  await expect(page.locator("body")).toContainText("Pearl pilot is not enabled");
  await expect(page.locator('[data-testid="no-target"]')).toHaveCount(0);
}

async function expectPilotForFlag(page: Page) {
  if (FLAG_ON) await expectPilotRendered(page);
  else await expectPilotDisabled(page);
}

test.describe(`cockpit pearl-pilot route [flag ${FLAG_ON ? "ON" : "OFF"}]`, () => {
  test("unauthenticated deep-link is denied by RequireAuth (pilot never renders)", async ({ browser }) => {
    // Faithful to the real cockpit SPA: RequireAuth redirects the unauthenticated
    // user off the protected route to "/login"; cockpitRouter has no "/login"
    // route, so its NotFound resolves that to "/" (Navigate to="/"). The security
    // property proven here is the boundary itself — the pilot route is left and
    // NOTHING pilot-related renders for a logged-out user.
    const context = await browser.newContext();
    const page = await context.newPage();
    await mockAuthApi(page, false); // no seeded token + me→401
    await page.goto(PILOT_PATH, { waitUntil: "networkidle" });
    expect(page.url(), "must be redirected off the protected pilot route").not.toContain("pearl-pilot");
    await expect(page).toHaveURL(/localhost:\d+\/(login)?$/); // "/" (via NotFound) or "/login"
    await expect(page.locator('[data-testid="no-target"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="pilot-disabled"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("GOVERNED AUTONOMY");
    await context.close();
  });

  test("authenticated direct URL entry to the pilot route", async ({ browser }) => {
    const context = await browser.newContext();
    await seedSession(context);
    const page = await context.newPage();
    await mockAuthApi(page, true);
    await page.goto(PILOT_PATH, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`${PILOT_PATH}$`));
    await expectPilotForFlag(page);
    await context.close();
  });

  test("authenticated refresh while on the pilot route", async ({ browser }) => {
    const context = await browser.newContext();
    await seedSession(context);
    const page = await context.newPage();
    await mockAuthApi(page, true);
    await page.goto(PILOT_PATH, { waitUntil: "networkidle" });
    await expectPilotForFlag(page);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`${PILOT_PATH}$`));
    await expectPilotForFlag(page);
    await context.close();
  });

  test("authenticated in-app navigation from /dashboard to the pilot route", async ({ browser }) => {
    const context = await browser.newContext();
    await seedSession(context);
    const page = await context.newPage();
    await mockAuthApi(page, true);
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/dashboard$/);
    // Not the pilot yet, and RequireAuth admitted us (no /login redirect).
    await expect(page.locator('[data-testid="no-target"]')).toHaveCount(0);
    // Mark the document so we can prove the next hop is a client-side SPA
    // navigation (same document), not a full reload.
    await page.evaluate(() => ((window as unknown as { __spa?: boolean }).__spa = true));
    await page.evaluate((to) => {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, PILOT_PATH);
    await expect(page).toHaveURL(new RegExp(`${PILOT_PATH}$`));
    expect(await page.evaluate(() => (window as unknown as { __spa?: boolean }).__spa === true)).toBe(true);
    await expectPilotForFlag(page);
    await context.close();
  });

  test("no Pearl leakage into the other shells (ecosystem / auth / council / storefront)", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const shell of ["/ecosystem-shell.html", "/auth-shell.html", "/council-shell.html", "/app/index.html"]) {
      const resp = await page.goto(shell, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), `${shell} should be served`).toBeLessThan(400);
      const html = await page.content();
      expect(html, `${shell} must not reference the pilot chunk`).not.toMatch(/PearlPilotRoute-[\w-]+\.js/);
      await expect(page.locator('[data-testid="no-target"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="pilot-disabled"]')).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("GOVERNED AUTONOMY");
    }
    await context.close();
  });
});
