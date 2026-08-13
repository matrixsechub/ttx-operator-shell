import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildUnsignedBeaconV2Release,
  signBeaconRelease,
  type SignedBeaconRelease,
} from "../../msh-ops/beacon/signedBeaconRelease.ts";
import {
  getVerifiedBeaconV2State,
  resetBeaconReleaseCacheForTests,
  setBundledBeaconReleaseForTests,
} from "../../worker/beacon/beaconRelease.ts";
import { resolveBeaconRuntimeState } from "../../worker/governance/beaconRuntime.ts";
import { EXPECTED_BEACON_SHA256 } from "../../msh-ops/beacon/beaconHash.ts";

/** Non-denylisted unit key for verified_v2 under staging/production. */
const UNIT_TEST_KEY = "unit-test-beacon-hmac-key-32chars-minimum!!";
/** Fixture key — unprotected denial tests and fixture-denied-in-protected tests only. */
const FIXTURE_BEACON_KEY = "test-only-beacon-signing-key-do-not-use-in-production-01";

async function makeFixtureRelease(overrides: {
  key?: string;
  environment?: "staging" | "production";
  mutateBeacon?: (release: SignedBeaconRelease) => void;
  mutateHash?: string;
  mutateSignature?: string;
} = {}): Promise<SignedBeaconRelease> {
  const environment = overrides.environment ?? "staging";
  const unsigned = await buildUnsignedBeaconV2Release("2.0.0-test", {
    environment,
    publishedAt: "2026-07-19T00:00:00.000Z",
  });
  const release = await signBeaconRelease(unsigned, overrides.key ?? UNIT_TEST_KEY);
  if (overrides.mutateBeacon) overrides.mutateBeacon(release);
  if (overrides.mutateHash) release.beaconHash = overrides.mutateHash;
  if (overrides.mutateSignature) release.signature.value = overrides.mutateSignature;
  return release;
}

describe("Beacon v2 runtime classification", () => {
  afterEach(() => {
    resetBeaconReleaseCacheForTests();
  });

  it("returns verified_v2 for a valid env-matched release and non-fixture key", async () => {
    const release = await makeFixtureRelease({ environment: "staging" });
    const state = await resolveBeaconRuntimeState(
      { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" },
      { release },
    );
    assert.equal(state.status, "verified_v2");
    assert.equal(state.mutationAllowed, true);
    assert.equal(state.hash, release.beaconHash);
    assert.equal(state.version, "2.0.0-test");
    if (state.status === "verified_v2") assert.equal(state.reasonCode, "BEACON_VERIFIED");
  });

  it("fails closed to legacy_v1 when the signing key is missing", async () => {
    const release = await makeFixtureRelease({ environment: "staging" });
    const state = await resolveBeaconRuntimeState(
      { DEPLOY_ENV: "staging" },
      { release },
    );
    assert.equal(state.status, "legacy_v1");
    assert.equal(state.mutationAllowed, false);
    assert.equal(state.hash, EXPECTED_BEACON_SHA256);
    assert.notEqual(state.status, "verified_v2");
    if (state.status === "legacy_v1") {
      assert.equal(state.reasonCode, "BEACON_SIGNING_KEY_MISSING");
    }
  });

  it("fails closed to legacy_v1 when the release is missing", async () => {
    setBundledBeaconReleaseForTests("staging", null);
    const state = await resolveBeaconRuntimeState(
      { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" },
    );
    assert.equal(state.status, "legacy_v1");
    assert.equal(state.hash, EXPECTED_BEACON_SHA256);
    if (state.status === "legacy_v1") {
      assert.equal(state.reasonCode, "SIGNED_BEACON_NOT_ACTIVE");
    }
  });

  it("fails closed on incorrect key / signature", async () => {
    const release = await makeFixtureRelease({ environment: "staging" });
    const state = await resolveBeaconRuntimeState(
      {
        BEACON_SIGNING_KEY: "wrong-key-wrong-key-wrong-key-wrong-key-99",
        DEPLOY_ENV: "staging",
      },
      { release },
    );
    assert.equal(state.status, "legacy_v1");
    if (state.status === "legacy_v1") {
      assert.equal(state.reasonCode, "BEACON_SIGNATURE_INVALID");
    }
    const verified = await getVerifiedBeaconV2State(
      { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" },
      { release: await makeFixtureRelease({ mutateSignature: "00".repeat(32) }) },
    );
    assert.equal(verified.verified, false);
    assert.equal(verified.reason, "BEACON_SIGNATURE_INVALID");
  });

  it("fails closed on tampered beacon document and hash mismatch", async () => {
    const tampered = await makeFixtureRelease({
      mutateBeacon: (release) => {
        release.beacon.mandate = `${release.beacon.mandate} TAMPERED`;
      },
    });
    const tamperedState = await getVerifiedBeaconV2State(
      { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" },
      { release: tampered },
    );
    assert.equal(tamperedState.verified, false);
    assert.equal(tamperedState.reason, "BEACON_HASH_MISMATCH");

    const hashMismatch = await makeFixtureRelease({
      mutateHash: "ab".repeat(32),
    });
    const hashState = await getVerifiedBeaconV2State(
      { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "staging" },
      { release: hashMismatch },
    );
    assert.equal(hashState.verified, false);
    assert.equal(hashState.reason, "BEACON_HASH_MISMATCH");
  });

  it("keeps healthy v1 classification as legacy_v1 and never as verified_v2", async () => {
    setBundledBeaconReleaseForTests("staging", null);
    const state = await resolveBeaconRuntimeState({ DEPLOY_ENV: "staging" });
    assert.equal(state.status, "legacy_v1");
    assert.equal(state.hash, EXPECTED_BEACON_SHA256);
    assert.equal(state.mutationAllowed, false);
    assert.notEqual(state.status, "verified_v2");
  });

  it("denies denylisted fixture key under staging at runtime resolve", async () => {
    // Artifact must be signed with a non-fixture key; fixture is refused at sign-time.
    const release = await makeFixtureRelease({
      environment: "staging",
      key: UNIT_TEST_KEY,
    });
    const verified = await getVerifiedBeaconV2State(
      { BEACON_SIGNING_KEY: FIXTURE_BEACON_KEY, DEPLOY_ENV: "staging" },
      { release },
    );
    assert.equal(verified.verified, false);
    assert.equal(verified.reason, "BEACON_FIXTURE_KEY_DENIED");
    assert.equal(JSON.stringify(verified).includes(FIXTURE_BEACON_KEY), false);
  });
});
