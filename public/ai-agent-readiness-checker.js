function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("agent-readiness-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function collectAnswers(form) {
  const formData = new FormData(form);
  return {
    agent_goal: String(formData.get("agent_goal") || "not_sure"),
    agent_autonomy_level: String(formData.get("agent_autonomy_level") || "not_sure"),
    tool_connections: formData.getAll("tool_connections").map((value) => String(value)),
    data_access: formData.getAll("data_access").map((value) => String(value)),
    human_review: String(formData.get("human_review") || "not_sure"),
    deployment_context: String(formData.get("deployment_context") || "not_sure"),
    workflow_clarity: String(formData.get("workflow_clarity") || "not_sure"),
    success_metric: String(formData.get("success_metric") || "not_sure"),
    timeline: String(formData.get("timeline") || "exploring"),
    source_route: "/apps/ai-agent-readiness-checker",
  };
}

function renderResult(result) {
  const target = document.getElementById("agent-readiness-result");
  if (!target) return;

  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Agent readiness check complete</h3>
    <p class="system-copy">The checker returned a deterministic readiness score, build path, and control guidance.</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ READINESS SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(result.readiness_score))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ READINESS TIER ]</p>
          <p class="stat-num">${escapeHtml(String(result.readiness_tier).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ PRIORITY ]</p>
          <p class="stat-num">${escapeHtml(String(result.priority).toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ BUILD COMPLEXITY ]</p>
          <p class="stat-num">${escapeHtml(String(result.build_complexity).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ SAFETY LEVEL ]</p>
          <p class="stat-num">${escapeHtml(String(result.safety_level).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RECOMMENDED SERVICE ]</p>
          <p class="stat-num">${escapeHtml(String(result.recommended_service).toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="telemetry-grid">
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ BUILD REQUIREMENTS ]</p>
          ${(result.top_build_requirements || []).slice(0, 3).map((entry) => `
            <div class="telemetry-list">
              <span>${escapeHtml(entry.title)}</span>
              <span>${escapeHtml(entry.category)}</span>
              <span>${escapeHtml(entry.description)}</span>
              <span>${escapeHtml(entry.why_it_matters)}</span>
            </div>
          `).join("")}
        </div>
      </article>
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ RISK CONTROLS ]</p>
          ${(result.top_risk_controls || []).slice(0, 3).map((entry) => `
            <div class="telemetry-list">
              <span>${escapeHtml(entry.title)}</span>
              <span>${escapeHtml(String(entry.severity).toUpperCase())}</span>
              <span>${escapeHtml(entry.description)}</span>
              <span>${escapeHtml(entry.recommended_control)}</span>
            </div>
          `).join("")}
        </div>
      </article>
    </div>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ NEXT_ROUTE ]</p>
        <p class="system-copy">Secondary service :: ${escapeHtml(result.secondary_service || "none")}</p>
        <div class="cta-row">
          <a class="button primary" href="${escapeHtml(result.next_route)}">[ REQUEST AI AGENT BUILD REVIEW ]</a>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState() {
  const target = document.getElementById("agent-readiness-result");
  if (!target) return;
  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Agent readiness findings will appear here.</h3>
    <p class="system-copy">
      Submit the questionnaire to receive readiness scoring, build complexity, safety controls, and a direct intake route.
    </p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("agent-readiness-form");
  const submitButton = document.getElementById("agent-readiness-submit");
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.tool_connections.length) answers.tool_connections = ["not_sure"];
    if (!answers.data_access.length) answers.data_access = ["not_sure"];

    setStatus("Checking agent readiness...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/agent-readiness-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) {
        throw new Error(`Agent readiness check failed with status ${response.status}`);
      }
      const result = await response.json();
      renderResult(result);
      setStatus("Agent readiness check complete.", "success");
    } catch (error) {
      console.error("MSHOPS agent readiness checker failed", error);
      setStatus("Agent readiness check is unavailable.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      renderEmptyState();
      setStatus("Checker ready.");
    }, 0);
  });
});
