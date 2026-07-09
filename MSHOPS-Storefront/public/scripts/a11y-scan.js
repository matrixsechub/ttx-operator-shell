/**
 * ACCESSIBILITY COMPLIANCE SCANNER
 * -----------------------------------------------------------------------
 * Read-only diagnostics script - never mutates the DOM/CSS, only logs
 * findings to the console. Include via
 * <script src="/scripts/a11y-scan.js" defer></script> after drift.js and
 * a11y.js. Complements (does not replace) the manual `body.a11y-mode`
 * toggle in a11y.css/a11y.js: this script checks that the underlying
 * accessibility PLUMBING is present and internally consistent, not whether
 * the user has switched Accessibility Mode on.
 *
 * Checks four categories:
 *   1. :focus-visible rule presence (keyboard-accessible focus rings).
 *   2. aria-live usage (at least one live region exists for dynamic status
 *      text, per the pattern used by service-intake.js/operator-agents-*.js).
 *   3. aria-pressed correctness (every toggle button using aria-pressed has
 *      a valid "true"/"false" value, never missing/invalid on a real toggle).
 *   4. Contrast token usage (core text/background CSS custom properties
 *      resolve to non-empty values, so contrast isn't silently falling back
 *      to unstyled browser defaults).
 *
 * Findings are stored on `window.__mshopsEcosystem.a11yScan` for
 * ecosystem-health.js's aggregate dashboard.
 */

(function accessibilityComplianceScanner() {
  window.__mshopsEcosystem = window.__mshopsEcosystem || {};

  const CONTRAST_TOKENS = ["--text", "--muted", "--bg"];

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
        if (rule.cssRules && rule.cssRules.length) {
          Array.from(rule.cssRules).forEach(walk);
        }
      } else if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        Array.from(rule.cssRules || []).forEach(walk);
      }
    }

    Array.from(document.styleSheets).forEach((sheet) => {
      let sheetRules;
      try {
        sheetRules = Array.from(sheet.cssRules || []);
      } catch (error) {
        return;
      }
      sheetRules.forEach(walk);
    });

    return rules;
  }

  function checkFocusVisible(rules) {
    const warnings = [];
    const hasRule = rules.some((rule) => typeof rule.selectorText === "string" && rule.selectorText.includes(":focus-visible"));
    if (!hasRule) {
      warnings.push("No :focus-visible rule found in any loaded stylesheet - keyboard users may lose visible focus.");
    }
    return warnings;
  }

  function checkAriaLive() {
    const warnings = [];
    const liveRegions = document.querySelectorAll("[aria-live]");
    if (!liveRegions.length) {
      warnings.push("No [aria-live] regions found on this page - dynamic status updates (queue loads, form submits) may not be announced to screen readers.");
    }
    return { warnings, count: liveRegions.length };
  }

  function checkAriaPressed() {
    const warnings = [];
    const pressedElements = document.querySelectorAll("[aria-pressed]");
    let validCount = 0;

    pressedElements.forEach((el) => {
      const value = el.getAttribute("aria-pressed");
      if (value !== "true" && value !== "false") {
        warnings.push(`Invalid aria-pressed value "${value}" on <${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}> - must be "true" or "false".`);
      } else {
        validCount += 1;
      }
      if (el.tagName !== "BUTTON" && el.getAttribute("role") !== "button") {
        warnings.push(`aria-pressed used on a non-button element (<${el.tagName.toLowerCase()}>) without role="button" - toggle semantics may not be announced correctly.`);
      }
    });

    return { warnings, total: pressedElements.length, valid: validCount };
  }

  function checkContrastTokens() {
    const warnings = [];
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);

    CONTRAST_TOKENS.forEach((token) => {
      const rootValue = rootStyle.getPropertyValue(token).trim();
      const bodyValue = bodyStyle.getPropertyValue(token).trim();
      if (!rootValue && !bodyValue) {
        warnings.push(`Contrast token ${token} does not resolve to a value on :root or <body> - text/background contrast may be relying on browser defaults.`);
      }
    });

    return warnings;
  }

  function runScan() {
    const rules = collectAllRules();
    const ariaLive = checkAriaLive();
    const ariaPressed = checkAriaPressed();

    const results = {
      focusVisible: checkFocusVisible(rules),
      ariaLive: ariaLive.warnings,
      ariaLiveCount: ariaLive.count,
      ariaPressed: ariaPressed.warnings,
      ariaPressedTotal: ariaPressed.total,
      ariaPressedValid: ariaPressed.valid,
      contrastTokens: checkContrastTokens(),
    };

    const allWarnings = [].concat(results.focusVisible, results.ariaLive, results.ariaPressed, results.contrastTokens);

    window.__mshopsEcosystem.a11yScan = { results, warningCount: allWarnings.length };

    if (allWarnings.length) {
      console.groupCollapsed(`%c[a11y-scan] ${allWarnings.length} accessibility warning(s) on ${location.pathname}`, "color:#fbbf24;font-weight:700;");
      allWarnings.forEach((warning) => console.warn(warning));
      console.groupEnd();
    } else {
      console.info(
        `%c[a11y-scan] Accessibility plumbing OK on ${location.pathname} (aria-live regions: ${ariaLive.count}, aria-pressed elements: ${ariaPressed.total}).`,
        "color:#34d399;font-weight:700;",
      );
    }
  }

  // Use `load`, not `DOMContentLoaded`: external stylesheets are not
  // guaranteed to have finished parsing (and their cssRules populated) by
  // DOMContentLoaded, which would otherwise cause false "missing" findings.
  if (document.readyState === "complete") {
    runScan();
  } else {
    window.addEventListener("load", runScan);
  }
})();
