import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicateOpportunities,opportunityKey} from '../../shared/iie/opportunity.ts';
import {transitionOpportunity} from '../../shared/iie/validation.ts';
import {op} from './fixtures.ts';
test('IIE-001: same provider event deduplicates',()=>{const d=deduplicateOpportunities([op(),op({title:'Updated synthetic test'})]);assert.equal(d.length,1);assert.equal(d[0]?.title,'Updated synthetic test');});
test('same platform ID, conflicting internal identity raises error',()=>{assert.throws(()=>deduplicateOpportunities([op(),op({id:'other-id'})]),{code:'CONFLICTING_IDENTITY'});});
test('provider is part of the identity, and case/space normalized',()=>{assert.equal(opportunityKey(op({provider:' SYNTHETIC.QA ',externalId:'A1'})),opportunityKey(op()));assert.equal(deduplicateOpportunities([op(),op({provider:'other.provider',id:'different'})]).length,2);});
test('IIE-005 state is not payable without independent verified evidence',()=>{const o=transitionOpportunity(op(),'ACCEPTED');assert.equal(o.stage,'ACCEPTED');assert.equal(o.agreedPay,undefined);});
test('terminal rejection cannot be promoted to accepted',()=>{assert.throws(()=>transitionOpportunity(op({stage:'REJECTED'}),'ACCEPTED'),{code:'INVALID_TRANSITION'});});
test('duplicate observations cannot regress stage in either order',()=>{
  const accepted=op({id:'op-1',externalId:'A1',stage:'ACCEPTED',title:'Accepted synthetic',agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'rate'},evidenceIds:['accepted','rate']});
  const discovered=op({id:'op-1',externalId:'A1',stage:'DISCOVERED',title:'Stale synthetic'});
  assert.equal(deduplicateOpportunities([accepted,discovered])[0]?.stage,'ACCEPTED');
  assert.equal(deduplicateOpportunities([discovered,accepted])[0]?.stage,'ACCEPTED');
  assert.equal(deduplicateOpportunities([accepted,discovered])[0]?.title,'Accepted synthetic');
});
test('incompatible agreed pay is rejected independent of order',()=>{
  const low=op({id:'op-1',externalId:'A1',stage:'ACCEPTED',agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'rate'}});
  const high=op({id:'op-1',externalId:'A1',stage:'ACCEPTED',agreedPay:{currency:'USD',amountMinor:9000,unit:'HOUR',termsEvidenceId:'rate'}});
  assert.throws(()=>deduplicateOpportunities([low,high]),{code:'CONFLICTING_TERMS'});
  assert.throws(()=>deduplicateOpportunities([high,low]),{code:'CONFLICTING_TERMS'});
});
test('a later observation cannot drop agreed pay',()=>{
  const withPay=op({id:'op-1',externalId:'A1',stage:'ACCEPTED',agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'rate'}});
  const dropped=op({id:'op-1',externalId:'A1',stage:'ACCEPTED'});
  assert.equal(deduplicateOpportunities([withPay,dropped])[0]?.agreedPay?.amountMinor,7000);
  assert.equal(deduplicateOpportunities([dropped,withPay])[0]?.agreedPay?.amountMinor,7000);
});
test('unreachable duplicate stages conflict',()=>{
  const completed=op({id:'op-1',stage:'COMPLETED'});
  const rejected=op({id:'op-1',stage:'REJECTED'});
  assert.throws(()=>deduplicateOpportunities([completed,rejected]),{code:'CONFLICTING_STAGE'});
  assert.throws(()=>deduplicateOpportunities([rejected,completed]),{code:'CONFLICTING_STAGE'});
});
