export const INTENT_QUALIFICATION_GOVERNANCE = {
  advisoryOnly: true,
  mutationAuthorized: false,
  operatorApprovalRequired: true,
} as const;

export type IntentQualificationGovernance = typeof INTENT_QUALIFICATION_GOVERNANCE;

export const INTENT_QUALIFICATION_MAX_BODY_BYTES = 4_096;
export const INTENT_QUALIFICATION_BATCH_LIMIT = 20;

export function summarizeIntentText(intent: string): string {
  return intent.trim().slice(0, 80);
}
