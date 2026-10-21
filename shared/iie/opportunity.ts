import type { OpportunityRecord } from './contracts.ts';
import { assert, validateOpportunity } from './validation.ts';
/** Normalized provider IDs are stable across repeated scans. No heuristic merging of unrelated projects. */
export function opportunityKey(op: OpportunityRecord): string {
  validateOpportunity(op);
  return JSON.stringify([op.provider.trim().toLowerCase(),op.externalId.trim().toLowerCase()]);
}
/** Duplicate observations retain the most recently supplied record, provided that the identity agrees. */
export function deduplicateOpportunities(records: readonly OpportunityRecord[]): OpportunityRecord[] {
  const map=new Map<string,OpportunityRecord>();
  for(const record of records) {
    const key=opportunityKey(record);
    const previous=map.get(key);
    if(previous) {
      assert(previous.id===record.id,'CONFLICTING_IDENTITY',`Identity conflict for ${key}`);
      // Updates cannot silently erase earlier evidence references.
      const combined=[...new Set([...previous.evidenceIds,...record.evidenceIds])];
      map.set(key,{...record,evidenceIds:combined});
    } else map.set(key,record);
  }
  return [...map.values()];
}
