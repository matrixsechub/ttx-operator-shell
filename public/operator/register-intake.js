function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "n/a";
}

function setStatus(message, state = "") {
  const node = document.getElementById("register-intake-queue-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

function formatTimeline(row) {
  const events = Array.isArray(row.lifecycle_timeline) ? row.lifecycle_timeline : [];
  if (!events.length) {
    return "n/a";
  }
  return events.map((entry) => entry.label || entry.status).join(" -> ");
}

function renderSummary(summary = {}) {
  const grid = document.getElementById("register-intake-summary-grid");
  if (!grid) {
    return;
  }

  const lifecycle = summary.lifecycle_distribution || {};
  const last = summary.last_submission || null;
  grid.innerHTML = `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ QUEUE_LENGTH ]</p>
        <h3>${summary.queue_length ?? summary.total ?? 0}</h3>
        <p class="system-copy">Public registration intake awaiting operator review.</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ LAST_SUBMISSION ]</p>
        <h3>${escapeHtml(last?.register_id || "n/a")}</h3>
        <p class="system-copy">${escapeHtml(last?.lifecycle_label || "No submissions yet")}</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ LIFECYCLE ]</p>
        <div class="telemetry-list">
          <span>PENDING :: ${lifecycle.received || 0}</span>
          <span>VALIDATED :: ${lifecycle.validated || 0}</span>
          <span>QUEUED :: ${lifecycle.queued || 0}</span>
          <span>PROCESSED :: ${lifecycle.processed || 0}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSecurityPlane(securityPlane = {}) {
  const node = document.getElementById("register-intake-security-plane");
  if (!node) {
    return;
  }

  const module = securityPlane.module || {};
  node.innerHTML = `
    <span>STAGE :: ${escapeHtml(module.security_stage || "intake")}</span>
    <span>PERMISSION :: ${escapeHtml(module.permission_profile || "public_intake")}</span>
    <span>AGENT :: ${escapeHtml(module.agent_config_key || "intake_agent_v2")}</span>
    <span>THREAT_MODEL :: ${module.requires_threat_modeling ? "required" : "not required"}</span>
    <span>HOOKS_FIRED :: ${escapeHtml(String(securityPlane.threat_hooks?.firedCount ?? 0))}</span>
  `;
}

function renderRows(rows = []) {
  const tbody = document.getElementById("register-intake-rows");
  if (!tbody) {
    return;
  }

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.register_id || "n/a")}</td>
              <td>${escapeHtml(row.name || "n/a")}</td>
              <td>${escapeHtml(row.role || "n/a")}</td>
              <td>${escapeHtml(row.lifecycle_label || row.lifecycle_status || "Pending Intake")}</td>
              <td>${escapeHtml(row.priority || "standard")}</td>
              <td>${escapeHtml(formatTimeline(row))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="7">No registration intake submissions in queue.</td></tr>`;
}

async function loadQueue() {
  setStatus("Loading register intake queue...");
  try {
    const response = await fetch("/api/operator/register-intake", {
      headers: { Accept: "application/json", "Cache-Control": "no-store" },
    });
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    renderSummary(payload.summary || {});
    renderSecurityPlane(payload.summary?.security_plane || {});
    renderRows(payload.rows || []);
    setStatus(`Loaded ${payload.rows?.length || 0} registration intake row(s).`, "success");
  } catch (error) {
    console.error("MSHOPS register intake queue load failed", error);
    setStatus("Register intake queue is unavailable right now.", "error");
    renderRows([]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadQueue();
});
