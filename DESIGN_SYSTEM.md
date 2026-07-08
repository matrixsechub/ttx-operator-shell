# MSHOPS Operator Shell — Design System Notes

This file tracks the front-end design system for `ttx-operator-shell` (RGB + Gold, Matrix-Tron, MGS-inspired operator aesthetic).

## Stylesheet load order

All pages load stylesheets in this dependency order:

1. `styles/rgbgold-tokens.css` — base design tokens (colors, spacing, motion durations/easings)
2. `styles/rgbgold-motion.css` — motion utilities (`.reveal`, `.glow-pulse`, `.shimmer`, `.hue-travel`)
3. `styles/rgbgold-components.css` — additive component classes (`.btn`, `.badge-status`, `.card`, `.hud-card`, `.pricing-tier`, etc.)
4. `styles/rgbgold-hud.css` — HUD tag component (`.hud-tag`)
5. Page-level stylesheet (`styles.css`, `marketplace.css`, `mission.css`, `os.css`, `api-explorer.css`, or `modules/module.css`)
6. `styles/a11y.css` — accessibility mode overrides (high contrast, reduced motion, focus styling)

## Retired assets

- **Legacy operator/intro assets retired during the Orphaned Asset Retirement Pass (July 2026).** `public/operator.css`, `public/operator.js`, and `public/intro.js` were removed after a full reference scan confirmed they were not linked from any HTML page, not imported by any script, not referenced by Worker asset-serving logic, and that every CSS class they defined (e.g. `.operator-panel`, `.ucip-badge`, `.command-bar`) was already covered by active stylesheets (`mission.css`, `marketplace.css`, `a11y.css`, `rgbgold-*`). No active or future surfaces depend on them.

## Ecosystem Expansion Hooks

Added during the Ecosystem Expansion Activation Pass (July 2026), `styles/rgbgold-hooks.css` (loaded after `rgbgold-hud.css`, before the page's own stylesheet — see load order above) defines **attachment points**, not components. They are distinct from the visual components in `rgbgold-components.css` (`.module-card`, `.operator-panel`, `.marketplace-entry`, `.rgbgold-module-shell`, `.operator-surface`): those are the things a future module is built *with*; the hooks below are inert, pre-wired placeholders already sitting in live page markup so a future pass can inject a new module, operator surface, marketplace entry, or cinematic component **without editing existing page HTML again**.

Every hook element ships with the native `hidden` attribute (zero visual/layout footprint, skipped by assistive tech) and its CSS class also collapses via `:empty` as a second safety net. To activate a hook: remove `hidden`, insert real content (ideally built from `rgbgold-components.css` primitives), and optionally add `.reveal`/`.hud-frame`/`.hud-card`/`.hue-travel` for motion/HUD framing (check the pseudo-element budget table in `rgbgold-hud.css` first).

| Hook class | Data attribute | Where it lives | Future use |
|---|---|---|---|
| `.module-expansion-hook` | `data-module-hook` | End of `.module-shell` on all 5 module detail pages (`/public/modules/*.html`) | New module detail layouts without a page rewrite |
| `.operator-surface-hook` | `data-operator-surface` | End of `<main>` on all 8 operator console pages (`operator.html`, `service-intake.html`, `operator-agents-intake.html`, `operator-agents-security-intake.html`, `audit-lite-operator.html`, `prompt-injection-scans-operator.html`, `agent-readiness-operator.html`, `automation-roi-operator.html`) | An entirely new operator section |
| `.operator-panel-hook` | — (nested inside `.operator-surface-hook`) | Same 8 pages | A single new panel inside an existing operator surface |
| `.marketplace-growth-hook` | `data-marketplace-entry` | End of the "Internal service modules" section in `marketplace.html` | New services/agents/modules appended without touching `marketplace.js` render logic |
| `.cinematic-hook` | `data-cinematic` | Hero sections of `index.html`, `services.html`, `marketplace.html`, `mission.html`, `os.html`, `enter.html` | Future RGB+Gold cinematic components (hero visualizations, live status ribbons). Owns zero pseudo-elements, so it composes cleanly with `.reveal`, `.shimmer`, `.hue-travel`, and any `.hud-frame`/`.hud-card` on sibling/parent elements |
| `.a11y-hook` | `data-a11y-override` | One representative instance alongside each hook category above (module page, operator page, marketplace page) | Marks ecosystem scaffolding for `a11y.js`/audits; content inside should use the existing generic overrides already defined in `a11y.css` (`.a11y-override-card`, `.a11y-override-badge`, `.a11y-override-hud`) — **no edits to `a11y.css` required** for a new module to be Accessibility Mode-compliant |

Accessibility Mode and `prefers-reduced-motion` remain fully independent of these hooks: since every hook is empty and `hidden` by default, `body.a11y-mode` and the reduced-motion media query in `rgbgold-motion.css` have nothing to act on until a hook is populated — at which point whatever component is inserted inherits the same governance as any other page content, per the registration checklist already documented in `a11y.css`.

## Scenario Engine (Operator Scenario Engine UI Integration Pass, July 2026)

`public/scenario.html` is the first live page built entirely on the RGB+Gold system rather than layered onto a pre-existing page - it loads the full `rgbgold-*` cascade plus a new page-only stylesheet, `public/scenario.css`, and a new page-only script, `public/scripts/scenario.js`. It introduces three reusable components (`.scenario-control-panel`, `.scenario-timeline`, `.scenario-event-feed`) and a documented `data-scenario-*` attribute contract for future integration. Full documentation lives in the marketing repo's `public/DESIGN_SYSTEM.md` §32-36 (this repo's own doc uses narrative, unnumbered sections, so the numbered write-up for this pass continues there rather than duplicating it here).

Reachable today only at the literal static path `/scenario.html` (served by the Cloudflare Assets binding) - no `worker/index.js` route was added for a clean `/scenario` path, per this pass's backend/Worker-free scope. `scenario.js` never calls a backend, Worker, or Scenario Engine API; all scenario lifecycle state is simulated client-side for UI integration purposes only.

## Scenario Engine ↔ Doctrine OS Integration (Scenario Engine ↔ Doctrine OS Integration Pass, July 2026)

`public/scenario.html` gained a fourth component, `.scenario-doctrine-panel` (composed of the version/chunk/diff/evidence viewers), plus a new page-only script, `public/scripts/doctrine-ui.js`, that is the **only** file in this repo's front-end permitted to call the existing, already-live `POST /doctrine/broker` route (`worker/doctrine/index.js` - not modified by this pass; it pre-dated this integration). `scenario.js` was extended (not replaced) to read a small published state object, `window.__mshopsScenarioDoctrine`, and a `"scenario:doctrine-updated"` event, so it can tag scenario events with the active doctrine classification without ever fetching doctrine itself. Neither file calls `/doctrine/sync` or `/doctrine/approve-*` (operator-token-gated) or any upstream source. Full documentation, including the exact division of responsibility between `doctrine-ui.js` and `scenario.js`, lives in the marketing repo's `public/DESIGN_SYSTEM.md` §37-42 (same cross-repo numbering convention as §32-36 above).

## Mission Engine (Operator Mission Engine Integration Pass, July 2026)

`public/mission-engine.html` is a second full-page, RGB+Gold-native surface alongside `scenario.html` - `public/styles/mission-engine.css` and `public/scripts/mission-engine.js` are both scoped to this one page only. It hosts a mission objective panel, an explicit mission state machine, an operator action + agent response console, a mission timeline, and a master evidence log. Its doctrine classification tags (`.mission-doctrine-tag`) are **client-side reference constants only** - unlike `scenario.html`'s broker-verified `.scenario-doctrine-tag`, `mission-engine.js` never calls `/doctrine/broker` or any other doctrine route. Full documentation, including the exact trust-level distinction between the two tag types and the composition rules that must not be violated, lives in the marketing repo's `public/DESIGN_SYSTEM.md` §43-49.

## §26 — Autonomous Drift Detection

Added during the Autonomous Ecosystem Governance Pass (July 2026). `public/scripts/drift.js` is a read-only diagnostics script, wired as the first of five new `<script defer>` tags added after `a11y.js` on every page. **It never touches the DOM or CSS** — it only reads already-applied stylesheets/computed styles via the CSSOM and `getComputedStyle`, and logs findings to the console via `console.warn`/`console.groupCollapsed`.

On every page load it scans:

- **Stylesheet load order** — verifies the five `rgbgold-*` core stylesheets (see load order table above) are present and load in the documented relative order, and that `a11y.css` loads after all of them.
- **Token namespace integrity** — confirms a representative sample of `--rgbgold-*` tokens resolve to a value on `:root`, and flags any token declared on `:root` in more than one stylesheet (duplication).
- **Motion utilities** — confirms `.reveal`, `.glow-pulse`, `.shimmer`, `.hue-travel` each have a matching CSS rule somewhere in the loaded stylesheets.
- **HUD utilities** — confirms `.hud-tag` and `.hud-frame` each have a matching CSS rule.
- **Accessibility overrides** — confirms `a11y.css` is loaded and that a `body.a11y-mode` rule block exists.

Every finding is a `console.warn`, never a thrown error — drift detection is about visibility, not blocking. Results are written to `window.__mshopsEcosystem.drift = { results, warningCount }` so `ecosystem-health.js` can fold them into its aggregate report. To extend drift.js with a new check, add it as its own `check*()` function returning an array of warning strings and concatenate it into `runDriftScan()`'s `allWarnings` array — never mutate the DOM from inside a check function.

## §27 — Design-System Enforcement Hooks

Added during the Autonomous Ecosystem Governance Pass. `.ds-enforce` (defined in `styles/rgbgold-hooks.css`, alongside the Ecosystem Expansion hooks from §above) is an inert, `hidden`-by-default marker class placed via `<div class="ds-enforce" data-ds-enforce hidden></div>` at the end of:

- All 5 module detail pages (`/public/modules/*.html`)
- All 8 operator console pages (same list as `.operator-surface-hook` in the table above)
- `marketplace.html`

It marks the surface as **governed** — i.e. a location a human or future automation can look for to confirm the page has opted into design-system enforcement. It carries no styling of its own beyond the same `[hidden]`/`:empty` collapse rule as every other hook in `rgbgold-hooks.css`, so it has zero visual or layout footprint.

**Enforcement rules represented by this hook** (checked today by the scanners in §26/§28/§29/§30, aggregated in §31):

1. The page must load all five core `rgbgold-*` stylesheets in the documented order (drift.js).
2. The page must not introduce hardcoded animation durations, untokenized colors, or duplicate token declarations (drift.js / motion-scan.js).
3. The page must expose at least one `:focus-visible` rule, valid `aria-pressed`/`aria-live` usage, and non-empty contrast tokens (a11y-scan.js).
4. Any HUD-styled element must respect the pseudo-element budget table in `rgbgold-hud.css` and use only documented HUD class names (hud-scan.js).

A future build step could read `document.querySelectorAll('[data-ds-enforce]')` plus `window.__mshopsEcosystem` to fail a CI check when `enforcementStatus !== "PASS"` — today it is console-only and advisory, exactly like every other scanner in this pass.

## §28 — Accessibility Compliance Scanner

Added during the Autonomous Ecosystem Governance Pass. `public/scripts/a11y-scan.js` is a read-only diagnostics script (same never-mutates-the-DOM guarantee as drift.js) that runs after `drift.js` on every page. It is distinct from — and does not replace — the manual `body.a11y-mode` toggle in `a11y.js`/`a11y.css`: this scanner checks that the underlying accessibility **plumbing** is present and internally consistent, regardless of whether a user has switched Accessibility Mode on.

It checks:

- **`:focus-visible` presence** — at least one rule targeting `:focus-visible` exists in the loaded stylesheets (keyboard focus rings).
- **`aria-live` usage** — at least one `[aria-live]` region exists on the page for dynamic status announcements (queue loads, form submits).
- **`aria-pressed` correctness** — every `[aria-pressed]` element has a valid `"true"`/`"false"` value and is a `<button>` or carries `role="button"`.
- **Contrast token usage** — the core `--text`, `--muted`, `--bg` tokens resolve to non-empty values on `:root`/`<body>`, so contrast isn't silently falling back to unstyled browser defaults.

Results are written to `window.__mshopsEcosystem.a11yScan = { results, warningCount }`.

## §29 — Motion Compliance Scanner

Added during the Autonomous Ecosystem Governance Pass. `styles/rgbgold-motion.css` gained a `.motion-scan` utility class (same inert `[hidden]`/`:empty` pattern as the Ecosystem Expansion hooks) with a `<div class="motion-scan" data-motion-scan hidden></div>` marker placed in the hero section of every page that already has a `.cinematic-hook` (`index.html`, `services.html`, `marketplace.html`, `mission.html`, `os.html`, `enter.html`).

`public/scripts/motion-scan.js` is the read-only diagnostics script that runs after `drift.js`. It checks:

- **Named tokens, not hardcoded timings** — scans every `animation`/`animation-duration`/`animation-timing-function`/`transition`/`transition-duration` declaration in the loaded stylesheets for a literal duration (`\d+(ms|s)`) not wrapped in `var(...)`.
- **Reduced-motion overrides active** — confirms a `@media (prefers-reduced-motion: reduce)` rule block exists, and reports the live `window.matchMedia("(prefers-reduced-motion: reduce)").matches` value (informational, not a failure either way).
- **No rogue keyframes** — enumerates every `@keyframes` name found across all loaded stylesheets and flags any name not in the `KNOWN_KEYFRAMES` allow-list hardcoded in `motion-scan.js`. When you add a new `@keyframes` rule, add its name to that allow-list in the same change.

Results are written to `window.__mshopsEcosystem.motionScan = { results, warningCount }`.

## §30 — HUD Compliance Scanner

Added during the Autonomous Ecosystem Governance Pass. `styles/rgbgold-hud.css` gained a `.hud-scan` utility class (same inert pattern) with a `<div class="hud-scan" data-hud-scan hidden></div>` marker placed at the end of `<main>` on all 8 operator console pages, alongside their `.ds-enforce` hook.

`public/scripts/hud-scan.js` runs after `drift.js` and encodes the pseudo-element budget table from the top of `rgbgold-hud.css` directly into two allow-lists (`BEFORE_OWNERS`, `AFTER_OWNERS`). It checks the **live DOM**, not just CSS:

- **Pseudo-element budget integrity** — walks every element in the document; if any single element combines two or more classes that each claim the same `::before` (or `::after`) slot per the budget table, it's flagged as a collision.
- **Collisions** — the specific, most likely case of the above (e.g. `.hue-travel` combined with `.bracket`/`.hud-frame`/`.hud-card` on the same node).
- **No rogue HUD classes** — scans for any live class name matching `/hud/i` that isn't in the documented `KNOWN_HUD_CLASSES` allow-list. Add new HUD class names to both the budget table in `rgbgold-hud.css` and this allow-list in the same change.

Results are written to `window.__mshopsEcosystem.hudScan = { results, warningCount }`.

## §31 — Ecosystem Health Dashboard

`public/scripts/ecosystem-health.js` (pre-existing from earlier cross-repo work, extended to v1.1 during the Autonomous Ecosystem Governance Pass) is the console-only aggregate dashboard, wired as the **last** script tag on every page — after `a11y.js`, `drift.js`, `a11y-scan.js`, `motion-scan.js`, and `hud-scan.js` in that order, so `window.__mshopsEcosystem.*` is fully populated by the time it runs.

On every page load it prints a single collapsed console group containing:

- Stylesheet load order and pass/fail against the expected sequence.
- Accessibility Mode state (`body.a11y-mode` + the `mshops_accessibility_mode` localStorage value).
- Live `prefers-reduced-motion` state.
- Component census (`.hud-frame`, `.hud-tag`, `.rgbgold-module-shell`, `.operator-surface`, `.marketplace-entry`, `.cinematic-hook`, `.a11y-hook`, `.expansion-safe` counts).
- **Ecosystem inventory** (new in v1.1) — active (non-hidden, populated) module cards, operator surfaces/panels, marketplace entries, and the count of `.ds-enforce` hooks present on the page.
- **Governance results** (new in v1.1) — the raw `drift`/`a11yScan`/`motionScan`/`hudScan` results from `window.__mshopsEcosystem`, a summed `totalWarnings` count, and an `enforcementStatus` of `"PASS"` (zero warnings, all four scanners ran) or `"ATTENTION"` (any warnings, or a scanner didn't run — e.g. its `<script>` tag was omitted or load order was wrong).

`window.mshopsEcosystemHealth.report()` remains available for manual re-runs from the console at any time and returns the same structured object that was logged.

## §43 — Mission Engine Shell

Added during the Operator Mission Engine Integration Pass (July 2026). `public/mission-engine.html` is a brand-new page hosting the Mission Engine console, structured identically to the Scenario Engine shell (`public/scenario.html`) so both consoles read as siblings:

```html
<header class="operator-surface" data-version="1.0">
  <section class="operator-surface-section" data-mission-hook>
    <div class="rgbgold-module-shell hud-frame reveal" data-reveal="up" data-module-hook data-version="1.0">
      <header class="rgbgold-module-shell-header">
        <div class="hud-tag">Mission Engine // Standby</div>
        ...
      </header>
      <div class="rgbgold-module-shell-body">...</div>
    </div>
  </section>
</header>
```

Load order: `rgbgold-tokens.css` → `rgbgold-motion.css` → `rgbgold-components.css` → `rgbgold-hud.css` → `rgbgold-hooks.css` → `styles.css` → `styles/mission-engine.css` → `styles/a11y.css` (last), matching every other page in the ecosystem. All five governance scanners (`drift.js`, `a11y-scan.js`, `motion-scan.js`, `hud-scan.js`, `ecosystem-health.js` — see §26-§31) are wired in, plus `.motion-scan`/`data-motion-scan` and `.hud-scan`/`data-hud-scan` diagnostic hooks and a `.ds-enforce`/`data-ds-enforce` enforcement hook, since this page introduces new `.hud-frame` and `.reveal` usage. `[data-mission-hook]` and `[data-module-hook]` are the attachment points a future pass can use to inject additional mission-shell chrome without editing this file's existing markup — same contract as `.module-expansion-hook` (§ Ecosystem Expansion Hooks above), just scoped to this one page's root instead of the shared hooks stylesheet.

## §44 — Mission Objective Panel

`.mission-objective-panel` (in `public/styles/mission-engine.css`) composes with `.operator-panel` (surface/padding), `.hud-frame` (corner brackets), `.reveal` (scroll-in motion), and `.a11y-override-card` (automatic Accessibility Mode coverage — no `a11y.css` edits required, since `.operator-panel` is already registered there). It renders a `<section data-mission-objectives>`-hooked list of doctrine-linked objectives; each `<li data-mission-objective="...">` carries a `data-doctrine-classification` attribute that is a **hardcoded editorial constant**, not a live broker response (see §49 for why). Every item has an operator-controlled completion toggle (`[data-mission-objective-toggle]`, a real `aria-pressed` button, not a decorative one) that `mission-engine.js`'s `initObjectives()` wires up to flip `data-complete="true"/"false"` on the parent `<li>`, update the button label, log the change to the Mission Evidence Viewer, and (when the objective is being completed) set `window.__mshopsMissionEngine.activeDoctrineClassification` to that objective's classification so subsequent state transitions and actions inherit the correct doctrine tag.

## §45 — Mission State Machine

`.mission-state-machine` shows the current mission state (`[data-mission-state]`, `aria-live="polite"` so every transition is announced to screen readers) and every state-defined allowed transition, rendered as buttons into `[data-mission-transitions]`. The state graph itself — `STANDBY → BRIEFED → IN_PROGRESS → DEBRIEF → COMPLETE → STANDBY`, plus `Reset`/`Abort Mission`/`Reopen Mission` shortcuts back to an earlier state — lives entirely in `mission-engine.js`'s `MISSION_STATES` constant; **the HTML never hardcodes a transition button** so the allowed-transitions list can never drift out of sync with the actual state machine. Composes with `.hud-frame`/`.reveal`/`.a11y-override-card` exactly like the Mission Objective Panel; introduces no animation of its own, so it needs no `prefers-reduced-motion` override beyond what `.reveal` already provides in `rgbgold-motion.css`.

## §46 — Mission Action Console

`.mission-action-console` composes with `.operator-panel`/`.hud-frame`/`.reveal` and hosts two things: a row of operator action buttons (`[data-mission-action]`: `log-note`, `request-agent-response`, `flag-doctrine`) and a combined operator-action/agent-response feed (`[data-mission-action-feed]`, `aria-live="polite"`, `.a11y-override-card`). `request-agent-response` logs the operator's action immediately, then a **simulated** agent acknowledgement follows after a fixed 600ms `setTimeout` in `initActionConsole()` — this is a UI-only echo, never a real agent call. Every logged item (operator or agent) is also mirrored into the Mission Evidence Viewer (§48) tagged with whichever mission objective's doctrine classification was most recently activated (`window.__mshopsMissionEngine.activeDoctrineClassification`, set whenever an objective is marked complete), satisfying the "doctrine-linked constraints" requirement without any broker call.

## §47 — Mission Timeline

`.mission-timeline` is a direct structural twin of `.scenario-timeline` (`scenario.css`): `.hud-frame` applied to the root for corner brackets, `.reveal` for scroll-in motion, zero bespoke pseudo-elements. Reduced-motion safety comes entirely from `.reveal`'s own `prefers-reduced-motion` override in `rgbgold-motion.css` — this component adds no animation of its own on top of that. `<div class="cinematic-hook" data-cinematic hidden>` is the future cinematic timeline-animation injection point, matching the pattern already used on `index.html`/`services.html`/etc. (§ Ecosystem Expansion Hooks). Every state transition and objective toggle appends a `.mission-timeline__node` here via `appendTimelineNode()`.

## §48 — Mission Evidence Viewer

`.mission-evidence-viewer` (`[data-mission-evidence]`, `aria-live="polite"`, `.a11y-override-card`) is the **master audit log** for the entire page: every state transition (`state`), objective toggle (`objective`), operator action (`operator-action`), simulated agent response (`agent-response`), and doctrine reference (`doctrine-reference`) lands here in chronological order via the single `appendEvidence(evidenceEl, kind, message)` function in `mission-engine.js`, each row tagged with a `.mission-evidence-viewer__kind` badge and (when an objective's doctrine classification is currently active) a `.mission-doctrine-tag`. Scrollable, high-contrast, no animation of its own — reduced-motion safe by construction, same as the Mission Action Console's feed and Scenario Engine's `.scenario-event-feed`/`.doctrine-evidence-viewer`.

## §49 — Mission ↔ Doctrine ↔ Scenario Integration Rules

The Mission Engine and Scenario Engine are **sibling, independent consoles** that intentionally do not share JavaScript state or a stylesheet import, so neither can break the other:

1. **Doctrine linkage is static on the Mission Engine, live on the Scenario Engine.** `mission-engine.html`'s objectives carry a hardcoded `data-doctrine-classification` editorial constant per objective — there is no broker form on this page and `mission-engine.js` **never calls** `/doctrine/broker` or any other doctrine endpoint. This is a deliberate, simpler contract than the Scenario Engine's live `doctrine-ui.js` integration (§37-42), chosen because the Mission Engine's objectives are pre-defined by the mission plan, not looked up per-session.
2. **If a future pass wants live doctrine data on the Mission Engine**, it must read the same read-only channels `scenario.js` already proves out — `window.__mshopsScenarioDoctrine.classification`/`.versionId` and the `"scenario:doctrine-updated"` `CustomEvent` on `document`, both published exclusively by `doctrine-ui.js` — rather than adding a second, competing broker integration. Both consoles degrade gracefully (no tag rendered) if that global/event is absent, so this is a strictly additive, backward-compatible extension point.
3. **`.mission-doctrine-tag` is an intentional, independent duplicate of `.scenario-doctrine-tag`** (visually identical, defined separately in `mission-engine.css`/`scenario.css`), not a shared class. This means `mission-engine.css` never needs to load `scenario.css` (or vice versa) and the two pages have zero load-order coupling — each console's stylesheet is fully self-sufficient.
4. **No pseudo-element or token collisions.** Both consoles compose the exact same shared primitives (`.operator-panel`, `.hud-frame`, `.reveal`, `.a11y-override-card`, `--rgbgold-*` tokens) from `rgbgold-components.css`/`rgbgold-motion.css`/`rgbgold-hud.css`/`rgbgold-tokens.css`, so there is nothing page-specific to reconcile in the pseudo-element budget table (`rgbgold-hud.css`) — adding the Mission Engine introduced zero new `::before`/`::after` usage.
5. **Neither console calls a backend, Worker, or any Mission/Scenario/Doctrine API.** Every state transition, objective toggle, operator action, agent response, and doctrine tag on both pages is simulated/read-only client-side state, logged only to the browser console and each page's own evidence/event viewer. Wiring either console to a real backend is an explicitly future, separate, backend-touching pass.
