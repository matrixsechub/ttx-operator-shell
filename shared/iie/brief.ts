import type { EvidenceRecord, IncomeBrief, IncomeBriefAction, IncomeDecision, LedgerSummary, OpportunityRecord } from './contracts.ts';
import { deduplicateOpportunities } from './opportunity.ts';
import { qualifyOpportunity } from './qualification.ts';
import { validateTimestamp } from './validation.ts';
const PRIORITY_ORDER:Readonly<Record<string,number>>={P0:0,P1:1,P2:2,P3:3,P4:4};
export function generateIncomeBrief(opportunities:readonly OpportunityRecord[], evidence:readonly EvidenceRecord[], ledger:LedgerSummary, asOf:string):IncomeBrief {
  validateTimestamp(asOf,'asOf');
  const unique=deduplicateOpportunities(opportunities);
  const decisions:IncomeDecision[]=unique.map(o=>qualifyOpportunity(o,evidence,asOf));
  const byId=new Map(unique.map(o=>[o.id,o]));
  const actionable=decisions.filter((d):d is IncomeDecision & {verdict:'DO'|'TEST'}=>d.verdict==='DO'||d.verdict==='TEST').sort((a,b)=>{
    const p=PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority];if(p!==0)return p;
    const da=byId.get(a.opportunityId)?.deadlineAt,db=byId.get(b.opportunityId)?.deadlineAt;
    if(da||db){const t=(da?Date.parse(da):Infinity)-(db?Date.parse(db):Infinity);if(t!==0)return t;}
    return b.score.lowerBound-a.score.lowerBound||a.opportunityId.localeCompare(b.opportunityId);
  });
  const actions:IncomeBriefAction[]=actionable.slice(0,3).map(d=>({opportunityId:d.opportunityId,priority:d.priority,verdict:d.verdict,instruction:d.nextAction,warnings:d.warnings}));
  return {
    generatedAt:asOf,
    availablePaidWork:decisions.filter(d=>d.priority==='P0'&&d.verdict==='DO').map(d=>d.opportunityId),
    pendingOpportunityIds:decisions.filter(d=>d.priority!=='P0'&&d.verdict!=='REJECT').map(d=>d.opportunityId),
    actions,ledger,sourceCoverage:'SYNTHETIC_ONLY',
    recommendation:actions[0]?.instruction??'No confirmed payable work; verify source coverage and pending opportunities',
  };
}
