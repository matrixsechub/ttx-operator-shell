document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("register-form");
  const status = document.getElementById("register-form-status");
  const submitButton = document.getElementById("register-submit");
  const sourcePageInput = document.getElementById("register-source-page");
  const underConstructionBanner = document.getElementById("register-under-construction");
  const underConstructionCopy = document.getElementById("register-under-construction-copy");

  if (sourcePageInput instanceof HTMLInputElement) {
    const params = new URLSearchParams(window.location.search);
    sourcePageInput.value = params.get("source_page") || document.referrer || window.location.pathname;
  }

  window.conversionTelemetry?.track("registration_started", {
    ctaId: "register-form",
  });

  async function loadCockpitStatus() {
    try {
      const response = await fetch("/api/public/demo-mode", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      console.warn("MSH OPS cockpit status unavailable", error);
      return null;
    }
  }

  const demoModePayload = await loadCockpitStatus();
  if (demoModePayload?.cockpit_status === "under_construction") {
    if (underConstructionBanner instanceof HTMLElement) {
      underConstructionBanner.hidden = false;
    }
    if (underConstructionCopy instanceof HTMLElement) {
      underConstructionCopy.textContent =
        demoModePayload.cockpit_message ||
        "Operator Cockpit is in controlled staging. Your registration is persisted and queued for operator review.";
    }
    document.body.classList.add("register-under-construction-active");
  }

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("focusin", () => {
    window.conversionTelemetry?.track("registration_started", {
      ctaId: "register-form-focus",
    });
  }, { once: true });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Submitting access request...";
    status.dataset.state = "";

    window.conversionTelemetry?.track("registration_submitted", {
      ctaId: "register-form-submit",
    });

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();

      window.flowTracker?.recordFormSubmit("register-form");

      const onboardingParams = new URLSearchParams();
      if (result.register_id) {
        onboardingParams.set("register_id", result.register_id);
      }
      if (result.role) {
        onboardingParams.set("role", result.role);
      }
      onboardingParams.set("source_page", "/register");
      window.location.assign(`/onboarding?${onboardingParams.toString()}`);
      return;
    } catch (error) {
      console.error("MSH OPS registration submission failed", error);
      status.textContent = "The registration path is unavailable right now. Please try again shortly.";
      status.dataset.state = "error";
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
});
