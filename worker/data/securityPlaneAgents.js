/**
 * JS mirror of ai-security-framework AGENT_REGISTRY + security_plane metadata.
 * Source of truth: agent_config.py, security_plane/lifecycle.py, security_plane/permissions.py
 * Security Plane version: 1.0.0-bootstrap
 */

const MEMORY_NAMESPACE_MAP = {
  "session:analysis": {
    read_agents: ["AureliusAgent", "intake_agent_v2", "ComplianceGovernanceAgent"],
    write_agents: ["AureliusAgent"],
  },
  "session:investigation": {
    read_agents: ["SecurityAnalystAgent", "AureliusAgent", "ComplianceGovernanceAgent"],
    write_agents: ["SecurityAnalystAgent"],
  },
  "session:threat_model": {
    read_agents: ["ThreatModelingAgent", "ComplianceGovernanceAgent"],
    write_agents: ["ThreatModelingAgent"],
  },
  "session:redteam_sandbox": {
    read_agents: ["RedTeamAdversaryAgent", "ComplianceGovernanceAgent"],
    write_agents: ["RedTeamAdversaryAgent"],
  },
  "kb:cve": {
    read_agents: ["SecurityAnalystAgent", "ThreatModelingAgent", "ComplianceGovernanceAgent"],
    write_agents: [],
  },
  "kb:mitre": {
    read_agents: ["SecurityAnalystAgent", "ThreatModelingAgent", "RedTeamAdversaryAgent", "ComplianceGovernanceAgent"],
    write_agents: [],
  },
  "kb:nist_controls": {
    read_agents: ["ThreatModelingAgent", "ComplianceGovernanceAgent"],
    write_agents: [],
  },
  "kb:nist_ai_rmf": {
    read_agents: ["ComplianceGovernanceAgent"],
    write_agents: [],
  },
  "kb:soc2_criteria": {
    read_agents: ["ComplianceGovernanceAgent"],
    write_agents: [],
  },
  "kb:asset_inventory": {
    read_agents: ["ThreatModelingAgent"],
    write_agents: [],
  },
  "kb:threat_intel": {
    read_agents: ["SecurityAnalystAgent"],
    write_agents: [],
  },
  "audit:decisions": {
    read_agents: ["ComplianceGovernanceAgent"],
    write_agents: ["ComplianceGovernanceAgent"],
  },
};

const AGENT_REGISTRY = {
  security_analyst: {
    enabled: true,
    name: "SecurityAnalystAgent",
    trust_level: "MEDIUM",
    lifecycle_stage: "03:ANALYSIS",
    permitted_tools: ["siem_read", "cve_lookup", "rag_retrieval", "threat_intel", "report_write"],
    tm_escalation: true,
  },
  threat_modeling: {
    enabled: true,
    name: "ThreatModelingAgent",
    trust_level: "MEDIUM",
    lifecycle_stage: "05:THREAT_MODEL",
    permitted_tools: ["mitre_attck", "cve_lookup", "rag_retrieval", "report_write"],
    tm_escalation: true,
  },
  red_team_adversary: {
    enabled: true,
    name: "RedTeamAdversaryAgent",
    trust_level: "LOW",
    lifecycle_stage: "06:RED_TEAM",
    permitted_tools: ["mitre_attck", "simulation_exec", "rag_retrieval"],
    tm_escalation: false,
  },
  compliance_governance: {
    enabled: true,
    name: "ComplianceGovernanceAgent",
    trust_level: "HIGH",
    lifecycle_stage: "07:COMPLIANCE",
    permitted_tools: ["compliance_db", "rag_retrieval", "policy_gate", "alert_dispatch", "report_write"],
    tm_escalation: false,
  },
  aurelius: {
    enabled: true,
    name: "AureliusAgent",
    trust_level: "MEDIUM",
    lifecycle_stage: "03:ANALYSIS_READY",
    permitted_tools: ["siem_read", "rag_retrieval", "cve_lookup", "report_write", "safe_telemetry_log"],
    readable_namespaces: ["session:analysis", "session:investigation"],
    writable_namespaces: ["session:analysis"],
    tm_escalation: false,
  },
};

function namespacesForAgent(agentName, accessType) {
  const field = accessType === "write" ? "write_agents" : "read_agents";
  return Object.entries(MEMORY_NAMESPACE_MAP)
    .filter(([, config]) => Array.isArray(config[field]) && config[field].includes(agentName))
    .map(([namespace]) => namespace)
    .sort();
}

function buildAgentRecord(key, config) {
  return {
    key,
    agent_config_key: key,
    name: config.name,
    lifecycle_stage: config.lifecycle_stage,
    trust_level: config.trust_level,
    readable_namespaces:
      config.readable_namespaces ?? namespacesForAgent(config.name, "read"),
    writable_namespaces:
      config.writable_namespaces ?? namespacesForAgent(config.name, "write"),
    permitted_tools: [...config.permitted_tools],
    tm_escalation: Boolean(config.tm_escalation),
  };
}

export function listSecurityPlaneAgents() {
  return Object.entries(AGENT_REGISTRY)
    .filter(([, config]) => config.enabled === true)
    .map(([key, config]) => buildAgentRecord(key, config));
}

export function getSecurityPlaneAgentsResponse() {
  return {
    version: "1.0.0-bootstrap",
    planRevision: "v1",
    generatedAt: new Date().toISOString(),
    agents: listSecurityPlaneAgents(),
  };
}

export default {
  listSecurityPlaneAgents,
  getSecurityPlaneAgentsResponse,
  AGENT_REGISTRY,
};
