function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function deriveRiskTier(score) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function derivePriority(tier) {
  if (tier === "low") return "low";
  if (tier === "medium") return "medium";
  return "high";
}

function setStatus(message, state = "") {
  const node = document.getElementById("prompt-injection-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function collectAnswers(form) {
  const formData = new FormData(form);
  const allowPromptText = formData.get("allow_prompt_text") === "true";
  return {
    ai_system_type: String(formData.get("ai_system_type") || "not_sure"),
    deployment_context: String(formData.get("deployment_context") || "not_sure"),
    prompt_text: allowPromptText ? String(formData.get("prompt_text") || "").trim().slice(0, 4000) : "",
    allow_prompt_text: allowPromptText,
    prompt_sensitivity: String(formData.get("prompt_sensitivity") || "not_sure"),
    tool_permissions: formData.getAll("tool_permissions").map((value) => String(value)),
    data_access: formData.getAll("data_access").map((value) => String(value)),
    existing_controls: formData.getAll("existing_controls").map((value) => String(value)),
    main_concern: String(formData.get("main_concern") || "not_sure"),
    source_route: "/apps/prompt-injection-scanner",
  };
}

function computeFallbackScore(answers) {
  let score = 20;
  const promptText = String(answers.prompt_text || "").toLowerCase();

  if (answers.deployment_context === "public_website") score += 20;
  if (answers.deployment_context === "customer_portal") score += 15;
  if (answers.deployment_context === "connected_to_business_tools") score += 15;
  if (answers.ai_system_type === "ai_agent") score += 15;
  if (answers.ai_system_type === "rag_assistant") score += 10;
  if (answers.ai_system_type === "customer_chatbot") score += 10;
  if (answers.ai_system_type === "automation_bot") score += 10;
  if (answers.ai_system_type === "multimodal_assistant") score += 10;
  if (answers.prompt_sensitivity === "includes_tool_instructions") score += 15;
  if (answers.prompt_sensitivity === "includes_security_or_access_rules") score += 15;
  if (answers.prompt_sensitivity === "includes_customer_data_rules") score += 10;
  if (answers.prompt_sensitivity === "includes_internal_processes") score += 10;
  if (answers.tool_permissions.includes("admin_actions")) score += 20;
  if (answers.tool_permissions.includes("payments")) score += 20;
  if (answers.tool_permissions.includes("database")) score += 15;
  if (answers.tool_permissions.includes("file_storage")) score += 15;
  if (answers.tool_permissions.includes("email")) score += 15;
  if (answers.tool_permissions.includes("code_execution")) score += 15;
  if (answers.tool_permissions.includes("workflow_automation")) score += 15;
  if (answers.data_access.includes("credentials_or_secrets")) score += 20;
  if (answers.data_access.includes("regulated_data")) score += 20;
  if (answers.data_access.includes("customer_data")) score += 15;
  if (answers.data_access.includes("financial_data")) score += 15;
  if (answers.data_access.includes("health_data")) score += 15;
  if (answers.data_access.includes("legal_data")) score += 15;
  if (answers.existing_controls.includes("none")) score += 15;
  if (answers.existing_controls.includes("not_sure")) score += 10;
  if (answers.existing_controls.includes("input_filtering")) score -= 10;
  if (answers.existing_controls.includes("output_filtering")) score -= 10;
  if (answers.existing_controls.includes("retrieval_boundaries")) score -= 10;
  if (answers.existing_controls.includes("tool_permission_limits")) score -= 10;
  if (answers.existing_controls.includes("human_approval")) score -= 10;
  if (answers.existing_controls.includes("logging_monitoring")) score -= 10;
  if (answers.existing_controls.includes("red_team_testing")) score -= 10;
  if (answers.existing_controls.includes("prompt_versioning")) score -= 5;
  if (/(api[_ -]?key|secret|password|token|credential|private[_ -]?key|bearer\s+[a-z0-9._-]+)/i.test(promptText)) score += 15;
  if (/(ignore previous instructions|developer mode|bypass|override|do anything now)/i.test(promptText)) score += 10;
  if (/(you may take any action|no approval needed|autonomously execute)/i.test(promptText)) score += 10;
  if (/(customer data|private data|internal data|sensitive data|confidential)/i.test(promptText) && !/(refuse|do not disclose|never reveal|must not share|only summarize)/i.test(promptText)) score += 10;
  if (/(refuse|do not comply|never reveal secrets|must not disclose|decline requests)/i.test(promptText)) score -= 5;
  if (/(human approval required|requires approval|await approval)/i.test(promptText)) score -= 5;
  if (/(data minimization|minimum necessary|no secrets in prompts|never store secrets)/i.test(promptText)) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function buildFallbackRisks(answers, riskTier) {
  const severity = riskTier === "critical" ? "critical" : riskTier === "high" ? "high" : riskTier === "medium" ? "medium" : "low";
  const promptText = String(answers.prompt_text || "").toLowerCase();
  const risks = [];
  const pushRisk = (title, category, description, recommended_control) => {
    if (risks.some((risk) => risk.category === category)) return;
    risks.push({ title, severity, category, description, recommended_control });
  };

  if (answers.deployment_context === "public_website" || answers.ai_system_type === "customer_chatbot") {
    pushRisk(
      "Public chatbot prompt injection exposure",
      "direct_prompt_injection",
      "The assistant appears to be exposed to untrusted public input while handling business context.",
      "Add strict instruction hierarchy, input filtering, refusal boundaries, and prompt injection testing before production use.",
    );
  }
  if (answers.tool_permissions.some((entry) => ["email", "database", "file_storage", "payments", "code_execution", "workflow_automation", "admin_actions"].includes(entry))) {
    pushRisk(
      "Tool permission abuse risk",
      "tool_permission_abuse",
      "The assistant appears to have connected tools that may be too broadly available during adversarial interactions.",
      "Add tool permission boundaries, narrow action scope, and human approval for external actions.",
    );
  }
  if (
    answers.data_access.some((entry) => ["customer_data", "financial_data", "health_data", "legal_data", "credentials_or_secrets", "regulated_data"].includes(entry)) ||
    /(customer data|private data|internal data|sensitive data|confidential)/i.test(promptText)
  ) {
    pushRisk(
      "Sensitive data exposure risk",
      "sensitive_data_exposure",
      "The deployment appears to touch sensitive information that could leak through prompts, outputs, or connected tools.",
      "Remove secrets from prompts, add refusal rules for sensitive data, and enforce data minimization across prompts and outputs.",
    );
  }
  if (risks.length < 3 && (answers.ai_system_type === "rag_assistant" || answers.data_access.includes("internal_docs"))) {
    pushRisk(
      "RAG context poisoning risk",
      "rag_context_poisoning",
      "Retrieved content may be able to influence the assistant if retrieval scope and instruction separation are weak.",
      "Add retrieval boundaries, source validation, and prompt injection testing focused on retrieval flows.",
    );
  }
  while (risks.length < 3) {
    pushRisk(
      "Missing approval or output guardrails",
      risks.length === 0 ? "missing_human_approval" : "weak_output_filtering",
      "The current answers suggest governance and response controls may be incomplete for higher-risk prompt and tool paths.",
      "Add human approval, output filtering, logging, and prompt version control for sensitive or high-impact workflows.",
    );
  }
  return risks.slice(0, 3);
}

function renderResult(result) {
  const target = document.getElementById("prompt-injection-result");
  if (!target) return;
  const recommendedControls = Array.isArray(result.recommended_controls)
    ? result.recommended_controls
    : (result.top_risks || []).map((risk) => risk.recommended_control);

  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Prompt injection scan complete</h3>
    <p class="system-copy">The scanner returned a defensive-only exposure estimate and safe next steps.</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ INJECTION SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(result.injection_score))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RISK TIER ]</p>
          <p class="stat-num">${escapeHtml(String(result.risk_tier).toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ PRIORITY ]</p>
          <p class="stat-num">${escapeHtml(String(result.priority).toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="telemetry-grid">
      ${(result.top_risks || [])
        .slice(0, 3)
        .map(
          (risk) => `
            <article class="telemetry-card bracket">
              <div class="bracket-inner">
                <p class="section-label mono">[ ${escapeHtml(String(risk.severity).toUpperCase())} ]</p>
                <h3>${escapeHtml(risk.title)}</h3>
                <p class="system-copy">${escapeHtml(risk.description)}</p>
                <p class="section-copy mono">CATEGORY :: ${escapeHtml(risk.category)}</p>
                <p class="section-copy mono">CONTROL :: ${escapeHtml(risk.recommended_control)}</p>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ RECOMMENDED_FIXES ]</p>
        <div class="telemetry-list">
          ${recommendedControls.slice(0, 3).map((control) => `<span>${escapeHtml(control)}</span>`).join("")}
        </div>
        <p class="section-copy mono">NEXT STEP :: ${escapeHtml(result.recommended_next_step || "Request a full Prompt Injection Review.")}</p>
        <div class="cta-row">
          <a class="button primary" href="${escapeHtml(result.next_route)}">[ REQUEST FULL PROMPT INJECTION REVIEW ]</a>
          <a class="button secondary" href="/apps/security-remediation-planner?source_type=prompt_injection_scan&scan_id=${escapeHtml(result.scan_id || "")}&risk_description=${encodeURIComponent("Prompt injection scan findings require remediation planning.")}">[ GENERATE REMEDIATION PLAN ]</a>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState() {
  const target = document.getElementById("prompt-injection-result");
  if (!target) return;
  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Prompt injection findings will appear here.</h3>
    <p class="system-copy">
      Submit the questionnaire to receive an exposure score, risk tier, top 3 risks, recommended fixes, and a clean
      intake handoff.
    </p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prompt-injection-form");
  const submitButton = document.getElementById("prompt-injection-submit");
  const allowPromptText = document.getElementById("allow-prompt-text");
  const promptText = document.getElementById("prompt-text");

  if (!(form instanceof HTMLFormElement)) return;

  allowPromptText?.addEventListener("change", () => {
    if (!(promptText instanceof HTMLTextAreaElement) || !(allowPromptText instanceof HTMLInputElement)) return;
    promptText.disabled = !allowPromptText.checked;
    if (!allowPromptText.checked) {
      promptText.value = "";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.tool_permissions.length) answers.tool_permissions = ["not_sure"];
    if (!answers.data_access.length) answers.data_access = ["not_sure"];
    if (!answers.existing_controls.length) answers.existing_controls = ["not_sure"];

    setStatus("Running prompt injection scan...");
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;

    try {
      const response = await fetch("/api/prompt-injection-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error(`Prompt injection scan failed with status ${response.status}`);
      }

      const result = await response.json();
      renderResult(result);
      setStatus("Prompt injection scan complete.", "success");
    } catch (error) {
      console.error("MSHOPS prompt injection scanner fallback", error);
      const injectionScore = computeFallbackScore(answers);
      const riskTier = deriveRiskTier(injectionScore);
      const priority = derivePriority(riskTier);
      const scanId = `pinj-local-${Date.now().toString(36)}`;
      const params = new URLSearchParams({
        service: "prompt_injection_review",
        priority,
        source: "prompt-injection-scanner",
        scan_id: scanId,
      });
      renderResult({
        status: "prompt-injection-scan-complete",
        scan_id: scanId,
        injection_score: injectionScore,
        risk_tier: riskTier,
        priority,
        top_risks: buildFallbackRisks(answers, riskTier),
        recommended_controls: buildFallbackRisks(answers, riskTier).map((risk) => risk.recommended_control),
        recommended_next_step: "Request a full Prompt Injection Review to validate prompts, approvals, and tool boundaries.",
        next_route: `/enter?${params.toString()}`,
      });
      setStatus("Prompt injection scan complete.", "success");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      if (promptText instanceof HTMLTextAreaElement) {
        promptText.disabled = true;
      }
      if (allowPromptText instanceof HTMLInputElement) {
        allowPromptText.checked = false;
      }
      renderEmptyState();
      setStatus("Scanner ready.");
    }, 0);
  });
});
