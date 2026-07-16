#!/usr/bin/env node
/**
 * PEARL-SPECTRAL OS — BRAND CONFORMANCE LINT (Track 1, CI-gated)
 * ---------------------------------------------------------------------------
 * Enforces token discipline and design doctrine across the governed public
 * surface set. Run via `npm run lint:brand`; wired into the reusable
 * build-test CI workflow so every PR/push is gated.
 *
 * RULES
 *  R1  Token discipline — raw hex colors may appear ONLY:
 *        a) anywhere inside a registered pure token file
 *           (rgbgold-tokens.css, entity-tokens.css, a11y.css),
 *        b) in custom-property declarations (`--x: ...`) inside registered
 *           token-source files (styles.css, splash.html's embedded system),
 *        c) as a var() fallback — `var(--token, #hex)` — anywhere,
 *        d) in the functional mask-compositing pattern
 *           `linear-gradient(#fff 0 0)`.
 *      Everything else is a rogue color.
 *  R2  No rogue palettes — every var() fallback hex must equal the
 *      canonical declared value of the referenced token (resolved through
 *      var() chains), so no token quietly forks.
 *  R3  Entity namespace — `--entity-*` tokens may be DECLARED only in
 *      entity-tokens.css (component files may bind the per-element
 *      `--entity-accent*` indirection slots, nothing else).
 *  R4  Contrast doctrine — every base entity token (--entity-beacon,
 *      -aurelius, -hsx, -ghost, -operator) must hold >= 4.5:1 contrast
 *      against the app background (--bg).
 *  R5  Motion doctrine — any governed stylesheet (or embedded <style>)
 *      that declares @keyframes must also carry a
 *      `prefers-reduced-motion: reduce` block.
 *  R6  Focus doctrine — governed surfaces must retain a :focus-visible
 *      treatment (styles.css global rule for token-linked pages; an own
 *      rule for self-contained pages like splash.html).
 *  R7  Funnel conformance — every governed funnel page must link
 *      entity-tokens.css + entity-cues.css + a11y.css, carry at least one
 *      entity voice cue, load the capture layer (flow-tracker.js), and
 *      tag at least one CTA with data-flow-cta.
 *  R8  Asset integrity — every local stylesheet/script a governed page
 *      references must exist (no dead includes).
 *
 * TRACK 3 — OS-WIDE RULES (cockpit / dashboard / marketplace / src)
 *  R9   No raw hex in src/ — the React OS surfaces may declare hex only
 *       in src/styles/index.css custom-property (@theme) declarations.
 *  R10  No named Tailwind palettes — utilities like text-zinc-400 or
 *       bg-emerald-950 are rogue palettes; only op-* / entity-* token
 *       utilities are governed.
 *  R11  No arbitrary hex utilities — class fragments like bg-[#141416].
 *  R12  Shell conformance — every Vite shell links the entity substrate
 *       (entity-tokens.css + entity-cues.css); PUBLIC shells (ecosystem,
 *       storefront, app index) load the capture layer; OPERATOR shells
 *       (cockpit, auth, council) must NOT load growth capture.
 *  R13  Surface voice — key OS surface components render <EntityVoice.
 *  R14  OS-wide capture — every non-operator public/*.html page loads
 *       flow-tracker.js (operator consoles are policy-excluded).
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(ROOT, "public");

/** Pure token files: hex allowed anywhere (they contain only tokens). */
const PURE_TOKEN_FILES = [
  "styles/rgbgold-tokens.css",
  "styles/entity-tokens.css",
  "styles/a11y.css",
];

/** Token-source files: hex allowed only in custom-property declarations. */
const DECLARATION_ONLY_FILES = ["styles.css", "splash.html"];

/** Governed stylesheets (all shared + page CSS under public/). */
const GOVERNED_CSS = [
  "styles.css",
  "styles/rgbgold-tokens.css",
  "styles/entity-tokens.css",
  "styles/entity-cues.css",
  "styles/rgbgold-motion.css",
  "styles/rgbgold-components.css",
  "styles/rgbgold-hud.css",
  "styles/rgbgold-hooks.css",
  "styles/nav.css",
  "styles/splash.css",
  "styles/a11y.css",
  "styles/growth-indicators.css",
  "styles/intake-demo-banner.css",
  "styles/onboarding.css",
  "enter.css",
  "intake.css",
  "register.css",
  "start.css",
  "ecosystem.css",
  "about.css",
  "contact.css",
  "status.css",
  "roadmap.css",
  "docs.css",
  "mission.css",
  "scenario.css",
];

/** Funnel surfaces under full Track 1 conformance (R7). */
const FUNNEL_PAGES = [
  "root-funnel.html",
  "services.html",
  "enter.html",
  "intake.html",
  "register.html",
  "onboarding.html",
  "start.html",
];

/** Governed pages checked for token discipline + asset integrity (R1, R8). */
const GOVERNED_HTML = [...FUNNEL_PAGES, "splash.html", "welcome.html"];

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const failures = [];

function read(rel) {
  return readFileSync(path.join(PUBLIC, rel), "utf8");
}

function fail(file, rule, message) {
  failures.push(`  [${rule}] ${file}: ${message}`);
}

/* ── Token registry (resolving var() chains to canonical hex) ─────────── */

function collectDeclarations(css, registry) {
  const declRe = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = declRe.exec(css)) !== null) {
    if (!(match[1] in registry)) registry[match[1]] = match[2].trim();
  }
}

const registry = {};
for (const file of [...PURE_TOKEN_FILES, ...DECLARATION_ONLY_FILES]) {
  collectDeclarations(read(file), registry);
}

function resolveToken(name, seen = new Set()) {
  if (seen.has(name)) return undefined;
  seen.add(name);
  const value = registry[name];
  if (!value) return undefined;
  const hex = value.match(/^#[0-9a-fA-F]{3,8}$/);
  if (hex) return hex[0].toLowerCase();
  const chain = value.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*(#[0-9a-fA-F]{3,8}))?\s*\)$/);
  if (chain) return resolveToken(chain[1], seen) ?? chain[2]?.toLowerCase();
  return undefined;
}

/* ── R1 + R2: token discipline and rogue-palette fallback checks ──────── */

function normalizeHex(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  return `#${h}`;
}

function checkCssText(file, css, { declarationOnlyHex, pureTokenFile }) {
  const lines = css.split("\n");
  lines.forEach((line, index) => {
    const lineNo = index + 1;

    // R2: validate every var(--x, #hex) fallback against the registry.
    const fallbackRe = /var\(\s*(--[a-zA-Z0-9-]+)\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g;
    let fb;
    while ((fb = fallbackRe.exec(line)) !== null) {
      const canonical = resolveToken(fb[1]);
      if (canonical && normalizeHex(fb[2]) !== normalizeHex(canonical)) {
        fail(file, "R2", `line ${lineNo}: fallback ${fb[2]} forks token ${fb[1]} (canonical ${canonical})`);
      }
    }

    if (pureTokenFile) return;

    // Strip allowed hex contexts, then flag whatever hex remains.
    let stripped = line.replace(fallbackRe, "var()");
    stripped = stripped.replace(/linear-gradient\(#fff(?:fff)?\s+0\s+0\)/gi, "mask()");
    const isDeclaration = /^\s*--[a-zA-Z0-9-]+\s*:/.test(line);
    if (isDeclaration && declarationOnlyHex) return;

    const rogue = stripped.match(HEX_RE);
    if (rogue) {
      fail(file, "R1", `line ${lineNo}: raw hex ${rogue.join(", ")} outside the token system`);
    }
  });
}

for (const file of GOVERNED_CSS) {
  if (!existsSync(path.join(PUBLIC, file))) {
    fail(file, "R8", "governed stylesheet missing from public/");
    continue;
  }
  checkCssText(file, read(file), {
    pureTokenFile: PURE_TOKEN_FILES.includes(file),
    declarationOnlyHex: DECLARATION_ONLY_FILES.includes(file),
  });
}

/* ── R3: --entity-* declarations live only in entity-tokens.css ───────── */

const ENTITY_BIND_SLOTS = new Set([
  "--entity-accent",
  "--entity-accent-dim",
  "--entity-accent-glow",
  "--entity-accent-veil",
  "--entity-accent-line",
]);

for (const file of GOVERNED_CSS) {
  if (file === "styles/entity-tokens.css" || !existsSync(path.join(PUBLIC, file))) continue;
  const declRe = /(--entity-[a-zA-Z0-9-]+)\s*:/g;
  let match;
  while ((match = declRe.exec(read(file))) !== null) {
    if (!ENTITY_BIND_SLOTS.has(match[1])) {
      fail(file, "R3", `declares ${match[1]} outside entity-tokens.css`);
    }
  }
}

/* ── R4: entity base tokens hold >= 4.5:1 contrast against --bg ───────── */

function luminance(hex) {
  const h = normalizeHex(hex).slice(1);
  const channel = (c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(h.slice(0, 2)) +
    0.7152 * channel(h.slice(2, 4)) +
    0.0722 * channel(h.slice(4, 6))
  );
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const bg = resolveToken("--bg");
if (!bg) {
  fail("styles.css", "R4", "cannot resolve --bg for contrast checks");
} else {
  for (const entity of ["beacon", "aurelius", "hsx", "ghost", "operator"]) {
    const token = `--entity-${entity}`;
    const value = resolveToken(token);
    if (!value) {
      fail("styles/entity-tokens.css", "R4", `cannot resolve ${token} to a hex value`);
      continue;
    }
    const ratio = contrast(value, bg);
    if (ratio < 4.5) {
      fail("styles/entity-tokens.css", "R4", `${token} (${value}) is ${ratio.toFixed(2)}:1 against --bg (${bg}); doctrine requires >= 4.5:1`);
    }
  }
}

/* ── R5 + R6: motion and focus doctrine ───────────────────────────────── */

for (const file of GOVERNED_CSS) {
  if (!existsSync(path.join(PUBLIC, file))) continue;
  const css = read(file);
  if (/@keyframes/.test(css) && !/prefers-reduced-motion/.test(css)) {
    fail(file, "R5", "declares @keyframes without a prefers-reduced-motion block");
  }
}

{
  const splash = read("splash.html");
  if (/@keyframes/.test(splash) && !/prefers-reduced-motion/.test(splash)) {
    fail("splash.html", "R5", "embedded styles animate without a prefers-reduced-motion block");
  }
  if (!/:focus-visible/.test(splash)) {
    fail("splash.html", "R6", "self-contained surface lacks a :focus-visible treatment");
  }
  if (!/:focus-visible/.test(read("styles.css"))) {
    fail("styles.css", "R6", "global :focus-visible treatment missing");
  }
}

/* ── R7 + R8: funnel conformance and asset integrity ──────────────────── */

for (const page of GOVERNED_HTML) {
  if (!existsSync(path.join(PUBLIC, page))) {
    fail(page, "R8", "governed page missing from public/");
    continue;
  }
  const html = read(page);

  // R8: every local stylesheet/script include must exist on disk.
  const includeRe = /(?:href|src)="(\/(?:styles|scripts)\/[^"]+|\/[a-z0-9-]+\.(?:css|js))"/g;
  let inc;
  while ((inc = includeRe.exec(html)) !== null) {
    const rel = inc[1].replace(/^\//, "");
    if (!existsSync(path.join(PUBLIC, rel))) {
      fail(page, "R8", `references missing asset ${inc[1]}`);
    }
  }

  // R1 (HTML): no raw hex in inline style attributes.
  const inlineStyleRe = /style="([^"]*)"/g;
  let style;
  while ((style = inlineStyleRe.exec(html)) !== null) {
    if (HEX_RE.test(style[1])) {
      fail(page, "R1", `inline style carries raw hex: style="${style[1]}"`);
    }
  }

  if (page === "welcome.html" || page === "splash.html") continue; // redirect stub / legacy (Track 2 rebuild target)

  // R7: funnel conformance.
  for (const sheet of ["/styles/entity-tokens.css", "/styles/entity-cues.css", "/styles/a11y.css"]) {
    if (!html.includes(sheet)) fail(page, "R7", `missing required stylesheet ${sheet}`);
  }
  if (!/class="entity-voice[" ]/.test(html) || !/data-entity="/.test(html)) {
    fail(page, "R7", "missing entity voice cue (class=\"entity-voice\" + data-entity)");
  }
  if (!html.includes("/scripts/flow-tracker.js")) {
    fail(page, "R7", "capture layer not loaded (/scripts/flow-tracker.js)");
  }
  if (!/data-flow-cta="/.test(html)) {
    fail(page, "R7", "no CTA tagged with data-flow-cta (capture coverage gap)");
  }
}

/* ── TRACK 3: OS-wide rules (src/, shells, capture policy) ────────────── */

const SRC = path.join(ROOT, "src");

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((ext) => name.endsWith(ext))) out.push(full);
  }
  return out;
}

const SRC_TOKEN_SOURCE = path.join(SRC, "styles", "index.css");
const NAMED_PALETTE_RE =
  /\b(?:text|bg|border|ring|from|to|via|outline|fill|stroke|decoration|divide|accent|caret|shadow)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/;
const ARBITRARY_HEX_UTILITY_RE = /-\[#[0-9a-fA-F]{3,8}\]/;

for (const file of walk(SRC, [".tsx", ".ts", ".css"])) {
  const rel = path.relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  const isTokenSource = file === SRC_TOKEN_SOURCE;

  text.split("\n").forEach((line, index) => {
    const lineNo = index + 1;

    if (isTokenSource) {
      // @theme token source: hex only in custom-property declarations.
      if (HEX_RE.test(line) && !/^\s*--[a-zA-Z0-9-]+\s*:/.test(line)) {
        fail(rel, "R9", `line ${lineNo}: raw hex outside a custom-property declaration`);
      }
      return;
    }

    // HTML numeric character references (&#9650;) are not colors.
    const deEntitied = line.replace(/&#\d+;/g, "");
    if (HEX_RE.test(deEntitied) && !/color-scheme|href=|glyph|#root/.test(line)) {
      fail(rel, "R9", `line ${lineNo}: raw hex in OS surface code (use op-*/entity-* tokens)`);
    }
    const named = line.match(NAMED_PALETTE_RE);
    if (named) {
      fail(rel, "R10", `line ${lineNo}: rogue named palette utility "${named[0]}"`);
    }
    if (ARBITRARY_HEX_UTILITY_RE.test(line)) {
      fail(rel, "R11", `line ${lineNo}: arbitrary hex utility (use op-*/entity-* tokens)`);
    }
  });
}

const PUBLIC_SHELLS = ["ecosystem.html", "storefront.html", "index.html"];
const OPERATOR_SHELLS = ["cockpit.html", "auth.html", "council.html"];

for (const shell of [...PUBLIC_SHELLS, ...OPERATOR_SHELLS]) {
  const full = path.join(ROOT, shell);
  if (!existsSync(full)) {
    fail(shell, "R12", "Vite shell missing from repo root");
    continue;
  }
  const html = readFileSync(full, "utf8");
  for (const sheet of ["/styles/entity-tokens.css", "/styles/entity-cues.css"]) {
    if (!html.includes(sheet)) fail(shell, "R12", `shell missing entity substrate ${sheet}`);
  }
  const hasCapture = html.includes("/scripts/flow-tracker.js");
  if (PUBLIC_SHELLS.includes(shell) && !hasCapture) {
    fail(shell, "R12", "public shell missing capture layer (/scripts/flow-tracker.js)");
  }
  if (OPERATOR_SHELLS.includes(shell) && hasCapture) {
    fail(shell, "R12", "operator shell must not load growth capture (policy exclusion)");
  }
}

const VOICE_SURFACES = [
  "src/pages/Dashboard.tsx",
  "src/pages/Marketplace.tsx",
  "src/pages/StorefrontMarketplace.tsx",
  "src/pages/Status.tsx",
  "src/pages/Login.tsx",
  "src/pages/EcosystemSplash.tsx",
  "src/pages/LiveJoin.tsx",
  "src/pages/ops/DeployOps.tsx",
  "src/pages/ops/FedGradeOps.tsx",
  "src/pages/ops/SecurityOps.tsx",
  "src/operator/ttx/index.tsx",
];

for (const rel of VOICE_SURFACES) {
  const full = path.join(ROOT, rel);
  if (!existsSync(full)) {
    fail(rel, "R13", "voice-governed surface missing");
    continue;
  }
  if (!readFileSync(full, "utf8").includes("<EntityVoice")) {
    fail(rel, "R13", "surface does not render an <EntityVoice> cue");
  }
}

for (const name of readdirSync(PUBLIC)) {
  if (!name.endsWith(".html") || name.endsWith("-operator.html")) continue;
  if (!readFileSync(path.join(PUBLIC, name), "utf8").includes("/scripts/flow-tracker.js")) {
    fail(name, "R14", "public page missing capture layer (/scripts/flow-tracker.js)");
  }
}

/* ── Report ───────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error(`Brand conformance lint FAILED (${failures.length} finding${failures.length === 1 ? "" : "s"}):\n`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Brand conformance lint passed: ${GOVERNED_CSS.length} stylesheets, ${GOVERNED_HTML.length} funnel/legacy pages, ` +
    `src/ OS surfaces + 6 shells + ${VOICE_SURFACES.length} voice surfaces, ` +
    `${Object.keys(registry).length} tokens in registry, entity contrast verified against --bg.`,
);
