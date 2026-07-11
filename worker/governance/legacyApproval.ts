import type { AuditDbEnv } from "./auditStore";
import { recordAuditEvent } from "./auditStore";
import { buildTelemetryEvent, emitGovernanceTelemetry } from "./governanceTelemetry";
import { isLegacyOperatorApprovalAllowed, isGovernedMutationEnvironment, resolveRuntimeEnvironment } from "./runtimeEnv";
import type { RuntimeEnvSource } from "./runtimeEnv";
import { getCodexManifestSnapshot } from "../codex/manifestHash";
import { getVerifiedBeaconV2State } from "../beacon/beaconRelease";

export interface LegacyApprovalCheckResult {
  allowed: boolean;
  code: string;
  reason: string;
}

export async function evaluateLegacyOperatorApproval(
  env: RuntimeEnvSource & AuditDbEnv,
  body: Record<string, unknown>,
  context: {
    actionClass: string;
    systemTarget: string;
    actorId: string;
    correlationId: string;
  },
): Promise<LegacyApprovalCheckResult> {
  if (body.operatorApproval !== true) {
    return { allowed: false, code: "RECEIPT_REQUIRED", reason: "Signed approval receipt required" };
  }

  const codex = await getCodexManifestSnapshot();
  const beacon = await getVerifiedBeaconV2State(env);
  const environment = resolveRuntimeEnvironment(env);

  if (isGovernedMutationEnvironment(env)) {
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance.legacy_bypass_blocked", {
        beaconHash: beacon.beaconHash ?? "unknown",
        codexHash: codex.manifestHash,
        environment,
        actionClass: context.actionClass,
        outcome: "blocked",
        reasonCode: "LEGACY_BYPASS_FORBIDDEN",
        correlationId: context.correlationId,
      }),
    );
    return {
      allowed: false,
      code: "LEGACY_BYPASS_FORBIDDEN",
      reason: "operatorApproval boolean bypass is forbidden in staging and production",
    };
  }

  if (!isLegacyOperatorApprovalAllowed(env)) {
    return {
      allowed: false,
      code: "LEGACY_BYPASS_DISABLED",
      reason: "Legacy operatorApproval bypass disabled — set ALLOW_LEGACY_OPERATOR_APPROVAL=true in development only",
    };
  }

  await recordAuditEvent(env, {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor_type: "operator",
    actor_id: context.actorId,
    action_class: context.actionClass as "C3",
    system_target: context.systemTarget,
    beacon_hash: beacon.beaconHash ?? "unknown",
    codex_hash: codex.manifestHash,
    trace_id: context.correlationId,
    event_type: "governance.legacy_bypass_used",
    correlation_id: context.correlationId,
    reason_code: "LEGACY_BYPASS_DEV_ONLY",
    risk_score: 90,
    result: "escalated",
  });

  await emitGovernanceTelemetry(
    env,
    buildTelemetryEvent("governance.legacy_bypass_blocked", {
      beaconHash: beacon.beaconHash ?? "unknown",
      codexHash: codex.manifestHash,
      environment,
      actionClass: context.actionClass,
      outcome: "allowed_dev_only",
      reasonCode: "LEGACY_BYPASS_DEV_ONLY",
      correlationId: context.correlationId,
    }),
  );

  return {
    allowed: true,
    code: "LEGACY_BYPASS_DEV_ONLY",
    reason: "Legacy bypass allowed in development only — removal scheduled",
  };
}
