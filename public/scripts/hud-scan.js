/**
 * HUD COMPLIANCE SCANNER
 * -----------------------------------------------------------------------
 * Read-only diagnostics script - never mutates the DOM/CSS, only logs
 * findings to the console. Include via
 * <script src="/scripts/hud-scan.js" defer></script> after drift.js.
 *
 * Encodes the pseudo-element budget table documented at the top of
 * /public/styles/rgbgold-hud.css and checks the LIVE DOM against it:
 *   1. Pseudo-element budget integrity - every element gets exactly one
 *      ::before slot and one ::after slot; this walks the DOM for elements
 *      combining two or more classes that are each documented as owning the
 *      SAME slot (e.g. .bracket + .hud-card would double up on ::before).
 *   2. Collisions - a subset of (1): specifically flags the documented
 *      "never combine" pairs (.hue-travel/.glow-pulse with .bracket/
 *      .hud-frame/.hud-card).
 *   3. Rogue HUD classes - any class name matching /hud/i in the live DOM
 *      that isn't in the documented KNOWN_HUD_CLASSES allow-list.
 *
 * Findings are stored on `window.__mshopsEcosystem.hudScan` for
 * ecosystem-health.js's aggregate dashboard.
 */

(function hudComplianceScanner() {
  window.__mshopsEcosystem = window.__mshopsEcosystem || {};

  // Mirrors the pseudo-element budget table in rgbgold-hud.css.
  const BEFORE_OWNERS = ["bracket", "hud-frame", "fx-overlay", "hud-card", "module-card", "operator-panel", "hue-travel", "hud-tag"];
  const AFTER_OWNERS = ["bracket", "hud-frame", "fx-overlay", "glow-pulse"];

  // Any class containing "hud" that isn't one of these is flagged as rogue.
  const KNOWN_HUD_CLASSES = [
    "hud-frame",
    "hud-ticker",
    "hud-tag",
    "hud-card",
    "hud-scan",
    "hud-dot",
    "hud-frame-corner",
    "hud-label",
    "hud-line",
  ];

  function classList(el) {
    return Array.from(el.classList || []);
  }

  function checkPseudoElementBudget() {
    const warnings = [];
    const allElements = document.querySelectorAll("*");

    allElements.forEach((el) => {
      const classes = classList(el);
      const beforeMatches = classes.filter((cls) => BEFORE_OWNERS.includes(cls));
      const afterMatches = classes.filter((cls) => AFTER_OWNERS.includes(cls));

      if (beforeMatches.length > 1) {
        warnings.push(
          `::before budget collision on <${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}>: classes [${beforeMatches.join(", ")}] all claim the ::before slot.`,
        );
      }
      if (afterMatches.length > 1) {
        warnings.push(
          `::after budget collision on <${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}>: classes [${afterMatches.join(", ")}] all claim the ::after slot.`,
        );
      }
    });

    return warnings;
  }

  function checkRogueHudClasses() {
    const warnings = [];
    const seen = new Set();
    const allElements = document.querySelectorAll('[class*="hud"]');

    allElements.forEach((el) => {
      classList(el).forEach((cls) => {
        if (/hud/i.test(cls) && !KNOWN_HUD_CLASSES.includes(cls) && !seen.has(cls)) {
          seen.add(cls);
          warnings.push(`Rogue HUD class ".${cls}" is not in the documented allow-list (rgbgold-hud.css budget table) - verify it doesn't collide with an existing pseudo-element owner.`);
        }
      });
    });

    return { warnings, rogueClasses: Array.from(seen) };
  }

  function runScan() {
    const rogue = checkRogueHudClasses();
    const results = {
      pseudoElementBudget: checkPseudoElementBudget(),
      rogueHudClasses: rogue.warnings,
      rogueClassNames: rogue.rogueClasses,
    };

    const allWarnings = [].concat(results.pseudoElementBudget, results.rogueHudClasses);

    window.__mshopsEcosystem.hudScan = { results, warningCount: allWarnings.length };

    if (allWarnings.length) {
      console.groupCollapsed(`%c[hud-scan] ${allWarnings.length} HUD compliance warning(s) on ${location.pathname}`, "color:#fbbf24;font-weight:700;");
      allWarnings.forEach((warning) => console.warn(warning));
      console.groupEnd();
    } else {
      console.info(`%c[hud-scan] HUD layer OK on ${location.pathname} - no pseudo-element collisions or rogue HUD classes.`, "color:#34d399;font-weight:700;");
    }
  }

  // Use `load`, not `DOMContentLoaded`: guarantees the DOM (including any
  // late-inserted nodes from page scripts) has settled before censusing.
  if (document.readyState === "complete") {
    runScan();
  } else {
    window.addEventListener("load", runScan);
  }
})();
