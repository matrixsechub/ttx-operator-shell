document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-form-status");
  const submitButton = document.getElementById("contact-submit");
  const confirmation = document.getElementById("contact-confirmation");
  const confirmationCopy = document.getElementById("contact-confirmation-copy");

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Sending your message...";
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
      status.textContent = `Message received. Reference ${result.engagement_id || result.id}.`;
      status.dataset.state = "success";

      if (confirmation instanceof HTMLElement) {
        confirmation.hidden = false;
      }

      if (confirmationCopy instanceof HTMLElement) {
        confirmationCopy.textContent = `Your message was accepted and stored with reference ${result.engagement_id || result.id}.`;
      }

      form.reset();
    } catch (error) {
      console.error("MSH OPS contact submission failed", error);
      status.textContent = "The contact path is unavailable right now. Please try again shortly or use the intake funnel.";
      status.dataset.state = "error";
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
});
