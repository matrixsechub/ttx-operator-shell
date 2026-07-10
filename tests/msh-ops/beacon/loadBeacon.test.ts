import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, before } from "node:test";
import northstarDocument from "../../../msh-ops/beacon/northstar.json" with { type: "json" };
import { validateBeaconDocument } from "../../../msh-ops/beacon/beaconSchema.ts";
import {
  EXPECTED_BEACON_SHA256,
  canonicalizeBeacon,
  computeBeaconHash,
} from "../../../msh-ops/beacon/beaconIntegrity.ts";
import {
  BeaconIntegrityError,
  BeaconValidationError,
  assertBeaconOnStartup,
  ensureBeaconLoaded,
  loadBeacon,
  loadBeaconFromPayload,
} from "../../../msh-ops/beacon/loadBeacon.ts";

describe("loadBeacon", () => {
  before(async () => {
    await ensureBeaconLoaded();
  });

  it("loads bundled beacon and matches schema", async () => {
    const result = await loadBeaconFromPayload(northstarDocument);
    assert.equal(result.safeMode, false);
    assert.equal(result.beacon.id, "BEACON::NORTHSTAR");
    assert.equal(result.beacon.state, "ACTIVE");
    assert.equal(result.beacon.axis.length, 5);
    assert.equal(result.beacon.priorities.length, 6);
  });

  it("verifies integrity hash against expected constant", async () => {
    const beacon = validateBeaconDocument(northstarDocument);
    const canonical = canonicalizeBeacon(beacon);
    const hash = await computeBeaconHash(canonical);
    assert.equal(hash, EXPECTED_BEACON_SHA256);
    const result = await loadBeaconFromPayload(northstarDocument);
    assert.equal(result.integrityHash, EXPECTED_BEACON_SHA256);
  });

  it("freezes beacon objects so agents cannot mutate them", async () => {
    const result = await loadBeaconFromPayload(northstarDocument);
    assert.equal(Object.isFrozen(result.beacon), true);
    assert.equal(Object.isFrozen(result.beacon.authority), true);
    assert.equal(Object.isFrozen(result.beacon.axis), true);
    assert.equal(Object.isFrozen(result.beacon.priorities), true);
  });

  it("rejects invalid beacon documents", async () => {
    await assert.rejects(
      () => loadBeaconFromPayload({ ...northstarDocument, state: "DRAFT" }),
      BeaconValidationError,
    );
    await assert.rejects(
      () => loadBeaconFromPayload({ ...northstarDocument, priorities: ["only one"] }),
      BeaconValidationError,
    );
  });

  it("rejects tampered beacon hash unless safe mode is enabled", async () => {
    const tampered = {
      ...northstarDocument,
      mandate: `${northstarDocument.mandate} altered`,
    };
    await assert.rejects(
      () => loadBeaconFromPayload(tampered),
      BeaconIntegrityError,
    );
    const safe = await loadBeaconFromPayload(tampered, { allowSafeMode: true });
    assert.equal(safe.safeMode, true);
    assert.match(safe.warning ?? "", /hash mismatch/i);
  });

  it("assertBeaconOnStartup succeeds after bundled init", async () => {
    const result = await assertBeaconOnStartup();
    assert.equal(result.safeMode, false);
    assert.equal(loadBeacon().integrityHash, EXPECTED_BEACON_SHA256);
  });

  it("enters safe mode when beacon payload is missing required fields", async () => {
    const safe = await loadBeaconFromPayload({}, { allowSafeMode: true });
    assert.equal(safe.safeMode, true);
    assert.ok(safe.warning);
  });
});

describe("beacon immutability guarantees", () => {
  it("does not expose write APIs for northstar.json in worker routes", () => {
    const root = join(process.cwd());
    const indexSrc = readFileSync(join(root, "worker", "index.ts"), "utf8");
    const backboneSrc = readFileSync(join(root, "worker", "backbone.ts"), "utf8");
    assert.equal(indexSrc.includes("northstar.json"), false);
    assert.equal(backboneSrc.includes("northstar.json"), false);
    assert.doesNotMatch(indexSrc, /writeFile.*northstar/i);
  });
});
