"""Namespace and tool permissions for security-plane agents."""

from __future__ import annotations

from dataclasses import dataclass, field

TRAFFIC_READABLE_NAMESPACES = ["session:marketing"]
TRAFFIC_WRITABLE_NAMESPACES = ["session:marketing"]

TRAFFIC_PERMITTED_TOOLS = [
    "content_generate",
    "seo_analyze",
    "telemetry_write",
    "distribution_push",
]

AGENT_NAMESPACE_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "TrafficAcquisitionAgent": {
        "readable": TRAFFIC_READABLE_NAMESPACES,
        "writable": TRAFFIC_WRITABLE_NAMESPACES,
    },
    "AureliusAgent": {
        "readable": ["session:analysis", "session:investigation"],
        "writable": ["session:analysis"],
    },
}

AGENT_TOOL_PERMISSIONS: dict[str, list[str]] = {
    "TrafficAcquisitionAgent": TRAFFIC_PERMITTED_TOOLS,
    "AureliusAgent": [
        "siem_read",
        "rag_retrieval",
        "cve_lookup",
        "report_write",
        "safe_telemetry_log",
    ],
}


@dataclass(frozen=True)
class AgentPermissionProfile:
    agent_name: str
    readable_namespaces: list[str] = field(default_factory=list)
    writable_namespaces: list[str] = field(default_factory=list)
    permitted_tools: list[str] = field(default_factory=list)


def get_permission_profile(agent_name: str) -> AgentPermissionProfile:
    namespace = AGENT_NAMESPACE_PERMISSIONS.get(agent_name, {})
    return AgentPermissionProfile(
        agent_name=agent_name,
        readable_namespaces=list(namespace.get("readable", [])),
        writable_namespaces=list(namespace.get("writable", [])),
        permitted_tools=list(AGENT_TOOL_PERMISSIONS.get(agent_name, [])),
    )
