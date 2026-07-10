#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "http://127.0.0.1:8787";
const res = await fetch(`${base}/api/traffic/activation`, { headers: { Accept: "application/json" } });
const json = await res.json().catch(() => ({}));
const activation = json.activation;
const ok =
  res.status === 200 &&
  activation &&
  typeof activation.qualifiedOrganicSessions === "number" &&
  Array.isArray(activation.confidenceBlockers);
console.log(
  JSON.stringify(
    {
      script: "verify-campaign-metrics",
      base,
      status: res.status,
      qualifiedOrganicSessions: activation?.qualifiedOrganicSessions,
      ok,
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
