import { TargetPolicyError } from "../targetPolicy.ts";
import type { ApprovedTarget } from "../targetPolicy.ts";

const DEFAULT_STAGING_ORIGIN = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";
const DEFAULT_PRODUCTION_ORIGIN = "https://ttx-operator-shell.sogellagepul.workers.dev";

export type StagingTarget = ApprovedTarget & {
  canonicalOrigin: string;
  hostname: string;
};

export function canonicalizeOrigin(raw: string): string {
  if (raw.includes("#")) {
    throw new TargetPolicyError("URL fragments are not permitted");
  }
  if (raw.includes("@")) {
    throw new TargetPolicyError("Credential-bearing URLs are not permitted");
  }
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TargetPolicyError(`Unsupported protocol: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new TargetPolicyError("Credential-bearing URLs are not permitted");
  }
  return `${url.protocol}//${url.host}`;
}

export function resolveStagingTarget(rawOrigin?: string): StagingTarget {
  const configured = canonicalizeOrigin(process.env.PRISM_STAGING_ORIGIN ?? DEFAULT_STAGING_ORIGIN);
  const supplied = canonicalizeOrigin(rawOrigin ?? configured);
  const productionOrigin = canonicalizeOrigin(process.env.PRISM_PRODUCTION_ORIGIN ?? DEFAULT_PRODUCTION_ORIGIN);

  if (supplied === productionOrigin) {
    throw new TargetPolicyError("Production origin denied for staging validation");
  }

  const url = new URL(supplied);
  if (url.protocol !== "https:") {
    throw new TargetPolicyError("Staging targets must use HTTPS");
  }

  if (supplied !== configured) {
    throw new TargetPolicyError(
      `Staging origin mismatch: supplied ${supplied} does not match approved ${configured}`,
    );
  }

  return {
    origin: supplied,
    canonicalOrigin: supplied,
    hostname: url.hostname,
    originClass: "staging",
  };
}

export function validateStagingRedirectChain(
  stagingOrigin: string,
  chain: string[],
  productionOrigin = canonicalizeOrigin(process.env.PRISM_PRODUCTION_ORIGIN ?? DEFAULT_PRODUCTION_ORIGIN),
): void {
  const approved = canonicalizeOrigin(stagingOrigin);
  for (const hop of chain) {
    if (!hop) continue;
    const hopUrl = new URL(hop);
    const hopOrigin = canonicalizeOrigin(hopUrl.origin);
    if (hopOrigin === productionOrigin) {
      throw new TargetPolicyError(`Redirect from staging to production denied: ${hop}`);
    }
    if (hopOrigin !== approved) {
      throw new TargetPolicyError(`Redirect to unapproved origin: ${hopOrigin}`);
    }
  }
}

export function rejectSimilarHostname(hostname: string): void {
  const approved = new URL(resolveStagingTarget().canonicalOrigin).hostname;
  if (hostname === approved) return;
  if (hostname.includes(approved) || approved.includes(hostname)) {
    throw new TargetPolicyError(`Similar-looking hostname rejected: ${hostname}`);
  }
  throw new TargetPolicyError(`Hostname not approved: ${hostname}`);
}

export function assertOperatorCaptureNotProduction(target: StagingTarget): void {
  if (target.originClass !== "staging") {
    throw new TargetPolicyError("Operator capture requires staging classification");
  }
}
