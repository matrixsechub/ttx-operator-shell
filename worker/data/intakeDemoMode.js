export function isIntakeDemoMode(env) {
  return String(env?.INTAKE_AGENT_DEMO_MODE || "").toLowerCase() === "true";
}

export const INTAKE_DEMO_MODE_MESSAGE = "Demo Mode — No data stored";
