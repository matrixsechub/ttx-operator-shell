/**
 * RGB+GOLD OPERATOR DESIGN SYSTEM — MOTION HELPER
 * -----------------------------------------------------------------------
 * Standalone, additive script that powers the `.reveal` scroll-trigger
 * utility from rgbgold-motion.css. Deliberately kept separate from each
 * page's existing app.js/services.js/etc. so it never touches existing
 * page logic - it only looks for `.reveal` elements and toggles
 * `.is-visible` when they enter the viewport.
 *
 * Include via <script src="/scripts/rgbgold-motion.js" defer></script> on
 * any page that uses `.reveal`.
 */

(function initRgbGoldReveal() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function run() {
    const revealNodes = document.querySelectorAll(".reveal");
    if (!revealNodes.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealNodes.forEach((node) => observer.observe(node));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
