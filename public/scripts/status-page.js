window.addEventListener("load", async () => {
  const scannerList = document.getElementById("status-scanners");
  const complianceList = document.getElementById("status-compliance");
  const reachabilityList = document.getElementById("status-reachability");
  const updatedAt = document.getElementById("status-updated-at");
  const health = window.__mshopsEcosystem && window.__mshopsEcosystem.health;

  function fillList(target, rows) {
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target.innerHTML = "";
    rows.forEach((row) => {
      const item = document.createElement("li");
      item.textContent = row;
      target.appendChild(item);
    });
  }

  if (health) {
    fillList(scannerList, [
      `Total scanner warnings: ${health.totalScannerWarnings}`,
      `Design-system enforcement: ${health.designSystemEnforcement.status}`,
      `Relevant stylesheet order OK: ${health.stylesheetOrder.inOrder ? "yes" : "no"}`,
    ]);

    fillList(complianceList, [
      `Reduced-motion active: ${health.reducedMotion ? "yes" : "no"}`,
      `Accessibility mode active: ${health.accessibilityMode.bodyClass ? "yes" : "no"}`,
      `HUD frames present: ${health.componentCensus.hudFrames}`,
    ]);
  } else {
    fillList(scannerList, ["Governance aggregate not available on this load."]);
    fillList(complianceList, ["Compliance summary not available on this load."]);
  }

  try {
    const response = await fetch("/api/engagements/status");
    if (!response.ok) {
      throw new Error(`Status check failed with ${response.status}`);
    }
    const result = await response.json();
    const count = Array.isArray(result.engagements) ? result.engagements.length : 0;
    fillList(reachabilityList, [
      "Public status path reachable",
      "Current uptime signal: available on this refresh",
      `Tracked public requests available: ${count}`,
      `Last checked from this page: ${new Date().toLocaleString()}`,
    ]);
  } catch (error) {
    console.error("MSH OPS status reachability check failed", error);
    fillList(reachabilityList, [
      "Public status path unavailable right now",
      "Current uptime signal: unavailable on this refresh",
      "Retry later or use the contact page if the issue persists",
    ]);
  }

  if (updatedAt instanceof HTMLElement) {
    updatedAt.textContent = `Status last refreshed on ${new Date().toLocaleString()}.`;
  }
});
