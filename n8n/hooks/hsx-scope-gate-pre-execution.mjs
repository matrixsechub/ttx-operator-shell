export async function runHsxScopeGatePreExecution({ fetchImpl = fetch, workerBaseUrl, secret, packet }) {
  if (!workerBaseUrl || !secret) throw new Error("HSX_SCOPE_GATE_CONFIG_MISSING");
  const response = await fetchImpl(new URL("/api/governance/hsx/scope-gate/evaluate", workerBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-Webhook-Secret": secret,
    },
    body: JSON.stringify(packet),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`HSX_SCOPE_GATE_INVALID_RESPONSE:${response.status}`);
  }
  if (!response.ok || body?.decision?.outcome !== "approved") {
    throw new Error(`HSX_SCOPE_GATE_DENIED:${body?.decision?.reason_code ?? body?.code ?? response.status}`);
  }
  return { packet, scopeGateDecision: body.decision };
}
