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
  const status = document.getElementById("security-remediation-status");
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
  const headers = { "X-MSH-Operator-Surface": "security-remediation" };
  const token = getOperatorToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function renderTacticalValue(value, fallback = "n/a") {
  const display = value === undefined || value === null || value === "" ? fallback : value;
  const normalized = String(display).trim().toLowerCase();
  if (normalized === "critical") {
    return `<span class="badge badge--tactical-critical" data-tactical-value>${escapeHtml(String(display))}</span>`;
  }
  if (normalized === "high") {
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
    ["risk_summary", row.risk_summary],
    ["vulnerabilities", row.vulnerabilities],
    ["prioritized_fix_plan", row.prioritized_fix_plan],
    ["remediation_steps", row.remediation_steps],
    ["implementation_order", row.implementation_order],
    ["security_controls_required", row.security_controls_required],
    ["compliance_alignment", row.compliance_alignment],
    ["validation_steps", row.validation_steps],
    ["regression_risks", row.regression_risks],
    ["monitoring_plan", row.monitoring_plan],
    ["recommended_next_step", row.recommended_next_step],
    ["next_route", row.next_route],
    ["source_route", row.source_route],
    ["diagnostic_context", row.diagnostic_context],
  ];
  return sections.map(([label, value]) => renderDetailSection(label, value)).filter(Boolean).join("") || '<p class="system-copy">No extended plan details available.</p>';
}

function rowDomId(row, index) {
  return String(row.remediation_plan_id || `row-${index}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function renderRows(rows) {
  const tbody = document.getElementById("security-remediation-rows");
  if (!tbody) return;

  tbody.innerHTML = rows.length
    ? rows
        .map((row, index) => {
          const domId = rowDomId(row, index);
          return `
            <tr data-row-id="${escapeHtml(domId)}">
              <td>${escapeHtml(row.remediation_plan_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(row.source_type || "n/a")}</td>
              <td>${escapeHtml(row.source_reference_id || "n/a")}</td>
              <td>${renderTacticalValue(row.risk_level, "medium")}</td>
              <td>${renderTacticalValue(row.priority, "medium")}</td>
              <td>${escapeHtml(row.estimated_effort || "n/a")}</td>
              <td>${escapeHtml(row.timeline || "n/a")}</td>
              <td>${escapeHtml(row.retainer_path || "n/a")}</td>
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
                    <p class="section-label mono">[ REMEDIATION_PLAN :: ${escapeHtml(row.remediation_plan_id || "n/a")} ]</p>
                  </div>
                  ${renderDetailPanels(row)}
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="${COLUMN_COUNT}">No security remediation records are in the queue.</td></tr>`;

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
  setStatus("Loading security remediation queue...");
  try {
    const response = await fetch("/api/operator/security-remediation", { headers: buildAuthHeaders() });
    if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderRows(rows);
    setStatus(`Loaded ${rows.length} remediation record(s).`, "success");
  } catch (error) {
    console.error("MSHOPS security remediation queue", error);
    renderRows([]);
    setStatus("Unable to load security remediation queue.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("security-remediation-refresh")?.addEventListener("click", () => {
    loadQueue();
  });
  loadQueue();
});
