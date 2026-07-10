import type { PrismFixtureDriftClassification } from "./types.ts";
import type { PrismStagingGovernance } from "./types.ts";
import { evidenceHash } from "../hash.ts";

export function buildStagingGovernance(input: {
  runId: string;
  captureId: string;
  canonicalOrigin: string;
  routeScope: "public" | "operator" | "mixed";
  publicRoutes: string[];
  authenticatedRoutes: string[];
  submittedAuditId?: string;
  fixtureDriftStatus: PrismFixtureDriftClassification;
}): PrismStagingGovernance {
  const envelope: Omit<PrismStagingGovernance, "evidenceHash" | "timestamp"> = {
    runId: input.runId,
    captureId: input.captureId,
    actorType: process.env.CI ? "ci" : "local",
    targetOriginClass: "staging",
    canonicalOrigin: input.canonicalOrigin,
    environment: "staging",
    routeScope: input.routeScope,
    authenticatedRoutes: input.authenticatedRoutes,
    publicRoutes: input.publicRoutes,
    productionDenied: true,
    arbitraryOriginDenied: true,
    artifactRetentionClass: "staging_review",
    advisoryOnly: true,
    mutationAuthorized: false,
    approvalRequired: true,
    submittedAuditId: input.submittedAuditId,
    fixtureDriftStatus: input.fixtureDriftStatus,
  };

  return {
    ...envelope,
    evidenceHash: evidenceHash(envelope),
    timestamp: new Date().toISOString(),
  };
}

export function assertGovernanceInvariants(governance: PrismStagingGovernance): void {
  if (governance.mutationAuthorized !== false) {
    throw new Error("Staging governance mutationAuthorized must be false");
  }
  if (governance.advisoryOnly !== true) {
    throw new Error("Staging governance advisoryOnly must be true");
  }
  if (governance.productionDenied !== true) {
    throw new Error("Staging governance productionDenied must be true");
  }
}
