/**
 * ACCESSIBILITY MODE CONTROLLER (Section 508 / WCAG 2.1 AA)
 * -----------------------------------------------------------------------
 * Standalone, additive script - does not modify or depend on app.js or any
 * page-specific script (services.js, marketplace.js, enter.js, etc.).
 * Include via <script src="/scripts/a11y.js" defer></script> as the LAST
 * script tag on every page.
 *
 * Responsibilities:
 *   1. On load, read localStorage["mshops_accessibility_mode"] and apply
 *      `class="a11y-mode"` to <body> if previously enabled.
 *   2. Expose `window.toggleAccessibilityMode()` globally.
 *   3. Inject a keyboard-accessible toggle button, fixed top-right, on
 *      every page (so no page markup edits are required).
 *   4. Sync across tabs via the `storage` event.
 *
 * All actual visual suppression (HUD overlays, glow pulses, animated
 * borders, Matrix rain / Tron sweep / haze-shift, ticker marquee, shimmer,
 * hue-travel) is handled declaratively by /public/styles/a11y.css via the
 * `.a11y-mode` ancestor selector - this script only ever toggles that one
 * class, so it can never drift out of sync with the stylesheet and cannot
 * collide with the app's existing classes or the rgbgold-* system.
 *
 * Independent from `prefers-reduced-motion`: that media query is automatic
 * and system-driven (see /public/styles.css's reduced-motion block and
 * rgbgold-motion.css's own); this toggle is manual and user-driven, and
 * always wins via a11y.css's !important rules regardless of system motion
 * preference.
 */

(function accessibilityModeController() {
  const STORAGE_KEY = "mshops_accessibility_mode";
  const ACTIVE_CLASS = "a11y-mode";

  function isEnabled() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function persist(enabled) {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch (error) {
      /* localStorage unavailable (private mode / disabled) - state simply
         won't persist across reloads; the toggle still works this session. */
    }
  }

  function applyState(enabled) {
    document.body.classList.toggle(ACTIVE_CLASS, enabled);
    const button = document.getElementById("a11y-toggle-btn");
    if (button) {
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.textContent = enabled ? "Accessibility Mode: On (508 / WCAG)" : "Accessibility Mode (508 / WCAG)";
    }
  }

  window.toggleAccessibilityMode = function toggleAccessibilityMode(force) {
    const next = typeof force === "boolean" ? force : !document.body.classList.contains(ACTIVE_CLASS);
    applyState(next);
    persist(next);
    return next;
  };

  function injectToggleButton() {
    if (document.getElementById("a11y-toggle-btn")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "a11y-toggle-btn";
    button.className = "btn btn-secondary a11y-toggle";
    button.setAttribute("aria-pressed", isEnabled() ? "true" : "false");
    button.textContent = isEnabled() ? "Accessibility Mode: On (508 / WCAG)" : "Accessibility Mode (508 / WCAG)";
    button.addEventListener("click", () => window.toggleAccessibilityMode());
    document.body.appendChild(button);
  }

  function init() {
    applyState(isEnabled());
    injectToggleButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      applyState(event.newValue === "true");
    }
  });
})();
