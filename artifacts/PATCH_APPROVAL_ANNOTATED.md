# PATCH_APPROVAL_ANNOTATED - PR #7

Repository: `matrixsechub/ttx-operator-shell`
PR: `#7`
Branch: `codex/hsx-scope-gate-validation`
Commit reviewed: `07a7992e`
Disposition: `CONDITIONAL_APPROVAL`
Reviewer role: Architect

## Approval Summary

PR #7 is approved for Preview validation. It adds the HSX scope-gate route and the signed-governance dependency layer needed to enforce pre-execution validation. Production rollout remains blocked until preview smoke output, preview logs, and operator approval are attached to the PR.

## Annotated Code Findings

### HSX route authentication

- `worker/hsxScopeGate/route.ts:10-13`
- Status: approved.
- Notes: route accepts either `X-N8N-Webhook-Secret` matching `env.N8N_WEBHOOK_SECRET` or a valid operator bearer token from `getAccessTokenOperator`.
- Removal required after validation: no.

### HSX route contract

- `worker/hsxScopeGate/route.ts:21-43`
- Status: approved.
- Notes: only `POST /api/governance/hsx/scope-gate/evaluate` is handled. Method, content-type, body size, JSON parsing, and structured decision response are enforced.
- Removal required after validation: no.

### Worker route insertion

- `worker/index.ts:245-250`
- Status: approved.
- Notes: HSX scope-gate evaluation is routed after operator auth/session handling and before public/protected HSX fallthrough. Route status is recorded through `recordTelemetrySample`.
- Removal required after validation: no.

### Audit event format and storage

- `worker/hsxScopeGate/store.ts:28-52`
- Status: approved for Preview validation.
- Format: `event_id`, `name`, `timestamp`, `packet_id`, `decision_id`, `correlation_id`, `actor_id`, `target`, `action_type`, `action_class`, `risk_score`, `risk_tier`, `outcome`, `reason_code`, `beacon_hash`.
- Storage: `TTX_STATE` KV under `hsx:scope-gate:v1:telemetry:<event_id>` with 90-day TTL. Decision records are also stored by decision id, outcome, and packet id.
- Runtime log: the same event is emitted through `console.log(JSON.stringify(event))`.
- Removal required after validation: no.

### Legacy approval compatibility path

- `worker/governance/legacyApproval.ts:53-95`
- Status: approved only as a temporary development compatibility path.
- Notes: staging and production are blocked by `isGovernedMutationEnvironment` at `worker/governance/legacyApproval.ts:33-50`; development requires `ALLOW_LEGACY_OPERATOR_APPROVAL=true`.
- Removal required after validation: yes. Remove this legacy boolean approval compatibility path after signed receipt adoption is complete.

### Bootstrap bypass code

- Search evidence: no `OPERATOR_BOOTSTRAP_TOKEN` references in PR #7 files.
- Status: not present in this PR.
- Removal required after validation: not applicable to PR #7.

### Debug telemetry

- Search evidence: HSX added no debug-only telemetry path. HSX audit events are governance records, not debug instrumentation.
- Existing `#region agent log` blocks are present in base Worker files but were not introduced by PR #7 and should be handled in a separate cleanup PR.
- Removal required after validation: not applicable to PR #7.

## Validation Evidence

- `node --import tsx --test tests/hsxScopeGate.test.ts tests/governanceEnforcement.test.ts tests/governanceRoutes.test.ts`
  - Result: pass, 24/24.
- `npm run typecheck`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## Approval Conditions

1. Preview smoke must prove unauthenticated HSX evaluation returns `401` with `SCOPE_GATE_AUTH_REQUIRED`.
2. Preview smoke must prove a valid `X-N8N-Webhook-Secret` or operator token can evaluate a valid low-risk packet.
3. Preview logs must include one `hsx.scope_gate.approved` or `hsx.scope_gate.denied` event with no secret values.
4. Production deploy requires operator approval after preview evidence is attached.
5. Follow-up cleanup must remove the development-only legacy approval compatibility path once signed receipt flow is fully adopted.

Signed: Architect
