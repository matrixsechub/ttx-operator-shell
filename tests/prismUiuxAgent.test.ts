import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildScorecard,
  computeEvidenceHash,
  deriveReleaseRecommendation,
  generateUiUxAudit,
  PrismUiuxValidationError,
  validateUiUxAuditRequest,
} from "../worker/data/prismUiuxEngine.ts";
import type { UiUxFinding } from "../worker/data/prismUiuxTypes.ts";

describe("PRISM UI/UX engine", () => {
  it("produces deterministic scores for fixture-backed homepage mobile audit", async () => {
    const request = {
      mode: "AUDIT_ROUTE" as const,
      routes: ["/"],
      viewport: "mobile" as const,
      useFixture: true,
    };
    const audit1 = await generateUiUxAudit(request, "fixed-audit-id-1");
    const audit2 = await generateUiUxAudit(request, "fixed-audit-id-1");

    assert.equal(audit1.scorecard.overall, audit2.scorecard.overall);
    assert.equal(audit1.findings.length, audit2.findings.length);
    assert.equal(audit1.findings[0]?.id, audit2.findings[0]?.id);
    assert.equal(audit1.releaseRecommendation, audit2.releaseRecommendation);
  });

  it("includes cramped mobile navigation finding for homepage fixture", async () => {
    const audit = await generateUiUxAudit({
      mode: "AUDIT_ROUTE",
      routes: ["/"],
      viewport: "mobile",
      useFixture: true,
    });
    const cramped = audit.findings.find((f) => f.route === "/" && f.category === "responsive");
    assert.ok(cramped);
    assert.match(cramped.userImpact, /tap|touch/i);
  });

  it("maps critical findings to BLOCK_RELEASE", () => {
    const scorecard = buildScorecard({
      usability: 90,
      accessibility: 90,
      responsive: 90,
      visualHierarchy: 90,
      designSystem: 90,
      conversion: 90,
      feedbackStates: 90,
      performance: 90,
    });
    const findings: UiUxFinding[] = [
      {
        id: "f1",
        auditId: "a1",
        viewport: "mobile",
        category: "accessibility",
        severity: "critical",
        evidence: [],
        userImpact: "x",
        recommendation: "y",
        acceptanceCriteria: [],
        confidence: 1,
        status: "open",
      },
    ];
    assert.equal(deriveReleaseRecommendation(scorecard, findings), "BLOCK_RELEASE");
  });

  it("rejects unknown modes and malformed routes", () => {
    assert.throws(
      () => validateUiUxAuditRequest({ mode: "INVALID", viewport: "mobile" }),
      (err: unknown) => err instanceof PrismUiuxValidationError && err.status === 400,
    );
    assert.throws(
      () => validateUiUxAuditRequest({ mode: "AUDIT_ROUTE", viewport: "mobile", routes: ["https://evil.com"] }),
      /Invalid route/,
    );
    assert.throws(
      () => validateUiUxAuditRequest({ mode: "AUDIT_ROUTE", viewport: "mobile", executableCode: "alert(1)" }),
      /not allowed/,
    );
  });

  it("produces stable evidence hash for identical input", async () => {
    const request = {
      mode: "CONVERSION_REVIEW" as const,
      routes: ["/enter", "/register"],
      viewport: "mobile" as const,
      useFixture: true,
    };
    const hash1 = await computeEvidenceHash(request);
    const hash2 = await computeEvidenceHash(request);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  it("does not include ai enrichment fields in deterministic output", async () => {
    const audit = await generateUiUxAudit({
      mode: "AUDIT_ROUTE",
      routes: ["/services"],
      viewport: "desktop",
      useFixture: true,
    });
    assert.equal(audit.ai_enrichment, undefined);
    assert.equal(audit.ai_model, undefined);
    assert.equal(audit.advisoryOnly, true);
  });

  it("generates patch proposals in PATCH_PROPOSAL mode", async () => {
    const audit = await generateUiUxAudit({
      mode: "PATCH_PROPOSAL",
      routes: ["/enter"],
      viewport: "mobile",
      useFixture: true,
    });
    assert.ok(audit.patchProposals && audit.patchProposals.length > 0);
    assert.equal(audit.patchProposals[0]?.requiresOperatorApproval, true);
    assert.equal(audit.patchProposals[0]?.advisoryOnly, true);
  });
});
