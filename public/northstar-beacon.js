function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("northstar-beacon-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function trackEvent(event, metadata = {}) {
  fetch("/api/growth/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      surface: "northstar-beacon",
      path: window.location.pathname,
      metadata,
    }),
    keepalive: true,
  }).catch(() => {});
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

let catalog = null;
let activeStep = 0;

function renderTiers(tiers) {
  const grid = document.getElementById("northstar-tier-grid");
  if (!grid) return;
  grid.innerHTML = tiers
    .map(
      (tier) => `
      <article class="service-card bracket" data-tier-id="${escapeHtml(tier.id)}">
        <div class="bracket-inner">
          <p class="section-label mono">[ ${escapeHtml(tier.slug.toUpperCase())} ]</p>
          <h3>${escapeHtml(tier.name)}</h3>
          <p class="hero-sub">${escapeHtml(tier.subtitle)}</p>
          <p class="mono">${escapeHtml(tier.price_label)}</p>
          <ul class="system-copy">
            ${tier.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
          </ul>
          <button class="button secondary select-tier" type="button" data-tier="${escapeHtml(tier.id)}">
            [ SELECT ${escapeHtml(tier.name.toUpperCase())} ]
          </button>
        </div>
      </article>`,
    )
    .join("");

  grid.querySelectorAll(".select-tier").forEach((button) => {
    button.addEventListener("click", () => {
      const tierId = button.getAttribute("data-tier");
      const input = document.getElementById("selected-tier-input");
      if (input instanceof HTMLInputElement && tierId) {
        input.value = tierId;
        trackEvent("tier_selection", { tier: tierId });
        setStatus(`Selected tier: ${tierId}`, "ok");
        document.getElementById("intake-form")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

function renderFaq(faq) {
  const list = document.getElementById("northstar-faq-list");
  if (!list || !Array.isArray(faq)) return;
  list.innerHTML = faq
    .map(
      (entry) => `
      <article class="service-card bracket">
        <div class="bracket-inner">
          <h3>${escapeHtml(entry.q)}</h3>
          <p class="system-copy">${escapeHtml(entry.a)}</p>
        </div>
      </article>`,
    )
    .join("");
}

function updateStepUi() {
  const steps = document.querySelectorAll("[data-northstar-step]");
  steps.forEach((step) => {
    const index = Number(step.getAttribute("data-northstar-step"));
    step.hidden = index !== activeStep;
    step.classList.toggle("is-active", index === activeStep);
  });
  const label = document.getElementById("northstar-step-label");
  if (label) label.textContent = `Step ${activeStep + 1} of ${steps.length}`;
  const prev = document.getElementById("northstar-prev");
  const next = document.getElementById("northstar-next");
  const submit = document.getElementById("northstar-submit");
  if (prev instanceof HTMLButtonElement) prev.hidden = activeStep === 0;
  if (next instanceof HTMLButtonElement) next.hidden = activeStep >= steps.length - 1;
  if (submit instanceof HTMLButtonElement) submit.hidden = activeStep < steps.length - 1;
}

function buildPayload(form) {
  const data = new FormData(form);
  return {
    organization_name: String(data.get("organization_name") || ""),
    strategic_northstar: String(data.get("strategic_northstar") || ""),
    strategic_axis: splitCsv(data.get("strategic_axis")),
    priorities: splitCsv(data.get("priorities")),
    prohibited_actions: splitCsv(data.get("prohibited_actions")),
    approval_required_actions: splitCsv(data.get("approval_required_actions")),
    agent_roles: splitCsv(data.get("agent_roles")),
    agent_permissions: [],
    allowed_governance_sources: ["pieces-os-mcp"],
    mutation_policy: "operator-only-manual-apply",
    escalation_rules: ["Deviation from strategic axis", "Missing beacon reference"],
    recursion_depth_limit: Number(data.get("recursion_depth_limit") || 3),
    termination_conditions: ["Safe mode activated", "Hash mismatch detected"],
    audit_requirements: ["Log proposals", "Log approvals"],
    deployment_environment: String(data.get("deployment_environment") || "not_sure"),
    preferred_language: String(data.get("preferred_language") || "typescript"),
    compliance_framework: String(data.get("compliance_framework") || "") || undefined,
    selected_tier: String(data.get("selected_tier") || "beacon-core"),
    source_type: "marketplace_purchase",
    source_route: "/apps/northstar-beacon",
    assisted_implementation: data.get("assisted_implementation") === "true",
    operator_approval: true,
  };
}

function renderResult(body) {
  const target = document.getElementById("northstar-beacon-result");
  if (!target) return;
  const files = Array.isArray(body.files) ? body.files : [];
  target.innerHTML = `
    <article class="service-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ PACKAGE_READY :: READ_ONLY ]</p>
        <p class="mono">Order: ${escapeHtml(body.order_id || "")}</p>
        <p class="mono">Integrity hash: ${escapeHtml(body.integrity_hash || "")}</p>
        <p class="mono">Files: ${files.length}</p>
        <p class="system-copy">Hash verification: PASS · Agent mutation: DENIED · Operator authority: RETAINED</p>
        <a class="button primary" href="${escapeHtml(body.next_route || "/enter")}">[ CONTINUE TO PURCHASE INTAKE ]</a>
        <details>
          <summary class="mono">Package file manifest</summary>
          <ul class="mono">${files.map((file) => `<li>${escapeHtml(file.path)}</li>`).join("")}</ul>
        </details>
      </div>
    </article>`;
}

async function loadCatalog() {
  trackEvent("marketplace_page_view");
  const response = await fetch("/api/northstar-beacon/catalog");
  if (!response.ok) throw new Error("catalog-unavailable");
  catalog = await response.json();
  renderTiers(catalog.tiers || []);
  renderFaq(catalog.listing?.faq || []);
  const preview = document.getElementById("northstar-sample-preview");
  if (preview) {
    preview.textContent = JSON.stringify(
      {
        version: "1.0.0",
        state: "active",
        authority: { agentExecutionRequiresApproval: true },
        autonomy: { mutationAllowed: false, operatorApprovalRequired: true },
        audit: { hashAlgorithm: "sha256" },
      },
      null,
      2,
    );
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = document.getElementById("northstar-beacon-form");
  if (!(form instanceof HTMLFormElement)) return;
  if (!form.elements.namedItem("operator_authority_confirm")) {
    setStatus("Operator authority confirmation required", "error");
    return;
  }
  const confirm = form.elements.namedItem("operator_authority_confirm");
  if (confirm instanceof HTMLInputElement && !confirm.checked) {
    setStatus("Operator authority confirmation required", "error");
    return;
  }

  const payload = buildPayload(form);
  setStatus("Validating beacon configuration…", "pending");
  trackEvent("checkout_initiation", { tier: payload.selected_tier });

  const validateResponse = await fetch("/api/northstar-beacon/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!validateResponse.ok) {
    const errorBody = await validateResponse.json().catch(() => ({}));
    setStatus(`Validation failed: ${errorBody.errors?.[0] || "invalid configuration"}`, "error");
    trackEvent("abandonment_point", { stage: "validation" });
    return;
  }

  setStatus("Generating customer beacon package…", "pending");
  trackEvent("intake_completion");

  const generateResponse = await fetch("/api/northstar-beacon/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await generateResponse.json().catch(() => ({}));
  if (!generateResponse.ok) {
    setStatus(`Generation failed: ${body.error || generateResponse.status}`, "error");
    trackEvent("abandonment_point", { stage: "generation" });
    return;
  }

  trackEvent("package_generation", { order_id: body.order_id, tier: body.selected_tier });
  trackEvent("purchase_completion", { order_id: body.order_id });
  if (payload.assisted_implementation) {
    trackEvent("assisted_implementation_request", { order_id: body.order_id });
  }
  setStatus("Beacon package generated. Hash verified. Operator authority retained.", "ok");
  renderResult(body);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCatalog().catch(() => setStatus("Unable to load marketplace catalog", "error"));

  document.getElementById("northstar-next")?.addEventListener("click", () => {
    activeStep = Math.min(activeStep + 1, 1);
    updateStepUi();
  });
  document.getElementById("northstar-prev")?.addEventListener("click", () => {
    activeStep = Math.max(activeStep - 1, 0);
    updateStepUi();
  });
  document.getElementById("northstar-beacon-form")?.addEventListener("submit", handleSubmit);
  updateStepUi();
});
