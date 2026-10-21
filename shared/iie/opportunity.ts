import type { OpportunityRecord, PayTerms } from './contracts.ts';
import { assert, stageCanReach, validateOpportunity } from './validation.ts';
/** Normalized provider IDs are stable across repeated scans. No heuristic merging of unrelated projects. */
export function opportunityKey(op: OpportunityRecord): string {
  validateOpportunity(op);
  return JSON.stringify([op.provider.trim().toLowerCase(),op.externalId.trim().toLowerCase()]);
}
function sameAgreedPay(left: PayTerms, right: PayTerms): boolean {
  return left.currency===right.currency && left.amountMinor===right.amountMinor && left.unit===right.unit && left.termsEvidenceId===right.termsEvidenceId;
}
function mergeAgreedPay(left?: PayTerms, right?: PayTerms): PayTerms | undefined {
  if(!left) return right;
  if(!right) return left;
  assert(sameAgreedPay(left,right),'CONFLICTING_TERMS','Duplicate observations disagree on agreed pay');
  return left;
}
/** Equal stages keep the later observation. A stage is kept only when the other stage can reach it. */
function laterObservation(previous: OpportunityRecord, incoming: OpportunityRecord): OpportunityRecord {
  if(previous.stage===incoming.stage) return incoming;
  const forward=stageCanReach(previous.stage,incoming.stage);
  const backward=stageCanReach(incoming.stage,previous.stage);
  assert(forward!==backward,'CONFLICTING_STAGE',`${previous.stage} and ${incoming.stage} are not on one path`);
  return forward?incoming:previous;
}
/** Duplicate observations keep one identity. Stage and agreed pay do not depend on input order. */
export function deduplicateOpportunities(records: readonly OpportunityRecord[]): OpportunityRecord[] {
  const map=new Map<string,OpportunityRecord>();
  for(const record of records) {
    const key=opportunityKey(record);
    const previous=map.get(key);
    if(!previous) { map.set(key,record); continue; }
    assert(previous.id===record.id,'CONFLICTING_IDENTITY',`Identity conflict for ${key}`);
    const agreedPay=mergeAgreedPay(previous.agreedPay,record.agreedPay);
    const survivor=laterObservation(previous,record);
    // Updates cannot silently erase earlier evidence references.
    const evidenceIds=[...new Set([...previous.evidenceIds,...record.evidenceIds])];
    map.set(key,{...survivor,agreedPay,evidenceIds});
  }
  return [...map.values()];
}
