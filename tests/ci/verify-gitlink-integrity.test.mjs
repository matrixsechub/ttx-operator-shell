import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  inspectRepositoryGitlinks,
  listGitlinksFromLsTree,
  oidLengthForFormat,
  parseGitmodules,
  sanitizeDiagnosticText,
  verifyGitlinkIntegrity,
  wrapGitCommandError,
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
      { oidLength: 40 },
    );
    assert.deepEqual(parsed, [{ oid: "a".repeat(40), path: "vendor/lib" }]);
  });

  it("accepts a valid SHA-1 gitlink OID", () => {
    const oid = "a".repeat(40);
    const parsed = listGitlinksFromLsTree(
      `160000 commit ${oid}\tvendor/lib`,
      { oidLength: 40 },
    );
    assert.deepEqual(parsed, [{ oid, path: "vendor/lib" }]);
  });

  it("accepts a valid SHA-256 gitlink OID", () => {
    const oid = "b".repeat(64);
    const parsed = listGitlinksFromLsTree(
      `160000 commit ${oid}\tvendor/lib`,
      { oidLength: 64 },
    );
    assert.deepEqual(parsed, [{ oid, path: "vendor/lib" }]);
  });

  it("rejects malformed and wrong-length OIDs", () => {
    const sha1Context = [
      // truncated SHA-1
      "160000 commit " + "a".repeat(39) + "\tvendor/short",
      // non-hex
      "160000 commit " + "g".repeat(40) + "\tvendor/badhex",
      // SHA-256 OID when parser expects SHA-1 length
      "160000 commit " + "c".repeat(64) + "\tvendor/sha256-as-sha1",
      // empty oid slot
      "160000 commit \tvendor/empty",
    ].join("\n");
    assert.deepEqual(listGitlinksFromLsTree(sha1Context, { oidLength: 40 }), []);

    const sha256Context = [
      "160000 commit " + "a".repeat(63) + "\tvendor/short256",
      "160000 commit " + "g".repeat(64) + "\tvendor/badhex256",
      // SHA-1 OID when parser expects SHA-256 length
      "160000 commit " + "d".repeat(40) + "\tvendor/sha1-as-sha256",
      "160000 commit \tvendor/empty256",
    ].join("\n");
    assert.deepEqual(
      listGitlinksFromLsTree(sha256Context, { oidLength: 64 }),
      [],
    );
  });

  it("maps object formats to OID lengths and rejects unsupported formats", () => {
    assert.equal(oidLengthForFormat("sha1"), 40);
    assert.equal(oidLengthForFormat("SHA1"), 40);
    assert.equal(oidLengthForFormat("sha256"), 64);
    assert.throws(
      () => oidLengthForFormat("blake2"),
      /unsupported object format/,
    );
    assert.throws(() => oidLengthForFormat(""), /unsupported object format/);
  });

  it("wraps git command failures with actionable diagnostics", () => {
    const cause = Object.assign(new Error("spawn failed"), {
      status: 128,
      stderr: "fatal: not a git repository\n",
    });
    const wrapped = wrapGitCommandError({
      operation: "git ls-tree -r HEAD",
      revision: "HEAD",
      root: "/tmp/not-a-repo",
      error: cause,
    });
    assert.match(wrapped.message, /GITLINK_INTEGRITY::FAIL/);
    assert.match(wrapped.message, /git ls-tree -r HEAD/);
    assert.match(wrapped.message, /revision='HEAD'/);
    assert.match(wrapped.message, /exit=128/);
    assert.match(wrapped.message, /not a git repository/);
    assert.equal(wrapped.cause, cause);
  });

  it("sanitizes diagnostic text without leaking control characters", () => {
    const cleaned = sanitizeDiagnosticText("fatal:\x1b[31m boom\x00\n\t  ");
    assert.equal(cleaned.includes("\x1b"), false);
    assert.equal(cleaned.includes("\x00"), false);
    assert.match(cleaned, /fatal:.*boom/);
  });

  it("inspectRepositoryGitlinks fails with diagnostics outside a git repo", () => {
    const dir = mkdtempSync(join(tmpdir(), "gitlink-integrity-"));
    try {
      assert.throws(
        () => inspectRepositoryGitlinks(dir),
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /GITLINK_INTEGRITY::FAIL/);
          assert.match(
            err.message,
            /git (rev-parse --show-object-format=storage|ls-tree -r HEAD)/,
          );
          assert.match(err.message, /exit=/);
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
