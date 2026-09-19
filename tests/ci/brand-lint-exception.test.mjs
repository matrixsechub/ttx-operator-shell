/**
 * F18 regression suite — proves the R9 raw-hex exception is a BOUNDED
 * architectural exception for one bootstrap file, not lint suppression.
 *
 * Pure-predicate cases assert the exception surface directly; subprocess cases
 * run the real lint so the proof is end-to-end rather than a restatement of
 * the implementation.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { R9_RAW_HEX_EXEMPT_FILES, isR9RawHexExempt } from "../../scripts/ci/brand-lint-exceptions.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LINT = join("scripts", "ci", "brand-conformance-lint.mjs");
const EXEMPT = "src/components/BootstrapErrorBoundary.tsx";
const RAW_HEX_COMPONENT = `export function Probe() {
  return <div style={{ background: "#050608", color: "#f0eee8" }}>probe</div>;
}
`;

/** Run the real lint. Returns exit status and combined output. */
function runLint() {
  try {
    const stdout = execFileSync("node", [LINT], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, output: stdout };
  } catch (error) {
    return { status: error.status ?? 1, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

/** Create a file, run the lint, always remove the file. */
function withTempFile(relPath, contents, fn) {
  const full = join(root, relPath);
  try {
    writeFileSync(full, contents);
    return fn();
  } finally {
    rmSync(full, { force: true });
  }
}

describe("F18 — R9 exception surface (pure)", () => {
  it("sanctions exactly one file, and the list is frozen", () => {
    assert.deepEqual([...R9_RAW_HEX_EXEMPT_FILES], [EXEMPT]);
    assert.equal(R9_RAW_HEX_EXEMPT_FILES.length, 1, "a second exemption is a governance change, not a lint fix");
    assert.ok(Object.isFrozen(R9_RAW_HEX_EXEMPT_FILES), "the allowlist must not be mutable at runtime");
    assert.throws(() => {
      R9_RAW_HEX_EXEMPT_FILES.push("src/components/Sneaky.tsx");
    }, "pushing a second exemption must throw rather than silently succeed");
    assert.deepEqual([...R9_RAW_HEX_EXEMPT_FILES], [EXEMPT]);
  });

  it("matches the sanctioned path exactly, in either separator style", () => {
    assert.equal(isR9RawHexExempt(EXEMPT), true);
    assert.equal(isR9RawHexExempt(EXEMPT.split("/").join("\\")), true);
  });

  it("does not exempt any other component", () => {
    for (const other of [
      "src/components/SystemHUD.tsx",
      "src/components/TelemetryPanel.tsx",
      "src/App.tsx",
      "src/pages/Dashboard.tsx",
    ]) {
      assert.equal(isR9RawHexExempt(other), false, `${other} must not be exempt`);
    }
  });

  it("loses the exemption when the target is renamed or moved", () => {
    for (const moved of [
      "src/components/BootstrapErrorBoundary2.tsx",
      "src/components/BootstrapErrorBoundaryV2.tsx",
      "src/BootstrapErrorBoundary.tsx",
      "src/components/bootstrap/BootstrapErrorBoundary.tsx",
      "src/components/boundary/BootstrapErrorBoundary.tsx",
    ]) {
      assert.equal(isR9RawHexExempt(moved), false, `${moved} must not inherit the exemption`);
    }
  });

  it("cannot be satisfied by substring, prefix, or suffix tricks", () => {
    for (const near of [
      `${EXEMPT}.bak`,
      `${EXEMPT}x`,
      `vendor/${EXEMPT}`,
      `../${EXEMPT}`,
      "src/components/",
      "src/components",
      "BootstrapErrorBoundary.tsx",
      "",
    ]) {
      assert.equal(isR9RawHexExempt(near), false, `"${near}" must not be exempt`);
    }
    for (const bad of [null, undefined, 42, {}, [EXEMPT]]) {
      assert.equal(isR9RawHexExempt(bad), false, "non-string input must not be exempt");
    }
  });
});

describe("F18 — R9 exception behavior (real lint)", () => {
  it("1. the current BootstrapErrorBoundary.tsx passes R9 and the whole lint is green", () => {
    const { status, output } = runLint();
    assert.equal(status, 0, `lint must exit 0; output:\n${output}`);
    assert.match(output, /Brand conformance lint passed/);
  });

  it("2. another component with equivalent raw hex still fails R9", () => {
    const probe = "src/components/__F18RawHexProbe.tsx";
    const { status, output } = withTempFile(probe, RAW_HEX_COMPONENT, runLint);
    assert.equal(status, 1, "an unsanctioned component with raw hex must fail the lint");
    assert.match(output, /\[R9\] src\/components\/__F18RawHexProbe\.tsx/);
  });

  it("3. a copy of the exempt file at another path fails R9 again", () => {
    const moved = "src/components/__F18MovedBoundary.tsx";
    const full = join(root, moved);
    let result;
    try {
      copyFileSync(join(root, EXEMPT), full);
      result = runLint();
    } finally {
      rmSync(full, { force: true });
    }
    assert.equal(result.status, 1, "moving/renaming the target must re-expose its raw hex");
    assert.match(result.output, /\[R9\] src\/components\/__F18MovedBoundary\.tsx/);
    // The original stays exempt in the same run.
    assert.doesNotMatch(result.output, /\[R9\] src\/components\/BootstrapErrorBoundary\.tsx/);
  });

  it("4. a second arbitrary exempt file is not silently permitted", () => {
    // Nothing but the frozen list grants exemption: a file that merely looks
    // like bootstrap infrastructure is still linted.
    const lookalike = "src/components/BootstrapErrorBoundaryFallback.tsx";
    const { status, output } = withTempFile(lookalike, RAW_HEX_COMPONENT, runLint);
    assert.equal(status, 1);
    assert.match(output, /\[R9\] src\/components\/BootstrapErrorBoundaryFallback\.tsx/);
  });

  it("5. the exemption covers R9 only — R10 still fires on the exempt file", () => {
    const full = join(root, EXEMPT);
    const original = readFileSync(full);
    let result;
    try {
      writeFileSync(full, `${original.toString()}\n// probe: <div className="text-zinc-400" />\n`);
      result = runLint();
    } finally {
      writeFileSync(full, original); // byte-exact restore
    }
    assert.deepEqual(readFileSync(full), original, "the exempt file must be restored byte-for-byte");
    assert.equal(result.status, 1, "R10 must still apply to the exempt file");
    assert.match(result.output, /\[R10\] src\/components\/BootstrapErrorBoundary\.tsx/);
    assert.doesNotMatch(result.output, /\[R9\] src\/components\/BootstrapErrorBoundary\.tsx/);
  });

  it("6. all other brand-conformance rules remain active", () => {
    const source = readFileSync(join(root, LINT), "utf8");
    // R9 is not disabled, and the exemption is consulted at exactly one site.
    assert.equal((source.match(/isR9RawHexExempt\(/g) ?? []).length, 1, "the exemption must be applied once, not sprinkled");
    assert.match(source, /fail\(rel, "R9"/, "R9 reporting must still exist");
    for (const rule of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R10", "R11", "R12", "R13", "R14", "R15"]) {
      assert.match(source, new RegExp(`"${rule}"`), `${rule} must remain enforced`);
    }
    // The exemption must never be expressed as a loose match.
    const exceptions = readFileSync(join(root, "scripts", "ci", "brand-lint-exceptions.mjs"), "utf8");
    for (const loose of [".includes(", ".startsWith(", ".endsWith(", "RegExp(", ".test("]) {
      assert.ok(
        !exceptions.includes(`normalized${loose}`) && !exceptions.includes(`exempt${loose}`),
        `exception matching must not use ${loose}`,
      );
    }
  });

  it("fails loudly if a sanctioned path stops existing", () => {
    const source = readFileSync(join(root, LINT), "utf8");
    assert.match(source, /sanctioned raw-hex exception points at a file that does not exist/);
  });
});

describe("F18a — raw-hex detection is stateless", () => {
  it("does not reuse a global regex for boolean tests", () => {
    const source = readFileSync(join(root, LINT), "utf8");
    // A /g regex keeps lastIndex between .test() calls and skipped roughly
    // every other violating line, silently under-reporting raw hex.
    assert.doesNotMatch(source, /HEX_RE\.test\(/, "HEX_RE is global; boolean checks must use HEX_TEST");
    assert.match(source, /const HEX_TEST = \/#\[0-9a-fA-F\]\{3,8\}\\b\/;/);
  });

  it("reports every raw-hex line in an unsanctioned file, not every other one", () => {
    const probe = "src/components/__F18MultiHexProbe.tsx";
    const body = `export function Probe() {
  const a = "#111111";
  const b = "#222222";
  const c = "#333333";
  const d = "#444444";
  return <div>{a}{b}{c}{d}</div>;
}
`;
    const { output } = withTempFile(probe, body, runLint);
    const hits = (output.match(/\[R9\] src\/components\/__F18MultiHexProbe\.tsx/g) ?? []).length;
    assert.equal(hits, 4, `all four raw-hex lines must be reported, got ${hits}`);
  });
});
