document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const status = document.getElementById("register-form-status");
  const submitButton = document.getElementById("register-submit");
  const confirmation = document.getElementById("register-confirmation");
  const confirmationCopy = document.getElementById("register-confirmation-copy");
  const demoNote = document.getElementById("register-demo-note");

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
      status.textContent = "Access Pending — Operator Review Required";
      status.dataset.state = "success";

      if (confirmation instanceof HTMLElement) {
        confirmation.hidden = false;
      }

      if (confirmationCopy instanceof HTMLElement) {
        confirmationCopy.textContent = "Access Pending — Operator Review Required";
      }

      if (result.next_route && confirmation instanceof HTMLElement) {
        const ctaRow = confirmation.querySelector(".cta-row");
        if (ctaRow && !ctaRow.querySelector("[data-register-next-route]")) {
          const nextLink = document.createElement("a");
          nextLink.className = "button primary";
          nextLink.href = result.next_route;
          nextLink.setAttribute("data-register-next-route", "true");
          nextLink.textContent = "Continue to Intake Funnel";
          ctaRow.prepend(nextLink);
        }
      }

      if (demoNote instanceof HTMLElement) {
        demoNote.hidden = result.mode !== "demo";
      }

      form.reset();
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
