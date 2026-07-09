function isIntakeDemoMode(env = {}) {
  return String(env?.INTAKE_AGENT_DEMO_MODE || process.env.INTAKE_AGENT_DEMO_MODE || "").toLowerCase() === "true";
}

const INTAKE_DEMO_MODE_MESSAGE = "Demo Mode — No data stored";

module.exports = {
  isIntakeDemoMode,
  INTAKE_DEMO_MODE_MESSAGE,
};
