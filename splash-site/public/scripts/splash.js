document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector("[data-splash-hero]");
  if (!(hero instanceof HTMLElement)) {
    return;
  }

  hero.classList.add("is-ready");
});
