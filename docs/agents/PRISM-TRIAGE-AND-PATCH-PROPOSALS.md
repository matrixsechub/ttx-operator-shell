# PRISM — Operator Triage and Patch Proposals (Phase 2D)

**Agent ID:** `PRISM_UIUX_AGENT_V1`  
**Phase:** `PRISM_UIUX_AGENT_PHASE_2D_OPERATOR_TRIAGE_AND_PATCH_PROPOSALS`  
**Status:** Advisory only — governed proposal packets, no execution authority

---

## Mission

Phase 2D converts validated PRISM audit findings (and HSX council advisories) into an operator-controlled triage queue and structured patch proposal packets. Operators may group, rank, disposition, and export proposals — but **no source code, commits, deployments, or mutation authority** are granted by this phase.

```text
PRISM evidence → HSX advisory → operator triage → governed patch proposal → STOP
```

A future execution phase must require a separate signed operator approval envelope before RefactorEngine, Codex, GitHub, or deployment actions.

---

## Architecture

| Layer | Module | Role |
|-------|--------|------|
| Types | `worker/data/prismTriageTypes.ts` | Triage items, proposals, governance block |
| Engine | `worker/data/prismTriageEngine.ts` | Deterministic grouping + priority scoring |
| Proposals | `worker/data/prismPatchProposal.ts` | Deterministic proposal generator + optional AI enrichment |
| Storage | `worker/prismTriageStorage.ts` | TTX_STATE KV persistence (bounded indexes) |
| Routes | `worker/prismTriageRoutes.ts` | Operator-protected `/api/operator/uiux/triage/*` |
| Telemetry | `worker/data/prismTriageTelemetry.ts` | Redacted structured events |
| Audit | `worker/prismTriageAudit.ts` | Governance audit events via `recordAuditEvent` |
| UI | `src/pages/ops/PrismTriagePage.tsx` | `/operator/uiux-expert/triage` |

---

## Data flow

1. Operator persists a PRISM audit (`mshops:uiux:v1:audit:{auditId}`) — unchanged by triage.
2. `POST /api/operator/uiux/triage/generate` reads the audit, groups open findings, scores priority, persists triage items.
3. Operator reviews queue at `/operator/uiux-expert/triage`.
4. `POST .../triage/{id}/proposals` generates a governed patch proposal (revision increments on regenerate).
5. Operator records disposition: `accepted_for_planning`, `deferred`, or `dismissed`.
6. HSX briefings and council packets include `prismTriageSummary` counts only.

---

## Priority model (deterministic, no LLM)

| Factor | Weighting |
|--------|-----------|
| Severity | critical=100, high=75, medium=50, low=25 |
| Route importance | `/login`, `/operator/*` highest; funnel routes very high |
| Viewport coverage | mobile +12; multi-viewport +8 |
| Accessibility impact | category + severity bonuses |
| Release posture | BLOCK_RELEASE +25 |

---

## Persistence (TTX_STATE only)

| Key | Purpose |
|-----|---------|
| `mshops:uiux:v1:triage:{triageId}` | Triage item |
| `mshops:uiux:v1:triage:index` | Bounded index (max 100) |
| `mshops:uiux:v1:proposal:{proposalId}` | Proposal record |
| `mshops:uiux:v1:proposal:triage:{triageId}` | Revision history (max 10) |

**TTL:** 30 days. Source audits are never mutated.

---

## API routes

| Method | Path |
|--------|------|
| GET | `/api/operator/uiux/triage` |
| POST | `/api/operator/uiux/triage/generate` |
| GET | `/api/operator/uiux/triage/:triageId` |
| POST | `/api/operator/uiux/triage/:triageId/disposition` |
| POST | `/api/operator/uiux/triage/:triageId/proposals` |
| GET | `/api/operator/uiux/proposals` |
| GET | `/api/operator/uiux/proposals/:proposalId` |

---

## Governance invariants

```json
{
  "advisoryOnly": true,
  "mutationAuthorized": false,
  "operatorApprovalRequired": true
}
```

Disposition (`accepted_for_planning`, `deferred`, `dismissed`) is not execution approval.

---

## Verification

```bash
npm run typecheck
npm test
npm run build
node --import tsx --test tests/prismTriageEngine.test.ts
node --import tsx --test tests/prismPatchProposal.test.ts
node --import tsx --test tests/prismTriageRoutes.test.ts
```
