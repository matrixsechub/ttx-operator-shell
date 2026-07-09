/**
 * MOTION COMPLIANCE SCANNER
 * -----------------------------------------------------------------------
 * Read-only diagnostics script - never mutates the DOM/CSS, only logs
 * findings to the console. Include via
 * <script src="/scripts/motion-scan.js" defer></script> after drift.js.
 *
 * Checks three categories:
 *   1. Animations use named duration/easing tokens (var(--rgbgold-duration-*)
 *      / var(--duration-*)), not hardcoded numeric literals like `1.8s` or
 *      `240ms` directly in an `animation`/`animation-duration`/
 *      `animation-timing-function`/`transition` declaration.
 *   2. A `@media (prefers-reduced-motion: reduce)` rule block exists and is
 *      currently matched/honored by the browser (informational either way -
 *      matching the media query is not itself a problem).
 *   3. No "rogue" @keyframes exist outside the documented, known set (any
 *      new keyframes should be added to the KNOWN_KEYFRAMES allow-list in
 *      this file in the same change that introduces them - see
 *      DESIGN_SYSTEM.md §29).
 *
 * Findings are stored on `window.__mshopsEcosystem.motionScan` for
 * ecosystem-health.js's aggregate dashboard.
 */

(function motionComplianceScanner() {
  window.__mshopsEcosystem = window.__mshopsEcosystem || {};

  const KNOWN_KEYFRAMES = [
    "neon-drift",
    "haze-shift",
    "tron-sweep",
    "matrix-fall",
    "page-fade-in",
    "marquee",
    "reveal-up",
    "hud-blink",
    "premium-shimmer",
    "badge-flash",
    "category-shift",
    "alert-pulse",
    "selection-glow-pulse",
    "step-line-flow",
    "step-active-glow",
    "badge-pulse",
    "neon-ring-pulse",
    "rgbgoldHeadlinePulse",
    "rgbgoldShimmer",
    "rgbgoldBorderFlow",
    "rgbgoldBlinkDot",
  ];

  const HARDCODED_DURATION_PATTERN = /\b\d+(\.\d+)?(ms|s)\b/;

  function collectRuleGroups() {
    const styleRules = [];
    const mediaRules = [];
    const keyframesRules = [];

    function walk(rule) {
      if (rule.type === CSSRule.STYLE_RULE) {
        styleRules.push(rule);
      } else if (rule.type === CSSRule.MEDIA_RULE) {
        mediaRules.push(rule);
        Array.from(rule.cssRules || []).forEach(walk);
      } else if (rule.type === CSSRule.KEYFRAMES_RULE) {
        keyframesRules.push(rule);
      }
    }

    Array.from(document.styleSheets).forEach((sheet) => {
      let rules;
      try {
        rules = Array.from(sheet.cssRules || []);
      } catch (error) {
        return;
      }
      rules.forEach(walk);
    });

    return { styleRules, mediaRules, keyframesRules };
  }

  const ZERO_DURATION_PATTERN = /^(0s|0ms|0)(\s*,\s*(0s|0ms|0))*$/;

  function checkHardcodedDurations(styleRules) {
    const warnings = [];
    // Only check the LONGHAND duration properties, never the `animation`/
    // `transition` shorthands: browsers serialize an authored shorthand
    // back out to its full expanded form (e.g. `animation: none !important`
    // becomes "auto ease 0s 1 normal none running none"), which bakes in
    // numeric-looking default sub-values even though nothing was
    // hardcoded - checking only the decomposed longhands avoids that
    // false-positive entirely. Explicit zero-outs (0s/0ms) are also
    // excluded since they're the correct, token-free pattern for
    // disabling an animation (e.g. reduced-motion overrides).
    const durationProps = ["animation-duration", "transition-duration"];

    styleRules.forEach((rule) => {
      if (!rule.style) return;
      durationProps.forEach((prop) => {
        const value = rule.style.getPropertyValue(prop).trim();
        if (!value || value.includes("var(") || ZERO_DURATION_PATTERN.test(value)) return;
        if (HARDCODED_DURATION_PATTERN.test(value)) {
          warnings.push(`Hardcoded motion timing in "${prop}: ${value}" on selector "${rule.selectorText}" - use a var(--duration-*)/var(--rgbgold-duration-*) token instead.`);
        }
      });
    });

    return warnings;
  }

  function checkReducedMotionSupport(mediaRules) {
    const warnings = [];
    const hasReducedMotionBlock = mediaRules.some((rule) => rule.conditionText && rule.conditionText.includes("prefers-reduced-motion"));

    if (!hasReducedMotionBlock) {
      warnings.push("No @media (prefers-reduced-motion: reduce) rule block found in any loaded stylesheet.");
    }

    let mediaQuerySupported = true;
    let reducedMotionActive = false;
    try {
      reducedMotionActive = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) {
      mediaQuerySupported = false;
      warnings.push("window.matchMedia is unavailable - cannot verify live prefers-reduced-motion state.");
    }

    return { warnings, hasReducedMotionBlock, mediaQuerySupported, reducedMotionActive };
  }

  function checkRogueKeyframes(keyframesRules) {
    const warnings = [];
    const seen = new Set();

    keyframesRules.forEach((rule) => {
      const name = rule.name;
      if (seen.has(name)) return;
      seen.add(name);
      if (!KNOWN_KEYFRAMES.includes(name)) {
        warnings.push(`Rogue @keyframes "${name}" is not in the known allow-list (DESIGN_SYSTEM.md §29) - add it there if intentional.`);
      }
    });

    return { warnings, names: Array.from(seen) };
  }

  function runScan() {
    const { styleRules, mediaRules, keyframesRules } = collectRuleGroups();
    const reducedMotion = checkReducedMotionSupport(mediaRules);
    const rogueKeyframes = checkRogueKeyframes(keyframesRules);

    const results = {
      hardcodedDurations: checkHardcodedDurations(styleRules),
      reducedMotion: reducedMotion.warnings,
      reducedMotionActive: reducedMotion.reducedMotionActive,
      rogueKeyframes: rogueKeyframes.warnings,
      keyframeNames: rogueKeyframes.names,
    };

    const allWarnings = [].concat(results.hardcodedDurations, results.reducedMotion, results.rogueKeyframes);

    window.__mshopsEcosystem.motionScan = { results, warningCount: allWarnings.length };

    if (allWarnings.length) {
      console.groupCollapsed(`%c[motion-scan] ${allWarnings.length} motion compliance warning(s) on ${location.pathname}`, "color:#fbbf24;font-weight:700;");
      allWarnings.forEach((warning) => console.warn(warning));
      console.groupEnd();
    } else {
      console.info(
        `%c[motion-scan] Motion system OK on ${location.pathname} (${rogueKeyframes.names.length} keyframes, reduced-motion active: ${reducedMotion.reducedMotionActive}).`,
        "color:#34d399;font-weight:700;",
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runScan);
  } else {
    runScan();
  }
})();
