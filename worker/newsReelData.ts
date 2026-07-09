export type NewsReelCategory = "cloud" | "ai" | "security" | "ecosystem";

export interface NewsReelItem {
  id: string;
  title: string;
  summary: string;
  image: string;
  category: NewsReelCategory;
}

export const NEWS_REEL_ITEMS: NewsReelItem[] = [
  {
    id: "cloud-zero-trust-2026",
    title: "Zero-Trust Cloud Posture Shifts Left",
    summary:
      "Enterprise teams are tightening identity-boundary checks before workload deployment. MatrixSecHub observers should map new conditional-access gaps across multi-cloud control planes.",
    image: "/assets/news/cloud-zero-trust.svg",
    category: "cloud",
  },
  {
    id: "ai-agent-tool-poisoning",
    title: "Agentic Tool Poisoning Surfaces Rise",
    summary:
      "Malicious tool metadata is entering agent orchestration pipelines. Operator consoles need telemetry on unexpected tool swaps and privilege escalation via MCP gateways.",
    image: "/assets/news/ai-tool-poisoning.svg",
    category: "ai",
  },
  {
    id: "rag-pipeline-exfiltration",
    title: "RAG Pipeline Exfiltration Vectors",
    summary:
      "Retrieval layers are becoming lateral movement paths for sensitive document leakage. Harden chunk-level access controls and monitor anomalous embedding query bursts.",
    image: "/assets/news/rag-exfiltration.svg",
    category: "security",
  },
  {
    id: "identity-drift-alerts",
    title: "Identity Drift Alerts Accelerate",
    summary:
      "Service principal rotations and stale federation trust are triggering drift signals across operator environments. Review IAM baselines before cockpit activation windows.",
    image: "/assets/news/identity-drift.svg",
    category: "security",
  },
  {
    id: "ecosystem-telemetry-uplink",
    title: "Ecosystem Telemetry Uplink Stable",
    summary:
      "Public storefront surfaces report healthy observer-mode uplinks. Worker-visible readiness signals confirm marketplace catalog sync without auth dependencies.",
    image: "/assets/news/ecosystem-telemetry.svg",
    category: "ecosystem",
  },
  {
    id: "llm-supply-chain-risk",
    title: "LLM Supply Chain Risk Briefing",
    summary:
      "Model artifact provenance and fine-tune dataset integrity are under scrutiny. Validate model registry attestations before promoting agents to production tiers.",
    image: "/assets/news/llm-supply-chain.svg",
    category: "ai",
  },
  {
    id: "cloud-secrets-rotation",
    title: "Cloud Secrets Rotation Cadence Tightens",
    summary:
      "Regulated workloads now require sub-30-day secret rotation with audit trails. Align operator runbooks with automated revocation hooks in the security panel.",
    image: "/assets/news/cloud-secrets.svg",
    category: "cloud",
  },
  {
    id: "threat-intel-quarterly",
    title: "Quarterly Threat Intel Drop",
    summary:
      "The latest agentic-systems briefing covers orchestration failures, prompt injection chains, and defensive posture updates for operator marketplace modules.",
    image: "/assets/news/threat-intel.svg",
    category: "ecosystem",
  },
];
