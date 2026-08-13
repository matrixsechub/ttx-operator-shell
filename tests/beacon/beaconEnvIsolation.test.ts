import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  BEACON_FIXTURE_KEY_DENIED,
  BEACON_FIXTURE_SIGNING_KEY_DENYLIST,
} from "../../msh-ops/beacon/beaconFixtureKeys.ts";
import { BUNDLED_BEACON_V2_PRODUCTION_RELEASE } from "../../msh-ops/beacon/releases/bundledProductionRelease.ts";
import { BUNDLED_BEACON_V2_STAGING_RELEASE } from "../../msh-ops/beacon/releases/bundledStagingRelease.ts";
import {
  buildUnsignedBeaconV2Release,
  canonicalizeBeaconReleaseEnvelope,
  signBeaconRelease,
  verifySignedBeaconRelease,
  type SignedBeaconRelease,
} from "../../msh-ops/beacon/signedBeaconRelease.ts";
import {
  getBeaconReleaseHistory,
  getVerifiedBeaconV2State,
  resetBeaconReleaseCacheForTests,
  setBundledBeaconReleaseForTests,
} from "../../worker/beacon/beaconRelease.ts";
import {
  BEACON_FIXTURE_SIGNING_KEY_DENYLIST as WORKER_FIXTURE_DENYLIST,
  normalizeDeployEnv,
  resolveBeaconSigningKey,
} from "../../worker/beacon/beaconSigning.ts";
import { resolveBeaconRuntimeState } from "../../worker/governance/beaconRuntime.ts";

const UNIT_TEST_KEY = "unit-test-beacon-hmac-key-32chars-minimum!!";
const FIXTURE_BEACON_KEY = "test-only-beacon-signing-key-do-not-use-in-production-01";
const STAGING_UNIT_KEY = "unit-test-staging-hmac-key-32chars-min!!!!";
const PRODUCTION_UNIT_KEY = "unit-test-production-hmac-key-32chars-min!";

async function signForEnv(
  environment: "staging" | "production",
  key: string = UNIT_TEST_KEY,
): Promise<SignedBeaconRelease> {
  const unsigned = await buildUnsignedBeaconV2Release("2.0.0-isolation", {
    environment,
    publishedAt: "2026-07-20T00:00:00.000Z",
  });
  return signBeaconRelease(unsigned, key);
}

describe("Phase 4 — Beacon env isolation", () => {
  afterEach(() => {
    resetBeaconReleaseCacheForTests();
  });

  describe("normalizeDeployEnv", () => {
    it("exact-matches staging and production after trim only", () => {
      assert.equal(normalizeDeployEnv("staging"), "staging");
      assert.equal(normalizeDeployEnv("production"), "production");
      assert.equal(normalizeDeployEnv("  staging  "), "staging");
      assert.equal(normalizeDeployEnv("Staging"), "unprotected");
      assert.equal(normalizeDeployEnv("PRODUCTION"), "unprotected");
      assert.equal(normalizeDeployEnv("development"), "unprotected");
      assert.equal(normalizeDeployEnv("test"), "unprotected");
      assert.equal(normalizeDeployEnv(""), "unprotected");
      assert.equal(normalizeDeployEnv(undefined), "unprotected");
    });
  });

  describe("slot selection", () => {
    it("keeps both bundled slots null and history non-authoritative empty", () => {
      assert.equal(BUNDLED_BEACON_V2_STAGING_RELEASE, null);
      assert.equal(BUNDLED_BEACON_V2_PRODUCTION_RELEASE, null);
      assert.deepEqual(getBeaconReleaseHistory(), []);
    });

    it("selects staging slot only under staging DEPLOY_ENV", async () => {
      const stagingRelease = await signForEnv("staging");
      const productionRelease = await signForEnv("production");
      setBundledBeaconReleaseForTests("staging", stagingRelease);
      setBundledBeaconReleaseForTests("production", productionRelease);

      const staging = await getVerifiedBeaconV2State({
        BEACON_SIGNING_KEY: UNIT_TEST_KEY,
        DEPLOY_ENV: "staging",
      });
      assert.equal(staging.verified, true);
      assert.equal(staging.release?.environment, "staging");
      assert.equal(staging.release?.beaconHash, stagingRelease.beaconHash);

      const production = await getVerifiedBeaconV2State({
        BEACON_SIGNING_KEY: UNIT_TEST_KEY,
        DEPLOY_ENV: "production",
      });
      assert.equal(production.verified, true);
      assert.equal(production.release?.environment, "production");
      assert.equal(production.release?.beaconHash, productionRelease.beaconHash);
    });

    it("returns null / missing for unprotected and unknown DEPLOY_ENV", async () => {
      const stagingRelease = await signForEnv("staging");
      setBundledBeaconReleaseForTests("staging", stagingRelease);

      for (const deployEnv of [undefined, "development", "test", "Staging", "prod"]) {
        const state = await getVerifiedBeaconV2State({
          BEACON_SIGNING_KEY: UNIT_TEST_KEY,
          DEPLOY_ENV: deployEnv,
        });
        assert.equal(state.verified, false);
        assert.equal(state.reason, "BEACON_RELEASE_MISSING");
        assert.equal(state.release, null);
      }
    });

    it("denies production when only staging slot is populated (and inverse)", async () => {
      const stagingRelease = await signForEnv("staging");
      setBundledBeaconReleaseForTests("staging", stagingRelease);
      setBundledBeaconReleaseForTests("production", null);

      const productionDenied = await getVerifiedBeaconV2State({
        BEACON_SIGNING_KEY: UNIT_TEST_KEY,
        DEPLOY_ENV: "production",
      });
      assert.equal(productionDenied.verified, false);
      assert.equal(productionDenied.reason, "BEACON_RELEASE_MISSING");

      resetBeaconReleaseCacheForTests();
      const productionRelease = await signForEnv("production");
      setBundledBeaconReleaseForTests("production", productionRelease);
      setBundledBeaconReleaseForTests("staging", null);

      const stagingDenied = await getVerifiedBeaconV2State({
        BEACON_SIGNING_KEY: UNIT_TEST_KEY,
        DEPLOY_ENV: "staging",
      });
      assert.equal(stagingDenied.verified, false);
      assert.equal(stagingDenied.reason, "BEACON_RELEASE_MISSING");
    });

    it("does not cross-fallback staging release into production runtime", async () => {
      const stagingRelease = await signForEnv("staging");
      const production = await getVerifiedBeaconV2State(
        { BEACON_SIGNING_KEY: UNIT_TEST_KEY, DEPLOY_ENV: "production" },
        { release: stagingRelease },
      );
      assert.equal(production.verified, false);
      assert.equal(production.reason, "BEACON_ENV_MISMATCH");
    });
  });

  describe("env-bound HMAC", () => {
    it("locks canonical envelope key order", () => {
      const envelope = canonicalizeBeaconReleaseEnvelope({
        environment: "staging",
        version: "2.0.0",
        beaconHash: "ab".repeat(32),
        publishedAt: "2026-07-20T00:00:00.000Z",
        keyId: "beacon-signing-key-v1",
      });
      assert.equal(
        envelope,
        JSON.stringify({
          domain: "MSHOPS::BEACON_RELEASE::V2",
          environment: "staging",
          version: "2.0.0",
          beaconHash: "ab".repeat(32),
          publishedAt: "2026-07-20T00:00:00.000Z",
          keyId: "beacon-signing-key-v1",
        }),
      );
      assert.ok(envelope.indexOf('"domain"') < envelope.indexOf('"environment"'));
      assert.ok(envelope.indexOf('"environment"') < envelope.indexOf('"version"'));
    });

    it("verifies staging only in staging and production only in production", async () => {
      const stagingRelease = await signForEnv("staging", STAGING_UNIT_KEY);
      const productionRelease = await signForEnv("production", PRODUCTION_UNIT_KEY);

      const stagingOk = await verifySignedBeaconRelease(stagingRelease, STAGING_UNIT_KEY, "staging");
      assert.equal(stagingOk.valid, true);

      const stagingCross = await verifySignedBeaconRelease(
        stagingRelease,
        STAGING_UNIT_KEY,
        "production",
      );
      assert.equal(stagingCross.valid, false);
      assert.equal(stagingCross.reason, "BEACON_ENV_MISMATCH");

      const productionOk = await verifySignedBeaconRelease(
        productionRelease,
        PRODUCTION_UNIT_KEY,
        "production",
      );
      assert.equal(productionOk.valid, true);

      const productionCross = await verifySignedBeaconRelease(
        productionRelease,
        PRODUCTION_UNIT_KEY,
        "staging",
      );
      assert.equal(productionCross.valid, false);
      assert.equal(productionCross.reason, "BEACON_ENV_MISMATCH");
    });

    it("fails missing/unknown runtime env with no legacy bypass", async () => {
      const release = await signForEnv("staging");
      for (const runtime of [undefined, "development", "Staging", ""]) {
        const result = await verifySignedBeaconRelease(release, UNIT_TEST_KEY, runtime);
        assert.equal(result.valid, false);
        assert.equal(result.reason, "BEACON_ENV_MISMATCH");
      }
    });

    it("fails on env/payload/hash/signature tamper and wrong key", async () => {
      const release = await signForEnv("staging");

      const envTamper = structuredClone(release);
      envTamper.environment = "production";
      const envResult = await verifySignedBeaconRelease(envTamper, UNIT_TEST_KEY, "production");
      assert.equal(envResult.valid, false);
      assert.equal(envResult.reason, "BEACON_SIGNATURE_INVALID");

      const hashTamper = structuredClone(release);
      hashTamper.beaconHash = "cd".repeat(32);
      const hashResult = await verifySignedBeaconRelease(hashTamper, UNIT_TEST_KEY, "staging");
      assert.equal(hashResult.valid, false);
      assert.equal(hashResult.reason, "BEACON_HASH_MISMATCH");

      const sigTamper = structuredClone(release);
      sigTamper.signature.value = "00".repeat(32);
      const sigResult = await verifySignedBeaconRelease(sigTamper, UNIT_TEST_KEY, "staging");
      assert.equal(sigResult.valid, false);
      assert.equal(sigResult.reason, "BEACON_SIGNATURE_INVALID");

      const wrongKey = await verifySignedBeaconRelease(
        release,
        "wrong-key-wrong-key-wrong-key-wrong-key-99",
        "staging",
      );
      assert.equal(wrongKey.valid, false);
      assert.equal(wrongKey.reason, "BEACON_SIGNATURE_INVALID");
    });
  });

  describe("fixture key denial", () => {
    it("exports the exact denylist fixture string from msh-ops and worker re-export", () => {
      assert.deepEqual(BEACON_FIXTURE_SIGNING_KEY_DENYLIST, [
        "test-only-beacon-signing-key-do-not-use-in-production-01",
      ]);
      assert.deepEqual(WORKER_FIXTURE_DENYLIST, [...BEACON_FIXTURE_SIGNING_KEY_DENYLIST]);
      assert.equal(FIXTURE_BEACON_KEY, BEACON_FIXTURE_SIGNING_KEY_DENYLIST[0]);
    });

    it("allows fixture key only in unprotected unit context via resolve", () => {
      const unprotected = resolveBeaconSigningKey({
        BEACON_SIGNING_KEY: FIXTURE_BEACON_KEY,
        DEPLOY_ENV: "development",
      });
      assert.ok(unprotected);
      assert.equal(unprotected.source, "beacon");

      const staging = resolveBeaconSigningKey({
        BEACON_SIGNING_KEY: FIXTURE_BEACON_KEY,
        DEPLOY_ENV: "staging",
      });
      assert.equal(staging, null);

      const production = resolveBeaconSigningKey({
        BEACON_SIGNING_KEY: FIXTURE_BEACON_KEY,
        DEPLOY_ENV: "production",
      });
      assert.equal(production, null);
    });

    it("rejects fixture key at sign-time for staging and production before crypto", async () => {
      for (const environment of ["staging", "production"] as const) {
        await assert.rejects(
          async () => signForEnv(environment, FIXTURE_BEACON_KEY),
          (err: unknown) => {
            assert.ok(err instanceof Error);
            assert.equal(err.message, BEACON_FIXTURE_KEY_DENIED);
            assert.equal(err.message.includes(FIXTURE_BEACON_KEY), false);
            assert.equal(String(err).includes(FIXTURE_BEACON_KEY), false);
            return true;
          },
        );
      }
    });

    it("does not write an output artifact when fixture key is denied", async () => {
      const dir = mkdtempSync(join(tmpdir(), "beacon-sign-deny-"));
      const outPath = join(dir, "denied-release.json");
      try {
        await assert.rejects(async () => {
          const unsigned = await buildUnsignedBeaconV2Release("2.0.0-deny", {
            environment: "staging",
            publishedAt: "2026-07-19T00:00:00.000Z",
          });
          await signBeaconRelease(unsigned, FIXTURE_BEACON_KEY);
          // Unreachable — would be the only write path under test.
          throw new Error("signBeaconRelease must throw before any write");
        });
        assert.equal(existsSync(outPath), false);
        assert.deepEqual(getBeaconReleaseHistory(), []);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("reports BEACON_FIXTURE_KEY_DENIED for protected envs at runtime resolve", async () => {
      // Release signed with a non-fixture unit key; env key is the denylisted fixture.
      const release = await signForEnv("staging", UNIT_TEST_KEY);
      for (const deployEnv of ["staging", "production"] as const) {
        const envRelease =
          deployEnv === "staging" ? release : await signForEnv("production", UNIT_TEST_KEY);
        const state = await getVerifiedBeaconV2State(
          { BEACON_SIGNING_KEY: FIXTURE_BEACON_KEY, DEPLOY_ENV: deployEnv },
          { release: envRelease },
        );
        assert.equal(state.verified, false);
        assert.equal(state.reason, "BEACON_FIXTURE_KEY_DENIED");
        assert.equal(JSON.stringify(state).includes(FIXTURE_BEACON_KEY), false);
      }
    });

    it("allows non-fixture unit key to sign in-memory without mutating history or slots", async () => {
      const release = await signForEnv("staging", UNIT_TEST_KEY);
      assert.equal(release.environment, "staging");
      assert.equal(typeof release.signature.value, "string");
      assert.deepEqual(getBeaconReleaseHistory(), []);
      assert.equal(BUNDLED_BEACON_V2_STAGING_RELEASE, null);
      assert.equal(BUNDLED_BEACON_V2_PRODUCTION_RELEASE, null);
    });

    it("fails closed on missing/empty/<32 key without AUTH fallback in protected envs", () => {
      assert.equal(resolveBeaconSigningKey({ DEPLOY_ENV: "staging" }), null);
      assert.equal(resolveBeaconSigningKey({ BEACON_SIGNING_KEY: "", DEPLOY_ENV: "staging" }), null);
      assert.equal(
        resolveBeaconSigningKey({ BEACON_SIGNING_KEY: "too-short", DEPLOY_ENV: "production" }),
        null,
      );
      assert.equal(
        resolveBeaconSigningKey({
          AUTH_SIGNING_KEY: UNIT_TEST_KEY,
          DEPLOY_ENV: "staging",
        }),
        null,
      );
    });

    it("AUTH fallback is unprotected-only", () => {
      const ok = resolveBeaconSigningKey({
        AUTH_SIGNING_KEY: UNIT_TEST_KEY,
        DEPLOY_ENV: "development",
      });
      assert.ok(ok);
      assert.equal(ok.source, "auth_fallback");
    });
  });

  describe("runtime / flywheel boundary", () => {
    it("null slots never classify as verified_v2", async () => {
      setBundledBeaconReleaseForTests("staging", null);
      setBundledBeaconReleaseForTests("production", null);
      for (const deployEnv of ["staging", "production"] as const) {
        const state = await resolveBeaconRuntimeState({
          BEACON_SIGNING_KEY: UNIT_TEST_KEY,
          DEPLOY_ENV: deployEnv,
        });
        assert.notEqual(state.status, "verified_v2");
      }
    });

    it("staging release cannot produce production verified_v2", async () => {
      const stagingRelease = await signForEnv("staging");
      setBundledBeaconReleaseForTests("staging", stagingRelease);
      const state = await resolveBeaconRuntimeState({
        BEACON_SIGNING_KEY: UNIT_TEST_KEY,
        DEPLOY_ENV: "production",
      });
      assert.notEqual(state.status, "verified_v2");
    });
  });
});
