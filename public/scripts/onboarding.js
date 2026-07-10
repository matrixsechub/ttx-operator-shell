document.addEventListener("DOMContentLoaded", async () => {
  const registerRef = document.getElementById("onboarding-register-ref");
  const params = new URLSearchParams(window.location.search);
  const registerId = params.get("register_id");

  if (registerRef instanceof HTMLElement && registerId) {
    registerRef.hidden = false;
    registerRef.textContent = `Registration received. Reference: ${registerId}`;
  }

  window.conversionTelemetry?.track("onboarding_viewed", {
    ctaId: params.get("source_page") ? "source-attributed" : "direct",
  });

  document.querySelectorAll("[data-onboarding-cta]").forEach((element) => {
    element.addEventListener("click", () => {
      if (!(element instanceof HTMLElement)) return;
      window.conversionTelemetry?.track("onboarding_cta_clicked", {
        ctaId: element.dataset.onboardingCta ?? "unknown",
      });
    });
  });

  try {
    const response = await fetch("/api/public/demo-mode", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload.cockpit_status !== "under_construction") return;

    const notice = document.createElement("p");
    notice.className = "section-copy mono";
    notice.setAttribute("role", "status");
    notice.textContent =
      payload.cockpit_message ||
      "Operator Cockpit remains in controlled staging while public intake and registration stay active.";
    const hero = document.querySelector(".onboarding-hero");
    if (hero instanceof HTMLElement) {
      hero.appendChild(notice);
    }
  } catch {
    // Non-blocking status banner.
  }
});
