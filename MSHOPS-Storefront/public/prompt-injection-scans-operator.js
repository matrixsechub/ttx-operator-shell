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
  const node = document.getElementById("prompt-injection-queue-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function renderRows(rows, filterValue = "") {
  const tbody = document.getElementById("prompt-injection-rows");
  if (!tbody) return;

  const filtered = filterValue ? rows.filter((row) => row.risk_tier === filterValue) : rows;
  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.scan_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(String(row.injection_score ?? 0))}</td>
              <td>${escapeHtml(String(row.risk_tier || "low"))}</td>
              <td>${escapeHtml(String(row.priority || "low"))}</td>
              <td>${escapeHtml(String(row.top_risk_category || "n/a"))}</td>
              <td>${escapeHtml(String(row.recommended_service || "prompt_injection_review"))}</td>
              <td>${escapeHtml(String(row.secondary_service || "ai_security_audit"))}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="10">No prompt injection records matched the current filter.</td>
        </tr>
      `;
}

async function loadQueue() {
  setStatus("Loading prompt injection queue...");

  try {
    const response = await fetch("/api/operator/prompt-injection-scans");
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    window.__promptInjectionRows = rows;
    const filter = document.getElementById("prompt-injection-filter");
    renderRows(rows, filter instanceof HTMLSelectElement ? filter.value : "");
    setStatus(`Prompt injection queue ready :: ${rows.length} records loaded.`, "success");
  } catch (error) {
    console.error("MSHOPS prompt injection queue failed", error);
    renderRows([], "");
    setStatus("Prompt injection queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("prompt-injection-refresh");
  const filter = document.getElementById("prompt-injection-filter");

  refresh?.addEventListener("click", loadQueue);
  filter?.addEventListener("change", () => {
    renderRows(window.__promptInjectionRows || [], filter.value);
  });

  loadQueue();
});
