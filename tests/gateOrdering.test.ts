// Ordering contract for the worker's API gate chain.
//
// worker/index.ts is a linear dispatcher, and its ORDER is the security model:
// a handler placed before the gates is unauthenticated by construction. That is
// exactly how F1 happened (docs/security/AUTH-SESSION-REVIEW.md). Nothing
// asserted that ordering end to end, so this suite does.
//
// These are source-structure assertions on purpose: they fail when someone moves
// or adds a call site, which is the moment the decision is being made.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { classifyRoute } from "../worker/edge/routeClass.ts";
import { isPublicApiRoute } from "../worker/apiAuth.ts";

const indexSource = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");

/** Index of a call site inside the request handler, asserted to exist exactly once. */
function callSite(name: string): number {
  const pattern = new RegExp(`(?:await )?${name}\\(`, "g");
  const hits = [...indexSource.matchAll(pattern)].map((m) => m.index ?? -1);
  assert.ok(hits.length > 0, `${name} is not called in worker/index.ts`);
  return hits[0];
}

describe("API gate ordering (worker/index.ts)", () => {
  it("runs the three gates in order: edge gate, canonical auth, cockpit session", () => {
    const edge = callSite("edgeAuthGate");
    const canonical = callSite("enforceOperatorApiAuth");
    const cockpit = callSite("enforceCockpitSession");
    assert.ok(edge < canonical, "edgeAuthGate must run before enforceOperatorApiAuth");
    assert.ok(canonical < cockpit, "enforceOperatorApiAuth must run before enforceCockpitSession");
  });

  it("proxies to the Engine only after every gate", () => {
    const proxy = indexSource.indexOf("await proxyToEngine(");
    assert.ok(proxy > 0, "proxyToEngine call site not found");
    for (const gate of ["edgeAuthGate", "enforceOperatorApiAuth", "enforceCockpitSession"]) {
      assert.ok(callSite(gate) < proxy, `${gate} must run before proxyToEngine`);
    }
  });

  it("only an explicit allowlist of handlers runs before the gates", () => {
    // Anything in this list answers /api/* WITHOUT passing canonical auth.
    // Adding an entry is a security decision: it must be justified here and,
    // if it can act on operator data, gated inside its own handler.
    const ALLOWED_PRE_GATE = [
      "blockAutonomousInBeta", // fail-closed 403 in OPERATOR_BETA; never grants access
      "handleAuditLiteRoute", // public audit-lite funnel, allowlisted in isPublicApiRoute
      "handleRecoveredFunnelApi", // public engagement intake
      "handleOperatorAuth", // credentialed bootstrap: verifies OPERATOR_PASSWORD itself
      "handleHsxEdgeRoute", // /api/hsx/session bootstrap, ctx-bound token
      "handleMarketplaceEdgeRoute", // /api/marketplace/session bootstrap, ctx-bound token
    ];
    const edge = callSite("edgeAuthGate");
    const preGate = indexSource.slice(0, edge);
    const called = [...preGate.matchAll(/(?:await )?(handle[A-Z]\w+|enforce[A-Z]\w+|block[A-Z]\w+)\(/g)]
      .map((m) => m[1])
      .filter((name) => name !== "handleFetch");
    const unexpected = [...new Set(called)].filter((name) => !ALLOWED_PRE_GATE.includes(name));
    assert.deepEqual(
      unexpected,
      [],
      `handler(s) run before the API gates without review: ${unexpected.join(", ")}. ` +
        "Either move the call after enforceOperatorApiAuth or justify it in ALLOWED_PRE_GATE.",
    );
  });

  it("F1 regression: no credential-less token minting survives before the gates", () => {
    assert.doesNotMatch(indexSource, /handleOperatorSession/);
  });
});

describe("route classification invariants", () => {
  // Representative path per OPERATOR_PROTECTED pattern in worker/edge/routeClass.ts.
  const OPERATOR_PATHS: Array<[string, string]> = [
    ["/api/operator/ai-agent-builds", "GET"],
    ["/api/operator/session", "POST"],
    ["/api/wildcard", "GET"],
    ["/api/wildcard/scan", "POST"],
    ["/api/debug/state", "GET"],
    ["/api/audit/trail", "GET"],
    ["/api/lifecycle/advance/run", "POST"],
    ["/api/marketplace/audit", "GET"],
    ["/api/fedgrade/health", "GET"],
    ["/api/governance/propose", "POST"],
    ["/api/governance/approve", "POST"],
    ["/api/engagements/anything", "GET"],
  ];

  it("every operator-class path classifies as operator", () => {
    for (const [path, method] of OPERATOR_PATHS) {
      assert.equal(classifyRoute(path, method), "operator", `${method} ${path}`);
    }
  });

  it("no operator-class path is in the public API allowlist", () => {
    // A path that is both operator-class and allowlisted would skip canonical
    // auth entirely, re-opening the F1 class of bypass.
    for (const [path, method] of OPERATOR_PATHS) {
      assert.equal(isPublicApiRoute(path, method), false, `${method} ${path} must not be public-allowlisted`);
    }
  });

  it("marketplace-class paths stay marketplace-class (ctx binding is their gate)", () => {
    assert.equal(classifyRoute("/api/marketplace/integrity", "GET"), "marketplace");
    assert.equal(classifyRoute("/api/hsx", "POST"), "marketplace");
  });
});
