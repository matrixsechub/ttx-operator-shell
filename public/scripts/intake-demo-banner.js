document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/public/demo-mode", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();
    if (!result?.enabled) {
      return;
    }

    const banner = document.createElement("div");
    banner.className = "intake-demo-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.textContent = result.message || "Demo Mode — No data stored";

    const topbar = document.querySelector(".topbar");
    if (topbar instanceof HTMLElement) {
      topbar.insertAdjacentElement("beforebegin", banner);
    } else {
      document.body.insertAdjacentElement("afterbegin", banner);
    }

    document.body.classList.add("demo-mode-active");
  } catch (error) {
    console.warn("MSH OPS demo banner unavailable", error);
  }
});
