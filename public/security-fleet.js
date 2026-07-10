function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function setStatus(message, state = "") {
  const node = document.getElementById("security-fleet-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function collectInput(form) {
  const formData = new FormData(form);
  return {
    event_name: String(formData.get("event_name") || "").trim(),
    security_source: String(formData.get("security_source") || "unknown"),
    event_type: String(formData.get("event_type") || "unknown"),
    asset_type: String(formData.get("asset_type") || "unknown"),
    asset_name: String(formData.get("asset_name") || "").trim(),
    event_description: String(formData.get("event_description") || "").trim(),
    suspicious_text_or_payload: String(formData.get("suspicious_text_or_payload") || "").trim(),
    observed_behavior: String(formData.get("observed_behavior") || "").trim(),
    business_impact: String(formData.get("business_impact") || "low"),
    asset_criticality: String(formData.get("asset_criticality") || "low"),
    exposure_level: String(formData.get("exposure_level") || "internal"),
    requested_outcome: String(formData.get("requested_outcome") || "analyze_only"),
    source_reference_id: String(formData.get("source_reference_id") || "").trim() || undefined,
    source_route: "/apps/security-fleet",
  };
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) return '<p class="system-copy">None listed.</p>';
  return `<ul class="telemetry-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderEmptyState() {
  const target = document.getElementById("security-fleet-result");
  if (!target) return;
  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ RESULT_SCREEN ]</p>
      <h3>Analysis results will appear here.</h3>
      <p class="system-copy">Submit the form to receive threat classification, risk score, and incident packet.</p>
    </div>
  `;
}

function renderResult(result) {
  const target = document.getElementById("security-fleet-result");
  if (!target) return;
  const packet = result.incident_packet && typeof result.incident_packet === "object" ? result.incident_packet : {};

  target.innerHTML = `
    <div class="bracket-inner">
      <p class="section-label mono">[ SECURITY_ANALYSIS :: ${escapeHtml(result.security_event_id || "n/a")} ]</p>
      <h3>${escapeHtml(result.event_name || "Security Event")}</h3>
      <p class="system-copy"><em>This tool generates a defensive security analysis and operator review packet only. It does not execute offensive activity, deploy exploits, access third-party systems, store credentials, or perform autonomous destructive actions.</em></p>
      <p class="system-copy"><strong>Source:</strong> ${escapeHtml(result.security_source || "n/a")} | <strong>Type:</strong> ${escapeHtml(result.event_type || "n/a")}</p>
      <p class="system-copy"><strong>Asset:</strong> ${escapeHtml(result.asset_type || "n/a")} - ${escapeHtml(result.asset_name || "n/a")}</p>
      <p class="system-copy"><strong>Severity:</strong> ${escapeHtml(result.severity || "n/a")} | <strong>Risk score:</strong> ${escapeHtml(String(result.risk_score ?? 0))} | <strong>Confidence:</strong> ${escapeHtml(String(result.confidence ?? 0))}%</p>
      <p class="system-copy"><strong>Recommended action:</strong> ${escapeHtml(result.recommended_action || "n/a")}</p>
      <p class="system-copy"><strong>Containment mode:</strong> ${escapeHtml(result.containment_mode || "n/a")}</p>
      <p class="system-copy"><strong>Operator required:</strong> ${escapeHtml(String(result.operator_required))} | <strong>Priority:</strong> ${escapeHtml(result.priority || "n/a")}</p>
      <p class="section-label mono">[ REASON_CODES ]</p>
      ${renderList(result.reason_codes)}
      <p class="section-label mono">[ DETECTED_SIGNALS ]</p>
      ${renderList(result.detected_signals)}
      <p class="section-label mono">[ INCIDENT_SUMMARY ]</p>
      <p class="system-copy">${escapeHtml(packet.summary || "No summary.")}</p>
      <p class="section-label mono">[ RECOMMENDED_ACTIONS ]</p>
      ${renderList(packet.recommended_actions)}
      <p class="system-copy"><strong>Audit hash preview:</strong> <code>${escapeHtml(result.audit_hash || "n/a")}</code></p>
      <div class="cta-row">
        <a class="button primary" href="${escapeHtml(result.next_route)}">[ CONTINUE TO SECURITY INTAKE ]</a>
      </div>
    </div>
  `;
}

function initStepper() {
  const steps = Array.from(document.querySelectorAll("[data-fleet-step]"));
  const prevButton = document.getElementById("fleet-prev");
  const nextButton = document.getElementById("fleet-next");
  const submitButton = document.getElementById("fleet-submit");
  const stepLabel = document.getElementById("fleet-step-label");
  let currentStep = 0;

  function renderStep() {
    steps.forEach((step, index) => {
      step.classList.toggle("is-active", index === currentStep);
      step.hidden = index !== currentStep;
    });
    if (stepLabel) stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    if (prevButton instanceof HTMLButtonElement) prevButton.disabled = currentStep === 0;
    if (nextButton instanceof HTMLButtonElement) nextButton.hidden = currentStep === steps.length - 1;
    if (submitButton instanceof HTMLButtonElement) submitButton.hidden = currentStep !== steps.length - 1;
  }

  prevButton?.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderStep();
    }
  });

  nextButton?.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderStep();
    }
  });

  renderStep();
  return () => {
    currentStep = 0;
    renderStep();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("security-fleet-form");
  const submitButton = document.getElementById("fleet-submit");
  const resetStepper = initStepper();
  renderEmptyState();

  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("reset", () => {
    resetStepper();
    renderEmptyState();
    setStatus("Fleet ready.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = collectInput(form);
    setStatus("Analyzing security event...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/security-event-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Analysis failed with status ${response.status}`);
      renderResult(result);
      setStatus("Security event analysis complete.", "success");
      document.getElementById("security-fleet-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("MSHOPS security fleet failed", error);
      setStatus(error.message || "Security event analysis failed.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
});
