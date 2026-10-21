import type { EvidenceClaim, EvidenceLevel, EvidenceRecord, OpportunityRecord } from './contracts.ts';
import { assert, validateEvidence, validateTimestamp } from './validation.ts';
const levelValue: Record<EvidenceLevel,number> = {E0:0,E1:1,E2:2,E3:3,E4:4,E5:5};
export function evidenceForClaim(records: readonly EvidenceRecord[], ids: readonly string[], claim: EvidenceClaim, required: EvidenceLevel, asOf: string, maximumAgeDays?: number): {supported: boolean; ids: string[]; reason?: string} {
  validateTimestamp(asOf,'asOf');
  validateEvidence(records);
  const byId = new Map(records.map(e=>[e.id,e]));
  for(const id of ids) assert(byId.has(id),'MISSING_EVIDENCE',`Missing evidence ${id}`);
  const qualifying = ids.map(id=>byId.get(id)!).filter(e=>e.verified && e.claim===claim && levelValue[e.level]>=levelValue[required] && Date.parse(e.observedAt)<=Date.parse(asOf) && (maximumAgeDays===undefined || Date.parse(asOf)-Date.parse(e.observedAt)<=maximumAgeDays*86400000));
  if(!qualifying.length) return {supported:false,ids:[],reason:`No current verified ${claim} evidence (${required} required)`};
  const values = new Set(qualifying.filter(e=>e.assertedValue!==undefined).map(e=>e.assertedValue));
  if(values.size>1) return {supported:false,ids:qualifying.map(e=>e.id),reason:`Conflicting verified ${claim} evidence`};
  return {supported:true,ids:qualifying.map(e=>e.id)};
}
export function verifyTerms(op: OpportunityRecord, evidence: readonly EvidenceRecord[], agreed: boolean, asOf: string): boolean {
  const pay=agreed?op.agreedPay:op.advertisedPay;
  if(!pay) return false;
  if(!op.evidenceIds.includes(pay.termsEvidenceId)) return false;
  const record=evidence.find(e=>e.id===pay.termsEvidenceId);
  // The proof must corroborate these exact terms, not merely mention a rate.
  const expected=`${pay.currency}:${pay.amountMinor}:${pay.unit}`;
  return record?.assertedValue===expected && evidenceForClaim(evidence,op.evidenceIds,'RATE',agreed?'E3':'E1',asOf).supported;
}
