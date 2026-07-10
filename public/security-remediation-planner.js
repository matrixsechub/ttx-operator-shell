function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("security-remediation-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

const DIAGNOSTIC_PARAM_KEYS = [
  "audit_id",
  "scan_id",
  "security_event_id",
  "rag_risk_id",
  "source_reference_id",
  "injection_score",
  "risk_tier",
  "risk_score",
  "security_severity",
  "source_app",
];

function buildDiagnosticContext(params) {
  const context = {};
  for (const key of DIAGNOSTIC_PARAM_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    if (["injection_score", "risk_score"].includes(key)) {
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
  const form = document.getElementById("security-remediation-form");
  if (!(form instanceof HTMLFormElement)) return;

  const sourceType = params.get("source_type");
  if (sourceType) {
    const field = form.elements.namedItem("source_type");
    if (fieldIsSelectable(field, sourceType)) field.value = sourceType;
  }

  const sourceRef =
    params.get("source_reference_id") ||
    params.get("audit_id") ||
    params.get("scan_id") ||
    params.get("security_event_id") ||
    params.get("rag_risk_id");
  if (sourceRef) {
    const field = form.elements.namedItem("source_reference_id");
    if (field instanceof HTMLInputElement) field.value = sourceRef;
  }

  const riskDescription = params.get("risk_description") || params.get("finding_summary");
  if (riskDescription) {
    const field = form.elements.namedItem("risk_description");
    if (field instanceof HTMLTextAreaElement) field.value = riskDescription;
  }

  const findingTitle = params.get("finding_title");
  if (findingTitle) {
    const field = form.elements.namedItem("finding_title");
    if (field instanceof HTMLInputElement) field.value = findingTitle;
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
    finding_title: String(form.elements.namedItem("finding_title")?.value || "").trim() || undefined,
    risk_description: String(form.elements.namedItem("risk_description")?.value || "").trim() || undefined,
    vulnerability_categories: collectCheckboxValues(form, "vulnerability_categories"),
    affected_systems: collectCheckboxValues(form, "affected_systems"),
    severity_indicators: collectCheckboxValues(form, "severity_indicators"),
    compliance_targets: collectCheckboxValues(form, "compliance_targets"),
    business_impact: String(form.elements.namedItem("business_impact")?.value || "moderate"),
    exposure_level: String(form.elements.namedItem("exposure_level")?.value || "authenticated"),
    remediation_scope: String(form.elements.namedItem("remediation_scope")?.value || "operator_review"),
    timeline: String(form.elements.namedItem("timeline")?.value || "this_month"),
    budget_band: String(form.elements.namedItem("budget_band")?.value || "not_sure"),
    operator_review_required: "yes",
    diagnostic_context: Object.keys(diagnostic_context).length ? diagnostic_context : undefined,
    source_route: "/apps/security-remediation-planner",
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">None listed.</p>';
  return `<ul class="telemetry-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderVulnerabilities(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">No vulnerabilities classified.</p>';
  return items
    .map(
      (item) => `
        <div class="system-copy">
          <strong>${escapeHtml(item.title)}</strong> (${escapeHtml(item.severity)})<br />
          ${escapeHtml(item.description)}<br />
          System: ${escapeHtml(item.affected_system)}
        </div>`,
    )
    .join("");
}

function renderRemediationSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return '<p class="system-copy">No remediation steps.</p>';
  return steps
    .map(
      (step) => `
        <div class="system-copy">
          <strong>Step ${step.step}</strong> [${escapeHtml(step.phase)}] — ${escapeHtml(step.action)}<br />
          Owner: ${escapeHtml(step.owner)} | Effort: ${escapeHtml(step.effort)}<br />
          Validation: ${escapeHtml(step.validation)}
        </div>`,
    )
    .join("");
}

function renderCompliance(alignment) {
  if (!alignment || typeof alignment !== "object") return '<p class="system-copy">No compliance alignment.</p>';
  return `
    <p class="section-label mono">[ NIST_CSF ]</p>
    ${renderList(alignment.nist_csf)}
    <p class="section-label mono">[ CISA ]</p>
    ${renderList(alignment.cisa)}
    <p class="section-label mono">[ ZERO_TRUST ]</p>
    ${renderList(alignment.zero_trust)}
  `;
}

function renderResult(result) {
  const target = document.getElementById("security-remediation-result");
  if (!target) return;

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ REMEDIATION_PLAN :: ${escapeHtml(result.remediation_plan_id || "n/a")} ]</p>
      <h3>Security remediation roadmap</h3>
      <p class="system-copy"><strong>Risk level:</strong> ${escapeHtml(result.risk_level)} | <strong>Priority:</strong> ${escapeHtml(result.priority)}</p>
      <p class="system-copy">${escapeHtml(result.risk_summary || "")}</p>
      <p class="section-label mono">[ VULNERABILITIES ]</p>
      ${renderVulnerabilities(result.vulnerabilities)}
      <p class="section-label mono">[ PRIORITIZED_FIX_PLAN ]</p>
      ${renderList(result.prioritized_fix_plan)}
      <p class="section-label mono">[ REMEDIATION_STEPS ]</p>
      ${renderRemediationSteps(result.remediation_steps)}
      <p class="system-copy"><strong>Estimated effort:</strong> ${escapeHtml(result.estimated_effort || "n/a")}</p>
      <p class="system-copy"><strong>Timeline:</strong> ${escapeHtml(result.timeline || "n/a")}</p>
      <p class="section-label mono">[ SECURITY_CONTROLS_REQUIRED ]</p>
      ${renderList(result.security_controls_required)}
      <p class="section-label mono">[ COMPLIANCE_ALIGNMENT ]</p>
      ${renderCompliance(result.compliance_alignment)}
      <p class="section-label mono">[ VALIDATION_STEPS ]</p>
      ${renderList(result.validation_steps)}
      <p class="section-label mono">[ REGRESSION_RISKS ]</p>
      ${renderList(result.regression_risks)}
      <p class="system-copy"><strong>Retainer path:</strong> ${escapeHtml(result.retainer_path || "n/a")}</p>
      <p class="section-copy mono">NEXT STEP :: ${escapeHtml(result.recommended_next_step || "Start remediation intake.")}</p>
      <p class="system-copy"><em>Advisory only. No patching, execution, or external API calls are performed.</em></p>
      <div class="cta-row">
        <a class="button primary" href="${escapeHtml(result.next_route)}">[ START REMEDIATION INTAKE ]</a>
        <a class="button secondary" href="/apps/ai-service-quote?source=security-remediation-planner">[ REQUEST SECURITY QUOTE ]</a>
      </div>
    </div>
  `;
}

function initStepper() {
  const form = document.getElementById("security-remediation-form");
  const steps = form ? [...form.querySelectorAll("[data-remediation-step]")] : [];
  const prevButton = document.getElementById("remediation-prev");
  const nextButton = document.getElementById("remediation-next");
  const submitButton = document.getElementById("remediation-submit");
  const stepLabel = document.getElementById("remediation-step-label");
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
  const form = document.getElementById("security-remediation-form");
  const submitButton = document.getElementById("remediation-submit");
  if (!(form instanceof HTMLFormElement)) return;

  prefillFromQueryParams();
  initStepper();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.vulnerability_categories.length) answers.vulnerability_categories = ["not_sure"];
    if (!answers.affected_systems.length) answers.affected_systems = ["not_sure"];
    if (!answers.severity_indicators.length) answers.severity_indicators = ["not_sure"];
    if (!answers.compliance_targets.length) answers.compliance_targets = ["nist_csf"];

    setStatus("Generating remediation plan...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/security-remediation-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error(`Remediation plan failed with status ${response.status}`);
      const result = await response.json();
      renderResult(result);
      setStatus("Remediation plan complete.", "success");
    } catch (error) {
      console.error("MSHOPS security remediation planner fallback", error);
      setStatus("Remediation plan generation failed. Please retry.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
