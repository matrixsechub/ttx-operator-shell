const COLUMN_COUNT = 14;

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
  const status = document.getElementById("ai-agent-builds-status");
  if (!status) {
    return;
  }
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
  const headers = {
    "X-MSH-Operator-Surface": "ai-agent-builds",
  };
  const token = getOperatorToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
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
  if (value === undefined || value === null || value === "") {
    return "n/a";
  }
  if (Array.isArray(value)) {
    return value.length ? value.join("\n") : "n/a";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function renderDetailSection(label, value) {
  const formatted = formatDetailValue(value);
  if (formatted === "n/a") {
    return "";
  }
  return `
    <details class="detail-panel detail-panel-collapsible">
      <summary class="section-label mono">${escapeHtml(label)}</summary>
      <pre>${escapeHtml(formatted)}</pre>
    </details>
  `;
}

function renderDetailPanels(row) {
  const sections = [
    ["agent_role_definition", row.agent_role_definition],
    ["agent_mission", row.agent_mission],
    ["business_problem", row.business_problem],
    ["target_user", row.target_user],
    ["task_scope", row.task_scope],
    ["out_of_scope_actions", row.out_of_scope_actions],
    ["tool_boundary_model", row.tool_boundary_model],
    ["permission_model", row.permission_model],
    ["user_interaction_model", row.user_interaction_model],
    ["approval_gates", row.approval_gates],
    ["safety_controls", row.safety_controls],
    ["memory_policy", row.memory_policy],
    ["prompt_interface_spec", row.prompt_interface_spec],
    ["data_handling_policy", row.data_handling_policy],
    ["logging_telemetry_plan", row.logging_telemetry_plan],
    ["integration_plan", row.integration_plan],
    ["deployment_plan", row.deployment_plan],
    ["testing_plan", row.testing_plan],
    ["red_team_checks", row.red_team_checks],
    ["client_inputs_needed", row.client_inputs_needed],
    ["implementation_checklist", row.implementation_checklist],
    ["maintenance_plan", row.maintenance_plan],
    ["tools_needed", row.tools_needed],
    ["data_types", row.data_types],
    ["output_modes", row.output_modes],
    ["risk_signals", row.risk_signals],
    ["recommended_next_step", row.recommended_next_step],
    ["next_route", row.next_route],
    ["source_type", row.source_type],
    ["source_route", row.source_route],
    ["agent_goal", row.agent_goal],
    ["agent_autonomy_level", row.agent_autonomy_level],
    ["human_approval_required", row.human_approval_required],
    ["deployment_environment", row.deployment_environment],
    ["memory_requirement", row.memory_requirement],
    ["timeline", row.timeline],
    ["budget_band", row.budget_band],
    ["volume_level", row.volume_level],
    ["diagnostic_context", row.diagnostic_context],
  ];

  const rendered = sections.map(([label, value]) => renderDetailSection(label, value)).filter(Boolean).join("");
  return rendered || '<p class="system-copy">No extended spec details available for this record.</p>';
}

function rowDomId(row, index) {
  const raw = row.ai_agent_build_id || `row-${index}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function renderRows(rows) {
  const tbody = document.getElementById("ai-agent-builds-rows");
  if (!tbody) {
    return;
  }

  tbody.innerHTML = rows.length
    ? rows
        .map((row, index) => {
          const domId = rowDomId(row, index);
          return `
            <tr data-row-id="${escapeHtml(domId)}">
              <td>${escapeHtml(row.ai_agent_build_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(row.source_reference_id || "n/a")}</td>
              <td>${escapeHtml(row.agent_name || "n/a")}</td>
              <td>${escapeHtml(row.agent_category || "n/a")}</td>
              <td>${escapeHtml(row.recommended_service || "n/a")}</td>
              <td>${escapeHtml(row.estimated_effort || "n/a")}</td>
              <td>${escapeHtml(row.delivery_timeline || "n/a")}</td>
              <td>${renderTacticalValue(row.complexity_level, "basic")}</td>
              <td>${renderTacticalValue(row.risk_level, "low")}</td>
              <td>${renderTacticalValue(row.priority, "medium")}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
              <td>
                <button
                  class="button secondary queue-detail-toggle"
                  type="button"
                  data-target="${escapeHtml(domId)}"
                  aria-expanded="false"
                  aria-controls="detail-${escapeHtml(domId)}"
                >
                  [ DETAILS ]
                </button>
              </td>
            </tr>
            <tr class="queue-detail-row" id="detail-${escapeHtml(domId)}" hidden>
              <td colspan="${COLUMN_COUNT}">
                <div class="payload-detail">
                  <div class="payload-detail-head">
                    <p class="section-label mono">[ BUILD_SPEC :: ${escapeHtml(row.ai_agent_build_id || "n/a")} ]</p>
                  </div>
                  ${renderDetailPanels(row)}
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
        <tr>
          <td colspan="${COLUMN_COUNT}">No AI agent build records are in the queue.</td>
        </tr>
      `;

  tbody.querySelectorAll(".queue-detail-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target");
      if (!targetId) {
        return;
      }
      const detailRow = document.getElementById(`detail-${targetId}`);
      const mainRow = tbody.querySelector(`tr[data-row-id="${targetId}"]`);
      if (!(detailRow instanceof HTMLTableRowElement)) {
        return;
      }

      const isOpen = !detailRow.hidden;
      detailRow.hidden = isOpen;
      button.setAttribute("aria-expanded", String(!isOpen));
      button.textContent = isOpen ? "[ DETAILS ]" : "[ HIDE ]";
      mainRow?.classList.toggle("selected-row", !isOpen);
    });
  });
}

async function loadQueue() {
  setStatus("Loading AI agent builds queue...");

  try {
    const response = await fetch("/api/operator/ai-agent-builds", {
      headers: buildAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderRows(rows);
    setStatus(`Queue ready :: ${rows.length} records loaded.`, "success");
    window.__aiAgentBuildRows = rows;
  } catch (error) {
    console.error("MSHOPS AI agent builds queue failed", error);
    renderRows([]);
    setStatus("AI agent builds queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("ai-agent-builds-refresh");
  refresh?.addEventListener("click", loadQueue);
  loadQueue();
});
