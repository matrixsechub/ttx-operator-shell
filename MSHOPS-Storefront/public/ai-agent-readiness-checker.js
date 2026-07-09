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

function escapeList(value) {
  return escapeHtml(String(value || "n/a").replace(/_/g, " "));
}

function complianceState(result) {
  if (result.safety_level === "high" || result.readiness_tier === "ready_with_controls") {
    return { label: "Security Plane Compliant", tone: "healthy" };
  }
  if (result.readiness_tier === "needs_controls" || result.safety_level === "medium") {
    return { label: "Security Plane Review", tone: "warning" };
  }
  return { label: "Security Plane Gated", tone: "critical" };
}

function lifecycleModel(result) {
  const tier = String(result.readiness_tier || "");
  const isReady = tier === "ready" || tier === "ready_with_controls";
  const needsControls = tier === "needs_controls";

  return [
    {
      label: "Assess",
      copy: "Questionnaire and deterministic scoring complete.",
      state: "complete",
    },
    {
      label: "Govern",
      copy: isReady
        ? "Security-plane compliance is aligned for intake."
        : needsControls
          ? "Control design is required before build execution."
          : "Readiness remains gated by workflow and safety gaps.",
      state: isReady || needsControls ? "active" : "pending",
    },
    {
      label: "Route",
      copy: "Handoff into the guided intake path for build review.",
      state: isReady ? "active" : needsControls ? "pending" : "pending",
    },
  ];
}

function renderTimeline(result) {
  return lifecycleModel(result)
    .map(
      (entry) => `
        <div class="readiness-timeline-item ${entry.state === "complete" ? "is-complete" : ""} ${entry.state === "active" ? "is-active" : ""}">
          <span class="readiness-timeline-dot" aria-hidden="true"></span>
          <div>
            <strong class="readiness-timeline-label">${escapeHtml(entry.label)}</strong>
            <span class="readiness-timeline-copy">${escapeHtml(entry.copy)}</span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderBuildList(entries, kind) {
  const items = Array.isArray(entries) ? entries.slice(0, 3) : [];
  if (!items.length) {
    return `<div class="readiness-list-item"><span class="readiness-list-kicker">No items</span><p>No ${kind} were returned.</p></div>`;
  }

  return items
    .map((entry) => {
      const kicker = kind === "requirements" ? entry.category : entry.severity;
      const copy = kind === "requirements" ? entry.why_it_matters : entry.recommended_control;
      return `
        <article class="readiness-list-item">
          <span class="readiness-list-kicker">${escapeList(kicker)}</span>
          <strong>${escapeHtml(entry.title)}</strong>
          <p>${escapeHtml(entry.description)}</p>
          <p>${escapeHtml(copy)}</p>
        </article>
      `;
    })
    .join("");
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

  const compliance = complianceState(result);

  target.innerHTML = `
    <div class="readiness-result-shell">
      <div>
        <p class="section-label mono">[ RESULT_SCREEN ]</p>
        <h3>Agent readiness check complete</h3>
        <p class="system-copy">The checker returned a deterministic readiness score, build path, and control guidance.</p>
      </div>

      <section class="readiness-score-block">
        <article class="readiness-score-indicator">
          <p class="section-label mono">[ READINESS SCORE ]</p>
          <div class="readiness-score-num">${escapeHtml(String(result.readiness_score))}</div>
          <p class="readiness-score-copy">
            ${escapeList(result.readiness_tier)} readiness with ${escapeList(result.priority)} routing priority.
          </p>
        </article>

        <article class="readiness-status-panel">
          <div>
            <p class="section-label mono">[ AGENT STATUS ]</p>
            <div class="readiness-status-chip-row">
              <span class="readiness-chip">${escapeList(result.readiness_tier)}</span>
              <span class="readiness-chip">${escapeList(result.priority)} priority</span>
              <span class="readiness-chip">${escapeList(result.safety_level)} safety</span>
            </div>
          </div>
          <div>
            <p class="section-label mono">[ SECURITY PLANE COMPLIANCE ]</p>
            <span class="readiness-badge readiness-badge--${escapeHtml(compliance.tone)}">${escapeHtml(compliance.label)}</span>
          </div>
        </article>
      </section>

      <section class="readiness-meta-grid">
        <article class="readiness-meta-card">
          <p class="section-label mono">[ BUILD COMPLEXITY ]</p>
          <div class="readiness-meta-value">${escapeList(result.build_complexity)}</div>
        </article>
        <article class="readiness-meta-card">
          <p class="section-label mono">[ RECOMMENDED SERVICE ]</p>
          <div class="readiness-meta-value">${escapeList(result.recommended_service)}</div>
        </article>
        <article class="readiness-meta-card">
          <p class="section-label mono">[ SECONDARY PATH ]</p>
          <div class="readiness-meta-value">${escapeList(result.secondary_service || "none")}</div>
        </article>
      </section>

      <article class="readiness-timeline-card">
        <p class="section-label mono">[ LIFECYCLE STAGE ]</p>
        <div class="readiness-timeline">
          ${renderTimeline(result)}
        </div>
      </article>

      <section class="readiness-lists">
        <article class="readiness-requirements">
          <p class="section-label mono">[ BUILD REQUIREMENTS ]</p>
          <div class="readiness-list">
            ${renderBuildList(result.top_build_requirements, "requirements")}
          </div>
        </article>
        <article class="readiness-requirements">
          <p class="section-label mono">[ RISK CONTROLS ]</p>
          <div class="readiness-list">
            ${renderBuildList(result.top_risk_controls, "controls")}
          </div>
        </article>
      </section>

      <article class="readiness-next-route">
        <p class="section-label mono">[ NEXT_ROUTE ]</p>
        <p class="system-copy">Route preserved into intake with readiness metadata and build-review context.</p>
        <div class="cta-row">
          <a class="button primary" href="${escapeHtml(result.next_route)}">[ REQUEST AI AGENT BUILD REVIEW ]</a>
        </div>
      </article>
    </div>
  `;
}

function renderEmptyState() {
  const target = document.getElementById("agent-readiness-result");
  if (!target) return;
  target.innerHTML = `
    <div class="readiness-empty">
      <p class="section-label mono">[ RESULT_SCREEN ]</p>
      <h3>Agent readiness findings will appear here.</h3>
      <p class="system-copy">
        Submit the questionnaire to receive readiness scoring, build complexity, safety controls, and a direct intake route.
      </p>
    </div>
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
