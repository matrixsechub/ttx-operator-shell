import type { ComponentType } from "react";
import { ReconSuite } from "./recon";
import { SignalIntelligencePanel } from "./signals";
import { HunterKillerScanner } from "./hunter";
import { OperatorWorkflowEngine } from "./workflow";
import { MSHAnalyzerNode } from "./analyzer";
import { CodexTerminal } from "./terminal";
import { OperatorVault } from "./vault";
import { MissionComposer } from "./missions";
import { OperatorHealthMonitor } from "./health";
import { AISecurityArchitectRail } from "./ai-security";
import { OperatorSandbox } from "./sandbox";
import { CloudflarePerimeterConsole } from "./perimeter";

export interface OperatorSystemEntry {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const OPERATOR_SYSTEMS: OperatorSystemEntry[] = [
  { slug: "recon", label: "Recon Suite", Component: ReconSuite },
  { slug: "signals", label: "Signal Intelligence Panel", Component: SignalIntelligencePanel },
  { slug: "hunter", label: "Hunter-Killer Scanner", Component: HunterKillerScanner },
  { slug: "workflow", label: "Operator Workflow Engine", Component: OperatorWorkflowEngine },
  { slug: "analyzer", label: "MSH Analyzer Node", Component: MSHAnalyzerNode },
  { slug: "terminal", label: "Codex Terminal", Component: CodexTerminal },
  { slug: "vault", label: "Operator Vault", Component: OperatorVault },
  { slug: "missions", label: "Mission Composer", Component: MissionComposer },
  { slug: "health", label: "Operator Health Monitor", Component: OperatorHealthMonitor },
  { slug: "ai-security", label: "AI Security Architect Rail", Component: AISecurityArchitectRail },
  { slug: "sandbox", label: "Operator Sandbox", Component: OperatorSandbox },
  { slug: "perimeter", label: "Cloudflare Perimeter Console", Component: CloudflarePerimeterConsole },
];

export function getOperatorSystem(slug: string): OperatorSystemEntry | undefined {
  return OPERATOR_SYSTEMS.find((system) => system.slug === slug);
}
