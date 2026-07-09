"""Agent registry configuration for the MSHOPS security plane."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

TrustLevel = Literal["LOW", "MEDIUM", "HIGH"]


@dataclass(frozen=True)
class AgentConfig:
    key: str
    name: str
    trust_level: TrustLevel
    enabled: bool
    namespaces: list[str]
    permitted_tools: list[str] = field(default_factory=list)
    lifecycle_stage: str = "03:ANALYSIS_READY"
    tm_escalation: bool = False


AGENT_REGISTRY: dict[str, AgentConfig] = {
    "aurelius": AgentConfig(
        key="aurelius",
        name="AureliusAgent",
        trust_level="MEDIUM",
        enabled=True,
        namespaces=["session:analysis"],
        permitted_tools=[
            "siem_read",
            "rag_retrieval",
            "cve_lookup",
            "report_write",
            "safe_telemetry_log",
        ],
        lifecycle_stage="03:ANALYSIS_READY",
    ),
    "traffic": AgentConfig(
        key="traffic",
        name="TrafficAcquisitionAgent",
        trust_level="MEDIUM",
        enabled=True,
        namespaces=["session:marketing"],
        permitted_tools=[
            "content_generate",
            "seo_analyze",
            "telemetry_write",
            "distribution_push",
        ],
        lifecycle_stage="03:ANALYSIS_READY",
    ),
}


def get_enabled_agents() -> list[AgentConfig]:
    return [config for config in AGENT_REGISTRY.values() if config.enabled]


def get_agent(key: str) -> AgentConfig | None:
    return AGENT_REGISTRY.get(key)
