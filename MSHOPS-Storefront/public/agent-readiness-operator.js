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
  const node = document.getElementById("agent-readiness-queue-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function renderRows(rows) {
  const tbody = document.getElementById("agent-readiness-rows");
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.agent_check_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(String(row.readiness_score ?? 0))}</td>
              <td>${escapeHtml(String(row.readiness_tier || "needs_design"))}</td>
              <td>${escapeHtml(String(row.build_complexity || "moderate"))}</td>
              <td>${escapeHtml(String(row.safety_level || "medium"))}</td>
              <td>${escapeHtml(String(row.priority || "low"))}</td>
              <td>${escapeHtml(String(row.recommended_service || "ai_agent_blueprint_session"))}</td>
              <td>${escapeHtml(String(row.secondary_service || "n/a"))}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="11">No agent readiness records are loaded.</td></tr>`;
}

async function loadQueue() {
  setStatus("Loading agent readiness queue...");
  try {
    const response = await fetch("/api/operator/agent-readiness");
    if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderRows(rows);
    setStatus(`Agent readiness queue ready :: ${rows.length} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS agent readiness queue failed", error);
    renderRows([]);
    setStatus("Agent readiness queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("agent-readiness-refresh")?.addEventListener("click", loadQueue);
  loadQueue();
});
