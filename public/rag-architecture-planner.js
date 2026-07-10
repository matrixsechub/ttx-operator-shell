function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("rag-architecture-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

const DIAGNOSTIC_PARAM_KEYS = [
  "rag_risk_id",
  "rag_risk_score",
  "rag_risk_tier",
  "retrieval_exposure_level",
  "access_control_level",
  "governance_maturity",
  "source_reference_id",
  "quote_id",
  "agent_check_id",
];

function buildDiagnosticContext(params) {
  const context = {};
  for (const key of DIAGNOSTIC_PARAM_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    if (key === "rag_risk_score") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) context[key] = numeric;
    } else {
      context[key] = value;
    }
  }
  return context;
}

function fieldIsSelectable(field, value) {
  return field instanceof HTMLSelectElement && [...field.options].some((option) => option.value === value);
}

function prefillFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const form = document.getElementById("rag-architecture-form");
  if (!(form instanceof HTMLFormElement)) return;

  const sourceType = params.get("source_type");
  if (sourceType) {
    const field = form.elements.namedItem("source_type");
    if (fieldIsSelectable(field, sourceType)) field.value = sourceType;
  }

  const sourceRef = params.get("source_reference_id") || params.get("rag_risk_id") || params.get("quote_id");
  if (sourceRef) {
    const field = form.elements.namedItem("source_reference_id");
    if (field instanceof HTMLInputElement) field.value = sourceRef;
  }

  const useCaseDescription = params.get("use_case_description");
  if (useCaseDescription) {
    const field = form.elements.namedItem("use_case_description");
    if (field instanceof HTMLTextAreaElement) field.value = useCaseDescription;
  }

  const retrievalExposure = params.get("retrieval_exposure_level");
  if (retrievalExposure === "high" || retrievalExposure === "critical") {
    const sensitivity = form.elements.namedItem("data_sensitivity");
    if (fieldIsSelectable(sensitivity, "confidential")) sensitivity.value = "confidential";
  }
}

function collectCheckboxValues(form, name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function collectAnswers(form) {
  const params = new URLSearchParams(window.location.search);
  const diagnostic_context = buildDiagnosticContext(params);
  return {
    source_type: String(form.elements.namedItem("source_type")?.value || "not_sure"),
    source_reference_id: String(form.elements.namedItem("source_reference_id")?.value || "").trim() || undefined,
    use_case: String(form.elements.namedItem("use_case")?.value || "not_sure"),
    use_case_description: String(form.elements.namedItem("use_case_description")?.value || "").trim() || undefined,
    data_sources: collectCheckboxValues(form, "data_sources"),
    data_sensitivity: String(form.elements.namedItem("data_sensitivity")?.value || "internal"),
    document_volume: String(form.elements.namedItem("document_volume")?.value || "medium"),
    query_patterns: collectCheckboxValues(form, "query_patterns"),
    freshness_requirement: String(form.elements.namedItem("freshness_requirement")?.value || "daily"),
    citation_requirement: String(form.elements.namedItem("citation_requirement")?.value || "recommended"),
    infra_preference: String(form.elements.namedItem("infra_preference")?.value || "not_sure"),
    latency_requirement: String(form.elements.namedItem("latency_requirement")?.value || "balanced"),
    budget_band: String(form.elements.namedItem("budget_band")?.value || "not_sure"),
    timeline: String(form.elements.namedItem("timeline")?.value || "this_month"),
    access_model: String(form.elements.namedItem("access_model")?.value || "authenticated"),
    compliance_notes: String(form.elements.namedItem("compliance_notes")?.value || "").trim() || undefined,
    diagnostic_context: Object.keys(diagnostic_context).length ? diagnostic_context : undefined,
    source_route: "/apps/rag-architecture-planner",
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

function renderMemoryLayers(layers) {
  if (!Array.isArray(layers) || !layers.length) return '<p class="system-copy">No memory layers defined.</p>';
  return layers
    .map(
      (layer) => `
        <div class="system-copy">
          <strong>${escapeHtml(layer.layer)}</strong> — ${escapeHtml(layer.scope)}<br />
          Retention: ${escapeHtml(layer.retention)} | Use when: ${escapeHtml(layer.use_when)}
        </div>`,
    )
    .join("");
}

function renderTradeoffs(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">No tradeoff profiles.</p>';
  return items
    .map(
      (item) => `
        <div class="system-copy">
          <strong>${escapeHtml(item.profile)}</strong><br />
          Latency: ${escapeHtml(item.latency)} | Cost: ${escapeHtml(item.cost)}<br />
          Best for: ${escapeHtml(item.best_for)}
        </div>`,
    )
    .join("");
}

function renderResult(result) {
  const target = document.getElementById("rag-architecture-result");
  if (!target) return;

  const agentBuilderHref = `/apps/ai-agent-builder?source_type=rag_architecture_plan&source_reference_id=${encodeURIComponent(result.rag_plan_id || "")}`;
  const automationBuilderHref = `/apps/automation-builder?source_type=rag_architecture_plan&source_reference_id=${encodeURIComponent(result.rag_plan_id || "")}`;
  const localDeploymentHref =
    result.infra_recommendation === "local" || result.infra_recommendation === "hybrid"
      ? `/apps/local-ai-deployment-planner?source_type=rag_architecture_plan&source_reference_id=${encodeURIComponent(result.rag_plan_id || "")}`
      : "";

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ RAG_PLAN :: ${escapeHtml(result.rag_plan_id || "n/a")} ]</p>
      <h3>RAG architecture plan</h3>
      <p class="system-copy">
        <strong>Use case:</strong> ${escapeHtml(result.use_case || "n/a")} |
        <strong>Complexity:</strong> ${escapeHtml(result.complexity_level)} |
        <strong>Risk:</strong> ${escapeHtml(result.risk_level)} |
        <strong>Priority:</strong> ${escapeHtml(result.priority)}
      </p>
      ${renderObjectBlock("CHUNKING_STRATEGY", result.chunking_strategy)}
      ${renderObjectBlock("EMBEDDING_STRATEGY", result.embedding_strategy)}
      ${renderObjectBlock("RETRIEVAL_STRATEGY", result.retrieval_strategy)}
      ${renderObjectBlock("RANKING_STRATEGY", result.ranking_strategy)}
      <p class="section-label mono">[ MEMORY_LAYERS ]</p>
      ${renderMemoryLayers(result.memory_layers)}
      ${renderObjectBlock("PROMPT_STRUCTURE", result.prompt_structure)}
      ${renderObjectBlock("CONTEXT_WINDOW_STRATEGY", result.context_window_strategy)}
      <p class="section-label mono">[ HALLUCINATION_CONTROLS ]</p>
      ${renderList(result.hallucination_controls)}
      <p class="section-label mono">[ PROMPT_INJECTION_DEFENSES ]</p>
      ${renderList(result.prompt_injection_defenses)}
      ${renderObjectBlock("DATA_ACCESS_CONTROLS", result.data_access_controls)}
      <p class="system-copy"><strong>Infra recommendation:</strong> ${escapeHtml(result.infra_recommendation || "n/a")}</p>
      <p class="section-label mono">[ INFRA_NOTES ]</p>
      ${renderList(result.infra_notes)}
      <p class="section-label mono">[ LATENCY_VS_COST_TRADEOFFS ]</p>
      ${renderTradeoffs(result.latency_vs_cost_tradeoffs)}
      <p class="section-label mono">[ EVALUATION_METRICS ]</p>
      ${renderList(result.evaluation_metrics)}
      <p class="section-label mono">[ TESTING_PLAN ]</p>
      ${renderList(result.testing_plan)}
      ${renderObjectBlock("MONITORING_PLAN", result.monitoring_plan)}
      ${renderObjectBlock("MAINTENANCE_PLAN", result.maintenance_plan)}
      <p class="system-copy"><strong>Estimated effort:</strong> ${escapeHtml(result.estimated_effort || "n/a")}</p>
      <p class="system-copy"><strong>Timeline:</strong> ${escapeHtml(result.timeline || "n/a")}</p>
      <p class="section-copy mono">NEXT STEP :: ${escapeHtml(result.recommended_next_step || "Start RAG build intake.")}</p>
      <p class="system-copy"><em>Advisory only. No vector DB setup, API calls, OpenAI usage, or deployment.</em></p>
      <div class="cta-row">
        <a class="button primary" href="${escapeHtml(result.next_route)}">[ START RAG BUILD INTAKE ]</a>
        <a class="button secondary" href="${escapeHtml(agentBuilderHref)}">[ OPEN AI AGENT BUILDER ]</a>
        <a class="button secondary" href="${escapeHtml(automationBuilderHref)}">[ OPEN AUTOMATION BUILDER ]</a>
        ${localDeploymentHref ? `<a class="button secondary" href="${escapeHtml(localDeploymentHref)}">[ PLAN LOCAL AI DEPLOYMENT ]</a>` : ""}
        <a class="button ghost" href="/apps/ai-service-quote?source=rag-architecture-planner">[ REQUEST AI SERVICE QUOTE ]</a>
      </div>
    </div>
  `;
}

function initStepper() {
  const form = document.getElementById("rag-architecture-form");
  const steps = form ? [...form.querySelectorAll("[data-rag-step]")] : [];
  const prevButton = document.getElementById("rag-prev");
  const nextButton = document.getElementById("rag-next");
  const submitButton = document.getElementById("rag-submit");
  const stepLabel = document.getElementById("rag-step-label");
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
  const form = document.getElementById("rag-architecture-form");
  const submitButton = document.getElementById("rag-submit");
  if (!(form instanceof HTMLFormElement)) return;

  prefillFromQueryParams();
  initStepper();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.data_sources.length) answers.data_sources = ["not_sure"];
    if (!answers.query_patterns.length) answers.query_patterns = ["single_hop_faq"];

    setStatus("Generating RAG architecture plan...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/rag-architecture-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error(`RAG architecture plan failed with status ${response.status}`);
      const result = await response.json();
      renderResult(result);
      setStatus("RAG architecture plan complete.", "success");
    } catch (error) {
      console.error("MSHOPS RAG architecture planner error", error);
      setStatus("RAG architecture plan generation failed. Please retry.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
