document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("intake-form");
  const status = document.getElementById("intake-form-status");
  const submitButton = document.getElementById("intake-submit");
  const confirmation = document.getElementById("intake-confirmation");
  const confirmationCopy = document.getElementById("intake-confirmation-copy");
  const moduleInterest = document.getElementById("intake-module-interest");
  const intentField = document.getElementById("intake-intent");
  const contextCopy = document.getElementById("intake-context-copy");
  const params = new URLSearchParams(window.location.search);
  const intent = params.get("intent") || "general";
  const path = params.get("path") || "";

  if (intentField instanceof HTMLInputElement) {
    intentField.value = intent;
  }

  if (moduleInterest instanceof HTMLInputElement) {
    moduleInterest.value = path || intent;
  }

  if (contextCopy instanceof HTMLElement && path) {
    contextCopy.textContent = `You arrived from ${path}. Your intake submission will keep that route context attached to the request.`;
  }

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Submitting your request...";
    status.dataset.state = "";

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch("/api/engagements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();
      status.textContent = `Request received. Reference ${result.engagement_id || result.id}.`;
      status.dataset.state = "success";

      window.flowTracker?.recordFormSubmit("intake-form");

      if (confirmation instanceof HTMLElement) {
        confirmation.hidden = false;
      }

      if (confirmationCopy instanceof HTMLElement) {
        confirmationCopy.textContent = `Your request was received and stored with reference ${result.engagement_id || result.id}.`;
      }

      form.reset();
      if (intentField instanceof HTMLInputElement) intentField.value = intent;
      if (moduleInterest instanceof HTMLInputElement) moduleInterest.value = path || intent;
    } catch (error) {
      console.error("MSH OPS intake submission failed", error);
      status.textContent = "The intake path is unavailable right now. Please try again shortly or use the contact page.";
      status.dataset.state = "error";
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
});
