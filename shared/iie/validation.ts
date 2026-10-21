import type { EvidenceRecord, OpportunityRecord, OpportunityStage, PayTerms } from './contracts.ts';

export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'DomainError'; this.code = code; }
}
export function assert(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
export function isValidRfc3339(value: string): boolean {
  return /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
}
export function validateTimestamp(value: string, field: string): void {
  assert(isValidRfc3339(value), 'INVALID_TIMEZONE', `${field} must be RFC3339 with an explicit offset or Z`);
}
export function validateMinor(amount: number, field: string): void {
  assert(Number.isSafeInteger(amount) && amount >= 0, 'INVALID_MONEY', `${field} must be a nonnegative safe integer`);
}
export function validatePay(pay: PayTerms, field: string): void {
  assert(pay.currency.length === 3 && /^[A-Z]{3}$/.test(pay.currency), 'INVALID_CURRENCY', `${field} currency must be ISO 4217 format`);
  validateMinor(pay.amountMinor, field);
  assert(['HOUR','TASK','FIXED'].includes(pay.unit), 'INVALID_PAY_UNIT', field);
  assert(Boolean(pay.termsEvidenceId), 'MISSING_EVIDENCE', `${field} missing evidence reference`);
}
export function validateOpportunity(op: OpportunityRecord): void {
  assert(Boolean(op.id && op.provider && op.externalId && op.title), 'INVALID_OPPORTUNITY', 'Identity/title missing');
  assert(['DISCOVERED','INVITED','SCREENING','ACCEPTED','ACTIVE','SUBMITTED','COMPLETED','REJECTED','EXPIRED','WITHDRAWN'].includes(op.stage), 'INVALID_STATE', 'Unknown opportunity state');
  assert(op.schedule !== undefined && typeof op.schedule.exclusivity === 'boolean' && typeof op.schedule.asyncWork === 'boolean' && typeof op.schedule.requiresSaturday === 'boolean', 'INVALID_SCHEDULE', 'Missing schedule fields');
  if (op.advertisedPay) validatePay(op.advertisedPay, 'advertisedPay');
  if (op.agreedPay) validatePay(op.agreedPay, 'agreedPay');
  if (op.deadlineAt) validateTimestamp(op.deadlineAt,'deadlineAt');
  if (op.expectedPaymentAt) validateTimestamp(op.expectedPaymentAt,'expectedPaymentAt');
  if (op.estimatedTotalHours !== undefined) assert(Number.isFinite(op.estimatedTotalHours) && op.estimatedTotalHours > 0, 'INVALID_HOURS', 'estimatedTotalHours must be positive');
  if (op.requiredUnpaidHours !== undefined) assert(Number.isFinite(op.requiredUnpaidHours) && op.requiredUnpaidHours >= 0, 'INVALID_HOURS', 'requiredUnpaidHours must be nonnegative');
  if (op.schedule.minimumWeeklyHours !== undefined) assert(Number.isFinite(op.schedule.minimumWeeklyHours) && op.schedule.minimumWeeklyHours >= 0, 'INVALID_HOURS', 'minimumWeeklyHours must be nonnegative');
  if (op.directCostsMinor !== undefined) validateMinor(op.directCostsMinor, 'directCostsMinor');
}
const allowed: Record<OpportunityStage, readonly OpportunityStage[]> = {
  DISCOVERED:['INVITED','SCREENING','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN'],
  INVITED:['SCREENING','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN'],
  SCREENING:['ACCEPTED','REJECTED','EXPIRED','WITHDRAWN'],
  ACCEPTED:['ACTIVE','SUBMITTED','COMPLETED','WITHDRAWN'],
  ACTIVE:['SUBMITTED','COMPLETED','WITHDRAWN'],
  SUBMITTED:['COMPLETED','REJECTED'],
  COMPLETED:[],REJECTED:[],EXPIRED:[],WITHDRAWN:[],
};
export function transitionOpportunity(op: OpportunityRecord, to: OpportunityStage): OpportunityRecord {
  validateOpportunity(op);
  assert(allowed[op.stage].includes(to), 'INVALID_TRANSITION', `${op.stage} cannot transition to ${to}`);
  return { ...op, stage: to };
}
export function validateEvidence(records: readonly EvidenceRecord[]): void {
  const ids = new Set<string>();
  for (const e of records) {
    assert(Boolean(e.id && e.source && e.claim), 'INVALID_EVIDENCE', 'Missing evidence ID/source/claim');
    assert(!ids.has(e.id), 'DUPLICATE_EVIDENCE', e.id);
    ids.add(e.id);
    assert(['E0','E1','E2','E3','E4','E5'].includes(e.level), 'INVALID_EVIDENCE', e.id);
    validateTimestamp(e.observedAt,'observedAt');
  }
}
