function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("rag-risk-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function collectAnswers(form) {
  const formData = new FormData(form);
  return {
    rag_system_type: String(formData.get("rag_system_type") || "not_sure"),
    deployment_context: String(formData.get("deployment_context") || "not_sure"),
    data_sources: formData.getAll("data_sources").map((value) => String(value)),
    retrieval_scope: String(formData.get("retrieval_scope") || "not_sure"),
    access_controls: formData.getAll("access_controls").map((value) => String(value)),
    source_governance: String(formData.get("source_governance") || "not_sure"),
    retrieval_quality_controls: formData.getAll("retrieval_quality_controls").map((value) => String(value)),
    prompt_injection_controls: formData.getAll("prompt_injection_controls").map((value) => String(value)),
    logging_monitoring: String(formData.get("logging_monitoring") || "not_sure"),
    business_impact: String(formData.get("business_impact") || "not_sure"),
    timeline: String(formData.get("timeline") || "exploring"),
    source_route: "/apps/rag-risk-analyzer",
  };
}

function renderEmptyState() {
  const target = document.getElementById("rag-risk-result");
  if (!target) return;
  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>RAG risk findings will appear here.</h3>
    <p class="system-copy">
      Submit the questionnaire to receive a RAG risk score, exposure tiering, governance findings, and a direct intake route.
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
  const target = document.getElementById("rag-risk-result");
  if (!target) return;

  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>RAG risk analysis complete</h3>
    <p class="system-copy">The analyzer returned a deterministic risk score, retrieval exposure rating, governance maturity, and intake route.</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RAG RISK SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(result.rag_risk_score))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RAG RISK TIER ]</p>
          <p class="stat-num">${escapeHtml(String(result.rag_risk_tier).toUpperCase())}</p>
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
          <p class="stat-label mono">[ RETRIEVAL EXPOSURE ]</p>
          <p class="stat-num">${escapeHtml(String(result.retrieval_exposure_level).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ ACCESS CONTROL ]</p>
          <p class="stat-num">${escapeHtml(String(result.access_control_level).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ GOVERNANCE ]</p>
          <p class="stat-num">${escapeHtml(String(result.governance_maturity).toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="services-result-grid">
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
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RAG RISK ID ]</p>
          <p class="stat-num">${escapeHtml(String(result.rag_risk_id || "pending"))}</p>
        </div>
      </article>
    </div>
    <div class="telemetry-grid">
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ TOP_RAG_RISKS ]</p>
          ${renderList(result.top_rag_risks, ["title", "severity", "category", "description", "recommended_control"])}
        </div>
      </article>
      <article class="telemetry-card bracket">
        <div class="bracket-inner">
          <p class="section-label mono">[ RECOMMENDED_CONTROLS ]</p>
          ${renderList(result.top_recommended_controls, ["title", "priority", "category", "description", "implementation_note"])}
        </div>
      </article>
    </div>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ NEXT_ROUTE ]</p>
        <div class="cta-row">
          <a class="button primary" href="${escapeHtml(result.next_route)}">[ REQUEST RAG GOVERNANCE REVIEW ]</a>
        </div>
      </div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("rag-risk-form-element");
  const submitButton = document.getElementById("rag-risk-submit");
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.data_sources.length) answers.data_sources = ["not_sure"];
    if (!answers.access_controls.length) answers.access_controls = ["not_sure"];
    if (!answers.retrieval_quality_controls.length) answers.retrieval_quality_controls = ["not_sure"];
    if (!answers.prompt_injection_controls.length) answers.prompt_injection_controls = ["not_sure"];

    setStatus("Analyzing RAG risk...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/rag-risk-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) {
        throw new Error(`RAG risk analysis failed with status ${response.status}`);
      }
      const result = await response.json();
      renderResult(result);
      setStatus("RAG risk analysis complete.", "success");
    } catch (error) {
      console.error("MSHOPS RAG risk analyzer failed", error);
      setStatus("RAG risk analysis is unavailable.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      renderEmptyState();
      setStatus("Analyzer ready.");
    }, 0);
  });
});
