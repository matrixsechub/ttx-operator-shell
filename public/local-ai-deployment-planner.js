function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("local-ai-deployment-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function fieldIsSelectable(field, value) {
  return field instanceof HTMLSelectElement && [...field.options].some((option) => option.value === value);
}

function prefillFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const form = document.getElementById("local-ai-deployment-form");
  if (!(form instanceof HTMLFormElement)) return;

  const sourceType = params.get("source_type");
  if (sourceType) {
    const field = form.elements.namedItem("source_type");
    if (fieldIsSelectable(field, sourceType)) field.value = sourceType;
  }

  const sourceRef =
    params.get("source_reference_id") || params.get("rag_plan_id") || params.get("deployment_plan_id") || params.get("quote_id");
  if (sourceRef) {
    const field = form.elements.namedItem("source_reference_id");
    if (field instanceof HTMLInputElement) field.value = sourceRef;
  }

  const useCaseDescription = params.get("use_case_description");
  if (useCaseDescription) {
    const field = form.elements.namedItem("use_case_description");
    if (field instanceof HTMLTextAreaElement) field.value = useCaseDescription;
  }

  const hosting = params.get("hosting_strategy_preference") || params.get("infra_preference");
  if (hosting === "local" || hosting === "hybrid") {
    const field = form.elements.namedItem("hosting_strategy_preference");
    if (fieldIsSelectable(field, hosting)) field.value = hosting;
  }
}

function collectAnswers(form) {
  return {
    source_type: String(form.elements.namedItem("source_type")?.value || "not_sure"),
    source_reference_id: String(form.elements.namedItem("source_reference_id")?.value || "").trim() || undefined,
    use_case: String(form.elements.namedItem("use_case")?.value || "not_sure"),
    use_case_description: String(form.elements.namedItem("use_case_description")?.value || "").trim() || undefined,
    model_family_preference: String(form.elements.namedItem("model_family_preference")?.value || "no_preference"),
    model_size_band: String(form.elements.namedItem("model_size_band")?.value || "not_sure"),
    hardware_profile: String(form.elements.namedItem("hardware_profile")?.value || "not_sure"),
    hosting_strategy_preference: String(form.elements.namedItem("hosting_strategy_preference")?.value || "not_sure"),
    data_sensitivity: String(form.elements.namedItem("data_sensitivity")?.value || "internal"),
    isolation_requirement: String(form.elements.namedItem("isolation_requirement")?.value || "not_sure"),
    concurrent_users: String(form.elements.namedItem("concurrent_users")?.value || "small_team"),
    workload_volume: String(form.elements.namedItem("workload_volume")?.value || "moderate"),
    latency_requirement: String(form.elements.namedItem("latency_requirement")?.value || "balanced"),
    budget_band: String(form.elements.namedItem("budget_band")?.value || "not_sure"),
    timeline: String(form.elements.namedItem("timeline")?.value || "this_month"),
    access_model: String(form.elements.namedItem("access_model")?.value || "authenticated"),
    compliance_notes: String(form.elements.namedItem("compliance_notes")?.value || "").trim() || undefined,
    source_route: "/apps/local-ai-deployment-planner",
    operator_approval: true,
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">None listed.</p>';
  return `<ul class="telemetry-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderObjectBlock(label, obj) {
  if (!obj || typeof obj !== "object") return "";
  const lines = Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      if (Array.isArray(value)) return `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(value.join(", "))}`;
      return `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}`;
    });
  if (!lines.length) return "";
  return `<p class="section-label mono">[ ${escapeHtml(label)} ]</p><div class="system-copy">${lines.join("<br />")}</div>`;
}

function renderResult(result) {
  const target = document.getElementById("local-ai-deployment-result");
  if (!target) return;

  const planId = encodeURIComponent(result.deployment_plan_id || "");
  const agentBuilderHref = `/apps/ai-agent-builder?source_type=local_ai_deployment_plan&source_reference_id=${planId}`;
  const ragPlannerHref = `/apps/rag-architecture-planner?source_type=local_ai_deployment_plan&source_reference_id=${planId}`;
  const quoteHref = `/apps/ai-service-quote?source=local-ai-deployment-planner&source_reference_id=${planId}`;

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ DEPLOYMENT_PLAN :: ${escapeHtml(result.deployment_plan_id || "n/a")} ]</p>
      <h3>Local AI deployment plan</h3>
      <p class="system-copy">
        <strong>Use case:</strong> ${escapeHtml(result.use_case || "n/a")} |
        <strong>Model:</strong> ${escapeHtml(result.model_recommendation || "n/a")} ${escapeHtml(result.model_size || "")} |
        <strong>Hosting:</strong> ${escapeHtml(result.hosting_strategy || "n/a")} |
        <strong>Complexity:</strong> ${escapeHtml(result.complexity_level)} |
        <strong>Risk:</strong> ${escapeHtml(result.risk_level)} |
        <strong>Priority:</strong> ${escapeHtml(result.priority)}
      </p>
      ${renderObjectBlock("HARDWARE_REQUIREMENTS", result.hardware_requirements)}
      ${renderObjectBlock("STORAGE_REQUIREMENTS", result.storage_requirements)}
      <p class="system-copy"><strong>Latency expectation:</strong> ${escapeHtml(result.latency_expectation || "n/a")}</p>
      <p class="system-copy"><strong>Cost estimate:</strong> ${escapeHtml(result.cost_estimate || "n/a")}</p>
      <p class="system-copy"><strong>Data isolation model:</strong> ${escapeHtml(result.data_isolation_model || "n/a")}</p>
      <p class="section-label mono">[ SECURITY_CONTROLS ]</p>
      ${renderList(result.security_controls)}
      <p class="system-copy"><strong>Access control model:</strong> ${escapeHtml(result.access_control_model || "n/a")}</p>
      <p class="system-copy"><strong>Update strategy:</strong> ${escapeHtml(result.update_strategy || "n/a")}</p>
      ${renderObjectBlock("MONITORING_PLAN", result.monitoring_plan)}
      <p class="system-copy"><strong>Scaling plan:</strong> ${escapeHtml(result.scaling_plan || "n/a")}</p>
      <p class="section-label mono">[ INTEGRATION_POINTS ]</p>
      ${renderList(result.integration_points)}
      <p class="section-label mono">[ FAILURE_MODES ]</p>
      ${renderList(result.failure_modes)}
      <p class="system-copy"><strong>Backup strategy:</strong> ${escapeHtml(result.backup_strategy || "n/a")}</p>
      <p class="system-copy"><strong>Estimated effort:</strong> ${escapeHtml(result.estimated_effort || "n/a")}</p>
      <p class="system-copy"><strong>Timeline:</strong> ${escapeHtml(result.timeline || "n/a")}</p>
      <p class="section-copy mono">NEXT STEP :: ${escapeHtml(result.recommended_next_step || "Start local AI intake.")}</p>
      <p class="system-copy"><em>Advisory only. No model downloads, infrastructure provisioning, API calls, or deployment.</em></p>
      <div class="cta-row">
        <a class="button primary" href="${escapeHtml(result.next_route)}">[ START LOCAL AI INTAKE ]</a>
        <a class="button secondary" href="${escapeHtml(agentBuilderHref)}">[ OPEN AI AGENT BUILDER ]</a>
        <a class="button secondary" href="${escapeHtml(ragPlannerHref)}">[ OPEN RAG ARCHITECTURE PLANNER ]</a>
        <a class="button ghost" href="${escapeHtml(quoteHref)}">[ REQUEST AI SERVICE QUOTE ]</a>
      </div>
    </div>
  `;
}

function initStepper() {
  const form = document.getElementById("local-ai-deployment-form");
  const steps = form ? [...form.querySelectorAll("[data-deployment-step]")] : [];
  const prevButton = document.getElementById("deployment-prev");
  const nextButton = document.getElementById("deployment-next");
  const submitButton = document.getElementById("deployment-submit");
  const stepLabel = document.getElementById("deployment-step-label");
  let currentStep = 0;

  function updateStep() {
    steps.forEach((step, index) => {
      const active = index === currentStep;
      step.classList.toggle("is-active", active);
      step.hidden = !active;
    });
    if (stepLabel) stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    if (prevButton instanceof HTMLButtonElement) prevButton.hidden = currentStep === 0;
    if (nextButton instanceof HTMLButtonElement) nextButton.hidden = currentStep === steps.length - 1;
    if (submitButton instanceof HTMLButtonElement) submitButton.hidden = currentStep !== steps.length - 1;
  }

  prevButton?.addEventListener("click", () => {
    currentStep = Math.max(0, currentStep - 1);
    updateStep();
  });

  nextButton?.addEventListener("click", () => {
    currentStep = Math.min(steps.length - 1, currentStep + 1);
    updateStep();
  });

  updateStep();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("local-ai-deployment-form");
  const submitButton = document.getElementById("deployment-submit");
  if (!(form instanceof HTMLFormElement)) return;

  prefillFromQueryParams();
  initStepper();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);

    setStatus("Generating local AI deployment plan...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/local-ai-deployment-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error(`Local AI deployment plan failed with status ${response.status}`);
      const result = await response.json();
      renderResult(result);
      setStatus("Local AI deployment plan complete.", "success");
    } catch (error) {
      console.error("MSHOPS local AI deployment planner error", error);
      setStatus("Local AI deployment plan generation failed. Please retry.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
