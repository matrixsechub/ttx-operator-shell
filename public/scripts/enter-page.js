document.addEventListener("DOMContentLoaded", () => {
  const buttons = Array.from(document.querySelectorAll("[data-intent-button]"));
  const panels = Array.from(document.querySelectorAll("[data-intent-panel]"));
  const status = document.getElementById("enter-route-status");
  const params = new URLSearchParams(window.location.search);
  const initialIntent = params.get("intent") || "orientation";

  function selectIntent(intent) {
    buttons.forEach((button) => {
      const active = button.dataset.intent === intent;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const active = panel.dataset.intentPanel === intent;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    if (status) {
      status.textContent = `${intent.charAt(0).toUpperCase()}${intent.slice(1)} selected. Previewing the best starting route now.`;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      selectIntent(button.dataset.intent || "orientation");
    });
  });

  selectIntent(initialIntent);
});
