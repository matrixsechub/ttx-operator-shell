function setStatus(message, state = "") {
  const node = document.getElementById("traffic-acquisition-status");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.state = state;
}

function renderResult(payload) {
  const node = document.getElementById("traffic-acquisition-result");
  if (!node) {
    return;
  }
  node.hidden = false;
  node.textContent = JSON.stringify(payload, null, 2);
}

document.getElementById("traffic-acquisition-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const formData = new FormData(form);
  const channels = formData.getAll("channels").map((value) => String(value));
  const payload = {
    target_audience: String(formData.get("target_audience") || ""),
    growth_goal: String(formData.get("growth_goal") || "marketplace_visits"),
    channels,
    source_route: window.location.pathname,
  };

  setStatus("Running Traffic Acquisition Agent...");
  try {
    const response = await fetch("/api/traffic-acquisition/run", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "traffic-acquisition-run-failed");
    }
    setStatus(`Campaign registered :: ${result.campaign_id}`, "success");
    renderResult(result);
  } catch (error) {
    setStatus(error.message || "Traffic acquisition run failed.", "error");
  }
});
