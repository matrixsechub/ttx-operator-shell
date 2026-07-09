function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("automation-roi-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function collectAnswers(form) {
  const formData = new FormData(form);
  return {
    workflow_type: String(formData.get("workflow_type") || "not_sure"),
    current_process: String(formData.get("current_process") || "not_sure"),
    weekly_volume: String(formData.get("weekly_volume") || "not_sure"),
    time_per_item_minutes: String(formData.get("time_per_item_minutes") || "not_sure"),
    team_hourly_cost: String(formData.get("team_hourly_cost") || "not_sure"),
    error_rate: String(formData.get("error_rate") || "not_sure"),
    tools_involved: formData.getAll("tools_involved").map((value) => String(value)),
    ai_needed: String(formData.get("ai_needed") || "not_sure"),
    risk_sensitivity: String(formData.get("risk_sensitivity") || "not_sure"),
    timeline: String(formData.get("timeline") || "exploring"),
    source_route: "/apps/automation-roi-calculator",
  };
}

function renderEmptyState() {
  const target = document.getElementById("automation-roi-result");
  if (!target) return;
  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Automation ROI findings will appear here.</h3>
    <p class="system-copy">
      Submit the questionnaire to receive savings estimates, ROI tiering, implementation requirements, and a direct intake route.
    </p>
  `;
}

function renderList(entries, fields) {
  return (entries || [])
    .slice(0, 3)
    .map((entry) => `
      <div class="telemetry-list">
        ${fields.map((field) => `<span>${escapeHtml(entry[field] || "")}</span>`).join("")}
      </div>
    `)
    .join("");
}

function renderResult(result) {
  const target = document.getElementById("automation-roi-result");
  if (!target) return;

  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Automation ROI calculation complete</h3>
    <p class="system-copy">The calculator returned a deterministic savings estimate, complexity profile, and intake route.</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ ROI SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(result.roi_score))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ ROI TIER ]</p>
          <p class="stat-num">${escapeHtml(String(result.roi_tier).toUpperCase())}</p>
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
          <p class="stat-label mono">[ MONTHLY SAVINGS ]</p>
          <p class="stat-num">$${escapeHtml(String(result.estimated_monthly_savings))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ ANNUAL SAVINGS ]</p>
          <p class="stat-num">$${escapeHtml(String(result.estimated_annual_savings))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ HOURS SAVED ]</p>
          <p class="stat-num">${escapeHtml(String(result.hours_saved_per_month))}</p>
          <p class="stat-copy mono">hours per month</p>
        </div>
      </article>
    </div>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ AUTOMATION COMPLEXITY ]</p>
          <p class="stat-num">${escapeHtml(String(result.automation_complexity).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RECOMMENDED SERVICE ]</p>
          <p class="stat-num">${escapeHtml(String(result.recommended_service).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ SECONDARY SERVICE ]</p>
          <p class="stat-num">${escapeHtml(String(result.secondary_service || "NONE").toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="telemetry-grid">
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ TOP_AUTOMATION_OPPORTUNITIES ]</p>
          ${renderList(result.top_automation_opportunities, ["title", "category", "description", "estimated_impact"])}
        </div>
      </article>
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ IMPLEMENTATION_REQUIREMENTS ]</p>
          ${renderList(result.top_implementation_requirements, ["title", "category", "description", "why_it_matters"])}
        </div>
      </article>
    </div>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ NEXT_ROUTE ]</p>
        <p class="system-copy">Automation ROI ID :: ${escapeHtml(result.automation_roi_id || "pending")}</p>
        <div class="cta-row">
          <a class="button primary" href="${escapeHtml(result.next_route)}">[ REQUEST AUTOMATION BUILD REVIEW ]</a>
        </div>
      </div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("automation-roi-form-element");
  const submitButton = document.getElementById("automation-roi-submit");
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.tools_involved.length) answers.tools_involved = ["not_sure"];

    setStatus("Calculating automation ROI...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/automation-roi-calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) {
        throw new Error(`Automation ROI calculation failed with status ${response.status}`);
      }
      const result = await response.json();
      renderResult(result);
      setStatus("Automation ROI calculation complete.", "success");
    } catch (error) {
      console.error("MSHOPS automation ROI calculator failed", error);
      setStatus("Automation ROI calculation is unavailable.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      renderEmptyState();
      setStatus("Calculator ready.");
    }, 0);
  });
});
