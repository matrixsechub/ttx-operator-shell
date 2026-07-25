#!/usr/bin/env node
/**
 * PEARL GOVERNANCE — static substrate + Living Layer check (R5-living)
 * ---------------------------------------------------------------------------
 * A DETERMINISTIC, pattern-based checker over the Pearl source. It enforces the
 * rules provable by static inspection; it does NOT claim semantic certainty it
 * cannot provide (see BOUNDARY below).
 *
 * SUBSTRATE RULES (everything under src/pearl-theme EXCEPT src/pearl-theme/living)
 *  P1  No raw decorative color literals in Pearl React components. Color belongs
 *      in tokens (pearl-theme.css). Components reference token classes/vars only.
 *  P2  No animation in the SUBSTRATE: `@keyframes`, `animation:` / `animation-*`,
 *      or `transition:` are forbidden in the substrate layer (CSS + components).
 *      Motion lives ONLY in the Living namespace (src/pearl-theme/living).
 *  P3  No unbounded durations in substrate CSS: `infinite` is forbidden there
 *      (the substrate ships zero animation at all).
 *  P4  Decorative green/red guard: emerald/red hues may appear ONLY on a
 *      `--color-state-*` token line (evidence-backed state), never as decorative
 *      atmosphere in component source or non-state CSS.
 *
 * LIVING RULES (src/pearl-theme/living — motion is allowed, but governed)
 *  L1  Motion belongs in living.css, not in JS: inline `animation:`/`transition:`
 *      style props inside Living TS/TSX are forbidden. (And by P2, animation may
 *      not appear anywhere outside the Living namespace at all.)
 *  L2  Reduced-motion nullification: if living.css animates, it MUST carry a
 *      `prefers-reduced-motion: reduce` block that nulls animation (`animation:
 *      none`).
 *  L3  Bounded motes / controlled timers: mote-spawning code must reference the
 *      cap (`maxMotes`); any `setInterval(` must have a matching `clearInterval(`.
 *  L5  No pointer-coordinate telemetry: pointer coords (`clientX`/`clientY`) may
 *      not co-occur with a network/telemetry sink (`fetch(`/`sendBeacon`/`.track(`).
 *  L6  One ambient behavior per primitive: a given primitive selector in
 *      living.css may carry at most one distinct ambient `animation-name`.
 *
 * BOUNDARY (honest limits): this is a LEXICAL scan. It cannot prove a color is
 * "decorative" vs "state" by intent; it cannot prove an animation is truly
 * bounded in amplitude, nor that a mote lifecycle is leak-free at runtime; L6's
 * "one behavior" is counted by distinct animation-name on a selector, not by
 * perceived behavior. It proves: zero animation outside the Living namespace,
 * zero raw component color literals, green/red confined to state tokens, a
 * reduced-motion null block exists, the mote cap and clearInterval are
 * referenced, and no pointer-coordinate telemetry sink is present. Everything
 * beyond that is a human-review item — runtime lifecycle correctness is proven
 * by the browser/unit tests, not here.
 *
 * Usage: `node scripts/ci/pearl-governance.mjs [rootDir]`
 *   default rootDir = repo. Pass a fixtures dir for self-tests.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const ANIM_RE = /@keyframes|(?:^|[^-])animation\s*:|animation-[a-z]+\s*:|transition\s*:/;
const INFINITE_RE = /\binfinite\b/;

/** Blank out /* … *​/ block comments, preserving newlines (line numbers stay stable). */
function blankBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, exts, out);
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

/** crude green/red hue classifier for a #rrggbb literal */
function isGreenOrRed(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const red = r > 150 && g < 90 && b < 90;
  const green = g > 120 && r < 120 && b < 130;
  return red || green;
}

/** Primitive selectors whose ambient behavior density L6 governs. */
const PRIMITIVE_TOKENS = [
  ".pearl-orb--beacon",
  ".pearl-orb--aurelius",
  ".pearl-orb--hsx",
  ".pearl-orb--ghost",
  ".pearl-spark",
  ".pearl-tele-val",
  ".pearl-living-panel",
  ".pearl-tide",
  ".pearl-fog",
  ".pearl-halo",
  ".pearl-mote",
];

/** Living-namespace CSS rules: L2 (reduced-motion null) + L6 (one ambient/primitive). */
function runLivingCssRules(file, css, fail) {
  const animates = /@keyframes/.test(css) || /animation\s*:/.test(css);
  if (animates) {
    const hasReduced = /prefers-reduced-motion\s*:\s*reduce/.test(css);
    const nullsAnim = /animation\s*:\s*none/.test(css);
    if (!hasReduced) {
      fail(file, "L2", "Living CSS animates but declares no prefers-reduced-motion:reduce block");
    } else if (!nullsAnim) {
      fail(file, "L2", "prefers-reduced-motion block present but does not null animation (animation: none)");
    }
  }

  // L6: count distinct ambient animation-names per gated primitive selector.
  const byPrimitive = new Map();
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(css)) !== null) {
    const sel = m[1];
    const body = m[2];
    if (!sel.includes('[data-living="on"]')) continue; // only gated ambient rules
    const am = body.match(/animation\s*:\s*([a-zA-Z][\w-]*)/);
    if (!am || am[1] === "none") continue;
    for (const tok of PRIMITIVE_TOKENS) {
      if (sel.includes(tok)) {
        if (!byPrimitive.has(tok)) byPrimitive.set(tok, new Set());
        byPrimitive.get(tok).add(am[1]);
      }
    }
  }
  for (const [tok, names] of byPrimitive) {
    if (names.size > 1) {
      fail(file, "L6", `primitive ${tok} carries ${names.size} distinct ambient animations (${[...names].join(", ")}); max one ambient behavior per primitive`);
    }
  }
}

export function runPearlGovernance(rootDir) {
  const pearlDir = path.join(rootDir, "src", "pearl-theme");
  const livingDir = path.join(pearlDir, "living");
  const failures = [];
  const fail = (file, rule, msg) => failures.push({ file: path.relative(rootDir, file), rule, msg });
  const underLiving = (f) => f === livingDir || f.startsWith(livingDir + path.sep);

  // ── Component/preview source (.tsx/.ts), substrate + living ──────────────
  const srcFiles = walk(pearlDir, [".tsx", ".ts"]).filter(
    (f) => !f.endsWith(".test.tsx") && !f.endsWith(".test.ts"),
  );
  for (const file of srcFiles) {
    const living = underLiving(file);
    const blanked = blankBlockComments(readFileSync(file, "utf8"));

    blanked.split("\n").forEach((line, i) => {
      const n = i + 1;
      const hexes = line.match(new RegExp(HEX_RE, "g")) ?? [];
      for (const hx of hexes) {
        fail(file, "P1", `line ${n}: raw color literal ${hx} in component source (use tokens)`);
        if (isGreenOrRed(hx)) fail(file, "P4", `line ${n}: decorative green/red literal ${hx} outside state tokens`);
      }
      if (ANIM_RE.test(line)) {
        if (living) fail(file, "L1", `line ${n}: inline animation/transition in Living source (declare motion in living.css, not JS style props)`);
        else fail(file, "P2", `line ${n}: animation/transition in substrate source (motion belongs to src/pearl-theme/living)`);
      }
    });

    // Living-namespace lifecycle rules (whole-file, comment-stripped).
    if (living) {
      if (/setInterval\s*\(/.test(blanked) && !/clearInterval\s*\(/.test(blanked)) {
        fail(file, "L3", "setInterval without a matching clearInterval (uncontrolled recurring timer)");
      }
      if (/pearl-mote\b/.test(blanked) && !/(maxMotes|MAX_MOTES)/.test(blanked)) {
        fail(file, "L3", "mote-spawning code does not reference the mote cap (maxMotes)");
      }
      if (/\bclientX\b|\bclientY\b/.test(blanked) && /(fetch\s*\(|sendBeacon|\.track\s*\()/.test(blanked)) {
        fail(file, "L5", "pointer coordinates near a network/telemetry sink (pointer-coordinate telemetry forbidden)");
      }
    }
  }

  // ── CSS, substrate + living ──────────────────────────────────────────────
  const cssFiles = walk(pearlDir, [".css"]);
  for (const file of cssFiles) {
    const living = underLiving(file);
    const css = blankBlockComments(readFileSync(file, "utf8"));

    css.split("\n").forEach((line, i) => {
      const n = i + 1;
      const isStateToken = /--color-state-[a-z-]+\s*:/.test(line);
      const hexes = line.match(new RegExp(HEX_RE, "g")) ?? [];
      for (const hx of hexes) {
        if (isGreenOrRed(hx) && !isStateToken) {
          fail(file, "P4", `line ${n}: green/red literal ${hx} outside a --color-state-* token (decorative use forbidden)`);
        }
      }
      if (!living) {
        if (ANIM_RE.test(line)) fail(file, "P2", `line ${n}: animation/transition in substrate CSS (motion belongs to src/pearl-theme/living)`);
        if (INFINITE_RE.test(line)) fail(file, "P3", `line ${n}: unbounded (infinite) duration`);
      }
    });

    if (living) runLivingCssRules(file, css, fail);
  }

  return failures;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : REPO;
  const failures = runPearlGovernance(root);
  if (failures.length) {
    console.error(`Pearl governance FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  [${f.rule}] ${f.file}: ${f.msg}`);
    process.exit(1);
  }
  console.log("Pearl governance passed: substrate animation-free + token-only; Living Layer motion confined to src/pearl-theme/living, reduced-motion nulled, motes capped, no pointer telemetry, one ambient behavior per primitive.");
  console.log("BOUNDARY: lexical scan — proves motion is confined to the Living namespace with a reduced-motion null block, the mote cap + clearInterval are referenced, and no pointer-coordinate telemetry sink is present. Runtime lifecycle correctness (leak-free teardown, amplitude bounds) is proven by the browser/unit tests, not here.");
}
