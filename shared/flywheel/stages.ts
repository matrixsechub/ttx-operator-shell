import type { FlywheelActionClass, FlywheelRiskLevel, FlywheelStageId } from "./contracts";

export interface FlywheelKpiDefinition { name: string; unit: string; target?: number }
export interface FlywheelStageDefinition {
  stageId: FlywheelStageId;
  numericOrder: number;
  displayName: string;
  description: string;
  acceptedCommands: string[];
  requiredInputs: string[];
  emittedOutputs: string[];
  approvalPolicy: FlywheelActionClass;
  autonomyCeiling: 0 | 1 | 2;
  riskCeiling: FlywheelRiskLevel;
  retryPolicy: { maxRetries: 3; baseDelayMs: number };
  timeoutMs: number;
  kpis: FlywheelKpiDefinition[];
  nextStage: FlywheelStageId;
  safeModeBehavior: string;
}

const rows: Array<Omit<FlywheelStageDefinition, "numericOrder" | "retryPolicy" | "timeoutMs" | "safeModeBehavior">> = [
  { stageId: "lead_generation", displayName: "Lead Generation", description: "Collect bounded lead signals.", acceptedCommands: ["SCAN", "ANALYZE", "SYNTH"], requiredInputs: ["mission"], emittedOutputs: ["lead_batch"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "low", kpis: [{ name: "leads_generated_week", unit: "count" }, { name: "icp_match_rate", unit: "percent" }, { name: "cost_per_lead", unit: "currency" }], nextStage: "lead_qualification" },
  { stageId: "lead_qualification", displayName: "Lead Qualification", description: "Score and tier lead signals.", acceptedCommands: ["ANALYZE", "SYNTH"], requiredInputs: ["lead_batch"], emittedOutputs: ["qualified_leads"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "low", kpis: [{ name: "qualified_tier_rate", unit: "percent" }, { name: "qualification_latency", unit: "milliseconds" }, { name: "rejection_precision", unit: "percent" }], nextStage: "personalized_outreach" },
  { stageId: "personalized_outreach", displayName: "Personalized Outreach", description: "Generate outreach proposals without sending.", acceptedCommands: ["GENERATE"], requiredInputs: ["qualified_leads"], emittedOutputs: ["outreach_drafts"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "medium", kpis: [{ name: "outreach_sent", unit: "count" }, { name: "open_rate", unit: "percent" }, { name: "reply_rate", unit: "percent" }], nextStage: "content_automation" },
  { stageId: "content_automation", displayName: "Content Automation", description: "Generate governed content artifacts.", acceptedCommands: ["GENERATE"], requiredInputs: ["outreach_drafts"], emittedOutputs: ["content_artifacts"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "medium", kpis: [{ name: "content_items_published", unit: "count" }, { name: "engagement_rate", unit: "percent" }, { name: "conversion_rate", unit: "percent" }], nextStage: "nurture_sequences" },
  { stageId: "nurture_sequences", displayName: "Nurture Sequences", description: "Propose bounded nurture sequences.", acceptedCommands: ["GENERATE"], requiredInputs: ["content_artifacts"], emittedOutputs: ["nurture_plan"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "medium", kpis: [{ name: "nurture_completion_rate", unit: "percent" }, { name: "click_rate", unit: "percent" }, { name: "qualified_handoff_rate", unit: "percent" }], nextStage: "sales_automation" },
  { stageId: "sales_automation", displayName: "Sales Automation", description: "Prepare sales workflow artifacts.", acceptedCommands: ["GENERATE", "SYNTH"], requiredInputs: ["nurture_plan"], emittedOutputs: ["sales_plan"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "medium", kpis: [{ name: "discovery_calls", unit: "count" }, { name: "proposal_rate", unit: "percent" }, { name: "close_rate", unit: "percent" }, { name: "pipeline_value", unit: "currency" }], nextStage: "service_delivery" },
  { stageId: "service_delivery", displayName: "Service Delivery", description: "Assemble delivery artifacts.", acceptedCommands: ["SYNTH"], requiredInputs: ["sales_plan"], emittedOutputs: ["delivery_packet"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "medium", kpis: [{ name: "delivery_cycle_time", unit: "hours" }, { name: "client_acceptance_rate", unit: "percent" }, { name: "knowledge_artifacts_created", unit: "count" }], nextStage: "optimization_loop" },
  { stageId: "optimization_loop", displayName: "Optimization Loop", description: "Analyze delivery evidence.", acceptedCommands: ["ANALYZE", "LOOP"], requiredInputs: ["delivery_packet"], emittedOutputs: ["optimization_plan"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "medium", kpis: [{ name: "optimization_actions_completed", unit: "count" }, { name: "flywheel_velocity_change", unit: "percent" }], nextStage: "scaling_workflows" },
  { stageId: "scaling_workflows", displayName: "Scaling Workflows", description: "Propose scaling changes without deployment.", acceptedCommands: ["GENERATE", "LOOP"], requiredInputs: ["optimization_plan"], emittedOutputs: ["scaling_proposal"], approvalPolicy: "C3", autonomyCeiling: 1, riskCeiling: "high", kpis: [{ name: "automation_rate", unit: "percent" }, { name: "workflow_error_rate", unit: "percent" }, { name: "hours_saved", unit: "hours" }], nextStage: "continuous_improvement" },
  { stageId: "continuous_improvement", displayName: "Continuous Improvement", description: "Create a governed next-cycle proposal.", acceptedCommands: ["SYNTH", "LOOP"], requiredInputs: ["scaling_proposal"], emittedOutputs: ["cycle_proposal"], approvalPolicy: "C2", autonomyCeiling: 1, riskCeiling: "high", kpis: [{ name: "prompts_optimized", unit: "count" }, { name: "local_processing_ratio", unit: "percent" }, { name: "recommendations_accepted", unit: "percent" }], nextStage: "lead_generation" },
];

export const FLYWHEEL_STAGE_REGISTRY: readonly FlywheelStageDefinition[] = rows.map((row, index) => ({ ...row, numericOrder: index + 1, retryPolicy: { maxRetries: 3, baseDelayMs: 250 }, timeoutMs: 30_000, safeModeBehavior: "Preserve state and evidence; deny material execution." }));
export const STAGE_BY_ID = Object.fromEntries(FLYWHEEL_STAGE_REGISTRY.map((stage) => [stage.stageId, stage])) as Record<FlywheelStageId, FlywheelStageDefinition>;
export function stageFromTarget(target: string): FlywheelStageDefinition | null {
  const match = /^STAGE_(10|[1-9])$/.exec(target);
  return match ? FLYWHEEL_STAGE_REGISTRY[Number(match[1]) - 1] ?? null : null;
}
