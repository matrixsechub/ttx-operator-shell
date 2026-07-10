import type { GovernanceState } from "./do/types";

/** Safe Northstar fallback when Governance DO is unreachable. */
export function defaultGovernanceState(): GovernanceState {
  const now = new Date().toISOString();
  return {
    northstar: {
      statement: "Operator-grade OS with FedGrade gates, marketplace integrity, and council oversight.",
      version: 1,
      updatedAt: now,
    },
    strategicAxis: [
      { id: "axis-security", name: "Security Posture", weight: 0.35, status: "active" },
      { id: "axis-delivery", name: "Delivery Velocity", weight: 0.3, status: "active" },
      { id: "axis-market", name: "Marketplace Integrity", weight: 0.2, status: "watch" },
      { id: "axis-governance", name: "Council Mandates", weight: 0.15, status: "active" },
    ],
    mandateRegistry: [
      {
        id: "mandate-fedgrade",
        title: "Maintain FedGrade advisory gates on protected routes",
        status: "approved",
        owner: "council",
        axisId: "axis-security",
      },
      {
        id: "mandate-marketplace",
        title: "Validate marketplace module entitlements before cockpit unlock",
        status: "approved",
        owner: "council",
        axisId: "axis-market",
      },
    ],
    eventLog: [],
  };
}
