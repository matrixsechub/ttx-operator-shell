function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("ai-agent-builder-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

const DIAGNOSTIC_PARAM_KEYS = [
  "package_id",
  "source_reference_id",
  "quote_id",
  "agent_check_id",
  "automation_build_id",
  "ai_agent_build_id",
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
  "readiness_score",
  "readiness_tier",
  "roi_score",
  "estimated_monthly_savings",
  "complexity_level",
  "risk_level",
  "urgency_level",
  "safety_level",
  "governance_maturity",
];

function buildDiagnosticContext(params) {
  const context = {};
  for (const key of DIAGNOSTIC_PARAM_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    if (["estimated_project_value", "readiness_score", "roi_score", "estimated_monthly_savings"].includes(key)) {
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
  const form = document.getElementById("ai-agent-builder-form");
  if (!(form instanceof HTMLFormElement)) return;

  const sourceType = params.get("source_type");
  if (sourceType) {
    const field = form.elements.namedItem("source_type");
    if (fieldIsSelectable(field, sourceType)) {
      field.value = sourceType;
    }
  }

  const sourceRef =
    params.get("source_reference_id") ||
    params.get("package_id") ||
    params.get("quote_id") ||
    params.get("agent_check_id") ||
    params.get("automation_build_id") ||
    params.get("ai_agent_build_id");
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

  const agentGoal = params.get("agent_goal");
  if (agentGoal) {
    const goalField = form.elements.namedItem("agent_goal");
    if (fieldIsSelectable(goalField, agentGoal)) {
      goalField.value = agentGoal;
    }
  }

  const intentText = params.get("intent");
  if (intentText) {
    const nameField = form.elements.namedItem("package_name");
    if (nameField instanceof HTMLInputElement && !nameField.value) {
      nameField.value = intentText.slice(0, 240);
    }
  }
}

function collectAnswers(form) {
  const formData = new FormData(form);
  const params = new URLSearchParams(window.location.search);
  const diagnostic = buildDiagnosticContext(params);
  const intentParam = params.get("intent");
  if (intentParam) {
    diagnostic.captured_intent = intentParam;
  }
  return {
    source_type: String(formData.get("source_type") || "not_sure"),
    source_reference_id: String(formData.get("source_reference_id") || "").trim() || undefined,
    package_name: String(formData.get("package_name") || "").trim() || undefined,
    recommended_service: String(formData.get("recommended_service") || "ai_agent_build"),
    agent_goal: String(formData.get("agent_goal") || "not_sure"),
    agent_autonomy_level: String(formData.get("agent_autonomy_level") || "not_sure"),
    user_interaction_channel: String(formData.get("user_interaction_channel") || "not_sure"),
    tools_needed: formData.getAll("tools_needed").map((value) => String(value)),
    data_types: formData.getAll("data_types").map((value) => String(value)),
    output_modes: formData.getAll("output_modes").map((value) => String(value)),
    human_approval_required: String(formData.get("human_approval_required") || "not_sure"),
    risk_signals: formData.getAll("risk_signals").map((value) => String(value)),
    memory_requirement: String(formData.get("memory_requirement") || "not_sure"),
    deployment_environment: String(formData.get("deployment_environment") || "not_sure"),
    volume_level: String(formData.get("volume_level") || "unknown"),
    timeline: String(formData.get("timeline") || "exploring"),
    budget_band: String(formData.get("budget_band") || "not_sure"),
    diagnostic_context: diagnostic,
    source_route: params.get("source_route") || "/apps/ai-agent-builder",
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">None listed.</p>';
  return `<ul class="telemetry-list">${items.map((item) => `<li>${escapeHtml(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul>`;
}

function renderRoleDefinition(role) {
  if (!role || typeof role !== "object") return '<p class="system-copy">No role definition.</p>';
  return `
    <p class="system-copy"><strong>Role:</strong> ${escapeHtml(role.role_name || "n/a")}</p>
    <p class="system-copy"><strong>Primary responsibility:</strong> ${escapeHtml(role.primary_responsibility || "n/a")}</p>
    <p class="system-copy"><strong>Decision authority:</strong> ${escapeHtml(role.decision_authority || "n/a")}</p>
    <p class="section-label mono">[ ALLOWED_ACTIONS ]</p>
    ${renderList(role.allowed_actions)}
    <p class="section-label mono">[ PROHIBITED_ACTIONS ]</p>
    ${renderList(role.prohibited_actions)}
    <p class="section-label mono">[ ESCALATION_CONDITIONS ]</p>
    ${renderList(role.escalation_conditions)}
  `;
}

function renderInteractionModel(model) {
  if (!model || typeof model !== "object") return '<p class="system-copy">No interaction model.</p>';
  return `
    <p class="system-copy"><strong>Primary channel:</strong> ${escapeHtml(model.primary_channel || "n/a")}</p>
    <p class="system-copy"><strong>Interaction style:</strong> ${escapeHtml(model.interaction_style || "n/a")}</p>
    <p class="system-copy"><strong>Fallback behavior:</strong> ${escapeHtml(model.fallback_behavior || "n/a")}</p>
    <p class="section-label mono">[ USER_INPUTS ]</p>
    ${renderList(model.user_inputs)}
    <p class="section-label mono">[ AGENT_OUTPUTS ]</p>
    ${renderList(model.agent_outputs)}
  `;
}

function renderToolBoundaryModel(model) {
  if (!model || typeof model !== "object") return '<p class="system-copy">No tool boundary model.</p>';
  return `
    <p class="section-label mono">[ TOOLS_ALLOWED ]</p>
    ${renderList(model.tools_allowed)}
    <p class="section-label mono">[ TOOLS_PROHIBITED ]</p>
    ${renderList(model.tools_prohibited)}
    <p class="section-label mono">[ READ_ONLY_TOOLS ]</p>
    ${renderList(model.read_only_tools)}
    <p class="section-label mono">[ DRAFT_ONLY_TOOLS ]</p>
    ${renderList(model.draft_only_tools)}
    <p class="section-label mono">[ WRITE_REQUIRES_APPROVAL ]</p>
    ${renderList(model.write_requires_approval)}
    <p class="system-copy"><em>${escapeHtml(model.no_credential_handling_rule || "")}</em></p>
  `;
}

function renderPermissionModel(model) {
  if (!model || typeof model !== "object") return '<p class="system-copy">No permission model.</p>';
  return `
    <p class="system-copy"><strong>Default permission level:</strong> ${escapeHtml(model.default_permission_level || "n/a")}</p>
    <p class="system-copy"><strong>Operator override rules:</strong> ${escapeHtml(model.operator_override_rules || "n/a")}</p>
    <p class="section-label mono">[ APPROVAL_REQUIRED_FOR ]</p>
    ${renderList(model.approval_required_for)}
    <p class="section-label mono">[ DENIED_OPERATIONS ]</p>
    ${renderList(model.denied_operations)}
    <p class="section-label mono">[ AUDIT_REQUIREMENTS ]</p>
    ${renderList(model.audit_requirements)}
  `;
}

function renderMemoryPolicy(policy) {
  if (!policy || typeof policy !== "object") return '<p class="system-copy">No memory policy.</p>';
  return `
    <p class="system-copy"><strong>Memory type:</strong> ${escapeHtml(policy.memory_type || "n/a")}</p>
    <p class="system-copy"><strong>Retention period:</strong> ${escapeHtml(policy.retention_period || "n/a")}</p>
    <p class="system-copy"><strong>Deletion policy:</strong> ${escapeHtml(policy.deletion_policy || "n/a")}</p>
    <p class="system-copy"><strong>User visibility:</strong> ${escapeHtml(policy.user_visibility || "n/a")}</p>
    <p class="section-label mono">[ RETAINED_FIELDS ]</p>
    ${renderList(policy.retained_fields)}
    <p class="section-label mono">[ EXCLUDED_FIELDS ]</p>
    ${renderList(policy.excluded_fields)}
  `;
}

function renderPromptInterfaceSpec(spec) {
  if (!spec || typeof spec !== "object") return '<p class="system-copy">No prompt interface spec.</p>';
  return `
    <p class="system-copy"><strong>System instruction summary:</strong> ${escapeHtml(spec.system_instruction_summary || "n/a")}</p>
    <p class="system-copy"><strong>Response format:</strong> ${escapeHtml(spec.response_format || "n/a")}</p>
    <p class="system-copy"><strong>Escalation language:</strong> ${escapeHtml(spec.escalation_language || "n/a")}</p>
    <p class="system-copy"><strong>Tone style:</strong> ${escapeHtml(spec.tone_style || "n/a")}</p>
    <p class="section-label mono">[ REQUIRED_USER_INPUTS ]</p>
    ${renderList(spec.required_user_inputs)}
    <p class="section-label mono">[ REFUSAL_CONDITIONS ]</p>
    ${renderList(spec.refusal_conditions)}
    <p class="section-label mono">[ DETERMINISTIC_FIELDS ]</p>
    ${renderList(spec.deterministic_fields)}
  `;
}

function renderDataHandlingPolicy(policy) {
  if (!policy || typeof policy !== "object") return '<p class="system-copy">No data handling policy.</p>';
  return `
    <p class="section-label mono">[ DATA_ALLOWED ]</p>
    ${renderList(policy.data_allowed)}
    <p class="section-label mono">[ DATA_RESTRICTED ]</p>
    ${renderList(policy.data_restricted)}
    <p class="section-label mono">[ DATA_NEVER_REQUESTED ]</p>
    ${renderList(policy.data_never_requested)}
    <p class="system-copy"><strong>Storage rules:</strong> ${escapeHtml(policy.storage_rules || "n/a")}</p>
    <p class="system-copy"><strong>Redaction rules:</strong> ${escapeHtml(policy.redaction_rules || "n/a")}</p>
    <p class="system-copy"><em>${escapeHtml(policy.access_review_note || "")}</em></p>
  `;
}

function renderTelemetryPlan(plan) {
  if (!plan || typeof plan !== "object") return '<p class="system-copy">No telemetry plan.</p>';
  return `
    <p class="section-label mono">[ EVENTS_TO_LOG ]</p>
    ${renderList(plan.events_to_log)}
    <p class="section-label mono">[ FIELDS_TO_REDACT ]</p>
    ${renderList(plan.fields_to_redact)}
    <p class="section-label mono">[ METRICS_TO_TRACK ]</p>
    ${renderList(plan.metrics_to_track)}
    <p class="section-label mono">[ ALERT_CONDITIONS ]</p>
    ${renderList(plan.alert_conditions)}
    <p class="section-label mono">[ OPERATOR_DASHBOARD_FIELDS ]</p>
    ${renderList(plan.operator_dashboard_fields)}
  `;
}

function renderIntegrationPlan(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">No integrations.</p>';
  return items
    .map(
      (item) => `
        <div class="system-copy">
          <strong>${escapeHtml(item.system)}</strong>: ${escapeHtml(item.purpose)}<br />
          In: ${escapeHtml(item.data_in)} | Out: ${escapeHtml(item.data_out)}<br />
          <em>${escapeHtml(item.auth_or_access_note)}</em><br />
          Risk: ${escapeHtml(item.risk_note || "n/a")}
        </div>`,
    )
    .join("");
}

function renderDeploymentPlan(plan) {
  if (!plan || typeof plan !== "object") return '<p class="system-copy">No deployment plan.</p>';
  return `
    <p class="system-copy"><strong>Recommended environment:</strong> ${escapeHtml(plan.recommended_environment || "n/a")}</p>
    <p class="system-copy"><strong>Deployment mode:</strong> ${escapeHtml(plan.deployment_mode || "n/a")}</p>
    <p class="system-copy"><strong>Required runtime:</strong> ${escapeHtml(plan.required_runtime || "n/a")}</p>
    <p class="system-copy"><strong>Access control model:</strong> ${escapeHtml(plan.access_control_model || "n/a")}</p>
    <p class="system-copy"><strong>Rollback plan:</strong> ${escapeHtml(plan.rollback_plan || "n/a")}</p>
    <p class="section-label mono">[ ROLLOUT_STEPS ]</p>
    ${renderList(plan.rollout_steps)}
  `;
}

function renderMaintenancePlan(plan) {
  if (!plan || typeof plan !== "object") return '<p class="system-copy">No maintenance plan.</p>';
  return `
    <p class="system-copy"><strong>Recommended retainer:</strong> ${escapeHtml(plan.recommended_retainer || "n/a")}</p>
    <p class="system-copy"><strong>Monitoring frequency:</strong> ${escapeHtml(plan.monitoring_frequency || "n/a")}</p>
    <p class="system-copy"><strong>Owner:</strong> ${escapeHtml(plan.owner || "n/a")}</p>
    <p class="section-label mono">[ UPDATE_TRIGGERS ]</p>
    ${renderList(plan.update_triggers)}
    <p class="section-label mono">[ MONTHLY_TASKS ]</p>
    ${renderList(plan.monthly_tasks)}
  `;
}

function renderEmptyState() {
  const target = document.getElementById("ai-agent-builder-result");
  if (!target) return;
  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ RESULT_SCREEN ]</p>
      <h3>Build spec findings will appear here.</h3>
      <p class="system-copy">
        Submit the questionnaire to receive an agent role definition, tool boundaries, permission model, and delivery phases.
        This is a build specification only - not a live agent.
      </p>
    </div>
  `;
}

function renderResult(result) {
  const target = document.getElementById("ai-agent-builder-result");
  if (!target) return;

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ BUILD_SPEC :: ${escapeHtml(result.ai_agent_build_id || "n/a")} ]</p>
      <h3>${escapeHtml(result.agent_name || "AI Agent Build Spec")}</h3>
      <p class="system-copy"><em>Build-spec disclaimer: This output is an implementation specification only. It does not deploy live agents, store credentials, execute tools, or run autonomous actions.</em></p>
      <p class="system-copy"><strong>Category:</strong> ${escapeHtml(result.agent_category || "n/a")}</p>
      <p class="system-copy"><strong>Target user:</strong> ${escapeHtml(result.target_user || "n/a")}</p>
      <p class="system-copy"><strong>Business problem:</strong> ${escapeHtml(result.business_problem || "n/a")}</p>
      <p class="system-copy"><strong>Agent mission:</strong> ${escapeHtml(result.agent_mission || "n/a")}</p>
      <p class="section-label mono">[ AGENT_ROLE_DEFINITION ]</p>
      ${renderRoleDefinition(result.agent_role_definition)}
      <p class="section-label mono">[ USER_INTERACTION_MODEL ]</p>
      ${renderInteractionModel(result.user_interaction_model)}
      <p class="section-label mono">[ TASK_SCOPE ]</p>
      ${renderList(result.task_scope)}
      <p class="section-label mono">[ OUT_OF_SCOPE_ACTIONS ]</p>
      ${renderList(result.out_of_scope_actions)}
      <p class="section-label mono">[ TOOL_BOUNDARY_MODEL ]</p>
      ${renderToolBoundaryModel(result.tool_boundary_model)}
      <p class="section-label mono">[ PERMISSION_MODEL ]</p>
      ${renderPermissionModel(result.permission_model)}
      <p class="section-label mono">[ MEMORY_POLICY ]</p>
      ${renderMemoryPolicy(result.memory_policy)}
      <p class="section-label mono">[ APPROVAL_GATES ]</p>
      ${renderList(result.approval_gates)}
      <p class="section-label mono">[ SAFETY_CONTROLS ]</p>
      ${renderList(result.safety_controls)}
      <p class="section-label mono">[ PROMPT_INTERFACE_SPEC ]</p>
      ${renderPromptInterfaceSpec(result.prompt_interface_spec)}
      <p class="section-label mono">[ DATA_HANDLING_POLICY ]</p>
      ${renderDataHandlingPolicy(result.data_handling_policy)}
      <p class="section-label mono">[ LOGGING_TELEMETRY_PLAN ]</p>
      ${renderTelemetryPlan(result.logging_telemetry_plan)}
      <p class="section-label mono">[ INTEGRATION_PLAN ]</p>
      ${renderIntegrationPlan(result.integration_plan)}
      <p class="section-label mono">[ DEPLOYMENT_PLAN ]</p>
      ${renderDeploymentPlan(result.deployment_plan)}
      <p class="section-label mono">[ TESTING_PLAN ]</p>
      ${renderList(result.testing_plan)}
      <p class="section-label mono">[ RED_TEAM_CHECKS ]</p>
      ${renderList(result.red_team_checks)}
      <p class="section-label mono">[ CLIENT_INPUTS_NEEDED ]</p>
      ${renderList(result.client_inputs_needed)}
      <p class="section-label mono">[ IMPLEMENTATION_CHECKLIST ]</p>
      ${renderList(result.implementation_checklist)}
      <p class="section-label mono">[ MAINTENANCE_PLAN ]</p>
      ${renderMaintenancePlan(result.maintenance_plan)}
      <p class="system-copy"><strong>Estimated effort:</strong> ${escapeHtml(result.estimated_effort || "n/a")}</p>
      <p class="system-copy"><strong>Delivery timeline:</strong> ${escapeHtml(result.delivery_timeline || "n/a")}</p>
      <p class="system-copy"><strong>Complexity:</strong> ${escapeHtml(result.complexity_level || "n/a")} | <strong>Risk:</strong> ${escapeHtml(result.risk_level || "n/a")} | <strong>Priority:</strong> ${escapeHtml(result.priority || "n/a")}</p>
      <p class="system-copy"><strong>Recommended next step:</strong> ${escapeHtml(result.recommended_next_step || "n/a")}</p>
      <div class="cta-row">
        <a class="button primary" href="${escapeHtml(result.next_route)}">[ START AI AGENT BUILD INTAKE ]</a>
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
  const form = document.getElementById("ai-agent-builder-form");
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
    setStatus("Generating AI agent build spec...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/ai-agent-build-spec-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Build spec request failed with status ${response.status}`);
      renderResult(result);
      setStatus("AI agent build spec complete.", "success");
      document.getElementById("ai-agent-builder-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("MSHOPS AI agent builder failed", error);
      setStatus(error.message || "AI agent build spec generation failed.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
