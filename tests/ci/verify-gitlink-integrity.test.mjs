import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listGitlinksFromLsTree,
  parseGitmodules,
  verifyGitlinkIntegrity,
} from "../../scripts/ci/verify-gitlink-integrity.mjs";

describe("verify-gitlink-integrity", () => {
  it("passes when there are no gitlinks and no .gitmodules", () => {
    const result = verifyGitlinkIntegrity({
      gitlinks: [],
      gitmodulesExists: false,
    });
    assert.equal(result.ok, true);
  });

  it("passes for a valid gitlink with matching .gitmodules", () => {
    const modules = `[submodule "vendor/lib"]
	path = vendor/lib
	url = https://example.com/lib.git
`;
    const result = verifyGitlinkIntegrity({
      gitlinks: [{ path: "vendor/lib", oid: "a".repeat(40) }],
      gitmodulesExists: true,
      gitmodulesText: modules,
    });
    assert.equal(result.ok, true);
  });

  it("fails closed on orphan gitlink without .gitmodules", () => {
    const result = verifyGitlinkIntegrity({
      gitlinks: [
        {
          path: ".worktrees/operator-os-phase1-wave3",
          oid: "b".repeat(40),
        },
      ],
      gitmodulesExists: false,
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes("orphan gitlink without .gitmodules")),
    );
  });

  it("fails when .gitmodules path has no matching gitlink", () => {
    const modules = `[submodule "missing"]
	path = vendor/missing
	url = https://example.com/missing.git
`;
    const result = verifyGitlinkIntegrity({
      gitlinks: [],
      gitmodulesExists: true,
      gitmodulesText: modules,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("without mode-160000")));
  });

  it("fails on duplicate .gitmodules path declaration", () => {
    const modules = `[submodule "a"]
	path = vendor/lib
	url = https://example.com/a.git
[submodule "b"]
	path = vendor/lib
	url = https://example.com/b.git
`;
    const result = verifyGitlinkIntegrity({
      gitlinks: [{ path: "vendor/lib", oid: "c".repeat(40) }],
      gitmodulesExists: true,
      gitmodulesText: modules,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("duplicate")));
  });

  it("fails on prohibited .worktrees/ tracked gitlink even with modules", () => {
    const modules = `[submodule "wt"]
	path = .worktrees/phase-37
	url = https://example.com/wt.git
`;
    const result = verifyGitlinkIntegrity({
      gitlinks: [{ path: ".worktrees/phase-37", oid: "d".repeat(40) }],
      gitmodulesExists: true,
      gitmodulesText: modules,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("prohibited tracked worktree")));
  });

  it("treats ordinary directory paths as non-gitlinks in ls-tree parsing", () => {
    const parsed = listGitlinksFromLsTree(
      [
        "040000 tree " + "e".repeat(40) + "\tsrc",
        "100644 blob " + "f".repeat(40) + "\tREADME.md",
        "160000 commit " + "a".repeat(40) + "\tvendor/lib",
      ].join("\n"),
    );
    assert.deepEqual(parsed, [{ oid: "a".repeat(40), path: "vendor/lib" }]);
  });

  it("fails closed on malformed .gitmodules missing url", () => {
    const modules = `[submodule "broken"]
	path = vendor/broken
`;
    const result = verifyGitlinkIntegrity({
      gitlinks: [{ path: "vendor/broken", oid: "1".repeat(40) }],
      gitmodulesExists: true,
      gitmodulesText: modules,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("missing url")));
  });

  it("parseGitmodules extracts path and url", () => {
    const entries = parseGitmodules(`[submodule "x"]
	path = libs/x
	url = https://example.com/x.git
`);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].path, "libs/x");
    assert.equal(entries[0].url, "https://example.com/x.git");
  });
});
