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
  const node = document.getElementById("security-intake-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

let selectedRow = null;

function getActionButtons() {
  return {
    ready: document.getElementById("security-intake-ready"),
    closed: document.getElementById("security-intake-closed"),
    viewSelector: document.getElementById("security-intake-view-selector"),
    viewEngagement: document.getElementById("security-intake-view-engagement"),
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

function isSecurityIntakeRow(row) {
  return row.agent_type === "security-intake" || row.security_risk_score != null;
}

function updateSummaryPanel(row) {
  selectedRow = row || null;
  const selection = document.getElementById("security-intake-selection");
  const summary = document.getElementById("security-intake-summary");
  const detailPanel = document.getElementById("security-intake-detail-panel");

  if (!row) {
    if (selection) selection.textContent = "Select a queue row to view security output.";
    if (summary) summary.textContent = "—";
    if (detailPanel) detailPanel.hidden = true;
    setActionState(false);
    return;
  }

  if (selection) {
    selection.textContent = `Selected :: ${row.selector_id || "n/a"} → ${row.engagement_id || "n/a"}`;
  }
  if (summary) {
    summary.textContent =
      row.security_summary ||
      "No security summary yet. Run POST /api/agent/security-intake/process for this pair.";
  }
  if (detailPanel) {
    detailPanel.hidden = true;
  }
  setActionState(Boolean(row.selector_id));
}

function renderTacticalValue(value, fallback = "—") {
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
  const badge = document.querySelector("#security-intake-rows tr.selected-row [data-tactical-value]");
  if (!badge) {
    return;
  }
  badge.classList.remove("badge--flash");
  void badge.offsetWidth;
  badge.classList.add("badge--flash");
  badge.addEventListener("animationend", () => badge.classList.remove("badge--flash"), { once: true });
}

function showDetail(label, payload) {
  const panel = document.getElementById("security-intake-detail-panel");
  const labelNode = document.getElementById("security-intake-detail-label");
  const jsonNode = document.getElementById("security-intake-detail-json");
  if (!panel || !labelNode || !jsonNode) {
    return;
  }
  labelNode.textContent = label;
  jsonNode.textContent = JSON.stringify(payload, null, 2);
  panel.hidden = false;
}

function renderRows(rows, filterValue = "") {
  const tbody = document.getElementById("security-intake-rows");
  if (!tbody) {
    return;
  }

  const securityRows = rows.filter(isSecurityIntakeRow);
  const filtered = filterValue
    ? securityRows.filter((row) => row.security_exposure_level === filterValue)
    : securityRows;

  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (row, index) => `
            <tr data-row-index="${index}" class="${selectedRow && selectedRow.selector_id === row.selector_id && selectedRow.engagement_id === row.engagement_id ? "selected-row" : ""}">
              <td>${escapeHtml(row.selector_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(String(row.security_risk_score ?? "—"))}</td>
              <td>${renderTacticalValue(row.security_exposure_level)}</td>
              <td>${escapeHtml(String(row.recommended_security_service || "—"))}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="7">No security intake records matched the current filter.</td>
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
    const rows = window.__securityIntakeRows || [];
    const refreshed = rows.find((row) => row.selector_id === selectedRow.selector_id);
    updateSummaryPanel(refreshed || null);
    flashSelectedBadge();
  } catch (error) {
    console.error("Security intake status update failed", error);
    setStatus(error.message || "Status update failed.", "error");
  }
}

async function loadQueue() {
  setStatus("Loading security intake queue...");

  try {
    const response = await fetch("/api/operator/service-intake");
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    window.__securityIntakeRows = rows;
    const filter = document.getElementById("security-intake-filter");
    renderRows(rows, filter instanceof HTMLSelectElement ? filter.value : "");
    const securityCount = rows.filter(isSecurityIntakeRow).length;
    setStatus(`Security intake queue ready :: ${securityCount} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS security intake queue failed", error);
    renderRows([], "");
    setStatus("Security intake queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("security-intake-refresh");
  const filter = document.getElementById("security-intake-filter");
  const buttons = getActionButtons();

  refresh?.addEventListener("click", loadQueue);
  filter?.addEventListener("change", () => {
    renderRows(window.__securityIntakeRows || [], filter.value);
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
