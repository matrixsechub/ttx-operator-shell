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
  const node = document.getElementById("automation-roi-queue-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function renderRows(rows) {
  const tbody = document.getElementById("automation-roi-rows");
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.automation_roi_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(String(row.roi_score ?? 0))}</td>
              <td>${escapeHtml(String(row.roi_tier || "moderate"))}</td>
              <td>$${escapeHtml(String(row.estimated_monthly_savings ?? 0))}</td>
              <td>$${escapeHtml(String(row.estimated_annual_savings ?? 0))}</td>
              <td>${escapeHtml(String(row.hours_saved_per_month ?? 0))}</td>
              <td>${escapeHtml(String(row.automation_complexity || "moderate"))}</td>
              <td>${escapeHtml(String(row.priority || "low"))}</td>
              <td>${escapeHtml(String(row.recommended_service || "workflow_optimization_review"))}</td>
              <td>${escapeHtml(String(row.secondary_service || "n/a"))}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="13">No automation ROI records are loaded.</td></tr>`;
}

async function loadQueue() {
  setStatus("Loading automation ROI queue...");
  try {
    const response = await fetch("/api/operator/automation-roi");
    if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderRows(rows);
    setStatus(`Automation ROI queue ready :: ${rows.length} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS automation ROI queue failed", error);
    renderRows([]);
    setStatus("Automation ROI queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("automation-roi-refresh")?.addEventListener("click", loadQueue);
  loadQueue();
});
