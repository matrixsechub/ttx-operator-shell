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
  const node = document.getElementById("audit-lite-queue-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

function renderRows(rows, filterValue = "") {
  const tbody = document.getElementById("audit-lite-rows");
  if (!tbody) {
    return;
  }

  const filtered = filterValue ? rows.filter((row) => row.risk_tier === filterValue) : rows;
  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.audit_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(String(row.risk_score ?? 0))}</td>
              <td>${escapeHtml(String(row.risk_tier || "low"))}</td>
              <td>${escapeHtml(String(row.priority || "low"))}</td>
              <td>${escapeHtml(String(row.top_risk_category || "n/a"))}</td>
              <td>${escapeHtml(String(row.recommended_service || "ai_security_audit"))}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="9">No audit-lite records matched the current filter.</td>
        </tr>
      `;
}

async function loadQueue() {
  setStatus("Loading audit-lite queue...");

  try {
    const response = await fetch("/api/operator/audit-lite");
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    window.__auditLiteRows = rows;
    const filter = document.getElementById("audit-lite-filter");
    renderRows(rows, filter instanceof HTMLSelectElement ? filter.value : "");
    setStatus(`Audit-lite queue ready :: ${rows.length} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS audit-lite queue failed", error);
    renderRows([], "");
    setStatus("Audit-lite queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("audit-lite-refresh");
  const filter = document.getElementById("audit-lite-filter");

  refresh?.addEventListener("click", loadQueue);
  filter?.addEventListener("change", () => {
    renderRows(window.__auditLiteRows || [], filter.value);
  });

  loadQueue();
});
