document.addEventListener("DOMContentLoaded", async () => {
  const stages = Array.from(document.querySelectorAll(".onboarding-stage"));
  const progress = document.getElementById("onboarding-progress");
  const prevButton = document.getElementById("onboarding-prev");
  const nextButton = document.getElementById("onboarding-next");
  const stepLabel = document.getElementById("onboarding-step-label");
  const comingOnlineBanner = document.getElementById("onboarding-coming-online");
  const cockpitCta = document.getElementById("onboarding-cockpit-cta");
  const registerRef = document.getElementById("onboarding-register-ref");

  const params = new URLSearchParams(window.location.search);
  const registerId = params.get("register_id");
  if (registerRef instanceof HTMLElement && registerId) {
    registerRef.hidden = false;
    registerRef.textContent = `REGISTER_ID :: ${registerId}`;
  }

  let currentStep = 0;
  const totalSteps = stages.length;

  function buildProgress() {
    if (!(progress instanceof HTMLElement)) {
      return;
    }
    progress.innerHTML = "";
    for (let index = 0; index < totalSteps; index += 1) {
      const dot = document.createElement("span");
      dot.className = "onboarding-progress-dot";
      dot.setAttribute("role", "presentation");
      progress.appendChild(dot);
    }
  }

  function updateUi() {
    stages.forEach((stage, index) => {
      stage.classList.toggle("is-active", index === currentStep);
    });

    if (progress instanceof HTMLElement) {
      progress.querySelectorAll(".onboarding-progress-dot").forEach((dot, index) => {
        dot.classList.toggle("is-active", index === currentStep);
        dot.classList.toggle("is-complete", index < currentStep);
      });
    }

    if (stepLabel instanceof HTMLElement) {
      stepLabel.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
    }

    if (prevButton instanceof HTMLButtonElement) {
      prevButton.disabled = currentStep === 0;
    }

    if (nextButton instanceof HTMLButtonElement) {
      const isLast = currentStep === totalSteps - 1;
      nextButton.textContent = isLast ? "Finish" : "Continue";
      nextButton.hidden = isLast;
    }
  }

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
  const cockpitUnderConstruction = demoModePayload?.cockpit_status === "under_construction";

  if (cockpitUnderConstruction) {
    if (comingOnlineBanner instanceof HTMLElement) {
      comingOnlineBanner.hidden = false;
      if (demoModePayload?.cockpit_message) {
        comingOnlineBanner.textContent = `⚠️ Cockpit Coming Online — ${demoModePayload.cockpit_message}`;
      }
    }
    if (cockpitCta instanceof HTMLAnchorElement) {
      cockpitCta.textContent = "Cockpit Coming Online";
      cockpitCta.setAttribute("aria-disabled", "true");
      cockpitCta.addEventListener("click", (event) => {
        event.preventDefault();
      });
    }
  }

  buildProgress();
  updateUi();

  if (prevButton instanceof HTMLButtonElement) {
    prevButton.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep -= 1;
        updateUi();
      }
    });
  }

  if (nextButton instanceof HTMLButtonElement) {
    nextButton.addEventListener("click", () => {
      if (currentStep < totalSteps - 1) {
        currentStep += 1;
        updateUi();
      }
    });
  }
});
