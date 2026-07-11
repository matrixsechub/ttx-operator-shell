import type { BuildInfoEnv } from "../buildInfo";
import type { ModeEnv } from "../mode";
import type { RuntimeEnvironment } from "./types";

export type RuntimeEnvSource = ModeEnv & BuildInfoEnv & {
  ALLOW_LEGACY_OPERATOR_APPROVAL?: string;
};

export function resolveRuntimeEnvironment(env: RuntimeEnvSource): RuntimeEnvironment {
  if (env.DEPLOY_ENV === "production") return "production";
  if (env.DEPLOY_ENV === "staging") return "staging";
  return "development";
}

export function isLegacyOperatorApprovalAllowed(env: RuntimeEnvSource): boolean {
  if (resolveRuntimeEnvironment(env) !== "development") return false;
  return env.ALLOW_LEGACY_OPERATOR_APPROVAL === "true";
}

export function isGovernedMutationEnvironment(env: RuntimeEnvSource): boolean {
  const runtime = resolveRuntimeEnvironment(env);
  return runtime === "staging" || runtime === "production";
}
