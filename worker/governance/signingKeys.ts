import type { BuildInfoEnv } from "../buildInfo";
import type { ModeEnv } from "../mode";
import { resolveRuntimeEnvironment } from "./runtimeEnv";

export const GOVERNANCE_RECEIPT_DOMAIN = "MSHOPS::GOVERNANCE_RECEIPT::V1";
export const BEACON_RELEASE_DOMAIN = "MSHOPS::BEACON_RELEASE::V2";
export const GOVERNANCE_RECEIPT_KEY_ID = "governance-receipt-signing-key-v1";
export const BEACON_SIGNING_KEY_ID = "beacon-signing-key-v1";

export type SigningKeyEnv = ModeEnv &
  BuildInfoEnv & {
    GOVERNANCE_RECEIPT_SIGNING_KEY?: string;
    BEACON_SIGNING_KEY?: string;
    AUTH_SIGNING_KEY?: string;
  };

export interface ResolvedSigningKey {
  key: string;
  keyId: string;
  domain: string;
  source: "governance" | "beacon" | "auth_fallback";
}

export function resolveGovernanceReceiptSigningKey(env: SigningKeyEnv): ResolvedSigningKey | null {
  const runtime = resolveRuntimeEnvironment(env);
  if (env.GOVERNANCE_RECEIPT_SIGNING_KEY) {
    return {
      key: env.GOVERNANCE_RECEIPT_SIGNING_KEY,
      keyId: GOVERNANCE_RECEIPT_KEY_ID,
      domain: GOVERNANCE_RECEIPT_DOMAIN,
      source: "governance",
    };
  }
  if (runtime === "development" && env.AUTH_SIGNING_KEY) {
    return {
      key: env.AUTH_SIGNING_KEY,
      keyId: "auth-signing-key-dev-fallback",
      domain: GOVERNANCE_RECEIPT_DOMAIN,
      source: "auth_fallback",
    };
  }
  return null;
}

export function resolveBeaconSigningKey(env: SigningKeyEnv): ResolvedSigningKey | null {
  const runtime = resolveRuntimeEnvironment(env);
  if (env.BEACON_SIGNING_KEY) {
    return {
      key: env.BEACON_SIGNING_KEY,
      keyId: BEACON_SIGNING_KEY_ID,
      domain: BEACON_RELEASE_DOMAIN,
      source: "beacon",
    };
  }
  if (runtime === "development" && env.AUTH_SIGNING_KEY) {
    return {
      key: env.AUTH_SIGNING_KEY,
      keyId: "auth-signing-key-dev-fallback",
      domain: BEACON_RELEASE_DOMAIN,
      source: "auth_fallback",
    };
  }
  return null;
}

export function governanceSigningKeysConfigured(env: SigningKeyEnv): {
  governanceReceipt: boolean;
  beacon: boolean;
} {
  const runtime = resolveRuntimeEnvironment(env);
  const devFallback = runtime === "development" && Boolean(env.AUTH_SIGNING_KEY);
  return {
    governanceReceipt: Boolean(env.GOVERNANCE_RECEIPT_SIGNING_KEY) || devFallback,
    beacon: Boolean(env.BEACON_SIGNING_KEY) || devFallback,
  };
}
