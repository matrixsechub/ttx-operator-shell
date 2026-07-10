const state = {
  auditId: null,
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, stateName = "") {
  const node = document.getElementById("cf-audit-lite-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = stateName;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

function findingList(findings) {
  if (!Array.isArray(findings) || !findings.length) {
    return '<p class="system-copy">No prioritized findings returned.</p>';
  }
  return findings
    .map(
      (finding) => `
        <article class="telemetry-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ ${escapeHtml(finding.severity || "INFO")} :: ${escapeHtml(finding.type || "finding")} ]</p>
            <h3>${escapeHtml(finding.description || "Finding")}</h3>
            <p class="system-copy">${escapeHtml(finding.recommendation || "Review this control.")}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderEmpty() {
  const target = document.getElementById("cf-audit-lite-result");
  if (!target) return;
  state.auditId = null;
  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Awaiting domain</h3>
    <p class="system-copy">
      Submit a public domain to generate a locked teaser, then complete checkout to unlock the full JSON/PDF report.
    </p>
  `;
}

function renderLocked(result) {
  const target = document.getElementById("cf-audit-lite-result");
  if (!target) return;
  const teaser = result.teaser || {};
  const checkoutUrl = result.checkout_url || null;
  const auditId = result.job_id || result.id || state.auditId;
  if (auditId) state.auditId = auditId;

  target.innerHTML = `
    <p class="section-label mono">[ LOCKED_REPORT :: ${escapeHtml(auditId || "pending")} ]</p>
    <h3>Security posture teaser ready</h3>
    <p class="system-copy">Complete checkout to unlock the full deterministic remediation report and downloads.</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(teaser.score ?? "n/a"))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RISK ]</p>
          <p class="stat-num">${escapeHtml(String(teaser.risk_level || "LOCKED"))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ PAYMENT ]</p>
          <p class="stat-num">${escapeHtml(String(result.payment_status || "unpaid").toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="telemetry-grid">
      ${findingList(teaser.sample_findings)}
    </div>
    <div class="cta-row">
      ${
        checkoutUrl
          ? `<a class="button primary" href="${escapeHtml(checkoutUrl)}">[ UNLOCK FULL REPORT - $299 ]</a>`
          : '<span class="button secondary" aria-disabled="true">[ CHECKOUT NOT CONFIGURED ]</span>'
      }
      ${auditId ? `<button class="button secondary" type="button" data-audit-action="refresh">[ REFRESH STATUS ]</button>` : ""}
      ${auditId ? `<button class="button ghost" type="button" data-audit-action="view">[ VIEW RESULT ]</button>` : ""}
    </div>
  `;
}

function renderFullReport(report) {
  const target = document.getElementById("cf-audit-lite-result");
  if (!target) return;
  state.auditId = report.id;
  target.innerHTML = `
    <p class="section-label mono">[ FULL_REPORT :: ${escapeHtml(report.id)} ]</p>
    <h3>${escapeHtml(report.domain)} report unlocked</h3>
    <p class="system-copy">${escapeHtml(report.executive_summary)}</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(report.score))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RISK ]</p>
          <p class="stat-num">${escapeHtml(report.risk_level)}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ COMPLEXITY ]</p>
          <p class="stat-num">${escapeHtml(report.implementation_complexity)}</p>
        </div>
      </article>
    </div>
    <p class="section-label mono">[ FINDINGS ]</p>
    <div class="telemetry-grid">${findingList(report.findings)}</div>
    <p class="section-label mono">[ REMEDIATION_PLAN ]</p>
    <ul class="telemetry-list">
      ${(report.remediation_plan || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
    <p class="system-copy">${escapeHtml(report.urgency_narrative || "")}</p>
    <div class="cta-row">
      <a class="button primary" href="/api/audit-lite/result/${encodeURIComponent(report.id)}?format=json">[ DOWNLOAD JSON ]</a>
      <a class="button secondary" href="/api/audit-lite/result/${encodeURIComponent(report.id)}?format=pdf">[ DOWNLOAD PDF ]</a>
      <a class="button ghost" href="/enter?service=ai_security_audit&source=cf-sec-audit-lite&audit_id=${encodeURIComponent(report.id)}">[ REQUEST IMPLEMENTATION ]</a>
    </div>
  `;
}

async function loadResult(auditId) {
  const result = await requestJson(`/api/audit-lite/result/${encodeURIComponent(auditId)}`);
  if (result.locked) {
    renderLocked(result);
    setStatus("Report is still locked pending payment.", "pending");
    return;
  }
  renderFullReport(result.report);
  setStatus("Full report unlocked.", "success");
}

async function refreshStatus(auditId) {
  const status = await requestJson(`/api/audit-lite/status/${encodeURIComponent(auditId)}`);
  if (status.payment_status === "paid") {
    await loadResult(auditId);
    return;
  }
  setStatus(`Audit ${status.status}; payment ${status.payment_status}.`, "pending");
}

function collectStartPayload(form) {
  const formData = new FormData(form);
  return {
    domain: String(formData.get("domain") || "").trim(),
    email: String(formData.get("email") || "").trim(),
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("cf-audit-lite-form");
  const submitButton = document.getElementById("cf-audit-lite-submit");
  const target = document.getElementById("cf-audit-lite-result");
  const params = new URLSearchParams(window.location.search);
  const existingAuditId = params.get("audit_id");
  const checkoutState = params.get("checkout");

  if (existingAuditId) {
    state.auditId = existingAuditId;
    setStatus(checkoutState === "success" ? "Checking payment confirmation..." : "Loading audit status...");
    try {
      await refreshStatus(existingAuditId);
      await loadResult(existingAuditId);
    } catch (error) {
      setStatus(error.message || "Unable to load audit.", "error");
    }
  }

  target?.addEventListener("click", async (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("[data-audit-action]") : null;
    if (!(button instanceof HTMLElement) || !state.auditId) return;
    const action = button.dataset.auditAction;
    try {
      setStatus(action === "refresh" ? "Refreshing payment status..." : "Loading result...");
      if (action === "refresh") await refreshStatus(state.auditId);
      if (action === "view") await loadResult(state.auditId);
    } catch (error) {
      setStatus(error.message || "Audit request failed.", "error");
    }
  });

  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      renderEmpty();
      setStatus("Audit Lite ready.");
    }, 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = collectStartPayload(form);
    setStatus("Running Cloudflare security audit...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const result = await requestJson("/api/audit-lite/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      renderLocked(result);
      setStatus("Audit teaser ready.", "success");
      document.getElementById("cf-audit-lite-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(error.message || "Audit failed.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
