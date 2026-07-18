import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { sanitizeTelemetry } from "../../worker/flywheel/telemetry.ts";
import { handleFlywheelRoute } from "../../worker/flywheel/routes.ts";

describe("Flywheel telemetry and cockpit contracts", () => {
  it("redacts nested credentials, prompts, and bearer tokens", () => {
    const value = sanitizeTelemetry({ token: "secret", nested: { clientContent: "private", safe: "Bearer abc.def" }, prompt: "raw" }) as Record<string, unknown>;
    assert.equal(value.token, "[REDACTED]");
    assert.deepEqual(value.nested, { clientContent: "[REDACTED]", safe: "Bearer [REDACTED]" });
    assert.equal(value.prompt, "[REDACTED]");
  });
  it("wires the protected route, cancelable polling, duplicate guard, and accessible status surfaces", async () => {
    const [router, page] = await Promise.all([readFile(new URL("../../src/routes/router.tsx", import.meta.url), "utf8"), readFile(new URL("../../src/pages/dashboard/FlywheelDashboard.tsx", import.meta.url), "utf8")]);
    assert.match(router, /dashboard\/flywheel/);
    assert.match(page, /AbortController/);
    assert.match(page, /5_000/);
    assert.match(page, /disabled=\{busy\}/);
    assert.match(page, /role="alert"/);
    assert.match(page, /aria-labelledby="flywheel-title"/);
  });
  it("returns the typed error envelope for an unauthenticated protected route", async () => {
    const response = await handleFlywheelRoute(new Request("https://example.com/api/flywheel"), "/api/flywheel", { FLYWHEEL_TENANT_ID: "tenant-1" } as never);
    assert.ok(response); assert.equal(response.status, 401);
    const value = await response.json() as { ok: boolean; error: { code: string }; meta: { traceId: string; version: string } };
    assert.equal(value.ok, false); assert.equal(value.error.code, "OPERATOR_AUTH_REQUIRED"); assert.equal(value.meta.version, "1.0"); assert.ok(value.meta.traceId);
  });
});
