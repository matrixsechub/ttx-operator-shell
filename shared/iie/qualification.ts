import type { EvidenceRecord, IncomeDecision, OpportunityRecord, Priority, QualificationScore, ScoringDimension, Verdict } from './contracts.ts';
import { evidenceForClaim, verifyTerms } from './evidence.ts';
import { validateOpportunity, validateTimestamp } from './validation.ts';
const WEIGHTS: Record<ScoringDimension,number>={paymentCertainty:30,paymentSpeed:25,effectiveReturn:20,flexibility:15,repeatability:10};
function scoreValues(values: Record<ScoringDimension,number|null>): QualificationScore {
  let knownPoints=0,knownWeight=0;
  for(const dimension of Object.keys(WEIGHTS) as ScoringDimension[]){
    const v=values[dimension];
    if(v!==null){knownPoints+=WEIGHTS[dimension]*v/5;knownWeight+=WEIGHTS[dimension];}
  }
  return {knownPoints,lowerBound:knownPoints,upperBound:knownPoints+(100-knownWeight),knownWeight,values};
}
function amountPerHour(op:OpportunityRecord, verifiedTerms:boolean):number|null {
  if(!op.agreedPay||!verifiedTerms||op.agreedPay.currency!=='USD'||!op.estimatedTotalHours) return null;
  const deliveryHours=op.estimatedTotalHours;
  const hours=deliveryHours+(op.requiredUnpaidHours??0);
  const gross=op.agreedPay.unit==='HOUR'?op.agreedPay.amountMinor*deliveryHours:op.agreedPay.amountMinor;
  return Math.round((gross-(op.directCostsMinor??0))/hours);
}
function effectiveReturnScore(minorPerHour:number|null):number|null {
  if(minorPerHour===null)return null;
  if(minorPerHour>=10000)return 5;
  if(minorPerHour>=7000)return 4;
  if(minorPerHour>=4500)return 3;
  if(minorPerHour>=2500)return 2;
  if(minorPerHour>0)return 1;
  return 0;
}
function speedScore(paymentAt:string|undefined,asOf:string,termsVerified:boolean):number|null {
  if(!paymentAt||!termsVerified)return null;
  const days=(Date.parse(paymentAt)-Date.parse(asOf))/86400000;
  if(days<=3)return 5;
  if(days<=7)return 4;
  if(days<=14)return 3;
  if(days<=30)return 2;
  return 1;
}
export function qualifyOpportunity(op:OpportunityRecord,evidence:readonly EvidenceRecord[],asOf:string):IncomeDecision {
  validateOpportunity(op);validateTimestamp(asOf,'asOf');
  const warnings:string[]=[];
  const accepted=evidenceForClaim(evidence,op.evidenceIds,'ACCEPTED','E3',asOf).supported;
  const invited=evidenceForClaim(evidence,op.evidenceIds,'INVITED','E2',asOf).supported;
  const listed=evidenceForClaim(evidence,op.evidenceIds,'LISTED','E1',asOf).supported;
  const eligible=evidenceForClaim(evidence,op.evidenceIds,'ELIGIBLE','E3',asOf).supported;
  const agreedTerms=verifyTerms(op,evidence,true,asOf);
  const paymentEvidence=evidenceForClaim(evidence,op.evidenceIds,'PAYMENT_TERMS',op.stage==='ACCEPTED'?'E3':'E2',asOf);
  const paymentTerms=paymentEvidence.supported && Boolean(op.expectedPaymentAt) && paymentEvidence.ids.some(id=>evidence.find(e=>e.id===id)?.assertedValue===op.expectedPaymentAt);
  if(op.expectedPaymentAt&&!paymentTerms)warnings.push('PAYMENT_DATE_NOT_VERIFIED');
  const approved=evidenceForClaim(evidence,op.evidenceIds,'WORK_APPROVED','E4',asOf).supported;
  if(!op.advertisedPay&&!op.agreedPay)warnings.push('COMPENSATION_UNKNOWN');
  if(op.agreedPay&&!agreedTerms)warnings.push('AGREED_RATE_NOT_VERIFIED');
  if(accepted&&(!agreedTerms||!op.agreedPay||op.agreedPay.amountMinor===0))warnings.push('ACCEPTED_PAYMENT_NOT_VERIFIED');
  if(op.deadlineAt && Date.parse(op.deadlineAt)<Date.parse(asOf))warnings.push('DEADLINE_PASSED');
  if(op.schedule.requiresSaturday)warnings.push('PROTECTED_SATURDAY_CONFLICT');
  if(op.schedule.exclusivity)warnings.push('EXCLUSIVITY_REQUIRED');
  if((op.schedule.minimumWeeklyHours??0)>=40)warnings.push('FIXED_40_HOUR_COMMITMENT');
  if(['ACCEPTED','ACTIVE','SUBMITTED','COMPLETED'].includes(op.stage)&&!accepted)warnings.push('ACCEPTANCE_NOT_VERIFIED');
  const certainty=approved?5:accepted?4:eligible?3:invited?2:listed?1:null;
  const flexibility=op.schedule.exclusivity||op.schedule.requiresSaturday?0:(op.schedule.minimumWeeklyHours??0)>=40?1:op.schedule.asyncWork?5:(op.schedule.minimumWeeklyHours??0)>0?2:4;
  const repeatability=(op.repeatPaidAssignments!==undefined&&approved)?(op.repeatPaidAssignments>=3?5:op.repeatPaidAssignments>=2?4:op.repeatPaidAssignments===1?2:0):null;
  const values:Record<ScoringDimension,number|null>={paymentCertainty:certainty,paymentSpeed:speedScore(op.expectedPaymentAt,asOf,paymentTerms),effectiveReturn:effectiveReturnScore(amountPerHour(op,agreedTerms)),flexibility,repeatability};
  let priority:Priority='P3';
  if(op.category==='BUG_BOUNTY')priority='P4';
  else if(op.category==='QUALIFICATION')priority='P2';
  else if(['ACCEPTED','ACTIVE','SUBMITTED'].includes(op.stage)&&accepted&&agreedTerms&&op.agreedPay && op.agreedPay.amountMinor>0)priority='P0';
  else if(['INVITED','SCREENING','ACCEPTED','ACTIVE','SUBMITTED'].includes(op.stage))priority='P1';
  let verdict:Verdict='HOLD';
  const expired=op.stage==='EXPIRED'||(op.deadlineAt!==undefined&&Date.parse(op.deadlineAt)<Date.parse(asOf));
  if(['REJECTED','WITHDRAWN','EXPIRED'].includes(op.stage)||expired)verdict='REJECT';
  else if(op.schedule.requiresSaturday||op.schedule.exclusivity||(op.schedule.minimumWeeklyHours??0)>=40)verdict='HOLD';
  else if(priority==='P0')verdict='DO';
  else if(['ACCEPTED','ACTIVE','SUBMITTED','COMPLETED'].includes(op.stage)&&!accepted)verdict='HOLD';
  else if(invited||listed||eligible)verdict='TEST';
  const nextAction=verdict==='DO'?(op.nextAction??'Review accepted payable assignment and complete authorized work')
    :verdict==='TEST'?(op.nextAction??'Verify eligibility, compensation, and schedule before committing')
    :verdict==='REJECT'?'Close this attempt; do not record earnings'
    :'Hold pending evidence or Operator resolution';
  return {opportunityId:op.id,priority,verdict,score:scoreValues(values),warnings,evidenceIds:op.evidenceIds,nextAction};
}
