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
  const status = document.getElementById("service-intake-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.dataset.state = state;
}

function normalizeAuditStatus(status) {
  const normalized = String(status || "not_started").toLowerCase().replace(/\s+/g, "_");
  if (normalized === "running" || normalized === "in_progress") {
    return "running";
  }
  if (normalized === "complete" || normalized === "completed") {
    return "complete";
  }
  return "not_started";
}

function renderAuditBadge(status) {
  const normalized = normalizeAuditStatus(status);
  const labels = {
    not_started: "Not started",
    running: "Running",
    complete: "Complete",
  };
  return `<span class="status-chip audit-badge audit-badge--${escapeHtml(normalized)}">${escapeHtml(labels[normalized] || labels.not_started)}</span>`;
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

function renderSummaryPreview(summary) {
  const text = typeof summary === "string" ? summary.trim() : "";
  if (!text) {
    return '<span class="audit-summary-preview audit-summary-preview--empty">—</span>';
  }
  const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
  return `<span class="audit-summary-preview" title="${escapeHtml(text)}">${escapeHtml(preview)}</span>`;
}

function renderStartAuditButton(row) {
  const engagementId = row.engagement_id;
  if (!engagementId) {
    return '<span class="audit-action-muted">n/a</span>';
  }

  const auditStatus = normalizeAuditStatus(row.security_audit_status);
  const disabled = auditStatus === "running" ? "disabled" : "";
  const label = auditStatus === "running" ? "[ RUNNING ]" : "[ START AUDIT ]";

  return `<button class="button secondary audit-start-button" type="button" data-engagement-id="${escapeHtml(engagementId)}" ${disabled}>${label}</button>`;
}

function renderRows(rows, filterValue = "") {
  const tbody = document.getElementById("service-intake-rows");
  if (!tbody) {
    return;
  }

  const filtered = filterValue ? rows.filter((row) => row.recommended_service === filterValue) : rows;
  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.selector_id || "n/a")}</td>
              <td>${escapeHtml(row.engagement_id || "n/a")}</td>
              <td>${escapeHtml(row.recommended_service || "n/a")}</td>
              <td>${escapeHtml(row.secondary_service || "n/a")}</td>
              <td>${escapeHtml(String(row.urgency_score ?? 0))}</td>
              <td>${escapeHtml(String(row.revenue_potential || "medium"))}</td>
              <td>${renderTacticalValue(row.priority, "medium")}</td>
              <td>${escapeHtml(String(row.status || "unknown"))}</td>
              <td>${renderAuditBadge(row.security_audit_status)}</td>
              <td>${renderSummaryPreview(row.security_audit_summary)}</td>
              <td>${renderStartAuditButton(row)}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="12">No service-selector records matched the current filter.</td>
        </tr>
      `;

  tbody.querySelectorAll(".audit-start-button").forEach((button) => {
    button.addEventListener("click", () => {
      const engagementId = button.getAttribute("data-engagement-id");
      if (engagementId) {
        startSecurityAudit(engagementId, button);
      }
    });
  });
}

function syncFilter(rows) {
  const select = document.getElementById("service-intake-filter");
  if (!(select instanceof HTMLSelectElement)) {
    return "";
  }

  const uniqueServices = [...new Set(rows.map((row) => row.recommended_service).filter(Boolean))];
  const current = select.value;
  select.innerHTML = `<option value="">all services</option>${uniqueServices
    .map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    .join("")}`;

  const searchService = new URLSearchParams(window.location.search).get("service");
  select.value = current || searchService || "";
  return select.value;
}

async function startSecurityAudit(engagementId, button) {
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
    button.textContent = "[ STARTING... ]";
  }
  setStatus(`Starting security audit for ${engagementId}...`);

  try {
    const response = await fetch("/api/cloudflare/security-audit/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MSH-Operator-Surface": "service-intake",
      },
      body: JSON.stringify({ engagement_id: engagementId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Start request failed with status ${response.status}`);
    }

    setStatus(`Security audit started for ${engagementId}.`, "success");
    await loadQueue();
  } catch (error) {
    console.error("MSHOPS security audit start failed", error);
    setStatus(error.message || "Security audit start failed.", "error");
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
      button.textContent = "[ START AUDIT ]";
    }
  }
}

async function loadQueue() {
  setStatus("Loading service intake queue...");

  try {
    const response = await fetch("/api/operator/service-intake");
    if (!response.ok) {
      throw new Error(`Queue request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const filterValue = syncFilter(rows);
    renderRows(rows, filterValue);
    setStatus(`Queue ready :: ${rows.length} records loaded.`, "success");
    window.__serviceIntakeRows = rows;
  } catch (error) {
    console.error("MSHOPS service intake queue failed", error);
    renderRows([], "");
    setStatus("Service intake queue is unavailable.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("service-intake-refresh");
  const filter = document.getElementById("service-intake-filter");

  refresh?.addEventListener("click", loadQueue);
  filter?.addEventListener("change", () => {
    renderRows(window.__serviceIntakeRows || [], filter.value);
  });

  loadQueue();
});
