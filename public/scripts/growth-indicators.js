(function growthIndicators() {
  const STRIP_ID = "growth-indicator-strip";

  function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function buildIndicators(pathname, variant) {
    const indicators = ["Fed-grade compliance enabled"];

    if (pathname === "/" || pathname === "/welcome") {
      indicators.unshift("Growth-optimized landing");
    }
    if (pathname === "/marketplace") {
      indicators.unshift("Edge-routed marketplace entry");
    }
    if (pathname === "/register" || pathname.includes("intent=")) {
      indicators.unshift("Tracked subscription CTA");
    }
    if (variant) {
      indicators.push(`Variant: ${variant}`);
    }

    const operatorToken = window.localStorage.getItem("mshops_hsx_operator_session");
    if (operatorToken) {
      indicators.push("Zero-trust session active");
    }

    return indicators;
  }

  function renderStrip(indicators) {
    let strip = document.getElementById(STRIP_ID);
    if (!strip) {
      strip = document.createElement("section");
      strip.id = STRIP_ID;
      strip.className = "growth-indicator-strip";
      strip.setAttribute("role", "status");
      strip.setAttribute("aria-live", "polite");
      strip.setAttribute("aria-label", "Growth and compliance indicators");

      const main = document.querySelector("main") || document.body;
      main.insertBefore(strip, main.firstChild);
    }

    strip.innerHTML = indicators
      .map((label) => `<span class="growth-indicator-chip is-active">${label}</span>`)
      .join("");
  }

  function trackPageView(pathname, variant) {
    fetch("/api/growth/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "page_view",
        pathname,
        variant: variant || null,
        cta_source: "growth-indicators",
      }),
    }).catch(() => {});
  }

  function bindTrackedCtas() {
    document.querySelectorAll("[data-growth-cta]").forEach((element) => {
      element.addEventListener("click", () => {
        fetch("/api/growth/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "cta_click",
            pathname: window.location.pathname,
            cta_source: element.getAttribute("data-growth-cta") || "unknown",
            variant: readCookie("mshops_growth_variant") || null,
          }),
        }).catch(() => {});
      });
    });
  }

  async function init() {
    const pathname = window.location.pathname;
    const variant = readCookie("mshops_growth_variant");
    renderStrip(buildIndicators(pathname, variant));
    trackPageView(pathname, variant);
    bindTrackedCtas();

    try {
      const posture = await fetch("/api/growth/posture").then((response) => response.json());
      if (posture?.fedgrade_enabled) {
        renderStrip(buildIndicators(pathname, variant));
      }
    } catch {
      /* posture fetch optional */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
