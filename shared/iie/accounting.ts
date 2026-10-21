import type { CashTransaction, CurrencySummary, EarningRecord, IncomeLedgerInput, LedgerSummary } from './contracts.ts';
import { evidenceForClaim } from './evidence.ts';
import { assert, validateEvidence, validateMinor, validateTimestamp } from './validation.ts';
const MACBOOK_COST_USD_MINOR=46856;
export function reconcileLedger(input:IncomeLedgerInput,asOf:string):LedgerSummary {
  validateTimestamp(asOf,'asOf');validateEvidence(input.evidence);
  const earnings=new Map<string,EarningRecord>();
  for(const e of input.earnings){
    assert(Boolean(e.id&&e.assignmentId&&e.payer),'INVALID_EARNING','Missing earning identity');
    assert(!earnings.has(e.id),'DUPLICATE_EARNING',e.id);
    validateMinor(e.amountMinor,'earning');
    assert(/^[A-Z]{3}$/.test(e.currency),'INVALID_CURRENCY',e.id);
    if(e.status==='APPROVED')assert(evidenceForClaim(input.evidence,e.evidenceIds,'WORK_APPROVED','E4',asOf).supported,'UNVERIFIED_EARNING',e.id);
    earnings.set(e.id,e);
  }
  const cash=new Map<string,CashTransaction>();
  const origin=new Map<string,CashTransaction>();
  for(const t of input.cash){
    validateMinor(t.amountMinor,'cash');
    assert(Boolean(t.id&&t.source&&t.externalId),'INVALID_CASH','Cash identity missing');
    assert(/^[A-Z]{3}$/.test(t.currency),'INVALID_CURRENCY',t.id);
    if(!t.posted)continue;
    assert(Boolean(t.postedEvidenceId),'MISSING_PAYMENT_EVIDENCE',t.id);
    assert(evidenceForClaim(input.evidence,[t.postedEvidenceId!],'PAYMENT_POSTED','E5',asOf).supported,'UNVERIFIED_PAYMENT',t.id);
    const key=JSON.stringify([t.source,t.externalId]);
    const prior=origin.get(key);
    if(prior){
      assert(prior.amountMinor===t.amountMinor&&prior.classification===t.classification&&prior.direction===t.direction&&prior.currency===t.currency&&prior.reversesTransactionId===t.reversesTransactionId,'CONFLICTING_CASH','External transaction ID has inconsistent values');
      continue;
    }
    origin.set(key,t);cash.set(t.id,t);
  }
  const reversals=new Map<string,number>();
  for(const t of cash.values()){
    if(t.classification!=='REVERSAL')continue;
    assert(t.direction==='OUT'&&Boolean(t.reversesTransactionId),'INVALID_REVERSAL',t.id);
    const original=cash.get(t.reversesTransactionId!);
    assert(original?.classification==='BUSINESS_INCOME'&&original.direction==='IN'&&original.currency===t.currency,'INVALID_REVERSAL','Reversal must reference a posted matching income transaction');
    const reversed=(reversals.get(original.id)??0)+t.amountMinor;
    assert(reversed<=original.amountMinor,'OVER_REVERSAL','Reversal exceeds receipt');
    reversals.set(original.id,reversed);
  }
  const allocationsByReceipt=new Map<string,Array<{id:string;earningId:string;amountMinor:number}>>();
  const allocationIds=new Set<string>();const nominalByEarning=new Map<string,number>();
  for(const a of input.allocations){
    validateMinor(a.amountMinor,'allocation');assert(a.amountMinor>0,'INVALID_ALLOCATION','Allocation must be positive');
    assert(!allocationIds.has(a.id),'DUPLICATE_ALLOCATION',a.id);allocationIds.add(a.id);
    const e=earnings.get(a.earningId),t=cash.get(a.transactionId);
    assert(e?.status==='APPROVED','UNAPPROVED_ALLOCATION',a.earningId);
    assert(t?.classification==='BUSINESS_INCOME'&&t.direction==='IN'&&e.currency===t.currency,'INVALID_ALLOCATION','Allocation must match a posted business receipt and currency');
    const ea=(nominalByEarning.get(e.id)??0)+a.amountMinor;
    assert(ea<=e.amountMinor,'OVER_ALLOCATION','Allocation exceeds approved earning');
    nominalByEarning.set(e.id,ea);
    const group=allocationsByReceipt.get(t.id)??[];
    group.push(a);allocationsByReceipt.set(t.id,group);
  }
  const effectiveByEarning=new Map<string,number>();const allocatedReceipts=new Set<string>();
  for(const [txId,items] of allocationsByReceipt){
    const receipt=cash.get(txId)!;
    const nominal=items.reduce((sum,a)=>sum+a.amountMinor,0);
    assert(nominal<=receipt.amountMinor,'OVER_RECEIPT_ALLOCATION',txId);
    let capacity=receipt.amountMinor-(reversals.get(txId)??0);
    for(const a of [...items].sort((x,y)=>x.id.localeCompare(y.id))){
      const taken=Math.min(capacity,a.amountMinor);capacity-=taken;
      effectiveByEarning.set(a.earningId,(effectiveByEarning.get(a.earningId)??0)+taken);
      if(taken>0)allocatedReceipts.add(txId);
    }
  }
  const byCurrency=new Map<string,{collectedMinor:number;approvedUnpaidMinor:number;earnedUnapprovedMinor:number;expensesMinor:number;macAttributedCollectedMinor:number}>();
  function row(cur:string){let v=byCurrency.get(cur);if(!v){v={collectedMinor:0,approvedUnpaidMinor:0,earnedUnapprovedMinor:0,expensesMinor:0,macAttributedCollectedMinor:0};byCurrency.set(cur,v);}return v;}
  const unmatched:string[]=[];
  for(const t of cash.values()){
    if(t.classification!=='BUSINESS_INCOME'||t.direction!=='IN')continue;
    const net=t.amountMinor-(reversals.get(t.id)??0);
    row(t.currency).collectedMinor+=net;
    if(net>0&&!allocatedReceipts.has(t.id))unmatched.push(t.id);
  }
  for(const e of earnings.values()){
    const r=row(e.currency);
    const paid=effectiveByEarning.get(e.id)??0;
    if(e.status==='APPROVED'){r.approvedUnpaidMinor+=e.amountMinor-paid;if(e.macEnabled)r.macAttributedCollectedMinor+=paid;}
    else if(e.status==='EARNED_UNAPPROVED')r.earnedUnapprovedMinor+=e.amountMinor;
  }
  for(const e of input.expenses){validateMinor(e.amountMinor,'expense');if(e.incurred)row(e.currency).expensesMinor+=e.amountMinor;}
  let timeSeconds=0;const timeIds=new Set<string>();
  for(const t of input.timeEntries){assert(!timeIds.has(t.id),'DUPLICATE_TIME',t.id);timeIds.add(t.id);assert(Number.isSafeInteger(t.durationSeconds)&&t.durationSeconds>=0,'INVALID_TIME','Negative/noninteger time');timeSeconds+=t.durationSeconds;}
  const summary:CurrencySummary[]=[...byCurrency].map(([currency,r])=>({...r,currency,preTaxCashAfterExpensesMinor:r.collectedMinor-r.expensesMinor})).sort((a,b)=>a.currency.localeCompare(b.currency));
  const macUsd=summary.find(r=>r.currency==='USD')?.macAttributedCollectedMinor??0;
  return {byCurrency:summary,unmatchedCashTransactionIds:unmatched.sort(),timeSeconds,macBookRecoveryRemainingUsdMinor:Math.max(0,MACBOOK_COST_USD_MINOR-macUsd)};
}
