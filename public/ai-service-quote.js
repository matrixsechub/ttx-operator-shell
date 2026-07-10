function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("service-quote-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

const DIAGNOSTIC_PARAM_KEYS = [
  "selector_id",
  "audit_id",
  "scan_id",
  "agent_check_id",
  "automation_roi_id",
  "rag_risk_id",
  "local_ai_check_id",
  "risk_score",
  "risk_tier",
  "injection_score",
  "readiness_score",
  "roi_score",
  "rag_risk_score",
  "local_ai_readiness_score",
  "estimated_monthly_savings",
  "safety_level",
  "governance_maturity",
  "privacy_need_level",
];

function buildDiagnosticContext(params) {
  const context = {};
  for (const key of DIAGNOSTIC_PARAM_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    if (
      [
        "risk_score",
        "injection_score",
        "readiness_score",
        "roi_score",
        "rag_risk_score",
        "local_ai_readiness_score",
        "estimated_monthly_savings",
      ].includes(key)
    ) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) context[key] = numeric;
    } else {
      context[key] = value;
    }
  }
  return context;
}

function prefillFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const sourceApp = params.get("source_app");
  const form = document.getElementById("service-quote-form");
  if (!(form instanceof HTMLFormElement)) return;

  if (sourceApp) {
    const sourceField = form.elements.namedItem("source_app");
    if (sourceField instanceof HTMLSelectElement) {
      sourceField.value = sourceApp;
    }
  }

  const service = params.get("service") || params.get("recommended_service");
  if (service) {
    const serviceField = form.elements.namedItem("primary_service_interest");
    if (serviceField instanceof HTMLSelectElement && [...serviceField.options].some((opt) => opt.value === service)) {
      serviceField.value = service;
    }
  }
}

function collectAnswers(form) {
  const formData = new FormData(form);
  const params = new URLSearchParams(window.location.search);
  return {
    source_app: String(formData.get("source_app") || "direct_quote_request"),
    primary_service_interest: String(formData.get("primary_service_interest") || "not_sure"),
    business_type: String(formData.get("business_type") || "not_sure"),
    project_goal: String(formData.get("project_goal") || "not_sure"),
    current_state: String(formData.get("current_state") || "not_sure"),
    technical_complexity: formData.getAll("technical_complexity").map((value) => String(value)),
    risk_factors: formData.getAll("risk_factors").map((value) => String(value)),
    desired_deliverable: String(formData.get("desired_deliverable") || "not_sure"),
    timeline: String(formData.get("timeline") || "exploring"),
    budget_expectation: String(formData.get("budget_expectation") || "not_sure"),
    diagnostic_context: buildDiagnosticContext(params),
    source_route: "/apps/ai-service-quote",
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return "<p class=\"system-copy\">None listed.</p>";
  return `<ul class="telemetry-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderEmptyState() {
  const target = document.getElementById("service-quote-result");
  if (!target) return;
  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ RESULT_SCREEN ]</p>
      <h3>Service quote findings will appear here.</h3>
      <p class="system-copy">
        Submit the questionnaire to receive an estimated scope, pricing range, delivery timeline, and intake route.
      </p>
    </div>
  `;
}

function buildPackagerRoute(result) {
  const params = new URLSearchParams({
    source_type: "service_quote",
    source_reference_id: result.quote_id || "",
    service_area: "not_sure",
  });
  if (result.recommended_service) params.set("recommended_service", result.recommended_service);
  if (result.quote_id) params.set("quote_id", result.quote_id);
  if (result.package_tier) params.set("package_tier", result.package_tier);
  if (result.price_range) params.set("price_range", result.price_range);
  if (Number.isFinite(Number(result.estimated_project_value))) {
    params.set("estimated_project_value", String(result.estimated_project_value));
  }
  return `/apps/microservice-packager?${params.toString()}`;
}

function renderResult(result) {
  const target = document.getElementById("service-quote-result");
  if (!target) return;

  const localDeploymentHref =
    result.recommended_service === "local_ai_setup" || result.secondary_service === "local_ai_setup"
      ? `/apps/local-ai-deployment-planner?source_type=service_quote&source_reference_id=${encodeURIComponent(result.quote_id || "")}`
      : "";

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ RESULT_SCREEN ]</p>
      <h3>AI service quote complete</h3>
      <p class="system-copy">${escapeHtml(result.pricing_note || "Estimated range only. Final scope depends on discovery.")}</p>
      <div class="services-result-grid">
        <article class="stat-panel bracket">
          <div class="bracket-inner">
            <p class="stat-label mono">[ QUOTE ID ]</p>
            <p class="stat-num">${escapeHtml(result.quote_id)}</p>
          </div>
        </article>
        <article class="stat-panel bracket">
          <div class="bracket-inner">
            <p class="stat-label mono">[ PACKAGE ]</p>
            <p class="stat-num">${escapeHtml(String(result.package_tier).toUpperCase())}</p>
          </div>
        </article>
        <article class="stat-panel bracket">
          <div class="bracket-inner">
            <p class="stat-label mono">[ PRICE RANGE ]</p>
            <p class="stat-num">${escapeHtml(result.price_range)}</p>
          </div>
        </article>
        <article class="stat-panel bracket">
          <div class="bracket-inner">
            <p class="stat-label mono">[ EST. VALUE ]</p>
            <p class="stat-num">$${escapeHtml(String(result.estimated_project_value))}</p>
          </div>
        </article>
      </div>
      <div class="telemetry-grid">
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ SERVICE ]</p>
            <p><strong>Recommended:</strong> ${escapeHtml(result.recommended_service)}</p>
            ${result.secondary_service ? `<p><strong>Secondary:</strong> ${escapeHtml(result.secondary_service)}</p>` : ""}
            <p><strong>Timeline:</strong> ${escapeHtml(result.delivery_timeline)}</p>
            <p><strong>Priority:</strong> ${escapeHtml(result.priority)}</p>
          </div>
        </article>
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ SCORES ]</p>
            <p>Complexity: ${escapeHtml(String(result.complexity_level))} (${escapeHtml(String(result.complexity_score))})</p>
            <p>Risk: ${escapeHtml(String(result.risk_level))} (${escapeHtml(String(result.risk_score))})</p>
            <p>Urgency: ${escapeHtml(String(result.urgency_level))} (${escapeHtml(String(result.urgency_score))})</p>
          </div>
        </article>
      </div>
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ SCOPE_SUMMARY ]</p>
          <p class="system-copy">${escapeHtml(result.scope_summary)}</p>
        </div>
      </article>
      <div class="services-layout">
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ REQUIRED_INPUTS ]</p>
            ${renderList(result.required_inputs)}
          </div>
        </article>
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ EXPECTED_OUTCOMES ]</p>
            ${renderList(result.expected_outcomes)}
          </div>
        </article>
      </div>
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ NEXT_STEP ]</p>
          <p class="system-copy">${escapeHtml(result.recommended_next_step)}</p>
        </div>
      </article>
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ CTA_SECTION ]</p>
          <div class="cta-row">
            <a class="button primary" href="${escapeHtml(result.next_route)}">[ START QUOTE INTAKE ]</a>
            <a class="button secondary" href="${escapeHtml(buildPackagerRoute(result))}">[ TURN THIS QUOTE INTO A PRODUCTIZED PACKAGE ]</a>
            ${localDeploymentHref ? `<a class="button secondary" href="${escapeHtml(localDeploymentHref)}">[ PLAN LOCAL AI DEPLOYMENT ]</a>` : ""}
          </div>
        </div>
      </article>
    </div>
  `;
}

function initStepper() {
  const steps = Array.from(document.querySelectorAll("[data-quote-step]"));
  const prevButton = document.getElementById("quote-prev");
  const nextButton = document.getElementById("quote-next");
  const submitButton = document.getElementById("quote-submit");
  const stepLabel = document.getElementById("quote-step-label");
  let currentStep = 0;

  function renderStep() {
    steps.forEach((step, index) => {
      const active = index === currentStep;
      step.classList.toggle("is-active", active);
      step.hidden = !active;
    });
    if (stepLabel) stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    if (prevButton instanceof HTMLButtonElement) prevButton.disabled = currentStep === 0;
    if (nextButton instanceof HTMLButtonElement) nextButton.hidden = currentStep === steps.length - 1;
    if (submitButton instanceof HTMLButtonElement) submitButton.hidden = currentStep !== steps.length - 1;
  }

  prevButton?.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderStep();
    }
  });

  nextButton?.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderStep();
    }
  });

  renderStep();
  return () => {
    currentStep = 0;
    renderStep();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("service-quote-form");
  const submitButton = document.getElementById("quote-submit");
  const resetStepper = initStepper();
  prefillFromQueryParams();
  renderEmptyState();

  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    setStatus("Generating service quote...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/service-quote-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Quote request failed with status ${response.status}`);
      renderResult(result);
      setStatus("Service quote complete.", "success");
      document.getElementById("service-quote-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("MSHOPS service quote failed", error);
      setStatus(error.message || "Service quote generation failed.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      resetStepper();
      prefillFromQueryParams();
      renderEmptyState();
      setStatus("Quote generator ready.");
    }, 0);
  });
});
