# Front-End CI Checklist

**Repo:** ttx-operator-shell · **Applies to:** `public/*.html`, `public/modules/*.html`, `public/styles.css` + page-specific CSS, `public/styles/rgbgold-*.css`, `public/styles/a11y.css`, `public/scripts/*.js`

This repo has no build step and no automated front-end CI pipeline (`worker/index.js` serves `public/` via the Cloudflare Assets binding and is unrelated to front-end correctness). This checklist is the manual, repeatable substitute for CI - run it before merging any change that touches the RGB+Gold additive design system or a page's markup. See the marketing repo's `public/DESIGN_SYSTEM.md` for the full architecture reference (the source of truth for both repos), and this repo's `rgbgold-*.css` file headers for the app-specific namespacing rationale.

## How contributors run this checklist

1. Open the changed files in an editor with search (or use `grep`/ripgrep).
2. Work through the five sections below, top to bottom, checking each box against your diff.
3. If any box fails, fix it before requesting review - none of these require tooling, just a search and a read of the design-system docs.
4. There is no automated enforcement (no linter, no test suite) - this file **is** the check.

## 1. Token compliance

- [ ] No new raw hex/`rgba()` color, gradient, shadow, spacing, radius, or duration value was added directly to `rgbgold-components.css`, `rgbgold-hud.css`, or `rgbgold-motion.css`. Every value traces back to a `var(--rgbgold-token-name)` defined in `rgbgold-tokens.css`.
- [ ] The new/changed CSS never redeclares or repurposes any of this app's own pre-existing tokens (`--gold`, `--blue`, `--neon-cyan`, `--space-*`, `--radius-*`, `--duration-*`, etc. in `styles.css`) - all new tokens are `--rgbgold-*` prefixed.
- [ ] Pre-launch/future tokens use the `--rgbgold-future-*` or `--a11y-future-*` reserved prefix (see `rgbgold-tokens.css` §"RESERVED NAMESPACES").

## 2. Motion compliance

- [ ] Every new `@keyframes` was added to `rgbgold-motion.css` (prefixed `rgbgold*`), not scattered into `rgbgold-components.css`/`rgbgold-hud.css`, and never added to this app's own pre-existing `styles.css`.
- [ ] Every new looping animation has a `--rgbgold-duration-*` token (not a bare number) and a "turn it off" rule in the `prefers-reduced-motion` block at the bottom of `rgbgold-motion.css`.
- [ ] The animation is classified as SAFE or USE-SPARINGLY per `rgbgold-motion.css`'s header comment.
- [ ] The animation is disabled under `body.a11y-mode` in `a11y.css` if it isn't already covered by the blanket `*` kill-switch there.

## 3. HUD pseudo-element budget compliance

- [ ] Before adding a `::before`/`::after`-based class to an element, the pseudo-element budget table in `rgbgold-hud.css` was checked - including this app's pre-existing `.bracket`/`.hud-frame`/`.fx-overlay` usage, not just the additive `rgbgold-*` classes.
- [ ] No element ends up with two classes competing for the same pseudo-element slot (wrap in an extra `<div>` instead if needed).
- [ ] A new class name was checked against this app's existing global class list before introduction (see the `.rgbgold-module-shell` naming-collision note in `rgbgold-components.css` for a real example of why this matters - it exists specifically because `.module-shell` collided with a pre-existing class in `/public/modules/module.css`).

## 4. Accessibility override compliance

- [ ] Any new component that renders a card/panel, badge/pill, or HUD-style decorative element is covered by `a11y.css` - either via an existing selector list, or by adding the new class to the matching list, or by using one of the `.a11y-override-*` marker classes.
- [ ] `body.a11y-mode` renders the new component with high contrast, no motion, and a visible focus ring on any interactive element.
- [ ] `prefers-reduced-motion` and `.a11y-mode` were tested independently to confirm they remain additive, not conflicting.

## 5. Stylesheet load-order compliance

- [ ] Every page loads: `/styles/rgbgold-tokens.css` → `/styles/rgbgold-motion.css` → `/styles/rgbgold-components.css` → `/styles/rgbgold-hud.css` → the page's own existing stylesheet (`styles.css`/`marketplace.css`/`mission.css`/`os.css`/`api-explorer.css`/`modules/module.css`) → `/styles/a11y.css` (last).
- [ ] `/scripts/a11y.js` loads after the page's own script(s), as the last script tag.
- [ ] No new page was added without the full stylesheet cascade from `rgbgold-tokens.css` through `a11y.css`.

---

See the marketing repo's `public/DESIGN_SYSTEM.md` §20 for how this checklist maps to the shared design system's architecture, and §21 for drift-detection markers.
