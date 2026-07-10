import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateUiUxAudit } from "../../worker/data/prismUiuxEngine.ts";

describe("PRISM live evidence engine integration", () => {
  it("maps live metadata into accessibility and reliability findings", async () => {
    const audit = await generateUiUxAudit({
      mode: "ACCESSIBILITY_CHECK",
      routes: ["/enter"],
      viewport: "mobile",
      useLiveEvidence: true,
      useFixture: false,
      routeMetadata: [
        {
          route: "/enter",
          accessibilityViolationCount: 2,
          consoleErrorCount: 1,
          failedRequestCount: 1,
          landmarkCount: 0,
          horizontalScrollRequired: true,
          touchTargetMinPx: 40,
        },
      ],
      interactionResults: [{ action: "keyboard_tab_traversal", success: true }],
      screenshotRefs: ["artifacts/uiux/test/screenshots/enter-mobile.png"],
    });

    assert.ok(audit.findings.some((f) => f.category === "accessibility" && f.evidence[0]?.type === "browser"));
    assert.ok(audit.findings.some((f) => f.category === "feedback_states"));
    assert.ok(audit.findings.some((f) => f.category === "performance"));
    assert.equal(audit.request.useLiveEvidence, true);
  });

  it("preserves fixture findings when not using live evidence", async () => {
    const audit = await generateUiUxAudit({
      mode: "AUDIT_ROUTE",
      routes: ["/"],
      viewport: "mobile",
      useFixture: true,
    });
    assert.ok(audit.findings.some((f) => f.route === "/" && f.category === "responsive"));
  });
});
