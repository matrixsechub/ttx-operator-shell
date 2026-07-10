function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return table[character];
  });
}

function buildAuthHeaders() {
  const token = window.localStorage.getItem("msh-operator-token");
  const headers = { "X-MSH-Operator-Surface": "northstar-beacon" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function setStatus(message) {
  const node = document.getElementById("northstar-operator-status");
  if (node) node.textContent = message;
}

function renderOrders(rows) {
  const tbody = document.getElementById("northstar-orders-rows");
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="mono">No beacon orders yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="mono">${escapeHtml(row.order_id)}</td>
        <td>${escapeHtml(row.organization_name || row.package_summary?.organization || "")}</td>
        <td class="mono">${escapeHtml(row.selected_tier || "")}</td>
        <td class="mono">${escapeHtml(String(row.integrity_hash || "").slice(0, 16))}…</td>
        <td class="mono">${escapeHtml(row.status || "")}</td>
        <td class="mono">${row.assisted_implementation ? "requested" : "—"}</td>
      </tr>`,
    )
    .join("");
}

function renderProposals(rows) {
  const tbody = document.getElementById("northstar-proposals-rows");
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="mono">No governance proposals yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="mono">${escapeHtml(row.proposal_id)}</td>
        <td class="mono">${escapeHtml(row.order_id)}</td>
        <td class="mono">${escapeHtml(row.payload_type)}</td>
        <td class="mono">${escapeHtml(row.status)}</td>
        <td class="mono">${escapeHtml(String(row.current_beacon_hash || "").slice(0, 16))}…</td>
      </tr>`,
    )
    .join("");
}

async function refresh() {
  setStatus("Loading operator queue…");
  const [ordersResponse, proposalsResponse] = await Promise.all([
    fetch("/api/operator/northstar-beacon-orders", { headers: buildAuthHeaders() }),
    fetch("/api/operator/northstar-beacon-proposals", { headers: buildAuthHeaders() }),
  ]);

  if (!ordersResponse.ok || !proposalsResponse.ok) {
    setStatus("Operator authentication required for this route.");
    return;
  }

  const ordersBody = await ordersResponse.json();
  const proposalsBody = await proposalsResponse.json();
  renderOrders(ordersBody.rows || []);
  renderProposals(proposalsBody.rows || []);
  setStatus(`Loaded ${ordersBody.rows?.length || 0} orders and ${proposalsBody.rows?.length || 0} proposals.`);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("northstar-orders-refresh")?.addEventListener("click", refresh);
  refresh();
});
