# MSH-OPS — Northstar Beacon

The Northstar Beacon is the immutable governance constitution for all in-repo agents. It encodes the approved strategic axis, priorities, authority model, and mandate that every agent must read and align to.

## What this is

| Artifact | Role |
|----------|------|
| `beacon/northstar.json` | Source-of-truth governance payload (read-only) |
| `beacon/beacon.schema.json` | JSON Schema for northstar beacon documents |
| `beacon/beacon.hash` | SHA-256 integrity hash for the active beacon (operator-readable) |
| `beacon/beaconHash.ts` | Bundled hash constant synced from `beacon.hash` for Worker imports |
| `beacon/loadBeacon.ts` | Validates schema, verifies SHA-256 integrity, freezes payload |
| `mcp/sourceRegistry.json` | Registers Pieces OS MCP as read-only governance source |
| `mcp/validateMcpPayload.ts` | Validates MCP payloads against registry + beacon schema |
| `mcp/ingestMcpPayload.ts` | Ingests MCP proposals without mutating the beacon |
| `agent/initAgentGovernance.ts` | Singleton initializer every agent uses at startup |
| `governance/checkAutonomy.ts` | Operator-approval gate for non-advisory actions |

## Relationship to GovernanceDO

The Worker also has a **mutable** `GovernanceDO` northstar used for cockpit metadata, mandates, and policy mode. That runtime state is separate from this Beacon.

- **Beacon** = immutable agent constitution (file-backed, hash-verified)
- **GovernanceDO** = operational governance metadata (Durable Object, operator proposals)

Agents must import from `loadBeacon` / `initAgentGovernance` only. **Never write to `northstar.json`.** There are no write APIs for the Beacon.

## Pieces OS MCP governance input

Pieces OS MCP is registered in `mcp/sourceRegistry.json` as a **read-only upstream governance source**.

- MCP may submit `northstar-update` or `governance-signal` payloads
- `mcp/ingestMcpPayload.ts` validates and logs `BeaconUpdateProposal` objects
- MCP has `mutationRights: "none"` — it cannot mutate `northstar.json`
- All beacon changes require `reviewBeaconProposal({ operatorApproval: true })`
- Even approved proposals do **not** auto-write the beacon; the operator must apply approved JSON manually and refresh `beacon.hash`

```ts
import { ingestPiecesMcpGovernanceFeed, reviewBeaconProposal } from "./mcp/ingestMcpPayload";

const results = await ingestPiecesMcpGovernanceFeed(piecesFetcher);
const reviewed = reviewBeaconProposal({ proposalId, operatorApproval: true });
```

## Strategic axis

```
STABILITY → REVENUE_VALIDATION → TRUST → CONTROLLED_GROWTH → WILDCARD_INNOVATION
```

## Safe mode

When the Beacon is missing, invalid, or fails integrity verification:

- Worker startup fails (`assertBeaconOnStartup` throws)
- In test-only safe mode (`allowSafeMode: true`), agents operate **advisory-only**
- Non-advisory actions return `BEACON_SAFE_MODE` or `BEACON_AUTONOMY_DENIED`

## Updating the Beacon

1. Edit `beacon/northstar.json` (operator-approved change only)
2. Run `node scripts/compute-beacon-hash.mjs` (updates `beacon/beacon.hash` and `beacon/beaconHash.ts`)
3. Run `npm test` to verify

## Agent integration

Every agent module must:

1. Load governance via `initAgentGovernance("<AgentId>")` or `getAgentGovernanceContextFor("<AgentId>")`
2. Attach `northstar_alignment` metadata to advisory outputs
3. Call `checkAutonomy()` before any `mutate_state` or `autonomous_execute` action

Autonomous side effects require `operator_approval: true` in the request body (or an approval token in future versions).

## OrganizerAgent (developer-side only)

`msh-ops/agents/` holds **developer tooling** that runs inside Cursor/Node — not in the Worker runtime.

| Artifact | Role |
|----------|------|
| `agents/OrganizerAgent.ts` | Scans repo structure, detects issues, builds advisory report |
| `agents/utils/fileScanner.ts` | Recursive file walk + anomaly detection |
| `agents/utils/structureAnalyzer.ts` | Convention rules, schema drift, barrel policy warnings |
| `agents/utils/importGraph.ts` | Import graph, circular deps, dead export heuristics |
| `agents/refactorEngine.ts` | Applies approved refactors (move, rename, import rewrite, dead-code removal) |
| `agents/runOrganizer.ts` | CLI entry point |
| `governance/approveRefactor.ts` | Operator approval gate before any structural mutation |

**Folder split:** `msh-ops/agent/` (singular) = governance bootstrap for runtime agents. `msh-ops/agents/` (plural) = developer refactor assistant.

OrganizerAgent **does not** load the Beacon, mutate `northstar.json`, or interact with GovernanceDO. All refactors require explicit operator approval via `approveRefactor.ts`.

```bash
npm run organizer              # dry-run report (default)
npm run organizer -- --json    # machine-readable output
npm run organizer -- --apply   # prompt for approval, then apply
npm run organizer:scheduled    # dry-run only if 72h elapsed since last run
npm run organizer:scheduled -- --force  # ignore 72h gate (manual)
```

**72-hour schedule:** GitHub Actions workflow `.github/workflows/organizer-schedule.yml` runs daily and calls `organizer:scheduled`, which skips if a report was generated within the last 72 hours. Reports are saved to `.artifacts/organizer-scheduled-report.json` and uploaded as a workflow artifact. Scheduled runs are **advisory only** — no refactors are applied without interactive `--apply` approval.

On Windows, you can also point Task Scheduler at `npm run organizer:scheduled` for a local 72h trigger.

To publish the latest report to Worker KV for the operator dashboard (`GET /api/operator/organizer/report`):

```bash
ORGANIZER_KV_PUBLISH=1 npm run organizer:scheduled -- --force
# optional: WRANGLER_ENV=staging
```

Decisions are logged to `.artifacts/organizer-decisions.jsonl`.

Barrel `index.ts` files in `src/components/` and `src/pages/` are **reported as policy warnings only** — OrganizerAgent never auto-creates them.

## Tests

```
tests/msh-ops/beacon/loadBeacon.test.ts
tests/msh-ops/beacon/agentInit.test.ts
tests/msh-ops/governance/checkAutonomy.test.ts
tests/msh-ops/mcp/ingestMcpPayload.test.ts
tests/msh-ops/organizer/*.test.ts
```
