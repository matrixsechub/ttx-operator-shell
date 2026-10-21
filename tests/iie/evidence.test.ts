import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyTerms} from '../../shared/iie/evidence.ts';
import {qualifyOpportunity} from '../../shared/iie/qualification.ts';
import type {EvidenceRecord} from '../../shared/iie/contracts.ts';
import {acceptedOp,evidence,NOW,op} from './fixtures.ts';

function rate(overrides: Partial<EvidenceRecord> & Pick<EvidenceRecord,'id'>): EvidenceRecord {
  return {source:'synthetic:terms',claim:'RATE',level:'E3',verified:true,assertedValue:'USD:7000:HOUR',observedAt:NOW,...overrides};
}

test('referenced agreed rate must itself be verified E3, not a different evidence id',()=>{
  const linked=rate({id:'linked-rate',level:'E1',verified:false});
  const other=rate({id:'other-rate'});
  const decision=qualifyOpportunity(acceptedOp({
    evidenceIds:['accepted','linked-rate','other-rate','paymentTerms'],
    agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'linked-rate'},
  }),[...evidence,linked,other],NOW);
  assert.notEqual(decision.priority,'P0');
  assert.equal(decision.verdict==='DO',false);
  assert(decision.warnings.includes('AGREED_RATE_NOT_VERIFIED'));
});

test('verified E1 linked rate cannot borrow a separate E3 rate',()=>{
  const linked=rate({id:'linked-e1',level:'E1',verified:true});
  const other=rate({id:'other-e3'});
  const decision=qualifyOpportunity(acceptedOp({
    evidenceIds:['accepted','linked-e1','other-e3','paymentTerms'],
    agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'linked-e1'},
  }),[...evidence,linked,other],NOW);
  assert.notEqual(decision.priority,'P0');
  assert(decision.warnings.includes('AGREED_RATE_NOT_VERIFIED'));
});

test('future or stale referenced rate is not fresh even when another rate matches',()=>{
  const linked=rate({id:'linked-future',observedAt:'2026-10-22T08:00:00Z'});
  const current=rate({id:'current-rate'});
  const futureOp=acceptedOp({
    evidenceIds:['accepted','linked-future','current-rate','paymentTerms'],
    agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'linked-future'},
  });
  const decision=qualifyOpportunity(futureOp,[...evidence,linked,current],NOW);
  assert.notEqual(decision.priority,'P0');
  const stale=rate({id:'linked-stale',observedAt:'2026-01-01T00:00:00Z'});
  assert.equal(verifyTerms(acceptedOp({
    evidenceIds:['accepted','linked-stale','current-rate','paymentTerms'],
    agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'linked-stale'},
  }),[...evidence,stale,current],true,NOW,30),false);
});

test('exact referenced E3 rate still agrees, and a conflicting qualifying rate does not',()=>{
  assert.equal(verifyTerms(acceptedOp(),evidence,true,NOW),true);
  const conflict=rate({id:'rate-conflict',assertedValue:'USD:9000:HOUR'});
  assert.equal(verifyTerms(acceptedOp({evidenceIds:['accepted','rate','rate-conflict','paymentTerms']}),[...evidence,conflict],true,NOW),false);
});

test('advertised terms require the referenced E1 record, not a different rate',()=>{
  const linked=rate({id:'linked-ad',level:'E1',verified:false,assertedValue:'USD:20000:HOUR'});
  const listed=op({evidenceIds:['list','invite','linked-ad','adRate'],advertisedPay:{currency:'USD',amountMinor:20000,unit:'HOUR',termsEvidenceId:'linked-ad'}});
  assert.equal(verifyTerms(listed,[...evidence,linked],false,NOW),false);
  assert.equal(verifyTerms(op(),evidence,false,NOW),true);
});
