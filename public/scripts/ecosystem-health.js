/**
 * ECOSYSTEM HEALTH - AGGREGATE DASHBOARD
 * -----------------------------------------------------------------------
 * DRIFT-MARKER: layer=ecosystem-health file=public/scripts/ecosystem-health.js version=1.1
 *
 * Read-only diagnostics script - never mutates the DOM or CSS, only logs
 * to the console. Include LAST, after drift.js, a11y-scan.js,
 * motion-scan.js, and hud-scan.js (all four run first and each publish
 * their findings onto `window.__mshopsEcosystem`):
 *   <script src="/scripts/drift.js" defer></script>
 *   <script src="/scripts/a11y-scan.js" defer></script>
 *   <script src="/scripts/motion-scan.js" defer></script>
 *   <script src="/scripts/hud-scan.js" defer></script>
 *   <script src="/scripts/ecosystem-health.js" defer></script>
 *
 * This script does two things:
 *   1. Aggregates `window.__mshopsEcosystem.{drift, motionScan, a11yScan,
 *      hudScan}` (each populated by its own scanner script) into a single
 *      console report, so a contributor only has to open one collapsed
 *      group to see the full compliance picture for the current page.
 *   2. Runs its own lightweight, complementary checks that don't belong
 *      in any single scanner: stylesheet load order, live Accessibility
 *      Mode state, live prefers-reduced-motion state, and a census of
 *      ecosystem component classes present on the page (HUD overlays,
 *      module shells, operator surfaces, marketplace entries, cinematic/
 *      a11y hooks, expansion-safe placeholders).
 *
 * If a page doesn't load one of the four scanner scripts, this script
 * still runs - it just reports that category as "not run on this page"
 * rather than throwing. It is always safe to include on any page and
 * never affects rendering.
 */

(function ecosystemHealthDashboard() {
  "use strict";

  window.__mshopsEcosystem = window.__mshopsEcosystem || {};

  var EXPECTED_STYLESHEET_ORDER = [
    "rgbgold-tokens.css",
    "rgbgold-motion.css",
    "rgbgold-components.css",
    "rgbgold-hud.css",
    "rgbgold-hooks.css",
    "a11y.css",
  ];

  function getLoadedStylesheetOrder() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('link[rel="stylesheet"]')
    );
    return links
      .map(function (link) {
        var href = link.getAttribute("href") || "";
        var match = href.match(/([^\/?#]+\.css)(?:[?#]|$)/);
        return match ? match[1] : href;
      })
      .filter(Boolean);
  }

  function checkLoadOrder(loaded) {
    var relevant = loaded.filter(function (name) {
      return EXPECTED_STYLESHEET_ORDER.indexOf(name) !== -1;
    });
    var expectedSubsequence = EXPECTED_STYLESHEET_ORDER.filter(function (
      name
    ) {
      return relevant.indexOf(name) !== -1;
    });
    var inOrder = relevant.join(",") === expectedSubsequence.join(",");
    return { relevant: relevant, inOrder: inOrder };
  }

  function getAccessibilityModeState() {
    try {
      return {
        bodyClass: document.body.classList.contains("a11y-mode"),
        localStorage: window.localStorage
          ? window.localStorage.getItem("mshops_accessibility_mode")
          : null,
      };
    } catch (e) {
      return { bodyClass: false, localStorage: null, error: String(e) };
    }
  }

  function getReducedMotionState() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function countSelector(selector) {
    try {
      return document.querySelectorAll(selector).length;
    } catch (e) {
      return 0;
    }
  }

  function collectComponentCensus() {
    return {
      hudOverlays: countSelector(".scanline-overlay"),
      hudFrames: countSelector(".hud-frame"),
      hudTags: countSelector(".hud-tag"),
      rgbgoldModuleShells: countSelector(".rgbgold-module-shell"),
      operatorSurfaces: countSelector(".operator-surface"),
      marketplaceEntries: countSelector(".marketplace-entry"),
      cinematicHooks: countSelector(".cinematic-hook"),
      a11yHooks: countSelector(".a11y-hook"),
      expansionSafe: countSelector(".expansion-safe"),
      scenarioControlPanels: countSelector(".scenario-control-panel"),
      scenarioTimelines: countSelector(".scenario-timeline"),
      scenarioEventFeeds: countSelector(".scenario-event-feed"),
      dsEnforceHooks: countSelector("[data-ds-enforce]"),
    };
  }

  function getDesignSystemEnforcement(totalScannerWarnings, scannerReports) {
    var ranAllScanners = ["drift", "motionScan", "a11yScan", "hudScan"].every(function (key) {
      return !!scannerReports[key];
    });
    return {
      hooksPresent: countSelector("[data-ds-enforce]"),
      status: ranAllScanners && totalScannerWarnings === 0 ? "PASS" : "ATTENTION",
    };
  }

  function scannerSummary(name, key) {
    var scanner = window.__mshopsEcosystem && window.__mshopsEcosystem[key];
    if (!scanner) {
      return name + ": not run on this page (script not included).";
    }
    return name + ": " + scanner.warningCount + " warning(s).";
  }

  function report() {
    var loaded = getLoadedStylesheetOrder();
    var orderCheck = checkLoadOrder(loaded);
    var a11y = getAccessibilityModeState();
    var reducedMotion = getReducedMotionState();
    var census = collectComponentCensus();

    var scannerReports = {
      drift: window.__mshopsEcosystem.drift || null,
      motionScan: window.__mshopsEcosystem.motionScan || null,
      a11yScan: window.__mshopsEcosystem.a11yScan || null,
      hudScan: window.__mshopsEcosystem.hudScan || null,
    };

    var totalScannerWarnings = ["drift", "motionScan", "a11yScan", "hudScan"].reduce(
      function (sum, key) {
        var scanner = scannerReports[key];
        return sum + (scanner ? scanner.warningCount : 0);
      },
      0
    );

    var enforcement = getDesignSystemEnforcement(totalScannerWarnings, scannerReports);

    /* eslint-disable no-console */
    console.groupCollapsed(
      "%c[ecosystem-health] RGB+Gold Design System aggregate report (" + location.pathname + ")",
      "color:#c9a24b;font-weight:bold;"
    );
    console.log("Stylesheet load order (relevant files):", orderCheck.relevant);
    console.log(
      orderCheck.inOrder
        ? "%cLoad order OK"
        : "%cLoad order MISMATCH - check FRONTEND_CI_CHECKLIST.md #5",
      orderCheck.inOrder ? "color:#3ddc84;" : "color:#ff5c5c;"
    );
    console.log("Accessibility Mode:", a11y);
    console.log("prefers-reduced-motion:", reducedMotion);
    console.log("Component census:", census);
    console.log(
      "%cScanner summary (" + totalScannerWarnings + " total warning(s) across all scanners):",
      totalScannerWarnings ? "color:#fbbf24;font-weight:600;" : "color:#3ddc84;font-weight:600;"
    );
    console.log("  " + scannerSummary("Drift detection", "drift"));
    console.log("  " + scannerSummary("Motion compliance", "motionScan"));
    console.log("  " + scannerSummary("Accessibility compliance", "a11yScan"));
    console.log("  " + scannerSummary("HUD compliance", "hudScan"));
    console.log(
      enforcement.status === "PASS"
        ? "%cDesign-system enforcement: PASS (" + enforcement.hooksPresent + " .ds-enforce hook(s) on this page, 0 warnings)"
        : "%cDesign-system enforcement: ATTENTION (" + enforcement.hooksPresent + " .ds-enforce hook(s) on this page, " + totalScannerWarnings + " warning(s))",
      enforcement.status === "PASS" ? "color:#3ddc84;font-weight:bold;" : "color:#fbbf24;font-weight:bold;"
    );
    console.groupEnd();
    /* eslint-enable no-console */

    var aggregate = {
      stylesheetOrder: orderCheck,
      accessibilityMode: a11y,
      reducedMotion: reducedMotion,
      componentCensus: census,
      scanners: scannerReports,
      totalScannerWarnings: totalScannerWarnings,
      designSystemEnforcement: enforcement,
    };

    window.__mshopsEcosystem.health = aggregate;
    return aggregate;
  }

  window.mshopsEcosystemHealth = { report: report };

  function runWhenScannersSettle() {
    /* Scanner scripts (drift/a11y-scan/motion-scan/hud-scan) run on their
       own `load` listeners registered before this script's, so by the time
       this fires they have already populated window.__mshopsEcosystem. A
       microtask defer adds one more safety margin for scripts loaded with
       `defer` in a different order. */
    setTimeout(report, 0);
  }

  // Use `load`, not `DOMContentLoaded`: external stylesheets used by the
  // stylesheet-order check (and read by the scanner scripts above) are not
  // guaranteed to have finished parsing by DOMContentLoaded.
  if (document.readyState === "complete") {
    runWhenScannersSettle();
  } else {
    window.addEventListener("load", runWhenScannersSettle);
  }
})();
