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
  const node = document.getElementById("intake-agent-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

let selectedRow = null;

function getActionButtons() {
  return {
    ready: document.getElementById("intake-agent-ready"),
    closed: document.getElementById("intake-agent-closed"),
    viewSelector: document.getElementById("intake-agent-view-selector"),
    viewEngagement: document.getElementById("intake-agent-view-engagement"),
  };
}

function setActionState(enabled) {
  const buttons = getActionButtons();
  Object.values(buttons).forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.disabled = !enabled;
    }
  });
}

function updateSummaryPanel(row) {
  selectedRow = row || null;
  const selection = document.getElementById("intake-agent-selection");
  const summary = document.getElementById("intake-agent-summary");
  const notes = document.getElementById("intake-agent-notes");
  const detailPanel = document.getElementById("intake-agent-detail-panel");

  if (!row) {
    if (selection) selection.textContent = "Select a queue row to view agent output.";
    if (summary) summary.textContent = "—";
    if (notes) notes.textContent = "—";
    if (detailPanel) detailPanel.hidden = true;
    setActionState(false);
    return;
  }

  if (selection) {
    selection.textContent = `Selected :: ${row.selector_id || "n/a"} → ${row.engagement_id || "n/a"}`;
  }
  if (summary) {
    summary.textContent = row.agent_summary || "No agent summary yet. Run POST /api/agent/intake/process for this pair.";
  }
  if (notes) {
    notes.textContent = row.agent_notes || "—";
  }
  if (detailPanel) {
    detailPanel.hidden = true;
  }
  setActionState(Boolean(row.selector_id));
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

function flashSelectedBadge() {
  const badge = document.querySelector("#intake-agent-rows tr.selected-row [data-tactical-value]");
  if (!badge) {
    return;
  }
  badge.classList.remove("badge--flash");
  void badge.offsetWidth;
  badge.classList.add("badge--flash");
  badge.addEventListener("animationend", () => badge.classList.remove("badge--flash"), { once: true });
}

function showDetail(label, payload) {
  const panel = document.getElementById("intake-agent-detail-panel");
  const labelNode = document.getElementById("intake-agent-detail-label");
  const jsonNode = document.getElementById("intake-agent-detail-json");
  if (!panel || !labelNode || !jsonNode) {
    return;
  }
  labelNode.textContent = label;
  jsonNode.textContent = JSON.stringify(payload, null, 2);
  panel.hidden = false;
}

function renderRows(rows, filterValue = "") {
  const tbody = document.getElementById("intake-agent-rows");
  if (!tbody) {
    return;
  }

  const filtered = filterValue ? rows.filter((row) => row.priority === filterValue) : rows;
  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (row, index) => `
            <tr data-row-index="${index}" class="${selectedRow && selectedRow.selector_id === row.selector_id && selectedRow.engagement_id === row.engagement_id ? "selected-row" : ""}">
              <td>${escapeHtml(row.selector_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(row.recommended_service || "n/a")}</td>
              <td>${escapeHtml(String(row.urgency_score ?? 0))}</td>
              <td>${escapeHtml(String(row.revenue_potential || "medium"))}</td>
              <td>${renderTacticalValue(row.priority, "normal")}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="8">No intake agent records matched the current filter.</td>
        </tr>
      `;

  tbody.querySelectorAll("tr[data-row-index]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const rowIndex = Number(tr.dataset.rowIndex);
      const row = filtered[rowIndex];
      if (!row) {
        return;
      }
      updateSummaryPanel(row);
      tbody.querySelectorAll("tr").forEach((node) => node.classList.remove("selected-row"));
      tr.classList.add("selected-row");
    });
  });
}

async function updateStatus(status) {
  if (!selectedRow?.selector_id) {
    return;
  }

  setStatus(`Updating status to ${status}...`);

  try {
    const response = await fetch("/api/operator/service-intake/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selector_id: selectedRow.selector_id, status }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `Status update failed (${response.status})`);
    }
    setStatus(`Status updated to ${status}.`, "success");
    await loadQueue();
    const rows = window.__intakeAgentRows || [];
    const refreshed = rows.find((row) => row.selector_id === selectedRow.selector_id);
    updateSummaryPanel(refreshed || null);
    flashSelectedBadge();
  } catch (error) {
    console.error("Intake agent status update failed", error);
    setStatus(error.message || "Status update failed.", "error");
  }
}

async function loadQueue() {
  setStatus("Loading intake agent queue...");

  try {
    const response = await fetch("/api/operator/service-intake");
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    window.__intakeAgentRows = rows;
    const filter = document.getElementById("intake-agent-filter");
    renderRows(rows, filter instanceof HTMLSelectElement ? filter.value : "");
    setStatus(`Intake agent queue ready :: ${rows.length} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS intake agent queue failed", error);
    renderRows([], "");
    setStatus("Intake agent queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("intake-agent-refresh");
  const filter = document.getElementById("intake-agent-filter");
  const buttons = getActionButtons();

  refresh?.addEventListener("click", loadQueue);
  filter?.addEventListener("change", () => {
    renderRows(window.__intakeAgentRows || [], filter.value);
  });

  buttons.ready?.addEventListener("click", () => updateStatus("ready-for-review"));
  buttons.closed?.addEventListener("click", () => updateStatus("closed"));
  buttons.viewSelector?.addEventListener("click", () => {
    if (selectedRow) {
      showDetail("selector_raw", selectedRow.selector_raw || {});
    }
  });
  buttons.viewEngagement?.addEventListener("click", () => {
    if (selectedRow) {
      showDetail("engagement_details", selectedRow.engagement_details || {});
    }
  });

  loadQueue();
});
