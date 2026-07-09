function isIntakeDemoMode(env = {}) {
  return String(env?.INTAKE_AGENT_DEMO_MODE || process.env.INTAKE_AGENT_DEMO_MODE || "").toLowerCase() === "true";
}

const INTAKE_DEMO_MODE_MESSAGE = "Demo Mode — No data stored";

const COCKPIT_STATUS = "under_construction";

const COCKPIT_MESSAGE =
  "Operator Cockpit is coming online soon — registration ensures you receive updates.";

function getPublicDemoModePayload(env = {}) {
  return {
    enabled: isIntakeDemoMode(env),
    message: INTAKE_DEMO_MODE_MESSAGE,
    cockpit_status: COCKPIT_STATUS,
    cockpit_message: COCKPIT_MESSAGE,
  };
}

module.exports = {
  isIntakeDemoMode,
  INTAKE_DEMO_MODE_MESSAGE,
  COCKPIT_STATUS,
  COCKPIT_MESSAGE,
  getPublicDemoModePayload,
};
