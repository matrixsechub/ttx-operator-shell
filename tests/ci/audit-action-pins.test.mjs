import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const stagingWorkflow = readFileSync(
  join(root, ".github", "workflows", "staging-deploy.yml"),
  "utf8",
);
const deployProductionWorkflow = readFileSync(
  join(root, ".github", "workflows", "deploy-production.yml"),
  "utf8",
);

describe("audit-action-pins cross-repo guard", () => {
  it("does not pin download-artifact to upload-artifact SHA", () => {
    assert.doesNotMatch(
      stagingWorkflow,
      /actions\/download-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/,
    );
    assert.match(
      stagingWorkflow,
      /actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/,
    );
  });
});

describe("deploy-production immutable action pins", () => {
  it("pins checkout and setup-node to repo-canonical immutable SHAs", () => {
    assert.doesNotMatch(deployProductionWorkflow, /actions\/checkout@v4\b/);
    assert.doesNotMatch(deployProductionWorkflow, /actions\/setup-node@v4\b/);
    assert.match(
      deployProductionWorkflow,
      /actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5/,
    );
    assert.match(
      deployProductionWorkflow,
      /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/,
    );
  });
});
