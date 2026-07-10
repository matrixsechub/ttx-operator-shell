/**
 * AUTONOMOUS DRIFT DETECTION
 * -----------------------------------------------------------------------
 * Read-only, additive diagnostics script. NEVER mutates the DOM or CSS -
 * only reads already-applied stylesheets/computed styles and logs findings
 * to the console. Include via <script src="/scripts/drift.js" defer></script>
 * BEFORE a11y-scan.js/motion-scan.js/hud-scan.js/ecosystem-health.js (those
 * read `window.__mshopsEcosystem.drift` for the aggregate dashboard).
 *
 * Detects drift across five categories:
 *   1. Stylesheet load order (tokens -> motion -> components -> hud ->
 *      hooks -> page stylesheet -> a11y, per DESIGN_SYSTEM.md).
 *   2. Missing or duplicated rgbgold-* token namespace declarations.
 *   3. Missing motion utilities (.reveal, .glow-pulse, .shimmer, .hue-travel).
 *   4. Missing HUD utilities (.hud-tag, .hud-frame).
 *   5. Missing accessibility overrides (body.a11y-mode rule block, a11y.css
 *      loaded at all).
 *
 * Every finding is a warning, not an error: this script's job is visibility,
 * not enforcement. It writes to `window.__mshopsEcosystem.drift` for
 * ecosystem-health.js to summarize and never modifies UI.
 */

(function driftDetection() {
  window.__mshopsEcosystem = window.__mshopsEcosystem || {};

  const EXPECTED_ORDER_FRAGMENTS = [
    "rgbgold-tokens.css",
    "rgbgold-motion.css",
    "rgbgold-components.css",
    "rgbgold-hud.css",
    "rgbgold-hooks.css",
  ];

  const EXPECTED_TOKENS = [
    "--rgbgold-cyan",
    "--rgbgold-gold",
    "--rgbgold-space-4",
    "--rgbgold-radius-lg",
    "--rgbgold-duration-slow",
    "--rgbgold-ease-standard",
  ];

  const EXPECTED_MOTION_SELECTORS = [".reveal", ".glow-pulse", ".shimmer", ".hue-travel"];
  const EXPECTED_HUD_SELECTORS = [".hud-tag", ".hud-frame"];

  function getLoadedStylesheetHrefs() {
    return Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return sheet.href || null;
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);
  }

  function flattenRules(sheet) {
    try {
      return Array.from(sheet.cssRules || []);
    } catch (error) {
      /* cross-origin stylesheet (e.g. Google Fonts) - not readable, skip */
      return [];
    }
  }

  // IMPORTANT: check `rule.type`, never truthiness of `rule.cssRules`.
  // Browsers with CSS Nesting support expose a `cssRules` property on
  // EVERY CSSStyleRule (an empty-but-truthy CSSRuleList when unused), so a
  // naive `if (rule.cssRules)` check misclassifies every plain style rule
  // as a container and silently drops it from the flattened list.
  function collectAllRules() {
    const rules = [];

    function walk(rule) {
      if (rule.type === CSSRule.STYLE_RULE) {
        rules.push(rule);
        // Still descend for genuinely nested (CSS Nesting) child rules.
        if (rule.cssRules && rule.cssRules.length) {
          Array.from(rule.cssRules).forEach(walk);
        }
      } else if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        Array.from(rule.cssRules || []).forEach(walk);
      }
    }

    Array.from(document.styleSheets).forEach((sheet) => {
      flattenRules(sheet).forEach(walk);
    });

    return rules;
  }

  function selectorExists(rules, selectorFragment) {
    return rules.some((rule) => typeof rule.selectorText === "string" && rule.selectorText.includes(selectorFragment));
  }

  function checkLoadOrder(hrefs) {
    const warnings = [];
    const positions = EXPECTED_ORDER_FRAGMENTS.map((fragment) => hrefs.findIndex((href) => href.includes(fragment)));

    EXPECTED_ORDER_FRAGMENTS.forEach((fragment, index) => {
      if (positions[index] === -1) {
        warnings.push(`Missing stylesheet: ${fragment} is not loaded on this page.`);
      }
    });

    for (let i = 1; i < positions.length; i += 1) {
      if (positions[i - 1] !== -1 && positions[i] !== -1 && positions[i] < positions[i - 1]) {
        warnings.push(
          `Stylesheet load order drift: ${EXPECTED_ORDER_FRAGMENTS[i]} loads before ${EXPECTED_ORDER_FRAGMENTS[i - 1]} (expected the reverse).`,
        );
      }
    }

    const a11yIndex = hrefs.findIndex((href) => href.includes("a11y.css"));
    const lastCoreIndex = Math.max(...positions.filter((p) => p !== -1));
    if (a11yIndex !== -1 && a11yIndex < lastCoreIndex) {
      warnings.push("Stylesheet load order drift: a11y.css loads before the rgbgold-* core stylesheets (it must load LAST to win the cascade).");
    }

    return warnings;
  }

  function checkTokenNamespace() {
    const warnings = [];
    const rootStyle = getComputedStyle(document.documentElement);
    const seen = new Set();
    const duplicated = new Set();

    EXPECTED_TOKENS.forEach((token) => {
      const value = rootStyle.getPropertyValue(token).trim();
      if (!value) {
        warnings.push(`Missing design token: ${token} does not resolve to a value on :root.`);
      }
    });

    collectAllRules().forEach((rule) => {
      if (rule.selectorText === ":root" && rule.style) {
        for (let i = 0; i < rule.style.length; i += 1) {
          const prop = rule.style[i];
          if (prop.startsWith("--rgbgold-")) {
            if (seen.has(prop)) {
              duplicated.add(prop);
            }
            seen.add(prop);
          }
        }
      }
    });

    duplicated.forEach((token) => {
      warnings.push(`Duplicated token namespace: ${token} is declared on :root in more than one stylesheet.`);
    });

    return warnings;
  }

  function checkMotionUtilities(rules) {
    return EXPECTED_MOTION_SELECTORS.filter((selector) => !selectorExists(rules, selector)).map(
      (selector) => `Missing motion utility: ${selector} has no matching CSS rule.`,
    );
  }

  function checkHudUtilities(rules) {
    return EXPECTED_HUD_SELECTORS.filter((selector) => !selectorExists(rules, selector)).map(
      (selector) => `Missing HUD utility: ${selector} has no matching CSS rule.`,
    );
  }

  function checkAccessibilityOverrides(hrefs, rules) {
    const warnings = [];
    if (!hrefs.some((href) => href.includes("a11y.css"))) {
      warnings.push("Missing accessibility override sheet: a11y.css is not loaded on this page.");
    } else if (!selectorExists(rules, "body.a11y-mode")) {
      warnings.push("Missing accessibility override: no body.a11y-mode rule block found (a11y.css may have loaded without its content).");
    }
    return warnings;
  }

  function runDriftScan() {
    const hrefs = getLoadedStylesheetHrefs();
    const rules = collectAllRules();

    const results = {
      loadOrder: checkLoadOrder(hrefs),
      tokenNamespace: checkTokenNamespace(),
      motionUtilities: checkMotionUtilities(rules),
      hudUtilities: checkHudUtilities(rules),
      accessibilityOverrides: checkAccessibilityOverrides(hrefs, rules),
    };

    const allWarnings = [].concat(
      results.loadOrder,
      results.tokenNamespace,
      results.motionUtilities,
      results.hudUtilities,
      results.accessibilityOverrides,
    );

    window.__mshopsEcosystem.drift = { results, warningCount: allWarnings.length };

    if (allWarnings.length) {
      console.groupCollapsed(`%c[drift] ${allWarnings.length} design-system drift warning(s) on ${location.pathname}`, "color:#fbbf24;font-weight:700;");
      allWarnings.forEach((warning) => console.warn(warning));
      console.groupEnd();
    } else {
      console.info(`%c[drift] No design-system drift detected on ${location.pathname}.`, "color:#34d399;font-weight:700;");
    }
  }

  // Use `load`, not `DOMContentLoaded`: external stylesheets are not
  // guaranteed to have finished parsing (and their cssRules populated) by
  // DOMContentLoaded, which would otherwise cause false "missing" findings.
  if (document.readyState === "complete") {
    runDriftScan();
  } else {
    window.addEventListener("load", runDriftScan);
  }
})();
