function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

const riskMetadata = {
  data_leakage: {
    title: "Data leakage exposure",
    description: "Your AI tooling appears to touch business or sensitive data that could leak through prompts, outputs, or connector misuse.",
    recommended_control: "Add data classification boundaries, approved usage rules, and human review for sensitive workflows.",
  },
  prompt_injection: {
    title: "Prompt injection risk",
    description: "Your AI environment has exposure paths where hostile content may steer models or connected workflows in unsafe ways.",
    recommended_control: "Introduce prompt-security testing, input boundary controls, and safer retrieval and tool invocation patterns.",
  },
  ai_agent_action_risk: {
    title: "AI agent action risk",
    description: "Your AI setup may be able to trigger business actions with insufficient guardrails or human checkpoints.",
    recommended_control: "Add approval gates, scoped permissions, action logging, and escalation paths for autonomous behavior.",
  },
  rag_data_exposure: {
    title: "RAG data exposure",
    description: "Knowledge-base AI and retrieval flows can expose internal documents or retrieval results beyond intended audiences.",
    recommended_control: "Review retrieval permissions, document segmentation, and prompt injection boundaries for RAG systems.",
  },
  workflow_automation_risk: {
    title: "Workflow automation risk",
    description: "Connected automation tools may create downstream failures, over-sharing, or unintended execution chains.",
    recommended_control: "Add workflow runbooks, failure controls, scoped credentials, and monitored human checkpoints.",
  },
  copilot_governance_gap: {
    title: "Copilot governance gap",
    description: "Microsoft Copilot and enterprise AI use may be running ahead of formal governance, policy, or review controls.",
    recommended_control: "Define approved-tool policy, access boundaries, logging expectations, and vendor review for enterprise AI.",
  },
  multimodal_privacy_risk: {
    title: "Multimodal privacy risk",
    description: "Image, document, audio, or video AI introduces media handling and privacy exposure that often lacks explicit controls.",
    recommended_control: "Document retention rules, moderation controls, and privacy review for multimodal inputs and outputs.",
  },
  local_ai_governance_gap: {
    title: "Local AI governance gap",
    description: "Local or self-hosted models can bypass central governance even when they reduce external exposure.",
    recommended_control: "Establish local model policy, logging, approved deployment patterns, and operator review expectations.",
  },
  missing_policy_controls: {
    title: "Missing policy controls",
    description: "The current AI environment appears to lack enough written policy, review, or monitoring controls.",
    recommended_control: "Start with written AI policy, access controls, prompt testing, and monitoring for high-risk workflows.",
  },
  compliance_exposure: {
    title: "Compliance exposure",
    description: "Your AI usage may intersect with regulated or sensitive data obligations that require more formal controls.",
    recommended_control: "Map compliance obligations to AI usage, vendor review, logging, and human approval requirements.",
  },
};

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

function computeLocalScore(answers) {
  let score = 20;

  if (answers.ai_exposure === "customer_facing") score += 20;
  if (answers.ai_exposure === "public_website") score += 15;
  if (answers.ai_exposure === "autonomous_actions") score += 20;
  if (answers.ai_exposure === "connected_to_business_tools") score += 10;
  if (answers.data_used_with_ai.includes("regulated_data")) score += 20;
  if (answers.data_used_with_ai.includes("credentials_or_secrets")) score += 20;
  if (answers.data_used_with_ai.includes("customer_data")) score += 15;
  if (answers.data_used_with_ai.includes("financial_data")) score += 15;
  if (answers.data_used_with_ai.includes("health_data")) score += 15;
  if (answers.data_used_with_ai.includes("legal_data")) score += 15;
  if (answers.ai_tools_used.includes("customer_chatbot")) score += 10;
  if (answers.ai_tools_used.includes("ai_agent")) score += 10;
  if (answers.ai_tools_used.includes("rag_knowledge_base")) score += 10;
  if (answers.ai_tools_used.includes("n8n_make_zapier")) score += 10;
  if (answers.ai_tools_used.includes("microsoft_copilot")) score += 10;
  if (answers.ai_tools_used.includes("multimodal_ai")) score += 10;
  if (answers.governance_controls.includes("none")) score += 15;
  if (answers.governance_controls.includes("not_sure")) score += 10;
  if (answers.governance_controls.includes("written_ai_policy")) score -= 10;
  if (answers.governance_controls.includes("access_controls")) score -= 10;
  if (answers.governance_controls.includes("logging_monitoring")) score -= 10;
  if (answers.governance_controls.includes("human_review")) score -= 10;
  if (answers.governance_controls.includes("vendor_review")) score -= 10;
  if (answers.governance_controls.includes("prompt_security_testing")) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function buildFallbackRisks(answers, riskTier) {
  const risks = [];
  const severity = riskTier === "critical" ? "critical" : riskTier === "high" ? "high" : "medium";

  const addRisk = (category) => {
    if (risks.some((risk) => risk.category === category)) {
      return;
    }
    const meta = riskMetadata[category];
    if (!meta) {
      return;
    }
    risks.push({
      title: meta.title,
      severity,
      category,
      description: meta.description,
      recommended_control: meta.recommended_control,
    });
  };

  if (answers.data_used_with_ai.includes("customer_data") || answers.data_used_with_ai.includes("credentials_or_secrets")) addRisk("data_leakage");
  if (answers.ai_exposure === "public_website" || answers.ai_exposure === "customer_facing") addRisk("prompt_injection");
  if (answers.ai_tools_used.includes("ai_agent") || answers.ai_exposure === "autonomous_actions") addRisk("ai_agent_action_risk");
  if (answers.ai_tools_used.includes("rag_knowledge_base")) addRisk("rag_data_exposure");
  if (answers.ai_tools_used.includes("n8n_make_zapier")) addRisk("workflow_automation_risk");
  if (answers.ai_tools_used.includes("microsoft_copilot")) addRisk("copilot_governance_gap");
  if (answers.ai_tools_used.includes("multimodal_ai")) addRisk("multimodal_privacy_risk");
  if (answers.ai_tools_used.includes("local_llm_ollama")) addRisk("local_ai_governance_gap");
  if (answers.governance_controls.includes("none") || answers.governance_controls.includes("not_sure")) addRisk("missing_policy_controls");
  if (answers.company_type === "regulated_business" || answers.data_used_with_ai.includes("regulated_data")) addRisk("compliance_exposure");

  if (!risks.length) addRisk("missing_policy_controls");
  while (risks.length < 3) {
    addRisk("data_leakage");
    addRisk("prompt_injection");
    addRisk("compliance_exposure");
    if (risks.length >= 3) break;
  }

  return risks.slice(0, 3);
}

function collectAnswers(form) {
  const formData = new FormData(form);
  return {
    company_type: String(formData.get("company_type") || "small_business"),
    ai_tools_used: formData.getAll("ai_tools_used").map((value) => String(value)),
    data_used_with_ai: formData.getAll("data_used_with_ai").map((value) => String(value)),
    ai_exposure: String(formData.get("ai_exposure") || "not_sure"),
    governance_controls: formData.getAll("governance_controls").map((value) => String(value)),
    main_concern: String(formData.get("main_concern") || "not_sure"),
    source_route: "/apps/ai-security-audit",
  };
}

function setStatus(message, state = "") {
  const node = document.getElementById("audit-lite-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function renderResult(result) {
  const target = document.getElementById("audit-lite-result");
  if (!target) {
    return;
  }

  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Risk check complete</h3>
    <p class="system-copy">Basic AI risk findings are ready. This lightweight diagnostic is designed to route qualified leads into a full audit intake.</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ RISK SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(result.risk_score))}</p>
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
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ LIFECYCLE ]</p>
          <p class="stat-num">${escapeHtml(String(result.lifecycle?.lifecycle_label || "Validated").toUpperCase())}</p>
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
                <p class="section-copy mono">CONTROL :: ${escapeHtml(risk.recommended_control)}</p>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="telemetry-card bracket audit-recommendation-card">
      <div class="bracket-inner">
        <p class="section-label mono">[ RECOMMENDED NEXT STEP ]</p>
        <h3>Request Full AI Security Audit</h3>
        <p class="system-copy">Route the diagnostic into a full AI Security Audit consultation with preserved risk context and intake priority.</p>
        <div class="cta-row">
          <a class="button primary" href="${escapeHtml(result.next_route)}">[ REQUEST FULL AI SECURITY AUDIT ]</a>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  const target = document.getElementById("audit-lite-result");
  if (!target) {
    return;
  }
  target.innerHTML = `
    <p class="section-label mono">[ RESULT_SCREEN ]</p>
    <h3>Free AI Security Risk Check</h3>
    <p class="system-copy">
      Submit the questionnaire to receive a risk score, tier, top 3 risks, and the recommended next step.
    </p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("audit-lite-form");
  const submitButton = document.getElementById("audit-lite-submit");

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    if (!answers.ai_tools_used.length) answers.ai_tools_used = ["none_yet"];
    if (!answers.data_used_with_ai.length) answers.data_used_with_ai = ["not_sure"];
    if (!answers.governance_controls.length) answers.governance_controls = ["not_sure"];

    setStatus("Running free AI risk check...");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch("/api/audit-lite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error(`Audit lite request failed with status ${response.status}`);
      }

      const result = await response.json();
      renderResult(result);
      setStatus("Risk check complete.", "success");
    } catch (error) {
      console.error("MSHOPS audit-lite fallback", error);
      const score = computeLocalScore(answers);
      const riskTier = deriveRiskTier(score);
      const priority = derivePriority(riskTier);
      const auditId = `aud-lite-local-${Date.now().toString(36)}`;
      const params = new URLSearchParams({
        service: "ai_security_audit",
        priority,
        source: "audit-lite",
        audit_id: auditId,
        risk_score: String(score),
        risk_tier: riskTier,
      });
      renderResult({
        status: "audit-lite-complete",
        audit_id: auditId,
        risk_score: score,
        risk_tier: riskTier,
        priority,
        top_risks: buildFallbackRisks(answers, riskTier),
        recommended_service: "ai_security_audit",
        next_route: `/enter?${params.toString()}`,
      });
      setStatus("Risk check complete.", "success");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      renderEmptyState();
      setStatus("Risk check ready.");
    }, 0);
  });
});
