# Mutation Route Coverage Matrix

Phase 1 system-wide enforcement baseline. Columns: method, path, action_class, owner, current_gate, execution_wrapper, receipt_required, safe_mode_enforced, audit_fail_closed, migration_status.

## Activation (operator) — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/operator/activation/campaigns` | C3 | receipt/governed | runGovernedMutation | yes | yes | yes | **migrated** |
| PATCH | `/api/operator/activation/campaigns/{id}` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/campaigns/{id}/activate` | C3 | receipt | partial | yes | yes | yes | wave-2-priority |
| POST | `/api/operator/activation/campaigns/{id}/approve` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/campaigns/{id}/pause` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/campaigns/{id}/complete` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/campaigns/{id}/submit` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/campaigns/{id}/assets/generate` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/assets/{id}/approve` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/assets/{id}/mark-used` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/queue/generate` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/tasks/{id}/approve` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/tasks/{id}/complete` | C3 | receipt | partial | yes | yes | yes | wave-2 |
| POST | `/api/operator/activation/tasks/{id}/skip` | C3 | receipt | partial | yes | yes | yes | wave-2 |

## Governance spine — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/governance/proposals` | C2 | operator auth | native | n/a | yes | no | native |
| POST | `/api/governance/proposals/{id}/approve` | C2 | operator auth | native | n/a | yes | no | native |
| POST | `/api/governance/proposals/{id}/deny` | C2 | operator auth | native | n/a | yes | no | native |
| POST | `/api/governance/mcp/delta` | C1 | none | advisory | no | yes | no | native |
| POST | `/api/governance/propose` | C2 | legacy DO | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/governance/approve` | C2 | legacy DO | none | no | no | no | **disabled_staging_prod** |

## Northstar beacon — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/northstar-beacon/generate` | C3 | boolean | none | yes | yes | yes | wave-2 |
| POST | `/api/northstar-beacon/proposal` | C3 | boolean | none | yes | yes | yes | wave-2 |

## Fulfillment agents — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/ai-agent-build-spec-generate` | C3 | boolean | none | yes | yes | yes | wave-2 |
| POST | `/api/rag-architecture-plan-generate` | C3 | boolean | none | yes | yes | yes | wave-2 |
| POST | `/api/local-ai-deployment-plan-generate` | C3 | boolean | none | yes | yes | yes | wave-2 |
| POST | `/api/security-remediation-plan-generate` | C5 | boolean | none | yes | yes | yes | wave-2 |

## AI gateway — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/ai/infer` | C3 | boolean | none | yes | yes | yes | wave-2 |

## TTX — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/ttx/local-scenarios/create` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/local-scenarios/update` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/local-scenarios/delete` | C6 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/local-scenarios/import` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/sessions/start` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/sessions/next` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/sessions/reset` | C6 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/sessions/score` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/live/create` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/live/token` | C3 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ttx/live/close` | C6 | operator auth | none | no | no | no | **disabled_staging_prod** |

## Public intake (C4) — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/register` | C4 | rate limit | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/engagements` | C4 | rate limit | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/engagements/create` | C4 | rate limit | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/service-selector` | C4 | rate limit | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/audit-lite/start` | C4 | rate limit | none | no | no | no | **disabled_staging_prod** |

## Auth / security (C5) — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/auth/login` | C5 | credential | none | no | no | no | exempt |
| POST | `/api/auth/refresh` | C5 | token | none | no | no | no | exempt |
| POST | `/api/auth/logout` | C5 | token | none | no | no | no | exempt |
| POST | `/api/audit-lite/webhook` | C5 | stripe HMAC | none | no | no | no | exempt |

## Other mutations — owner: operator

| Method | Path | Class | Gate | Wrapper | Receipt | SafeMode | Audit FC | Status |
|--------|------|-------|------|---------|---------|----------|----------|--------|
| POST | `/api/webhooks/ingest` | C2 | HMAC | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/webhooks/clear` | C6 | operator auth | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/operator/uiux/audits` | C3 | none | none | no | no | no | **disabled_staging_prod** |
| POST | `/api/ai/mcp/signal` | C3 | none | none | no | no | no | **disabled_staging_prod** |

## Migration priority

1. Activation activate + remaining activation mutations
2. Northstar beacon
3. Fulfillment + security remediation
4. AI gateway infer
5. Codex-register disabled routes with `enforcement: disabled_staging_prod`
