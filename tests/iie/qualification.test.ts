import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyOpportunity} from '../../shared/iie/qualification.ts';
import {evidence,NOW,op,acceptedOp} from './fixtures.ts';
test('IIE-002: missing pay is unknown, not zero',()=>{const d=qualifyOpportunity(op({advertisedPay:undefined}),evidence,NOW);assert(d.warnings.includes('COMPENSATION_UNKNOWN'));assert.equal(d.score.values.effectiveReturn,null);});
test('IIE-003: screener rejection has no action, never DO',()=>{const d=qualifyOpportunity(op({stage:'REJECTED'}),evidence,NOW);assert.equal(d.verdict,'REJECT');assert.notEqual(d.priority,'P0');});
test('IIE-004: $200 advertised does not outrank $70 accepted',()=>{const a=qualifyOpportunity(op(),evidence,NOW),b=qualifyOpportunity(acceptedOp(),evidence,NOW);assert.equal(a.priority,'P1');assert.equal(b.priority,'P0');assert.equal(a.score.values.effectiveReturn,null);assert.equal(b.verdict,'DO');});
test('IIE-005: accepted state needs E3 evidence',()=>{const a=qualifyOpportunity(acceptedOp({evidenceIds:['rate']}),evidence,NOW);assert.notEqual(a.verdict,'DO');assert(a.warnings.includes('ACCEPTANCE_NOT_VERIFIED'));});
test('IIE-013: local deadline without offset is invalid',()=>{assert.throws(()=>qualifyOpportunity(op({deadlineAt:'2026-10-21T16:00:00'}),evidence,NOW),{code:'INVALID_TIMEZONE'});});
test('IIE-014: Saturday requirement blocks selection',()=>{const d=qualifyOpportunity(acceptedOp({schedule:{asyncWork:false,exclusivity:false,requiresSaturday:true}}),evidence,NOW);assert.equal(d.verdict,'HOLD');assert(d.warnings.includes('PROTECTED_SATURDAY_CONFLICT'));});
test('IIE-015: fixed 40 hours flagged and held',()=>{const d=qualifyOpportunity(acceptedOp({schedule:{asyncWork:false,exclusivity:false,requiresSaturday:false,minimumWeeklyHours:40}}),evidence,NOW);assert.equal(d.verdict,'HOLD');assert(d.warnings.includes('FIXED_40_HOUR_COMMITMENT'));});
test('IIE-016: missing evidence ref throws, no promotion',()=>{assert.throws(()=>qualifyOpportunity(op({evidenceIds:['nonexistent']}),evidence,NOW),{code:'MISSING_EVIDENCE'});});
test('unverified rate cannot be treated as expected economic return',()=>{const d=qualifyOpportunity(acceptedOp({agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'adRate'},evidenceIds:['accepted','adRate']}),evidence,NOW);assert.equal(d.score.values.effectiveReturn,null);assert(d.warnings.includes('AGREED_RATE_NOT_VERIFIED'));});
test('expired invitation cannot remain actionable',()=>{const d=qualifyOpportunity(op({deadlineAt:'2026-10-20T00:00:00Z'}),evidence,NOW);assert.equal(d.verdict,'REJECT');});
test('bounty classified as P4, never secured by listing',()=>{const d=qualifyOpportunity(op({category:'BUG_BOUNTY',stage:'DISCOVERED',evidenceIds:['list']}),evidence,NOW);assert.equal(d.priority,'P4');assert.notEqual(d.verdict,'DO');});
test('missing pay and acceptance never treated as payable P0',()=>{const d=qualifyOpportunity(acceptedOp({agreedPay:undefined,advertisedPay:undefined}),evidence,NOW);assert.notEqual(d.priority,'P0');});

test('exact compensation must match the supporting E3 fact',()=>{const d=qualifyOpportunity(acceptedOp({agreedPay:{currency:'USD',amountMinor:9000,unit:'HOUR',termsEvidenceId:'rate'}}),evidence,NOW);assert.equal(d.priority,'P1');assert(d.warnings.includes('AGREED_RATE_NOT_VERIFIED'));});
test('expected payment date cannot be scored without matching verified source',()=>{const d=qualifyOpportunity(acceptedOp({expectedPaymentAt:'2026-11-01T08:00:00Z'}),evidence,NOW);assert.equal(d.score.values.paymentSpeed,null);assert(d.warnings.includes('PAYMENT_DATE_NOT_VERIFIED'));});

test('conflicting E3 rate facts block confirmed pay',()=>{const extra={id:'rate-conflict',source:'synthetic:other',claim:'RATE' as const,level:'E3' as const,verified:true,assertedValue:'USD:9000:HOUR',observedAt:NOW};const d=qualifyOpportunity(acceptedOp({evidenceIds:['accepted','rate','rate-conflict','paymentTerms']}),[...evidence,extra],NOW);assert.equal(d.priority,'P1');assert(d.warnings.includes('AGREED_RATE_NOT_VERIFIED'));});
