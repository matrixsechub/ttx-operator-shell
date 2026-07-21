import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { FlywheelCommand, FlywheelRun } from "../../shared/flywheel/contracts.ts";
import { EXPECTED_BEACON_SHA256 } from "../../msh-ops/beacon/beaconHash.ts";
import {
  buildUnsignedBeaconV2Release,
  signBeaconRelease,
} from "../../msh-ops/beacon/signedBeaconRelease.ts";
import {
  resetBeaconReleaseCacheForTests,
  setBundledBeaconReleaseForTests,
} from "../../worker/beacon/beaconRelease.ts";
import { evaluateFlywheelGovernance } from "../../worker/flywheel/governance.ts";
import {
  getBeaconHashForReads,
  resolveBeaconRuntimeState,
} from "../../worker/flywheel/mainCompat.ts";

/** Non-denylisted unit key for verified_v2 under staging/production. */
const UNIT_TEST_KEY = "unit-test-beacon-hmac-key-32chars-minimum!!";

const baseRun = (overrides: Partial<FlywheelRun> = {}): FlywheelRun => ({
  id: "run-1",
  missionId: "mission-1",
  tenantId: "tenant-1",
  currentStage: "lead_generation",
  state: "queued",
  autonomyLevel: 1,
  riskLevel: "low",
  beaconVersion: "legacy-v1",
  beaconSha256: EXPECTED_BEACON_SHA256,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  traceId: "trace-1",
  idempotencyKey: "run-key",
  ...overrides,
});

const command = (overrides: Partial<FlywheelCommand> = {}): FlywheelCommand => ({
  commandId: "cmd-1",
  raw: "SYNTH::STAGE_1::QUALIFY",
  category: "SYNTH",
  target: "STAGE_1",
  parameter: "QUALIFY",
  payload: { evidenceRefs: ["ev-1"] },
  requestedBy: "operator",
  missionId: "mission-1",
  traceId: "trace-1",
  idempotencyKey: "cmd-key",
  requestedAt: "2026-01-01T00:00:00.000Z",
  actionClass: "C2",
  ...overrides,
});

describe("Flywheel Beacon gate", () => {
  afterEach(() => {
    resetBeaconReleaseCacheForTests();
  });

  it("denies C2 under legacy_v1 and allows C0/C1", async () => {
    setBundledBeaconReleaseForTests("staging", null);
    const env = { DEPLOY_ENV: "staging" };
    const c2 = await evaluateFlywheelGovernance(env, "tenant-1", baseRun(), command());
    assert.equal(c2.allowed, false);
    assert.equal(c2.approvalRequired, true);
    assert.equal(c2.code, "GOVERNANCE_MISSING_BEACON");

    const c0 = await evaluateFlywheelGovernance(
      env,
      "tenant-1",
      baseRun(),
      command({
        actionClass: "C0",
        category: "ANALYZE",
        raw: "ANALYZE::STAGE_1::SCORE",
        target: "STAGE_1",
        parameter: "SCORE",
      }),
    );
    assert.equal(c0.allowed, true);
    assert.equal(c0.approvalRequired, false);

    const c1 = await evaluateFlywheelGovernance(
      env,
      "tenant-1",
      baseRun(),
      command({
        actionClass: "C1",
        category: "SCAN",
        raw: "SCAN::STAGE_1::SURFACE",
        target: "STAGE_1",
        parameter: "SURFACE",
      }),
    );
    assert.equal(c1.allowed, true);
    assert.equal(c1.approvalRequired, false);
  });

  it("reaches approval-required under verified_v2 for a new v2-stamped run", async () => {
    const unsigned = await buildUnsignedBeaconV2Release("2.0.0-test", {
      environment: "staging",
      publishedAt: "2026-07-19T00:00:00.000Z",
    });
    const release = await signBeaconRelease(unsigned, UNIT_TEST_KEY);
    setBundledBeaconReleaseForTests("staging", release);
    const env = { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" };

    const state = await resolveBeaconRuntimeState(env);
    assert.equal(state.status, "verified_v2");
    assert.notEqual(state.hash, EXPECTED_BEACON_SHA256);

    const v2Run = baseRun({
      beaconVersion: state.status === "verified_v2" ? state.version : "legacy-v1",
      beaconSha256: state.hash,
    });
    const decision = await evaluateFlywheelGovernance(env, "tenant-1", v2Run, command());
    assert.equal(decision.allowed, true);
    assert.equal(decision.approvalRequired, true);
    assert.equal(decision.code, undefined);
  });

  it("does not silently upgrade an old v1 run when v2 becomes active", async () => {
    const unsigned = await buildUnsignedBeaconV2Release("2.0.0-test", {
      environment: "staging",
      publishedAt: "2026-07-19T00:00:00.000Z",
    });
    const release = await signBeaconRelease(unsigned, UNIT_TEST_KEY);
    setBundledBeaconReleaseForTests("staging", release);
    const env = { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" };

    const state = await resolveBeaconRuntimeState(env);
    assert.equal(state.status, "verified_v2");

    const oldRun = baseRun(); // still carries EXPECTED_BEACON_SHA256 / legacy-v1
    assert.equal(oldRun.beaconSha256, EXPECTED_BEACON_SHA256);
    assert.equal(oldRun.beaconVersion, "legacy-v1");

    const drift = await evaluateFlywheelGovernance(env, "tenant-1", oldRun, command());
    assert.equal(drift.allowed, false);
    assert.equal(drift.code, "GOVERNANCE_HASH_INVALID");
  });

  it("new verified reads return the v2 hash, distinct from legacy v1", async () => {
    const unsigned = await buildUnsignedBeaconV2Release("2.0.0-test", {
      environment: "staging",
      publishedAt: "2026-07-19T00:00:00.000Z",
    });
    const release = await signBeaconRelease(unsigned, UNIT_TEST_KEY);
    setBundledBeaconReleaseForTests("staging", release);
    const env = { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" };
    const hash = await getBeaconHashForReads(env);
    assert.equal(hash, release.beaconHash);
    assert.notEqual(hash, EXPECTED_BEACON_SHA256);
  });
});
