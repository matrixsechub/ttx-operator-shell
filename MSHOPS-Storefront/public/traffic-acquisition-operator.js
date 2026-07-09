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
  const node = document.getElementById("traffic-acquisition-queue-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

function renderSummary(summary = {}) {
  const grid = document.getElementById("traffic-acquisition-summary-grid");
  if (!grid) {
    return;
  }

  const last = summary.last_campaign || null;
  grid.innerHTML = `
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ QUEUE_LENGTH ]</p>
        <h3>${summary.queue_length ?? 0}</h3>
        <p class="system-copy">Registered inbound traffic campaigns.</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ QUEUED ]</p>
        <h3>${summary.queued ?? 0}</h3>
        <p class="system-copy">Awaiting operator distribution approval.</p>
      </div>
    </article>
    <article class="telemetry-card bracket">
      <div class="bracket-inner">
        <p class="section-label mono">[ LAST_CAMPAIGN ]</p>
        <h3>${escapeHtml(last?.campaign_id || "n/a")}</h3>
        <p class="system-copy">${escapeHtml(last?.growth_goal || "No campaigns yet")}</p>
      </div>
    </article>
  `;
}

function renderSecurityPlane(securityPlane = {}, agentRecord = null) {
  const node = document.getElementById("traffic-acquisition-security-plane");
  if (!node) {
    return;
  }

  const module = securityPlane.module || {};
  const tools = Array.isArray(agentRecord?.permitted_tools) ? agentRecord.permitted_tools.join(", ") : "n/a";
  const readNamespaces = Array.isArray(agentRecord?.readable_namespaces)
    ? agentRecord.readable_namespaces.join(", ")
    : "session:marketing";

  node.innerHTML = `
    <span>STAGE :: ${escapeHtml(module.security_stage || "03:ANALYSIS_READY")}</span>
    <span>AGENT :: ${escapeHtml(module.agent_config_key || securityPlane.agent_config_key || "traffic")}</span>
    <span>TRUST :: ${escapeHtml(agentRecord?.trust_level || "MEDIUM")}</span>
    <span>LIFECYCLE :: ${escapeHtml(agentRecord?.lifecycle_stage || "03:ANALYSIS_READY")}</span>
    <span>TOOLS :: ${escapeHtml(tools)}</span>
    <span>NAMESPACES :: ${escapeHtml(readNamespaces)}</span>
  `;
}

function renderRows(rows = []) {
  const tbody = document.getElementById("traffic-acquisition-rows");
  if (!tbody) {
    return;
  }

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.campaign_id || "n/a")}</td>
              <td>${escapeHtml(row.target_audience || "n/a")}</td>
              <td>${escapeHtml(row.growth_goal || "n/a")}</td>
              <td>${escapeHtml((row.channels || []).join(", ") || "n/a")}</td>
              <td>${escapeHtml(String(row.seo_opportunity_score ?? "n/a"))}</td>
              <td>${escapeHtml(String(row.content_artifact_count ?? 0))}</td>
              <td>${escapeHtml(row.status || "queued")}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="8">No traffic acquisition campaigns in queue.</td></tr>`;
}

async function loadSecurityPlaneAgent() {
  const response = await fetch("/api/security-plane/agents", {
    headers: { Accept: "application/json", "Cache-Control": "no-store" },
  });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const agents = Array.isArray(payload.agents) ? payload.agents : [];
  return agents.find((entry) => entry.key === "traffic" || entry.agent_config_key === "traffic") || null;
}

async function loadQueue() {
  setStatus("Loading traffic acquisition queue...");
  try {
    const [queueResponse, agentRecord] = await Promise.all([
      fetch("/api/operator/traffic-acquisition", {
        headers: { Accept: "application/json", "Cache-Control": "no-store" },
      }),
      loadSecurityPlaneAgent(),
    ]);

    if (!queueResponse.ok) {
      throw new Error("traffic-acquisition-queue-unavailable");
    }

    const payload = await queueResponse.json();
    renderSummary(payload.summary || {});
    renderSecurityPlane(payload.security_plane || {}, agentRecord);
    renderRows(payload.rows || []);
    setStatus(`Loaded ${(payload.rows || []).length} campaign(s).`, "success");
  } catch (error) {
    setStatus(error.message || "Failed to load traffic acquisition queue.", "error");
  }
}

document.getElementById("traffic-acquisition-refresh")?.addEventListener("click", () => {
  if (document.getElementById("traffic-acquisition-refresh")?.disabled) {
    setStatus("Cockpit controls are locked until activation.", "warning");
    return;
  }
  loadQueue();
});

loadQueue();
setStatus("Read-only preview — cockpit controls locked until activation.", "warning");
