const FALLBACK_SERVICE_CATALOG = [
  {
    slug: "ai_security_audit",
    name: "AI Security Audit",
    public_description: "Identify vulnerabilities in your AI stack before they become breaches.",
    best_for: "Customer-facing AI or regulated data",
    price_range: "$2,500 - $8,500",
    delivery_time: "5-10 business days",
    default_cta: "Start Security Intake",
    icon: "SEC",
  },
  {
    slug: "ai_agent_build",
    name: "AI Agent Build",
    public_description: "Custom AI agents that take action across real business workflows.",
    best_for: "Multi-step business automation",
    price_range: "$4,000 - $18,000",
    delivery_time: "2-6 weeks",
    default_cta: "Start Agent Intake",
    icon: "AGT",
  },
  {
    slug: "ai_automation_systems",
    name: "AI Automation Systems",
    public_description: "Replace manual workflows with intelligent, reliable automation.",
    best_for: "Ops-heavy teams with repetitive processes",
    price_range: "$3,000 - $12,000",
    delivery_time: "2-4 weeks",
    default_cta: "Start Automation Intake",
    icon: "AUT",
  },
  {
    slug: "rag_governance_review",
    name: "RAG Governance Review",
    public_description: "Audit and improve your retrieval-augmented generation pipelines.",
    best_for: "Existing RAG or knowledge assistants",
    price_range: "$3,500 - $9,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start RAG Intake",
    icon: "RAG",
  },
  {
    slug: "local_ai_setup",
    name: "Local AI Setup",
    public_description: "Deploy AI models on your own infrastructure without cloud dependency.",
    best_for: "Privacy-first or air-gapped environments",
    price_range: "$2,000 - $7,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Local AI Intake",
    icon: "LOC",
  },
  {
    slug: "copilot_governance",
    name: "Copilot Governance",
    public_description: "Govern, monitor, and secure Microsoft Copilot in your enterprise.",
    best_for: "Microsoft 365 and enterprise Copilot deployments",
    price_range: "$3,000 - $10,000",
    delivery_time: "1-3 weeks",
    default_cta: "Start Governance Intake",
    icon: "COP",
  },
  {
    slug: "aeo_visibility_setup",
    name: "AEO Visibility Setup",
    public_description: "Optimize your content for AI-generated answers and search summaries.",
    best_for: "Brands wanting AI search visibility",
    price_range: "$1,500 - $5,000",
    delivery_time: "1-2 weeks",
    default_cta: "Start AEO Intake",
    icon: "AEO",
  },
  {
    slug: "multimodal_ai_risk_review",
    name: "Multimodal AI Risk Review",
    public_description: "Assess risks in AI systems using text, images, audio, video, or documents.",
    best_for: "Image, document, audio, or video AI",
    price_range: "$3,000 - $9,500",
    delivery_time: "1-3 weeks",
    default_cta: "Start Multimodal Intake",
    icon: "MM",
  },
];

const SERVICE_LABELS = {
  ai_security_audit: "AI Security Audit",
  ai_agent_build: "AI Agent Build",
  ai_automation_systems: "AI Automation Systems",
  rag_governance_review: "RAG Governance Review",
  local_ai_setup: "Local AI Setup",
  copilot_governance: "Copilot Governance",
  aeo_visibility_setup: "AEO Visibility Setup",
  multimodal_ai_risk_review: "Multimodal AI Risk Review",
};

const SERVICE_MAP = {
  secure_ai_tools: { primary: "ai_security_audit", secondary: "copilot_governance" },
  build_ai_agent: { primary: "ai_agent_build", secondary: "ai_automation_systems" },
  automate_workflow: { primary: "ai_automation_systems", secondary: "ai_agent_build" },
  improve_ai_visibility: { primary: "aeo_visibility_setup", secondary: "rag_governance_review" },
  build_private_local_ai: { primary: "local_ai_setup", secondary: "ai_security_audit" },
  govern_copilot_enterprise_ai: { primary: "copilot_governance", secondary: "ai_security_audit" },
  assess_multimodal_ai: { primary: "multimodal_ai_risk_review", secondary: "ai_security_audit" },
  not_sure: { primary: "ai_security_audit", secondary: "aeo_visibility_setup" },
};

let serviceCatalog = [...FALLBACK_SERVICE_CATALOG];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function getServiceBySlug(slug) {
  return serviceCatalog.find((service) => service.slug === slug);
}

function getServiceLabel(slug) {
  return getServiceBySlug(slug)?.name || SERVICE_LABELS[slug] || slug;
}

function derivePriority(score) {
  if (score >= 75) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

function deriveRevenuePotential(budgetRange) {
  switch (budgetRange) {
    case "under_500":
      return "low";
    case "500_2500":
      return "medium";
    case "2500_10000":
      return "high";
    case "10000_plus":
      return "enterprise";
    default:
      return "medium";
  }
}

function computeUrgencyScore(answers) {
  let score = 20;
  const usage = answers.current_ai_usage || [];

  if (answers.urgency === "this_week") score += 25;
  if (answers.urgency === "this_month") score += 15;
  if (answers.urgency === "planning_phase") score += 5;

  if (answers.risk_level === "regulated_compliance_heavy") score += 30;
  if (answers.risk_level === "customer_facing_ai" || answers.risk_level === "handling_sensitive_data") score += 20;
  if (answers.risk_level === "unknown") score += 10;
  if (answers.risk_level === "internal_only_ai") score += 5;

  if (answers.business_type === "enterprise_team" || answers.business_type === "regulated_business") score += 20;
  if (answers.business_type === "saas_company" || answers.business_type === "agency") score += 10;

  if (usage.includes("customer_chatbot")) score += 15;
  if (usage.includes("rag_system")) score += 10;
  if (usage.includes("multimodal_ai")) score += 10;
  if (usage.includes("microsoft_copilot")) score += 5;
  if (usage.includes("n8n_make_zapier")) score += 5;
  if (usage.includes("local_models_ollama")) score += 5;

  return Math.max(0, Math.min(100, score));
}

function computeFallbackResult(answers) {
  const selectorId = `sel-local-${Date.now().toString(36)}`;
  const match = SERVICE_MAP[answers.primary_goal] || SERVICE_MAP.not_sure;
  let secondary = match.secondary;

  if (answers.current_ai_usage.includes("customer_chatbot") && match.primary !== "ai_security_audit") {
    secondary = "ai_security_audit";
  } else if (answers.current_ai_usage.includes("multimodal_ai") && match.primary !== "multimodal_ai_risk_review") {
    secondary = "multimodal_ai_risk_review";
  }

  const urgencyScore = computeUrgencyScore(answers);
  const priority = derivePriority(urgencyScore);
  const params = new URLSearchParams({
    service: match.primary,
    priority,
    source: "service-selector",
    selector_id: selectorId,
  });

  return {
    status: "service-match-ready",
    selector_id: selectorId,
    recommended_service: match.primary,
    secondary_service: secondary,
    urgency_score: urgencyScore,
    revenue_potential: deriveRevenuePotential(answers.budget_range),
    priority,
    next_route: `/enter?${params.toString()}`,
    explanation: `${getServiceLabel(match.primary)} is the strongest fit based on your stated goal, AI usage, urgency, and risk profile.`,
  };
}

function collectAnswers(form) {
  const formData = new FormData(form);
  const currentUsage = formData
    .getAll("current_ai_usage")
    .map((value) => String(value))
    .filter(Boolean);

  return {
    primary_goal: String(formData.get("primary_goal") || "not_sure"),
    business_type: String(formData.get("business_type") || "small_business"),
    current_ai_usage: currentUsage.length ? currentUsage : ["no_ai_yet"],
    risk_level: String(formData.get("risk_level") || "unknown"),
    budget_range: String(formData.get("budget_range") || "not_sure"),
    urgency: String(formData.get("urgency") || "research_only"),
    source_route: "/services",
  };
}

function setStatus(message, state = "") {
  const node = document.getElementById("service-selector-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

function renderCatalog() {
  const grid = document.getElementById("service-catalog-grid");
  if (!grid) {
    return;
  }

  grid.innerHTML = serviceCatalog
    .map(
      (service) => `
        <article class="marketplace-card bracket">
          <div class="bracket-inner">
            <p class="section-label mono">[ ${escapeHtml(service.icon)} ]</p>
            <h3>${escapeHtml(service.name)}</h3>
            <p class="system-copy">${escapeHtml(service.public_description)}</p>
            <div class="marketplace-tags">
              <span>${escapeHtml(service.best_for)}</span>
              <span>${escapeHtml(service.price_range)}</span>
              <span>${escapeHtml(service.delivery_time)}</span>
            </div>
            <div class="cta-row">
              ${
                service.slug === "ai_security_audit"
                  ? `<a class="button primary" href="/apps/ai-security-audit">[ FREE RISK CHECK ]</a>
                     <a class="button secondary" href="/enter?service=${encodeURIComponent(service.slug)}&source=services-catalog">${escapeHtml(service.default_cta)}</a>`
                  : service.slug === "ai_agent_build"
                  ? `<a class="button primary" href="/apps/ai-agent-readiness-checker">[ CHECK READINESS ]</a>
                     <a class="button secondary" href="/enter?service=${encodeURIComponent(service.slug)}&source=services-catalog">${escapeHtml(service.default_cta)}</a>`
                  : service.slug === "ai_automation_systems"
                  ? `<a class="button primary" href="/apps/automation-roi-calculator">[ CALCULATE ROI ]</a>
                     <a class="button secondary" href="/enter?service=${encodeURIComponent(service.slug)}&source=services-catalog">${escapeHtml(service.default_cta)}</a>`
                  : service.slug === "rag_governance_review"
                  ? `<a class="button primary" href="/apps/rag-risk-analyzer">[ ANALYZE RAG RISK ]</a>
                     <a class="button secondary" href="/enter?service=${encodeURIComponent(service.slug)}&source=services-catalog">${escapeHtml(service.default_cta)}</a>`
                  : `<a class="button primary" href="/enter?service=${encodeURIComponent(service.slug)}&source=services-catalog">${escapeHtml(service.default_cta)}</a>`
              }
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderResult(result) {
  const target = document.getElementById("service-selector-result");
  if (!target) {
    return;
  }

  const primary = getServiceBySlug(result.recommended_service);
  const secondary = result.secondary_service ? getServiceBySlug(result.secondary_service) : null;
  const selectorId = result.selector_id || "pending";

  target.innerHTML = `
    <p class="section-label mono">[ RECOMMENDED_PATH ]</p>
    <h3>${escapeHtml(primary?.name || getServiceLabel(result.recommended_service))}</h3>
    <p class="system-copy">${escapeHtml(result.explanation || "Recommended path ready.")}</p>
    <div class="services-result-grid">
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ PRIORITY ]</p>
          <p class="stat-num">${escapeHtml(String(result.priority || "medium").toUpperCase())}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ URGENCY SCORE ]</p>
          <p class="stat-num">${escapeHtml(String(result.urgency_score || 0))}</p>
        </div>
      </article>
      <article class="stat-panel bracket">
        <div class="bracket-inner">
          <p class="stat-label mono">[ REVENUE ]</p>
          <p class="stat-num">${escapeHtml(String(result.revenue_potential || "medium").toUpperCase())}</p>
        </div>
      </article>
    </div>
    <div class="telemetry-list">
      <span>Selector ID :: ${escapeHtml(selectorId)}</span>
      <span>Primary Path :: ${escapeHtml(primary?.name || getServiceLabel(result.recommended_service))}</span>
      <span>Secondary Path :: ${escapeHtml(secondary?.name || getServiceLabel(result.secondary_service || "ai_security_audit"))}</span>
    </div>
    <div class="cta-row">
      <a class="button primary" href="${escapeHtml(result.next_route || "/enter")}">[ START INTAKE ]</a>
      <a class="button ghost" href="#catalog">[ REVIEW SERVICES ]</a>
    </div>
  `;
}

async function loadCatalog() {
  try {
    const response = await fetch("/api/service-selector/catalog");
    if (!response.ok) {
      throw new Error(`Catalog request failed with status ${response.status}`);
    }
    const payload = await response.json();
    if (Array.isArray(payload.services) && payload.services.length) {
      serviceCatalog = payload.services;
    }
  } catch (error) {
    console.warn("MSHOPS service catalog fallback", error);
  }

  renderCatalog();
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("service-selector-form");
  const submitButton = document.getElementById("service-selector-submit");

  await loadCatalog();

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const answers = collectAnswers(form);
    setStatus("Matching your service path...");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch("/api/service-selector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error(`Selector request failed with status ${response.status}`);
      }

      const result = await response.json();
      renderResult(result);
      setStatus("Recommended service path ready.", "success");
    } catch (error) {
      console.error("MSHOPS service selector fallback", error);
      const fallback = computeFallbackResult(answers);
      renderResult(fallback);
      setStatus("Recommended service path ready.", "success");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      const target = document.getElementById("service-selector-result");
      if (target) {
        target.innerHTML = `
          <p class="section-label mono">[ RECOMMENDED_PATH ]</p>
          <h3>Recommended Path</h3>
          <p class="system-copy">
            Submit the questionnaire to receive a recommended service, a secondary path when useful, and a clean
            intake handoff.
          </p>
        `;
      }
      setStatus("Selector ready.");
    }, 0);
  });
});
