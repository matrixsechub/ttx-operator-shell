document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("register-form");
  const status = document.getElementById("register-form-status");
  const submitButton = document.getElementById("register-submit");
  const confirmation = document.getElementById("register-confirmation");
  const confirmationCopy = document.getElementById("register-confirmation-copy");
  const demoNote = document.getElementById("register-demo-note");
  const cockpitNote = document.getElementById("register-cockpit-update-note");
  const underConstructionBanner = document.getElementById("register-under-construction");
  const underConstructionCopy = document.getElementById("register-under-construction-copy");

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
        "Operator Cockpit Under Construction — Your registration will receive updates as systems come online.";
    }
    document.body.classList.add("register-under-construction-active");
  }

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Submitting access request...";
    status.dataset.state = "";

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
