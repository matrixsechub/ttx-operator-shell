function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("automation-builder-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

const DIAGNOSTIC_PARAM_KEYS = [
  "package_id",
  "source_reference_id",
  "quote_id",
  "automation_roi_id",
  "engagement_id",
  "package_name",
  "package_tier",
  "price_band",
  "estimated_project_value",
  "recommended_service",
  "implementation_agent_needed",
  "retainer_path",
  "source_app",
  "roi_score",
  "estimated_monthly_savings",
  "complexity_level",
  "risk_level",
  "urgency_level",
];

function buildDiagnosticContext(params) {
  const context = {};
  for (const key of DIAGNOSTIC_PARAM_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    if (["estimated_project_value", "roi_score", "estimated_monthly_savings"].includes(key)) {
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
  const form = document.getElementById("automation-builder-form");
  if (!(form instanceof HTMLFormElement)) return;

  const sourceType = params.get("source_type");
  if (sourceType) {
    const field = form.elements.namedItem("source_type");
    if (field instanceof HTMLSelectElement && [...field.options].some((opt) => opt.value === sourceType)) {
      field.value = sourceType;
    }
  }

  const sourceRef = params.get("source_reference_id") || params.get("package_id") || params.get("quote_id");
  if (sourceRef) {
    const refField = form.elements.namedItem("source_reference_id");
    if (refField instanceof HTMLInputElement) refField.value = sourceRef;
  }

  const packageName = params.get("package_name");
  if (packageName) {
    const nameField = form.elements.namedItem("package_name");
    if (nameField instanceof HTMLInputElement) nameField.value = packageName;
  }

  const recommendedService = params.get("recommended_service") || params.get("service");
  if (recommendedService) {
    const serviceField = form.elements.namedItem("recommended_service");
    if (fieldIsSelectable(serviceField, recommendedService)) {
      serviceField.value = recommendedService;
    }
  }
}

function fieldIsSelectable(field, value) {
  return field instanceof HTMLSelectElement && [...field.options].some((option) => option.value === value);
}

function collectAnswers(form) {
  const formData = new FormData(form);
  const params = new URLSearchParams(window.location.search);
  return {
    source_type: String(formData.get("source_type") || "not_sure"),
    source_reference_id: String(formData.get("source_reference_id") || "").trim() || undefined,
    package_name: String(formData.get("package_name") || "").trim() || undefined,
    recommended_service: String(formData.get("recommended_service") || "ai_automation_build"),
    automation_goal: String(formData.get("automation_goal") || "not_sure"),
    current_workflow_state: String(formData.get("current_workflow_state") || "not_sure"),
    trigger_type: String(formData.get("trigger_type") || "not_sure"),
    tools_involved: formData.getAll("tools_involved").map((value) => String(value)),
    data_types: formData.getAll("data_types").map((value) => String(value)),
    output_destination: formData.getAll("output_destination").map((value) => String(value)),
    human_approval_required: String(formData.get("human_approval_required") || "not_sure"),
    risk_signals: formData.getAll("risk_signals").map((value) => String(value)),
    volume_level: String(formData.get("volume_level") || "unknown"),
    timeline: String(formData.get("timeline") || "exploring"),
    budget_band: String(formData.get("budget_band") || "not_sure"),
    diagnostic_context: buildDiagnosticContext(params),
    source_route: "/apps/automation-builder",
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">None listed.</p>';
  return `<ul class="telemetry-list">${items.map((item) => `<li>${escapeHtml(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul>`;
}

function renderWorkflowMap(steps) {
  if (!Array.isArray(steps) || !steps.length) return '<p class="system-copy">No workflow map.</p>';
  return `<ol class="telemetry-list">${steps
    .map(
      (step) =>
        `<li><strong>${escapeHtml(step.name)}</strong> - ${escapeHtml(step.actor)} via ${escapeHtml(step.system)} -> ${escapeHtml(step.output)}</li>`,
    )
    .join("")}</ol>`;
}

function renderIntegrationPlan(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">No integrations.</p>';
  return items
    .map(
      (item) => `
        <div class="system-copy">
          <strong>${escapeHtml(item.system)}</strong>: ${escapeHtml(item.purpose)}<br />
          In: ${escapeHtml(item.data_in)} | Out: ${escapeHtml(item.data_out)}<br />
          <em>${escapeHtml(item.auth_or_access_note)}</em>
        </div>`,
    )
    .join("");
}

function renderNodePlan(nodes) {
  if (!Array.isArray(nodes) || !nodes.length) return '<p class="system-copy">No nodes.</p>';
  return nodes
    .map(
      (node) =>
        `<p class="system-copy"><strong>${escapeHtml(node.node_id)}</strong> ${escapeHtml(node.node_name)} (${escapeHtml(node.node_type)}) - ${escapeHtml(node.action)}</p>`,
    )
    .join("");
}

function renderEmptyState() {
  const target = document.getElementById("automation-builder-result");
  if (!target) return;
  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ RESULT_SCREEN ]</p>
      <h3>Build spec findings will appear here.</h3>
      <p class="system-copy">
        Submit the questionnaire to receive a workflow map, integration plan, node plan, and delivery phases.
        This is a build specification only - not an executable workflow.
      </p>
    </div>
  `;
}

function renderResult(result) {
  const target = document.getElementById("automation-builder-result");
  if (!target) return;

  const trigger = result.trigger_plan && typeof result.trigger_plan === "object" ? result.trigger_plan : {};
  const handoff = result.data_handoff_model && typeof result.data_handoff_model === "object" ? result.data_handoff_model : {};
  const telemetry =
    result.logging_telemetry_plan && typeof result.logging_telemetry_plan === "object" ? result.logging_telemetry_plan : {};
  const maintenance = result.maintenance_plan && typeof result.maintenance_plan === "object" ? result.maintenance_plan : {};

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ BUILD_SPEC :: ${escapeHtml(result.automation_build_id || "n/a")} ]</p>
      <h3>${escapeHtml(result.build_name || "Automation Build Spec")}</h3>
      <p class="system-copy"><em>Build-spec disclaimer: This output is an implementation specification only. It does not execute workflows, store credentials, register webhooks, or deploy automations.</em></p>
      <p class="system-copy"><strong>Category:</strong> ${escapeHtml(result.automation_category || "n/a")}</p>
      <p class="system-copy"><strong>Target user:</strong> ${escapeHtml(result.target_user || "n/a")}</p>
      <p class="system-copy"><strong>Business problem:</strong> ${escapeHtml(result.business_problem || "n/a")}</p>
      <p class="system-copy"><strong>Workflow summary:</strong> ${escapeHtml(result.workflow_summary || "n/a")}</p>
      <p class="section-label mono">[ WORKFLOW_MAP ]</p>
      ${renderWorkflowMap(result.workflow_map)}
      <p class="section-label mono">[ TRIGGER_PLAN ]</p>
      <p class="system-copy">Type: ${escapeHtml(trigger.trigger_type || "n/a")} | Source: ${escapeHtml(trigger.trigger_source || "n/a")}</p>
      ${renderList(trigger.validation_rules)}
      <p class="section-label mono">[ INTEGRATION_PLAN ]</p>
      ${renderIntegrationPlan(result.integration_plan)}
      <p class="section-label mono">[ DATA_HANDOFF ]</p>
      <p class="system-copy">Format: ${escapeHtml(handoff.handoff_format || "JSON")} - ${escapeHtml(handoff.retention_note || "")}</p>
      <p class="section-label mono">[ NODE_PLAN ]</p>
      ${renderNodePlan(result.node_plan)}
      <p class="section-label mono">[ APPROVAL_GATES ]</p>
      ${renderList(result.approval_gates)}
      <p class="section-label mono">[ ERROR_HANDLING ]</p>
      ${renderList(result.error_handling_plan)}
      <p class="section-label mono">[ TELEMETRY ]</p>
      ${renderList(telemetry.events_to_log)}
      <p class="section-label mono">[ SECURITY_CONTROLS ]</p>
      ${renderList(result.security_controls)}
      <p class="section-label mono">[ REQUIRED_CREDENTIALS ]</p>
      ${renderList((result.required_credentials || []).map((credential) => `${credential.system}: ${credential.credential_type} - ${credential.scope_required}`))}
      <p class="section-label mono">[ CLIENT_INPUTS ]</p>
      ${renderList(result.client_inputs_needed)}
      <p class="section-label mono">[ DELIVERY_PHASES ]</p>
      ${renderList(result.delivery_phases)}
      <p class="section-label mono">[ IMPLEMENTATION_CHECKLIST ]</p>
      ${renderList(result.implementation_checklist)}
      <p class="section-label mono">[ TESTING_PLAN ]</p>
      ${renderList(result.testing_plan)}
      <p class="section-label mono">[ MAINTENANCE ]</p>
      <p class="system-copy">Retainer: ${escapeHtml(maintenance.recommended_retainer || "n/a")} | Frequency: ${escapeHtml(maintenance.monitoring_frequency || "n/a")}</p>
      ${renderList(maintenance.monthly_tasks)}
      <p class="system-copy"><strong>Estimated effort:</strong> ${escapeHtml(result.estimated_effort || "n/a")}</p>
      <p class="system-copy"><strong>Delivery timeline:</strong> ${escapeHtml(result.delivery_timeline || "n/a")}</p>
      <p class="system-copy"><strong>Complexity:</strong> ${escapeHtml(result.complexity_level || "n/a")} | <strong>Risk:</strong> ${escapeHtml(result.risk_level || "n/a")} | <strong>Priority:</strong> ${escapeHtml(result.priority || "n/a")}</p>
      <p class="system-copy"><strong>Recommended next step:</strong> ${escapeHtml(result.recommended_next_step || "n/a")}</p>
      <div class="cta-row">
        <a class="button primary" href="${escapeHtml(result.next_route)}">[ START AUTOMATION BUILD INTAKE ]</a>
      </div>
    </div>
  `;
}

function initStepper() {
  const steps = Array.from(document.querySelectorAll("[data-builder-step]"));
  const prevButton = document.getElementById("builder-prev");
  const nextButton = document.getElementById("builder-next");
  const submitButton = document.getElementById("builder-submit");
  const stepLabel = document.getElementById("builder-step-label");
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
  const form = document.getElementById("automation-builder-form");
  const submitButton = document.getElementById("builder-submit");
  const resetStepper = initStepper();
  prefillFromQueryParams();
  renderEmptyState();

  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("reset", () => {
    resetStepper();
    renderEmptyState();
    setStatus("Builder ready.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    setStatus("Generating automation build spec...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/automation-build-spec-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Build spec request failed with status ${response.status}`);
      renderResult(result);
      setStatus("Automation build spec complete.", "success");
      document.getElementById("automation-builder-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("MSHOPS automation builder failed", error);
      setStatus(error.message || "Automation build spec generation failed.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
