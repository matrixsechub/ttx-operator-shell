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

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }
  return payload;
}

async function fetchOptional(url, fallback = {}) {
  try {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) {
      return { ...fallback, advisoryDegraded: true, degraded: true, advisoryOnly: true };
    }
    return payload;
  } catch {
    return { ...fallback, advisoryDegraded: true, degraded: true, advisoryOnly: true };
  }
}

function cfDegradedListItem(feed, message) {
  const fn = window.CloudflareFederationUI?.renderCfAdvisoryDegradedListItem;
  return fn ? fn(feed, message) : "";
}

function normalizeUcipMode(ucip = {}, heartbeat = {}) {
  const raw = String(ucip.ucipState?.mode || heartbeat.cloudflareUCIPMode || "yellow").toLowerCase();
  if (raw === "green" || raw === "yellow" || raw === "orange" || raw === "red") {
    return raw;
  }
  return "yellow";
}

function renderUcipStrip(ucip, heartbeat) {
  const strip = document.getElementById("mission-ucip-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeUcipMode(ucip, heartbeat);
  strip.querySelectorAll(".mission-ucip-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-ucip") === mode);
  });
}

function renderUcipActions(ucip, heartbeat) {
  const node = document.getElementById("mission-ucip-actions");
  if (!node) {
    return;
  }
  const actions = ucip.ucipRecommendedActions || heartbeat.cloudflareUCIPRecommendedActions || [];
  const top = actions.slice(0, 5);
  node.innerHTML = top.length
    ? top.map((action) => `<li>${escapeHtml(action)}</li>`).join("")
    : "<li>No unified recommended actions reported.</li>";
}

function renderUcipGrid(ucip, heartbeat) {
  const grid = document.getElementById("mission-ucip-grid");
  if (!grid) {
    return;
  }
  const state = ucip.ucipState || {};
  const mode = state.mode || heartbeat.cloudflareUCIPMode || "yellow";
  const score = ucip.ucipScore ?? state.score ?? heartbeat.cloudflareUCIPScore ?? "n/a";
  const health = ucip.ucipHealth || state.health || heartbeat.cloudflareUCIPHealth || "optional";
  const horizon = state.horizon || heartbeat.cloudflareStrategicHorizon || "medium";
  const stripMode = state.stripMode || heartbeat.cloudflareStrategicStripMode || "watch";
  const campaigns = (ucip.ucipCampaigns || heartbeat.cloudflareUCIPCampaigns || []).length;

  grid.innerHTML = `
    <article class="telemetry-card bracket ucip-mode-${escapeHtml(mode)}"><div class="bracket-inner"><p class="section-label mono">[ UCIP_MODE ]</p><h3>${escapeHtml(String(mode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ UCIP_SCORE ]</p><h3>${escapeHtml(String(score))}</h3><p class="section-copy">${escapeHtml(health)}</p></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ HORIZON ]</p><h3>${escapeHtml(String(horizon).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ STRIP ]</p><h3>${escapeHtml(String(stripMode).toUpperCase())}</h3></div></article>
    <article class="telemetry-card bracket"><div class="bracket-inner"><p class="section-label mono">[ CAMPAIGNS ]</p><h3>${escapeHtml(String(campaigns))}</h3></div></article>
  `;
}

function renderUcipReasons(ucip, heartbeat) {
  const node = document.getElementById("mission-ucip-reasons");
  if (!node) {
    return;
  }
  const reasons = [...(ucip.ucipReasons || []), ...(heartbeat.cloudflareUCIPReasons || [])];
  const unique = [...new Set(reasons)].slice(0, 12);
  const degradedItem = cfDegradedListItem(ucip, "UCIP advisory degraded — federation optional.");
  node.innerHTML = degradedItem + (unique.length
    ? unique.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
    : "<li>No UCIP advisories reported.</li>");
}

function normalizeAmgMode(amg = {}, heartbeat = {}) {
  const raw = String(amg.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow").toLowerCase();
  if (raw === "govern_green" || raw === "govern_yellow" || raw === "govern_orange" || raw === "govern_red") {
    return raw;
  }
  return "govern_yellow";
}

function renderAmgStrip(amg, heartbeat) {
  const strip = document.getElementById("mission-amg-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeAmgMode(amg, heartbeat);
  strip.querySelectorAll(".mission-amg-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-amg") === mode);
  });
}

function renderAmgItems(amg, heartbeat) {
  const node = document.getElementById("mission-amg-items");
  if (!node) {
    return;
  }
  const rules = (amg.amgRules || heartbeat.cloudflareAMGRules || []).slice(0, 3).map((entry) =>
    typeof entry === "string" ? entry : entry.rule || "",
  );
  const nudges = (amg.amgOperatorNudges || heartbeat.cloudflareAMGOperatorNudges || []).slice(0, 2).map((entry) =>
    typeof entry === "string" ? entry : entry.nudge || "",
  );
  const items = [...rules, ...nudges].filter(Boolean).slice(0, 5);
  node.innerHTML = cfDegradedListItem(amg, "AMG advisory degraded — federation optional.") + (items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No AMG rules or nudges reported.</li>");
}

function normalizeCbaMode(cba = {}, heartbeat = {}) {
  const raw = String(cba.cbaState?.mode || heartbeat.cloudflareCBAMode || "behavior_yellow").toLowerCase();
  if (raw === "behavior_green" || raw === "behavior_yellow" || raw === "behavior_orange" || raw === "behavior_red") {
    return raw;
  }
  return "behavior_yellow";
}

function renderCbaStrip(cba, heartbeat) {
  const strip = document.getElementById("mission-cba-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeCbaMode(cba, heartbeat);
  strip.querySelectorAll(".mission-cba-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-cba") === mode);
  });
}

function renderCbaItems(cba, heartbeat) {
  const node = document.getElementById("mission-cba-items");
  if (!node) {
    return;
  }
  const drift = (cba.cbaBehaviorDriftWarnings || heartbeat.cloudflareCBABehaviorDriftWarnings || []).slice(0, 3);
  const hints = [
    ...(cba.cbaOperatorBehaviorHints || heartbeat.cloudflareCBAOperatorBehaviorHints || []).slice(0, 2),
    ...(cba.cbaSystemBehaviorHints || heartbeat.cloudflareCBASystemBehaviorHints || []).slice(0, 2),
  ];
  const items = [...drift, ...hints].filter(Boolean).slice(0, 5);
  node.innerHTML = cfDegradedListItem(cba, "CBA advisory degraded — federation optional.") + (items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No behavioral drift warnings or hints reported.</li>");
}

function normalizeCalMode(cal = {}, heartbeat = {}) {
  const raw = String(cal.calState?.mode || heartbeat.cloudflareCALMode || "align_yellow").toLowerCase();
  if (raw === "align_green" || raw === "align_yellow" || raw === "align_orange" || raw === "align_red") {
    return raw;
  }
  return "align_yellow";
}

function renderCalStrip(cal, heartbeat) {
  const strip = document.getElementById("mission-cal-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeCalMode(cal, heartbeat);
  strip.querySelectorAll(".mission-cal-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-cal") === mode);
  });
}

function renderCalItems(cal, heartbeat) {
  const node = document.getElementById("mission-cal-items");
  if (!node) {
    return;
  }
  const warnings = (cal.calAlignmentWarnings || heartbeat.cloudflareCALAlignmentWarnings || []).slice(0, 3);
  const hints = [
    ...(cal.calOperatorAlignmentHints || heartbeat.cloudflareCALOperatorAlignmentHints || []).slice(0, 2),
    ...(cal.calSystemAlignmentHints || heartbeat.cloudflareCALSystemAlignmentHints || []).slice(0, 2),
  ];
  const items = [...warnings, ...hints].filter(Boolean).slice(0, 5);
  node.innerHTML = cfDegradedListItem(cal, "CAL advisory degraded — federation optional.") + (items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No alignment warnings or hints reported.</li>");
}

function normalizeIhlMode(ihl = {}, heartbeat = {}) {
  const raw = String(ihl.ihlState?.mode || heartbeat.cloudflareIHLMode || "intent_yellow").toLowerCase();
  if (raw === "intent_green" || raw === "intent_yellow" || raw === "intent_orange" || raw === "intent_red") {
    return raw;
  }
  return "intent_yellow";
}

function renderIhlStrip(ihl, heartbeat) {
  const strip = document.getElementById("mission-ihl-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeIhlMode(ihl, heartbeat);
  strip.querySelectorAll(".mission-ihl-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-ihl") === mode);
  });
}

function renderIhlItems(ihl, heartbeat) {
  const node = document.getElementById("mission-ihl-items");
  if (!node) {
    return;
  }
  const warnings = (ihl.ihlIntentWarnings || heartbeat.cloudflareIHLIntentWarnings || []).slice(0, 3);
  const hints = [
    ...(ihl.ihlOperatorIntentHints || heartbeat.cloudflareIHLOperatorIntentHints || []).slice(0, 2),
    ...(ihl.ihlSystemIntentHints || heartbeat.cloudflareIHLSystemIntentHints || []).slice(0, 2),
  ];
  const items = [...warnings, ...hints].filter(Boolean).slice(0, 5);
  node.innerHTML = cfDegradedListItem(ihl, "IHL advisory degraded — federation optional.") + (items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No intent warnings or hints reported.</li>");
}

function normalizeIarlMode(iarl = {}, heartbeat = {}) {
  const raw = String(iarl.iarlState?.mode || heartbeat.cloudflareIARLMode || "resonance_yellow").toLowerCase();
  if (raw === "resonance_green" || raw === "resonance_yellow" || raw === "resonance_orange" || raw === "resonance_red") {
    return raw;
  }
  return "resonance_yellow";
}

function renderIarlStrip(iarl, heartbeat) {
  const strip = document.getElementById("mission-iarl-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeIarlMode(iarl, heartbeat);
  strip.querySelectorAll(".mission-iarl-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-iarl") === mode);
  });
}

function renderIarlItems(iarl, heartbeat) {
  const node = document.getElementById("mission-iarl-items");
  if (!node) {
    return;
  }
  const warnings = (iarl.iarlResonanceWarnings || heartbeat.cloudflareIARLResonanceWarnings || []).slice(0, 3);
  const hints = [
    ...(iarl.iarlOperatorResonanceHints || heartbeat.cloudflareIARLOperatorResonanceHints || []).slice(0, 2),
    ...(iarl.iarlSystemResonanceHints || heartbeat.cloudflareIARLSystemResonanceHints || []).slice(0, 2),
  ];
  const items = [...warnings, ...hints].filter(Boolean).slice(0, 5);
  node.innerHTML = cfDegradedListItem(iarl, "IARL advisory degraded — federation optional.") + (items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No resonance warnings or hints reported.</li>");
}

function normalizeAclMode(acl = {}, heartbeat = {}) {
  const raw = String(acl.aclState?.mode || heartbeat.cloudflareACLMode || "coherence_yellow").toLowerCase();
  if (raw === "coherence_green" || raw === "coherence_yellow" || raw === "coherence_orange" || raw === "coherence_red") {
    return raw;
  }
  return "coherence_yellow";
}

function renderAclStrip(acl, heartbeat) {
  const strip = document.getElementById("mission-acl-strip");
  if (!strip) {
    return;
  }
  const mode = normalizeAclMode(acl, heartbeat);
  strip.querySelectorAll(".mission-acl-segment").forEach((segment) => {
    segment.classList.toggle("active", segment.getAttribute("data-acl") === mode);
  });
}

function renderAclItems(acl, heartbeat) {
  const node = document.getElementById("mission-acl-items");
  if (!node) {
    return;
  }
  const warnings = (acl.aclCoherenceWarnings || heartbeat.cloudflareACLCoherenceWarnings || []).slice(0, 3);
  const hints = [
    ...(acl.aclOperatorCoherenceHints || heartbeat.cloudflareACLOperatorCoherenceHints || []).slice(0, 2),
    ...(acl.aclSystemCoherenceHints || heartbeat.cloudflareACLSystemCoherenceHints || []).slice(0, 2),
  ];
  const items = [...warnings, ...hints].filter(Boolean).slice(0, 5);
  node.innerHTML = cfDegradedListItem(acl, "ACL advisory degraded — federation optional.") + (items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>No coherence warnings or hints reported.</li>");
}

async function loadMissionControl() {
  const status = document.getElementById("mission-status");
  if (status) {
    status.textContent = "Refreshing UCIP, AMG, CBA, CAL, IHL, IARL, and ACL signals...";
  }

  const [heartbeat, ucip, amg, cba, cal, ihl, iarl, acl] = await Promise.all([
    fetchOptional("/api/os/heartbeat", {}),
    fetchOptional("/api/os/cloudflare/ucip", { ucipState: { mode: "yellow" }, advisoryOnly: true }),
    fetchOptional("/api/os/cloudflare/amg", { amgState: { mode: "govern_yellow" }, advisoryOnly: true }),
    fetchOptional("/api/os/cloudflare/cba", { cbaState: { mode: "behavior_yellow" }, advisoryOnly: true }),
    fetchOptional("/api/os/cloudflare/cal", { calState: { mode: "align_yellow" }, advisoryOnly: true }),
    fetchOptional("/api/os/cloudflare/ihl", { ihlState: { mode: "intent_yellow" }, advisoryOnly: true }),
    fetchOptional("/api/os/cloudflare/iarl", { iarlState: { mode: "resonance_yellow" }, advisoryOnly: true }),
    fetchOptional("/api/os/cloudflare/acl", { aclState: { mode: "coherence_yellow" }, advisoryOnly: true }),
  ]);

  const mode = normalizeUcipMode(ucip, heartbeat);
  renderUcipStrip(ucip, heartbeat);
  renderUcipActions(ucip, heartbeat);
  renderUcipGrid(ucip, heartbeat);
  renderUcipReasons(ucip, heartbeat);
  renderAmgStrip(amg, heartbeat);
  renderAmgItems(amg, heartbeat);
  renderCbaStrip(cba, heartbeat);
  renderCbaItems(cba, heartbeat);
  renderCalStrip(cal, heartbeat);
  renderCalItems(cal, heartbeat);
  renderIhlStrip(ihl, heartbeat);
  renderIhlItems(ihl, heartbeat);
  renderIarlStrip(iarl, heartbeat);
  renderIarlItems(iarl, heartbeat);
  renderAclStrip(acl, heartbeat);
  renderAclItems(acl, heartbeat);

  if (status) {
    const amgMode = amg.amgState?.mode || heartbeat.cloudflareAMGMode || "govern_yellow";
    const cbaMode = cba.cbaState?.mode || heartbeat.cloudflareCBAMode || "behavior_yellow";
    const calMode = cal.calState?.mode || heartbeat.cloudflareCALMode || "align_yellow";
    const ihlMode = ihl.ihlState?.mode || heartbeat.cloudflareIHLMode || "intent_yellow";
    const iarlMode = iarl.iarlState?.mode || heartbeat.cloudflareIARLMode || "resonance_yellow";
    const aclMode = acl.aclState?.mode || heartbeat.cloudflareACLMode || "coherence_yellow";
    const advisoryFeeds = [ucip, amg, cba, cal, ihl, iarl, acl];
    const degradedNote = advisoryFeeds.some((feed) => feed.advisoryDegraded || feed.degraded)
      ? " :: CF advisory degraded (optional)"
      : "";
    status.textContent = `Mission board online :: UCIP ${mode.toUpperCase()} :: AMG ${String(amgMode).toUpperCase()} :: CBA ${String(cbaMode).toUpperCase()} :: CAL ${String(calMode).toUpperCase()} :: IHL ${String(ihlMode).toUpperCase()} :: IARL ${String(iarlMode).toUpperCase()} :: ACL ${String(aclMode).toUpperCase()}${degradedNote} :: refreshed ${formatDate(new Date().toISOString())}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("mission-refresh")?.addEventListener("click", loadMissionControl);
  loadMissionControl();
});
