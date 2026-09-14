import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCTION_WORKER_NAME,
  STAGING_WORKER_NAME,
  resolveBuildInfo,
  resolveWorkerName,
} from "../worker/buildInfo.ts";

describe("build-info worker identity", () => {
  it("defaults production identity when WORKER_NAME and DEPLOY_ENV are unset", () => {
    assert.equal(resolveWorkerName({}), PRODUCTION_WORKER_NAME);
    assert.equal(resolveBuildInfo({}).workerName, PRODUCTION_WORKER_NAME);
  });

  it("emits staging identity from DEPLOY_ENV=staging without WORKER_NAME", () => {
    const env = { DEPLOY_ENV: "staging" };
    assert.equal(resolveWorkerName(env), STAGING_WORKER_NAME);
    assert.equal(resolveBuildInfo(env).workerName, STAGING_WORKER_NAME);
    assert.equal(resolveBuildInfo(env).deployEnv, "staging");
  });

  it("prefers explicit WORKER_NAME over DEPLOY_ENV fallback", () => {
    assert.equal(
      resolveWorkerName({ DEPLOY_ENV: "staging", WORKER_NAME: STAGING_WORKER_NAME }),
      STAGING_WORKER_NAME,
    );
    assert.equal(
      resolveWorkerName({ DEPLOY_ENV: "production", WORKER_NAME: PRODUCTION_WORKER_NAME }),
      PRODUCTION_WORKER_NAME,
    );
  });

  it("never reports production workerName for staging evidence payloads", () => {
    const staging = resolveBuildInfo({
      DEPLOY_ENV: "staging",
      WORKER_NAME: STAGING_WORKER_NAME,
      BUILD_COMMIT_SHA: "e24c4f7d5b3734d3415973b14c919ce14c309e15",
    });
    assert.equal(staging.workerName, STAGING_WORKER_NAME);
    assert.notEqual(staging.workerName, PRODUCTION_WORKER_NAME);
    assert.equal(staging.deployEnv, "staging");
  });

  it("keeps production identity on the production path", () => {
    const production = resolveBuildInfo({
      DEPLOY_ENV: "production",
      WORKER_NAME: PRODUCTION_WORKER_NAME,
    });
    assert.equal(production.workerName, PRODUCTION_WORKER_NAME);
    assert.equal(production.deployEnv, "production");
  });
});
