/** Source-only capability gate. These are NOT production Beacon approval semantics. */
export type IiePhaseOneAction = 'ANALYZE'|'CLASSIFY'|'SCORE'|'RECONCILE_SYNTHETIC'|'PREPARE_BRIEF';
const INTERNAL = new Set<string>(['ANALYZE','CLASSIFY','SCORE','RECONCILE_SYNTHETIC','PREPARE_BRIEF']);
export interface CapabilityDecision {readonly allowed:boolean;readonly reasonCode:'SOURCE_ONLY_ALLOWED'|'EXTERNAL_ACTION_DENIED'}
export function phaseOneCapability(action:string):CapabilityDecision {
  return INTERNAL.has(action)?{allowed:true,reasonCode:'SOURCE_ONLY_ALLOWED'}:{allowed:false,reasonCode:'EXTERNAL_ACTION_DENIED'};
}
