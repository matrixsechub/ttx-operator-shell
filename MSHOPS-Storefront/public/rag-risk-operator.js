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
  const node = document.getElementById("rag-risk-queue-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function renderRows(rows) {
  const tbody = document.getElementById("rag-risk-rows");
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.rag_risk_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(String(row.rag_risk_score ?? 0))}</td>
              <td>${escapeHtml(String(row.rag_risk_tier || "medium"))}</td>
              <td>${escapeHtml(String(row.retrieval_exposure_level || "medium"))}</td>
              <td>${escapeHtml(String(row.access_control_level || "weak"))}</td>
              <td>${escapeHtml(String(row.governance_maturity || "weak"))}</td>
              <td>${escapeHtml(String(row.priority || "low"))}</td>
              <td>${escapeHtml(String(row.recommended_service || "rag_governance_review"))}</td>
              <td>${escapeHtml(String(row.secondary_service || "n/a"))}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="12">No RAG risk records are loaded.</td></tr>`;
}

async function loadQueue() {
  setStatus("Loading RAG risk queue...");
  try {
    const response = await fetch("/api/operator/rag-risk");
    if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    renderRows(rows);
    setStatus(`RAG risk queue ready :: ${rows.length} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS RAG risk queue failed", error);
    renderRows([]);
    setStatus("RAG risk queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("rag-risk-refresh")?.addEventListener("click", loadQueue);
  loadQueue();
});
