"""Lifecycle stage definitions and ownership for security-plane agents."""

from __future__ import annotations

AURELIUS_LIFECYCLE_STAGE = "03:ANALYSIS_READY"
TRAFFIC_LIFECYCLE_STAGE = "03:ANALYSIS_READY"

LIFECYCLE_ACTIVE_STAGE = "04:ACTIVE"
LIFECYCLE_REPORTING_STAGE = "08:REPORTING"

LIFECYCLE_STAGE_OWNERS: dict[str, str] = {
    "AureliusAgent": AURELIUS_LIFECYCLE_STAGE,
    "TrafficAcquisitionAgent": TRAFFIC_LIFECYCLE_STAGE,
    "SecurityAnalystAgent": "03:ANALYSIS",
    "ThreatModelingAgent": "05:THREAT_MODEL",
    "RedTeamAdversaryAgent": "06:RED_TEAM",
    "ComplianceGovernanceAgent": "07:COMPLIANCE",
}

# Analysis-ready → active → reporting mirrors Aurelius routing.
AGENT_LIFECYCLE_TRANSITIONS: dict[str, list[tuple[str, str]]] = {
    "AureliusAgent": [
        (AURELIUS_LIFECYCLE_STAGE, LIFECYCLE_ACTIVE_STAGE),
        (LIFECYCLE_ACTIVE_STAGE, LIFECYCLE_REPORTING_STAGE),
    ],
    "TrafficAcquisitionAgent": [
        (TRAFFIC_LIFECYCLE_STAGE, LIFECYCLE_ACTIVE_STAGE),
        (LIFECYCLE_ACTIVE_STAGE, LIFECYCLE_REPORTING_STAGE),
    ],
}


def next_lifecycle_stage(agent_name: str, current_stage: str) -> str | None:
    transitions = AGENT_LIFECYCLE_TRANSITIONS.get(agent_name, [])
    for source, target in transitions:
        if source == current_stage:
            return target
    return None


def owner_stage(agent_name: str) -> str | None:
    return LIFECYCLE_STAGE_OWNERS.get(agent_name)
