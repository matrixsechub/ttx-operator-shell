import type { CashTransaction,EarningRecord,EvidenceRecord,IncomeLedgerInput,OpportunityRecord } from '../../shared/iie/contracts.ts';
import {earningApprovalValue,paymentPostedValue} from '../../shared/iie/accounting.ts';
export const NOW='2026-10-21T08:00:00Z';
const defaultEarning={id:'e1',assignmentId:'a1',payer:'synthetic.qa',currency:'USD',amountMinor:10000} as const;
const defaultReceipt={source:'synthetic.bank',externalId:'bank-1',currency:'USD',amountMinor:10000,direction:'IN',classification:'BUSINESS_INCOME'} as const;
const defaultReversal={source:'synthetic.bank',externalId:'bank-2',currency:'USD',amountMinor:5000,direction:'OUT',classification:'REVERSAL'} as const;
const spareReceipt={source:'synthetic.bank',externalId:'bank-3',currency:'USD',amountMinor:3000,direction:'IN',classification:'BUSINESS_INCOME'} as const;
export function approvalRecord(id:string,subject:Pick<EarningRecord,'id'|'assignmentId'|'payer'|'currency'|'amountMinor'>):EvidenceRecord{
 return {id,source:'synthetic:approval',claim:'WORK_APPROVED',level:'E4',verified:true,observedAt:NOW,assertedValue:earningApprovalValue(subject)};
}
export function postedRecord(id:string,subject:Pick<CashTransaction,'source'|'externalId'|'currency'|'amountMinor'|'direction'|'classification'>):EvidenceRecord{
 return {id,source:'synthetic:cash',claim:'PAYMENT_POSTED',level:'E5',verified:true,observedAt:NOW,assertedValue:paymentPostedValue(subject)};
}
export const evidence:EvidenceRecord[]=[
 {id:'list',source:'synthetic:listing',claim:'LISTED',level:'E1',verified:true,observedAt:NOW},
 {id:'invite',source:'synthetic:invitation',claim:'INVITED',level:'E2',verified:true,observedAt:NOW},
 {id:'accepted',source:'synthetic:acceptance',claim:'ACCEPTED',level:'E3',verified:true,observedAt:NOW},
 {id:'rate',source:'synthetic:terms',claim:'RATE',level:'E3',verified:true,assertedValue:'USD:7000:HOUR',observedAt:NOW},
 {id:'adRate',source:'synthetic:advertisement',claim:'RATE',level:'E1',verified:true,assertedValue:'USD:20000:HOUR',observedAt:NOW},
 {id:'paymentTerms',source:'synthetic:terms',claim:'PAYMENT_TERMS',level:'E3',verified:true,assertedValue:'2026-10-27T08:00:00Z',observedAt:NOW},
 approvalRecord('workApproved',defaultEarning),
 postedRecord('posted1',defaultReceipt),
 postedRecord('posted2',defaultReversal),
 postedRecord('posted3',spareReceipt),
 ];
export function op(overrides:Partial<OpportunityRecord>={}):OpportunityRecord{
 return {id:'op-1',provider:'synthetic.qa',externalId:'A1',title:'Synthetic test',category:'QA_TESTING',stage:'INVITED',evidenceIds:['list','invite','adRate'],advertisedPay:{currency:'USD',amountMinor:20000,unit:'HOUR',termsEvidenceId:'adRate'},schedule:{asyncWork:true,exclusivity:false,requiresSaturday:false},nextAction:'Check selection criteria',...overrides};
}
export function acceptedOp(overrides:Partial<OpportunityRecord>={}):OpportunityRecord{
 return op({id:'work-1',externalId:'A2',stage:'ACCEPTED',evidenceIds:['accepted','rate','paymentTerms'],agreedPay:{currency:'USD',amountMinor:7000,unit:'HOUR',termsEvidenceId:'rate'},estimatedTotalHours:4,expectedPaymentAt:'2026-10-27T08:00:00Z',nextAction:'Complete accepted 4-hour test',...overrides});
}
export function earning(overrides:Partial<EarningRecord>={}):EarningRecord{
 return {id:'e1',assignmentId:'a1',payer:'synthetic.qa',currency:'USD',amountMinor:10000,status:'APPROVED',evidenceIds:['workApproved'],macEnabled:false,...overrides};
}
export function cash(overrides:Partial<CashTransaction>={}):CashTransaction{
 return {id:'c1',source:'synthetic.bank',externalId:'bank-1',currency:'USD',amountMinor:10000,classification:'BUSINESS_INCOME',direction:'IN',posted:true,postedEvidenceId:'posted1',...overrides};
}
export function ledger(overrides:Partial<IncomeLedgerInput>={}):IncomeLedgerInput{
 return {evidence,earnings:[],cash:[],allocations:[],expenses:[],timeEntries:[],...overrides};
}
