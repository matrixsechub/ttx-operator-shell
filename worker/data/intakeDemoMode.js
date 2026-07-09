export function isIntakeDemoMode(env) {
  return String(env?.INTAKE_AGENT_DEMO_MODE || "").toLowerCase() === "true";
}

export const INTAKE_DEMO_MODE_MESSAGE = "Demo Mode — No data stored";

export const COCKPIT_STATUS = "under_construction";

export const COCKPIT_MESSAGE =
  "Operator Cockpit is coming online soon — registration ensures you receive updates.";

export function getPublicDemoModePayload(env) {
  return {
    enabled: isIntakeDemoMode(env),
    message: INTAKE_DEMO_MODE_MESSAGE,
    cockpit_status: COCKPIT_STATUS,
    cockpit_message: COCKPIT_MESSAGE,
  };
}
