/** IIE v1.0 source-only contracts. No external services or authority. */
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'MXN' | string;
export type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
export type EvidenceClaim = 'LISTED' | 'INVITED' | 'ELIGIBLE' | 'ACCEPTED' | 'RATE' | 'DEADLINE' | 'PAYMENT_TERMS' | 'WORK_APPROVED' | 'PAYMENT_POSTED';
export interface EvidenceRecord {
  readonly id: string;
  readonly source: string;
  readonly claim: EvidenceClaim;
  readonly level: EvidenceLevel;
  readonly observedAt: string;
  readonly verified: boolean;
  /** Canonical stated value, optional. Conflicting verified values prevent promotion. */
  readonly assertedValue?: string;
}
export type OpportunityCategory = 'AI_EVALUATION' | 'CYBERSECURITY' | 'QA_TESTING' | 'PAID_RESEARCH' | 'CONSULTING' | 'CONTRACT_ROLE' | 'QUALIFICATION' | 'BUG_BOUNTY' | 'OTHER';
export type OpportunityStage = 'DISCOVERED' | 'INVITED' | 'SCREENING' | 'ACCEPTED' | 'ACTIVE' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
export type PayUnit = 'HOUR' | 'TASK' | 'FIXED';
export interface PayTerms {
  readonly currency: Currency;
  readonly amountMinor: number;
  readonly unit: PayUnit;
  readonly termsEvidenceId: string;
}
export interface ScheduleConstraints {
  readonly asyncWork: boolean;
  readonly minimumWeeklyHours?: number;
  readonly exclusivity: boolean;
  readonly requiresSaturday: boolean;
}
export interface OpportunityRecord {
  readonly id: string;
  readonly provider: string;
  readonly externalId: string;
  readonly title: string;
  readonly category: OpportunityCategory;
  readonly stage: OpportunityStage;
  readonly evidenceIds: readonly string[];
  readonly advertisedPay?: PayTerms;
  readonly agreedPay?: PayTerms;
  readonly estimatedTotalHours?: number;
  readonly requiredUnpaidHours?: number;
  readonly directCostsMinor?: number;
  readonly schedule: ScheduleConstraints;
  /** RFC3339 with Z or explicit numeric offset. Never infer timezone. */
  readonly deadlineAt?: string;
  readonly expectedPaymentAt?: string;
  readonly repeatPaidAssignments?: number;
  readonly nextAction?: string;
}
export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type Verdict = 'DO' | 'TEST' | 'HOLD' | 'REJECT';
export type ScoringDimension = 'paymentCertainty' | 'paymentSpeed' | 'effectiveReturn' | 'flexibility' | 'repeatability';
export interface QualificationScore {
  readonly knownPoints: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly knownWeight: number;
  readonly values: Readonly<Record<ScoringDimension, number | null>>;
}
export interface IncomeDecision {
  readonly opportunityId: string;
  readonly priority: Priority;
  readonly verdict: Verdict;
  readonly score: QualificationScore;
  readonly warnings: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly nextAction: string;
}
export type EarningStatus = 'SUBMITTED' | 'EARNED_UNAPPROVED' | 'APPROVED' | 'DISPUTED' | 'REVERSED';
export interface EarningRecord {
  readonly id: string;
  readonly assignmentId: string;
  readonly payer: string;
  readonly currency: Currency;
  readonly amountMinor: number;
  readonly status: EarningStatus;
  readonly evidenceIds: readonly string[];
  readonly macEnabled: boolean;
}
export type CashClassification = 'BUSINESS_INCOME' | 'OTHER_INCOME' | 'TRANSFER' | 'EXPENSE' | 'UNKNOWN' | 'REVERSAL';
export interface CashTransaction {
  readonly id: string;
  readonly source: string;
  readonly externalId: string;
  readonly currency: Currency;
  readonly amountMinor: number;
  readonly classification: CashClassification;
  readonly direction: 'IN' | 'OUT';
  readonly posted: boolean;
  readonly postedEvidenceId?: string;
  readonly reversesTransactionId?: string;
}
export interface PaymentAllocation {
  readonly id: string;
  readonly earningId: string;
  readonly transactionId: string;
  readonly amountMinor: number;
}
export interface ExpenseRecord {
  readonly id: string;
  readonly currency: Currency;
  readonly amountMinor: number;
  readonly incurred: boolean;
  readonly description: string;
}
export interface TimeEntry {
  readonly id: string;
  readonly assignmentId: string;
  readonly category: 'SCREENING' | 'APPLICATION' | 'ONBOARDING' | 'INTERVIEW' | 'DELIVERY' | 'TRAVEL' | 'ADMIN' | 'REWORK';
  readonly durationSeconds: number;
}
export interface IncomeLedgerInput {
  readonly evidence: readonly EvidenceRecord[];
  readonly earnings: readonly EarningRecord[];
  readonly cash: readonly CashTransaction[];
  readonly allocations: readonly PaymentAllocation[];
  readonly expenses: readonly ExpenseRecord[];
  readonly timeEntries: readonly TimeEntry[];
}
export interface CurrencySummary {
  readonly currency: Currency;
  readonly collectedMinor: number;
  readonly approvedUnpaidMinor: number;
  readonly earnedUnapprovedMinor: number;
  readonly expensesMinor: number;
  readonly preTaxCashAfterExpensesMinor: number;
  readonly macAttributedCollectedMinor: number;
}
export interface LedgerSummary {
  readonly byCurrency: readonly CurrencySummary[];
  readonly unmatchedCashTransactionIds: readonly string[];
  readonly timeSeconds: number;
  readonly macBookRecoveryRemainingUsdMinor: number;
}
export interface IncomeBriefAction {
  readonly opportunityId: string;
  readonly priority: Priority;
  readonly verdict: 'DO' | 'TEST';
  readonly instruction: string;
  readonly warnings: readonly string[];
}
export interface IncomeBrief {
  readonly generatedAt: string;
  readonly availablePaidWork: readonly string[];
  readonly pendingOpportunityIds: readonly string[];
  readonly actions: readonly IncomeBriefAction[];
  readonly ledger: LedgerSummary;
  readonly sourceCoverage: 'SYNTHETIC_ONLY';
  readonly recommendation: string;
}
