document.addEventListener("DOMContentLoaded", () => {
  const scrollLinks = Array.from(document.querySelectorAll("[data-scroll-target]"));
  const form = document.getElementById("enter-lead-form");
  const status = document.getElementById("enter-form-status");
  const submitButton = document.getElementById("enter-submit");
  const contextHeading = document.getElementById("enter-context-heading");
  const contextBadge = document.getElementById("enter-context-badge");
  const moduleInterestField = document.getElementById("module-interest");
  const transmissionField = document.getElementById("transmission");
  const hiddenService = document.getElementById("hidden-service");
  const hiddenPriority = document.getElementById("hidden-priority");
  const hiddenSource = document.getElementById("hidden-source");
  const hiddenSelectorId = document.getElementById("hidden-selector-id");
  const hiddenAuditId = document.getElementById("hidden-audit-id");
  const hiddenScanId = document.getElementById("hidden-scan-id");
  const hiddenAgentCheckId = document.getElementById("hidden-agent-check-id");
  const hiddenAutomationRoiId = document.getElementById("hidden-automation-roi-id");
  const hiddenRagRiskId = document.getElementById("hidden-rag-risk-id");
  const hiddenRiskScore = document.getElementById("hidden-risk-score");
  const hiddenInjectionScore = document.getElementById("hidden-injection-score");
  const hiddenRiskTier = document.getElementById("hidden-risk-tier");
  const hiddenReadinessScore = document.getElementById("hidden-readiness-score");
  const hiddenReadinessTier = document.getElementById("hidden-readiness-tier");
  const hiddenRoiScore = document.getElementById("hidden-roi-score");
  const hiddenRoiTier = document.getElementById("hidden-roi-tier");
  const hiddenRagRiskScore = document.getElementById("hidden-rag-risk-score");
  const hiddenRagRiskTier = document.getElementById("hidden-rag-risk-tier");
  const hiddenEstimatedMonthlySavings = document.getElementById("hidden-estimated-monthly-savings");
  const hiddenEstimatedAnnualSavings = document.getElementById("hidden-estimated-annual-savings");
  const hiddenHoursSavedPerMonth = document.getElementById("hidden-hours-saved-per-month");
  const hiddenRetrievalExposureLevel = document.getElementById("hidden-retrieval-exposure-level");
  const hiddenAccessControlLevel = document.getElementById("hidden-access-control-level");
  const hiddenGovernanceMaturity = document.getElementById("hidden-governance-maturity");
  const hiddenBuildComplexity = document.getElementById("hidden-build-complexity");
  const hiddenAutomationComplexity = document.getElementById("hidden-automation-complexity");
  const hiddenSafetyLevel = document.getElementById("hidden-safety-level");
  const lifecyclePanel = document.getElementById("enter-lifecycle-panel");
  const lifecycleHeading = document.getElementById("enter-lifecycle-heading");
  const lifecycleStatus = document.getElementById("enter-lifecycle-status");
  const lifecycleTimeline = document.getElementById("enter-lifecycle-timeline");
  const securityPanel = document.getElementById("enter-security-panel");
  const securityHeading = document.getElementById("enter-security-heading");
  const securityStage = document.getElementById("enter-security-stage");
  const permissionProfile = document.getElementById("enter-permission-profile");
  const hiddenRegisterId = document.getElementById("hidden-register-id");
  const params = new URLSearchParams(window.location.search);

  const selectedService = params.get("service") || "";
  const selectedPriority = params.get("priority") || "";
  const selectedSource = params.get("source") || "enter-funnel";
  const selectedSelectorId = params.get("selector_id") || "";
  const selectedAuditId = params.get("audit_id") || "";
  const selectedRegisterId = params.get("register_id") || "";
  const selectedRole = params.get("role") || "";
  const selectedScanId = params.get("scan_id") || "";
  const selectedAgentCheckId = params.get("agent_check_id") || "";
  const selectedAutomationRoiId = params.get("automation_roi_id") || "";
  const selectedRagRiskId = params.get("rag_risk_id") || "";
  const selectedRiskScore = params.get("risk_score") || "";
  const selectedInjectionScore = params.get("injection_score") || "";
  const selectedRiskTier = params.get("risk_tier") || "";
  const selectedReadinessScore = params.get("readiness_score") || "";
  const selectedReadinessTier = params.get("readiness_tier") || "";
  const selectedRoiScore = params.get("roi_score") || "";
  const selectedRoiTier = params.get("roi_tier") || "";
  const selectedRagRiskScore = params.get("rag_risk_score") || "";
  const selectedRagRiskTier = params.get("rag_risk_tier") || "";
  const selectedEstimatedMonthlySavings = params.get("estimated_monthly_savings") || "";
  const selectedEstimatedAnnualSavings = params.get("estimated_annual_savings") || "";
  const selectedHoursSavedPerMonth = params.get("hours_saved_per_month") || "";
  const selectedRetrievalExposureLevel = params.get("retrieval_exposure_level") || "";
  const selectedAccessControlLevel = params.get("access_control_level") || "";
  const selectedGovernanceMaturity = params.get("governance_maturity") || "";
  const selectedBuildComplexity = params.get("build_complexity") || "";
  const selectedAutomationComplexity = params.get("automation_complexity") || "";
  const selectedSafetyLevel = params.get("safety_level") || "";

  if (hiddenService instanceof HTMLInputElement) {
    hiddenService.value = selectedService;
  }

  if (hiddenPriority instanceof HTMLInputElement) {
    hiddenPriority.value = selectedPriority;
  }

  if (hiddenSource instanceof HTMLInputElement) {
    hiddenSource.value = selectedSource;
  }

  if (hiddenSelectorId instanceof HTMLInputElement) {
    hiddenSelectorId.value = selectedSelectorId;
  }

  if (hiddenAuditId instanceof HTMLInputElement) {
    hiddenAuditId.value = selectedAuditId;
  }

  if (hiddenRegisterId instanceof HTMLInputElement) {
    hiddenRegisterId.value = selectedRegisterId;
  }

  if (hiddenScanId instanceof HTMLInputElement) {
    hiddenScanId.value = selectedScanId;
  }

  if (hiddenAgentCheckId instanceof HTMLInputElement) {
    hiddenAgentCheckId.value = selectedAgentCheckId;
  }

  if (hiddenAutomationRoiId instanceof HTMLInputElement) {
    hiddenAutomationRoiId.value = selectedAutomationRoiId;
  }
  if (hiddenRagRiskId instanceof HTMLInputElement) {
    hiddenRagRiskId.value = selectedRagRiskId;
  }

  if (hiddenRiskScore instanceof HTMLInputElement) {
    hiddenRiskScore.value = selectedRiskScore;
  }

  if (hiddenInjectionScore instanceof HTMLInputElement) {
    hiddenInjectionScore.value = selectedInjectionScore;
  }

  if (hiddenRiskTier instanceof HTMLInputElement) {
    hiddenRiskTier.value = selectedRiskTier;
  }

  if (hiddenReadinessScore instanceof HTMLInputElement) {
    hiddenReadinessScore.value = selectedReadinessScore;
  }

  if (hiddenReadinessTier instanceof HTMLInputElement) {
    hiddenReadinessTier.value = selectedReadinessTier;
  }

  if (hiddenRoiScore instanceof HTMLInputElement) {
    hiddenRoiScore.value = selectedRoiScore;
  }

  if (hiddenRoiTier instanceof HTMLInputElement) {
    hiddenRoiTier.value = selectedRoiTier;
  }
  if (hiddenRagRiskScore instanceof HTMLInputElement) {
    hiddenRagRiskScore.value = selectedRagRiskScore;
  }
  if (hiddenRagRiskTier instanceof HTMLInputElement) {
    hiddenRagRiskTier.value = selectedRagRiskTier;
  }

  if (hiddenEstimatedMonthlySavings instanceof HTMLInputElement) {
    hiddenEstimatedMonthlySavings.value = selectedEstimatedMonthlySavings;
  }

  if (hiddenEstimatedAnnualSavings instanceof HTMLInputElement) {
    hiddenEstimatedAnnualSavings.value = selectedEstimatedAnnualSavings;
  }

  if (hiddenHoursSavedPerMonth instanceof HTMLInputElement) {
    hiddenHoursSavedPerMonth.value = selectedHoursSavedPerMonth;
  }
  if (hiddenRetrievalExposureLevel instanceof HTMLInputElement) {
    hiddenRetrievalExposureLevel.value = selectedRetrievalExposureLevel;
  }
  if (hiddenAccessControlLevel instanceof HTMLInputElement) {
    hiddenAccessControlLevel.value = selectedAccessControlLevel;
  }
  if (hiddenGovernanceMaturity instanceof HTMLInputElement) {
    hiddenGovernanceMaturity.value = selectedGovernanceMaturity;
  }

  if (hiddenBuildComplexity instanceof HTMLInputElement) {
    hiddenBuildComplexity.value = selectedBuildComplexity;
  }

  if (hiddenAutomationComplexity instanceof HTMLInputElement) {
    hiddenAutomationComplexity.value = selectedAutomationComplexity;
  }

  if (hiddenSafetyLevel instanceof HTMLInputElement) {
    hiddenSafetyLevel.value = selectedSafetyLevel;
  }

  if (moduleInterestField instanceof HTMLInputElement && selectedService) {
    moduleInterestField.value = selectedService;
  }

  if (contextHeading instanceof HTMLElement && selectedSource === "audit-lite") {
    contextHeading.textContent = "AI Security Audit - Access Pending";
  } else if (contextHeading instanceof HTMLElement && selectedSource === "public-register") {
    contextHeading.textContent = "Registration Intake Pending";
  } else if (contextHeading instanceof HTMLElement && selectedSource === "prompt-injection-scanner") {
    contextHeading.textContent = "Start your full Prompt Injection Review intake";
  } else if (contextHeading instanceof HTMLElement && selectedSource === "agent-readiness-checker") {
    contextHeading.textContent = "Start your AI Agent Build Review intake";
  } else if (contextHeading instanceof HTMLElement && selectedSource === "automation-roi-calculator") {
    contextHeading.textContent = "Start your Automation Build Review intake";
  } else if (contextHeading instanceof HTMLElement && selectedSource === "rag-risk-analyzer") {
    contextHeading.textContent = "Start your RAG Governance Review intake";
  } else if (contextHeading instanceof HTMLElement && selectedService) {
    contextHeading.textContent = `Transmit operator context for ${selectedService.replace(/_/g, " ")}`;
  }

  if (contextBadge instanceof HTMLElement && (selectedService || selectedAuditId)) {
    const segments = [];
    if (selectedService) {
      segments.push(`Service ${selectedService}`);
    }
    if (selectedPriority) {
      segments.push(`priority ${selectedPriority}`);
    }
    if (selectedSelectorId) {
      segments.push(`selector ${selectedSelectorId}`);
    }
    if (selectedAuditId) {
      segments.push(`audit ${selectedAuditId}`);
    }
    if (selectedRegisterId) {
      segments.push(`register ${selectedRegisterId}`);
    }
    if (selectedRole) {
      segments.push(`role ${selectedRole}`);
    }
    if (selectedScanId) {
      segments.push(`scan ${selectedScanId}`);
    }
    if (selectedAgentCheckId) {
      segments.push(`agent ${selectedAgentCheckId}`);
    }
    if (selectedAutomationRoiId) {
      segments.push(`automation ${selectedAutomationRoiId}`);
    }
    if (selectedRagRiskId) {
      segments.push(`rag ${selectedRagRiskId}`);
    }
    if (selectedInjectionScore) {
      segments.push(`injection ${selectedInjectionScore}`);
    }
    if (selectedRiskTier) {
      segments.push(`risk ${selectedRiskTier}`);
    }
    if (selectedReadinessTier) {
      segments.push(`readiness ${selectedReadinessTier}`);
    }
    if (selectedRoiTier) {
      segments.push(`roi ${selectedRoiTier}`);
    }
    if (selectedRagRiskTier) {
      segments.push(`rag-risk ${selectedRagRiskTier}`);
    }
    if (selectedRetrievalExposureLevel) {
      segments.push(`exposure ${selectedRetrievalExposureLevel}`);
    }
    if (selectedAccessControlLevel) {
      segments.push(`access ${selectedAccessControlLevel}`);
    }
    if (selectedGovernanceMaturity) {
      segments.push(`governance ${selectedGovernanceMaturity}`);
    }
    if (selectedBuildComplexity) {
      segments.push(`complexity ${selectedBuildComplexity}`);
    }
    if (selectedAutomationComplexity) {
      segments.push(`automation-complexity ${selectedAutomationComplexity}`);
    }
    if (selectedSafetyLevel) {
      segments.push(`safety ${selectedSafetyLevel}`);
    }
    contextBadge.textContent = segments.join(" :: ");
  }

  async function loadAuditLifecycle() {
    if (!(lifecyclePanel instanceof HTMLElement)) {
      return;
    }

    if (selectedSource !== "audit-lite" || !selectedAuditId) {
      if (selectedSource !== "public-register") {
        lifecyclePanel.hidden = true;
      }
      return;
    }

    lifecyclePanel.hidden = false;
    if (lifecycleHeading instanceof HTMLElement) {
      lifecycleHeading.textContent = "Audit-lite lifecycle status";
    }
    if (lifecycleStatus instanceof HTMLElement) {
      lifecycleStatus.textContent = "Loading audit-lite lifecycle...";
      lifecycleStatus.dataset.state = "";
    }

    try {
      const response = await fetch(`/api/audit-lite/lifecycle?audit_id=${encodeURIComponent(selectedAuditId)}`, {
        headers: { "Cache-Control": "no-store" },
      });
      if (!response.ok) {
        throw new Error(`Lifecycle request failed with status ${response.status}`);
      }

      const lifecycle = await response.json();
      if (contextBadge instanceof HTMLElement) {
        const base = contextBadge.textContent ? `${contextBadge.textContent} :: ` : "";
        contextBadge.textContent = `${base}${lifecycle.lifecycle_label}`;
      }
      if (lifecycleStatus instanceof HTMLElement) {
        lifecycleStatus.textContent = lifecycle.operator_mode
          ? "Operator Mode available. Intake lifecycle has already been processed."
          : "Observer Mode active. Audit intake remains in the public-to-operator handoff path.";
        lifecycleStatus.dataset.state = lifecycle.operator_mode ? "success" : "warning";
      }
      if (lifecycleTimeline instanceof HTMLElement) {
        lifecycleTimeline.innerHTML = (Array.isArray(lifecycle.lifecycle_timeline) ? lifecycle.lifecycle_timeline : [])
          .map(
            (entry) =>
              `<span>${entry.label || entry.status} :: ${new Date(entry.at).toLocaleString()}${entry.note ? ` :: ${entry.note}` : ""}</span>`,
          )
          .join("");
      }
    } catch (error) {
      console.error("MSHOPS audit-lite lifecycle load failed", error);
      if (lifecycleStatus instanceof HTMLElement) {
        lifecycleStatus.textContent = "Audit-lite lifecycle is unavailable right now.";
        lifecycleStatus.dataset.state = "error";
      }
      if (lifecycleTimeline instanceof HTMLElement) {
        lifecycleTimeline.innerHTML = "<span>No lifecycle events available.</span>";
      }
    }
  }

  async function loadRegisterLifecycle() {
    if (selectedSource !== "public-register") {
      if (securityPanel instanceof HTMLElement) {
        securityPanel.hidden = true;
      }
      return;
    }

    if (securityPanel instanceof HTMLElement) {
      securityPanel.hidden = false;
    }
    if (securityHeading instanceof HTMLElement) {
      securityHeading.textContent = "Registration Intake Pending";
    }

    try {
      const securityResponse = await fetch("/api/register-security", {
        headers: { "Cache-Control": "no-store" },
      });
      if (securityResponse.ok) {
        const securityPlane = await securityResponse.json();
        if (securityStage instanceof HTMLElement) {
          securityStage.textContent = `Security stage :: ${securityPlane.module?.security_stage || "intake"}`;
          securityStage.dataset.state = "warning";
        }
        if (permissionProfile instanceof HTMLElement) {
          permissionProfile.textContent = `Permission profile :: ${securityPlane.module?.permission_profile || "public_intake"} :: agent ${securityPlane.module?.agent_config_key || "intake_agent_v2"}`;
        }
      }
    } catch (error) {
      console.error("MSHOPS register security-plane load failed", error);
    }

    if (!(lifecyclePanel instanceof HTMLElement) || !selectedRegisterId) {
      return;
    }

    lifecyclePanel.hidden = false;
    if (lifecycleHeading instanceof HTMLElement) {
      lifecycleHeading.textContent = "Registration lifecycle status";
    }
    if (lifecycleStatus instanceof HTMLElement) {
      lifecycleStatus.textContent = "Loading registration lifecycle...";
      lifecycleStatus.dataset.state = "";
    }

    try {
      const response = await fetch(`/api/register-lifecycle?register_id=${encodeURIComponent(selectedRegisterId)}`, {
        headers: { "Cache-Control": "no-store" },
      });
      if (!response.ok) {
        throw new Error(`Lifecycle request failed with status ${response.status}`);
      }

      const lifecycle = await response.json();
      if (contextBadge instanceof HTMLElement) {
        const base = contextBadge.textContent ? `${contextBadge.textContent} :: ` : "";
        contextBadge.textContent = `${base}${lifecycle.lifecycle_label}`;
      }
      if (lifecycleStatus instanceof HTMLElement) {
        lifecycleStatus.textContent = lifecycle.operator_mode
          ? "Operator Mode available. Registration lifecycle has been processed."
          : "Registration Intake Pending — operator review required.";
        lifecycleStatus.dataset.state = lifecycle.operator_mode ? "success" : "warning";
      }
      if (lifecycleTimeline instanceof HTMLElement) {
        lifecycleTimeline.innerHTML = (Array.isArray(lifecycle.lifecycle_timeline) ? lifecycle.lifecycle_timeline : [])
          .map((entry) => `<span>${entry.label || entry.status}</span>`)
          .join("") || "<span>No lifecycle events available.</span>";
      }
    } catch (error) {
      console.error("MSHOPS register lifecycle load failed", error);
      if (lifecycleStatus instanceof HTMLElement) {
        lifecycleStatus.textContent = "Registration lifecycle is unavailable right now.";
        lifecycleStatus.dataset.state = "error";
      }
      if (lifecycleTimeline instanceof HTMLElement) {
        lifecycleTimeline.innerHTML = "<span>No lifecycle events available.</span>";
      }
    }
  }

  if (transmissionField instanceof HTMLTextAreaElement && selectedService && !transmissionField.value) {
    transmissionField.placeholder = `Mission context for ${selectedService.replace(
      /_/g,
      " ",
    )}, current AI usage, risk posture, desired operator support, and engagement objectives.`;
  }

  for (const link of scrollLinks) {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("data-scroll-target");
      if (!targetId) {
        return;
      }

      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    loadAuditLifecycle();
    loadRegisterLifecycle();
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      operator_handle: String(formData.get("operator_handle") || "").trim(),
      contact_email: String(formData.get("contact_email") || "").trim(),
      organization: String(formData.get("organization") || "").trim(),
      module_interest: String(formData.get("module_interest") || "").trim(),
      urgency: String(formData.get("urgency") || "").trim(),
      transmission: String(formData.get("transmission") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      priority: String(formData.get("priority") || "").trim(),
      source: String(formData.get("source") || "").trim() || "enter-funnel",
      selector_id: String(formData.get("selector_id") || "").trim(),
      audit_id: String(formData.get("audit_id") || "").trim(),
      register_id: String(formData.get("register_id") || "").trim(),
      scan_id: String(formData.get("scan_id") || "").trim(),
      agent_check_id: String(formData.get("agent_check_id") || "").trim(),
      automation_roi_id: String(formData.get("automation_roi_id") || "").trim(),
      rag_risk_id: String(formData.get("rag_risk_id") || "").trim(),
      risk_score: String(formData.get("risk_score") || "").trim(),
      injection_score: String(formData.get("injection_score") || "").trim(),
      risk_tier: String(formData.get("risk_tier") || "").trim(),
      readiness_score: String(formData.get("readiness_score") || "").trim(),
      readiness_tier: String(formData.get("readiness_tier") || "").trim(),
      roi_score: String(formData.get("roi_score") || "").trim(),
      roi_tier: String(formData.get("roi_tier") || "").trim(),
      rag_risk_score: String(formData.get("rag_risk_score") || "").trim(),
      rag_risk_tier: String(formData.get("rag_risk_tier") || "").trim(),
      estimated_monthly_savings: String(formData.get("estimated_monthly_savings") || "").trim(),
      estimated_annual_savings: String(formData.get("estimated_annual_savings") || "").trim(),
      hours_saved_per_month: String(formData.get("hours_saved_per_month") || "").trim(),
      retrieval_exposure_level: String(formData.get("retrieval_exposure_level") || "").trim(),
      access_control_level: String(formData.get("access_control_level") || "").trim(),
      governance_maturity: String(formData.get("governance_maturity") || "").trim(),
      build_complexity: String(formData.get("build_complexity") || "").trim(),
      automation_complexity: String(formData.get("automation_complexity") || "").trim(),
      safety_level: String(formData.get("safety_level") || "").trim(),
    };

    if (!payload.module_interest && payload.service) {
      payload.module_interest = payload.service;
    }

    if (!payload.operator_handle || !payload.contact_email || !payload.transmission) {
      status.textContent = "Operator handle, contact email, and mission brief are required.";
      status.dataset.state = "error";
      return;
    }

    status.textContent = "Transmitting operator context...";
    status.dataset.state = "";

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch("/api/engagements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Lead intake failed with status ${response.status}`);
      }

      const result = await response.json();
      status.textContent = `Lead captured. Intake ${result.engagement_id || result.id} is now ${result.status}.`;
      status.dataset.state = "success";
      if (selectedSource === "audit-lite") {
        loadAuditLifecycle();
      }
      if (selectedSource === "public-register") {
        loadRegisterLifecycle();
      }
      form.reset();
      if (hiddenService instanceof HTMLInputElement) hiddenService.value = selectedService;
      if (hiddenPriority instanceof HTMLInputElement) hiddenPriority.value = selectedPriority;
      if (hiddenSource instanceof HTMLInputElement) hiddenSource.value = selectedSource;
      if (hiddenSelectorId instanceof HTMLInputElement) hiddenSelectorId.value = selectedSelectorId;
      if (hiddenAuditId instanceof HTMLInputElement) hiddenAuditId.value = selectedAuditId;
      if (hiddenRegisterId instanceof HTMLInputElement) hiddenRegisterId.value = selectedRegisterId;
      if (hiddenScanId instanceof HTMLInputElement) hiddenScanId.value = selectedScanId;
      if (hiddenAgentCheckId instanceof HTMLInputElement) hiddenAgentCheckId.value = selectedAgentCheckId;
      if (hiddenAutomationRoiId instanceof HTMLInputElement) hiddenAutomationRoiId.value = selectedAutomationRoiId;
      if (hiddenRagRiskId instanceof HTMLInputElement) hiddenRagRiskId.value = selectedRagRiskId;
      if (hiddenRiskScore instanceof HTMLInputElement) hiddenRiskScore.value = selectedRiskScore;
      if (hiddenInjectionScore instanceof HTMLInputElement) hiddenInjectionScore.value = selectedInjectionScore;
      if (hiddenRiskTier instanceof HTMLInputElement) hiddenRiskTier.value = selectedRiskTier;
      if (hiddenReadinessScore instanceof HTMLInputElement) hiddenReadinessScore.value = selectedReadinessScore;
      if (hiddenReadinessTier instanceof HTMLInputElement) hiddenReadinessTier.value = selectedReadinessTier;
      if (hiddenRoiScore instanceof HTMLInputElement) hiddenRoiScore.value = selectedRoiScore;
      if (hiddenRoiTier instanceof HTMLInputElement) hiddenRoiTier.value = selectedRoiTier;
      if (hiddenRagRiskScore instanceof HTMLInputElement) hiddenRagRiskScore.value = selectedRagRiskScore;
      if (hiddenRagRiskTier instanceof HTMLInputElement) hiddenRagRiskTier.value = selectedRagRiskTier;
      if (hiddenEstimatedMonthlySavings instanceof HTMLInputElement) hiddenEstimatedMonthlySavings.value = selectedEstimatedMonthlySavings;
      if (hiddenEstimatedAnnualSavings instanceof HTMLInputElement) hiddenEstimatedAnnualSavings.value = selectedEstimatedAnnualSavings;
      if (hiddenHoursSavedPerMonth instanceof HTMLInputElement) hiddenHoursSavedPerMonth.value = selectedHoursSavedPerMonth;
      if (hiddenRetrievalExposureLevel instanceof HTMLInputElement) hiddenRetrievalExposureLevel.value = selectedRetrievalExposureLevel;
      if (hiddenAccessControlLevel instanceof HTMLInputElement) hiddenAccessControlLevel.value = selectedAccessControlLevel;
      if (hiddenGovernanceMaturity instanceof HTMLInputElement) hiddenGovernanceMaturity.value = selectedGovernanceMaturity;
      if (hiddenBuildComplexity instanceof HTMLInputElement) hiddenBuildComplexity.value = selectedBuildComplexity;
      if (hiddenAutomationComplexity instanceof HTMLInputElement) hiddenAutomationComplexity.value = selectedAutomationComplexity;
      if (hiddenSafetyLevel instanceof HTMLInputElement) hiddenSafetyLevel.value = selectedSafetyLevel;
      if (moduleInterestField instanceof HTMLInputElement && selectedService) {
        moduleInterestField.value = selectedService;
      }
    } catch (error) {
      console.error("MSHOPS enter funnel intake failed", error, payload);
      status.textContent =
        "Live intake is unavailable right now. The briefing data was kept locally; retry after the console path stabilizes.";
      status.dataset.state = "error";
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });

  loadAuditLifecycle();
  loadRegisterLifecycle();
});
