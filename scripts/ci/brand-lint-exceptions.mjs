/**
 * BRAND CONFORMANCE LINT — SANCTIONED EXCEPTIONS
 * ---------------------------------------------------------------------------
 * Pure, side-effect-free. Imported by scripts/ci/brand-conformance-lint.mjs
 * and by tests/ci/brand-lint-exception.test.mjs. Keep it free of I/O so the
 * exception surface can be asserted without executing the lint.
 *
 * R9 ("no raw hex in src/") has exactly ONE sanctioned exception.
 *
 * WHY src/components/BootstrapErrorBoundary.tsx IS EXCEPTIONAL
 * ---------------------------------------------------------------------------
 * It is bootstrap / error-recovery infrastructure, not a product surface. It
 * renders only when the React root has already failed to start, which is
 * precisely the situation in which the token substrate cannot be assumed:
 * `src/styles/index.css`, `entity-tokens.css`, and the op-* / entity-* utility
 * layer may all have failed to load, parse, or apply. Every color it uses is
 * therefore an inline literal with no stylesheet dependency, so the operator
 * still gets a readable failure state and a reload affordance when everything
 * else is gone.
 *
 * Rewriting those literals as op-* / entity-* utilities to satisfy the lint
 * would make the last-resort error surface depend on the very substrate whose
 * absence it exists to report. Operator decision, 2026-09-17: keep the
 * literals, sanction the file explicitly, and do not weaken R9 anywhere else.
 *
 * SCOPE OF THE EXCEPTION
 *   - R9 raw-hex reporting ONLY. R10 (named palettes), R11 (arbitrary hex
 *     utilities) and R15 (debug capture) still apply to this file.
 *   - Exact repository-relative path equality. Not a prefix, not a suffix,
 *     not a substring, not a glob, not a directory.
 *   - Renaming or moving the file removes the exception, because the new path
 *     is not in the list. The lint additionally fails if a listed path does
 *     not exist, so a stale exception cannot rot unnoticed.
 *
 * ADDING ANOTHER ENTRY IS A GOVERNANCE CHANGE, NOT A LINT FIX.
 * It requires an Operator decision and must update the regression tests in
 * tests/ci/brand-lint-exception.test.mjs, which assert this list exactly.
 */

/** Repository-relative, POSIX-separated. Exactly one sanctioned entry. */
export const R9_RAW_HEX_EXEMPT_FILES = Object.freeze(["src/components/BootstrapErrorBoundary.tsx"]);

/**
 * Exact-path membership test. Accepts a repository-relative path in either
 * separator style and compares it whole; no substring or prefix matching.
 *
 * @param {string} relativePath repository-relative path, e.g. "src/components/Foo.tsx"
 * @returns {boolean} true only for a sanctioned R9 raw-hex exception
 */
export function isR9RawHexExempt(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) return false;
  const normalized = relativePath.split("\\").join("/");
  // Whole-string equality against a frozen list. Deliberately not .includes(),
  // .startsWith(), .endsWith(), or a RegExp — those are how exceptions leak.
  return R9_RAW_HEX_EXEMPT_FILES.some((exempt) => exempt === normalized);
}
