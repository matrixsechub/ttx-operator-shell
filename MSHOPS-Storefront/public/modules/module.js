function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return table[character];
  });
}

function formatStatus(value) {
  return String(value || "unknown").replace(/_/g, " ").toUpperCase();
}

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

function renderList(elementId, items) {
  const values = Array.isArray(items) && items.length ? items : ["No additional guidance attached."];
  document.getElementById(elementId).innerHTML = values
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderModule(moduleData) {
  document.title = `${moduleData.name} | MSH OPS Marketplace`;
  document.getElementById("module-category").textContent = moduleData.metadata.category;
  document.getElementById("module-num").textContent = moduleData.metadata.num;
  document.getElementById("module-name").textContent = moduleData.name;
  document.getElementById("module-description").textContent = moduleData.description;
  document.getElementById("module-long-description").textContent = moduleData.metadata.longDescription;
  document.getElementById("module-status").textContent = formatStatus(moduleData.status);
  document.getElementById("module-access").textContent = formatStatus(moduleData.metadata.accessLevel);
  document.getElementById("module-updated").textContent = formatDate(moduleData.lastUpdated);
  document.getElementById("module-route").textContent = moduleData.metadata.route;
  document.getElementById("module-cta-label").textContent = moduleData.metadata.ctaLabel;

  document.getElementById("module-tags").innerHTML = moduleData.tags
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");

  renderList("module-features", moduleData.metadata.features);
  renderList("module-access-instructions", moduleData.metadata.accessInstructions);

  const ctaLink = document.getElementById("module-cta-link");
  const ctaHref = moduleData.metadata.ctaHref || moduleData.metadata.route;
  ctaLink.href = ctaHref;
  ctaLink.textContent = moduleData.metadata.ctaLabel;

  if (ctaHref.startsWith("http")) {
    ctaLink.target = "_blank";
    ctaLink.rel = "noreferrer";
  }

  const payloadLink = document.getElementById("module-payload-link");
  payloadLink.href = `/api/modules/${moduleData.id}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const moduleId = document.body.dataset.moduleId;
  const moduleData = await fetchJson(`/api/modules/${moduleId}`);
  renderModule(moduleData);
});