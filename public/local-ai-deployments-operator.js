const COLUMN_COUNT = 12;

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
  const status = document.getElementById("local-ai-deployments-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function getOperatorToken() {
  try {
    return sessionStorage.getItem("operator_token") || sessionStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function buildAuthHeaders() {
  const headers = { "X-MSH-Operator-Surface": "local-ai-deployments" };
  const token = getOperatorToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function renderTacticalValue(value, fallback = "n/a") {
  const display = value === undefined || value === null || value === "" ? fallback : value;
  const normalized = String(display).trim().toLowerCase();
  if (normalized === "critical" || normalized === "enterprise") {
    return `<span class="badge badge--tactical-critical" data-tactical-value>${escapeHtml(String(display))}</span>`;
  }
  if (normalized === "high" || normalized === "advanced") {
    return `<span class="badge badge--tactical-high" data-tactical-value>${escapeHtml(String(display))}</span>`;
  }
  return `<span class="badge badge--neutral" data-tactical-value>${escapeHtml(String(display))}</span>`;
}

function formatDetailValue(value) {
  if (value === undefined || value === null || value === "") return "n/a";
  if (Array.isArray(value)) return value.length ? value.join("\n") : "n/a";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function renderDetailSection(label, value) {
  const formatted = formatDetailValue(value);
  if (formatted === "n/a") return "";
  return `
    <details class="detail-panel detail-panel-collapsible">
      <summary class="section-label mono">${escapeHtml(label)}</summary>
      <pre>${escapeHtml(formatted)}</pre>
    </details>
  `;
}

function renderDetailPanels(row) {
  const sections = [
    ["hardware_requirements", row.hardware_requirements],
    ["storage_requirements", row.storage_requirements],
    ["data_isolation_model", row.data_isolation_model],
    ["security_controls", row.security_controls],
    ["access_control_model", row.access_control_model],
    ["update_strategy", row.update_strategy],
    ["monitoring_plan", row.monitoring_plan],
    ["scaling_plan", row.scaling_plan],
    ["integration_points", row.integration_points],
    ["failure_modes", row.failure_modes],
    ["backup_strategy", row.backup_strategy],
    ["latency_expectation", row.latency_expectation],
    ["cost_estimate", row.cost_estimate],
    ["recommended_next_step", row.recommended_next_step],
    ["next_route", row.next_route],
    ["diagnostic_context", row.diagnostic_context],
  ];
  return sections.map(([label, value]) => renderDetailSection(label, value)).filter(Boolean).join("") || '<p class="system-copy">No extended plan details available.</p>';
}

function rowDomId(row, index) {
  return String(row.deployment_plan_id || `row-${index}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function renderRows(rows) {
  const tbody = document.getElementById("local-ai-deployments-rows");
  if (!tbody) return;

  tbody.innerHTML = rows.length
    ? rows
        .map((row, index) => {
          const domId = rowDomId(row, index);
          const modelLabel = `${row.model_recommendation || "n/a"} ${row.model_size || ""}`.trim();
          return `
            <tr data-row-id="${escapeHtml(domId)}">
              <td>${escapeHtml(row.deployment_plan_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(row.use_case || "n/a")}</td>
              <td>${escapeHtml(modelLabel)}</td>
              <td>${escapeHtml(row.hosting_strategy || "n/a")}</td>
              <td>${renderTacticalValue(row.complexity_level, "moderate")}</td>
              <td>${renderTacticalValue(row.risk_level, "medium")}</td>
              <td>${renderTacticalValue(row.priority, "medium")}</td>
              <td>${escapeHtml(row.estimated_effort || "n/a")}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
              <td>
                <button class="button secondary queue-detail-toggle" type="button" data-target="${escapeHtml(domId)}" aria-expanded="false" aria-controls="detail-${escapeHtml(domId)}">[ DETAILS ]</button>
              </td>
            </tr>
            <tr class="queue-detail-row" id="detail-${escapeHtml(domId)}" hidden>
              <td colspan="${COLUMN_COUNT}">
                <div class="payload-detail">
                  <div class="payload-detail-head">
                    <p class="section-label mono">[ DEPLOYMENT_PLAN :: ${escapeHtml(row.deployment_plan_id || "n/a")} ]</p>
                  </div>
                  ${renderDetailPanels(row)}
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="${COLUMN_COUNT}">No local AI deployment records are in the queue.</td></tr>`;

  tbody.querySelectorAll(".queue-detail-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target");
      if (!targetId) return;
      const detailRow = document.getElementById(`detail-${targetId}`);
      if (!(detailRow instanceof HTMLTableRowElement)) return;
      const expanded = button.getAttribute("aria-expanded") === "true";
      detailRow.hidden = expanded;
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
    });
  });
}

async function loadQueue() {
  setStatus("Loading local AI deployments queue...");
  try {
    const response = await fetch("/api/operator/local-ai-deployments", { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderRows(rows);
    setStatus(`Loaded ${rows.length} local AI deployment record(s).`, "success");
  } catch (error) {
    console.error("MSHOPS local AI deployments queue", error);
    renderRows([]);
    setStatus("Unable to load local AI deployments queue.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("local-ai-deployments-refresh")?.addEventListener("click", () => {
    loadQueue();
  });
  loadQueue();
});
