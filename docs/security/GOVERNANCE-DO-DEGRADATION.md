# Finding G1 — Governance Durable Object degrades to default policy when unreachable

**Date:** 2026-09-17 · **From:** SEC-01 (advisory) · **To:** OPERATOR · **Status:** NOT FIXED, by instruction · **Origin:** `docs/ARCHITECTURE.md` §6

Recorded as a bounded finding. Per the mission boundary this was **not** fixed in PR #43, and it was not required to complete Task 5.

## Exact observed behavior (VERIFIED)

`fetchGovernanceStateSafe` (`worker/kernel.ts:132-142`) wraps the Durable Object read:

```
try    → { state: <live GOVERNANCE DO state>, source: "durable-object" }
catch  → recordSubsystemFailure(env, "do", ...)
         { state: defaultGovernanceState(), source: "fallback" }
```

The catch is unconditional: any failure to read the `GOVERNANCE` Durable Object, including a thrown `"governance state unavailable"` when the response body has no `state`, substitutes a hardcoded default and continues. Policy is then computed from that default by `buildGovernancePolicy` (`kernel.ts:100-110`).

**The characterization "fails open" needs qualifying.** Comparing `defaultGovernanceState()` (`worker/governanceDefaults.ts:4-34`) against the policy derivation:

| Policy field | Derivation | Value under fallback | Direction |
|---|---|---|---|
| `wildcardFeaturesEnabled` | `axis-market` status not `watch`/`dormant` | `false` (default status is `watch`) | **More** restrictive |
| `marketplaceValidationRequired` | `mandate-marketplace` status `approved` | `true` | **More** restrictive |
| `mode` | `northstar.version >= 2 ? "strict" : "standard"` | `"standard"` (default version is 1) | **Less** restrictive |
| `northstarVersion` | from state | `1` | Misreports Beacon |

So the fallback is better described as **fail-substituted**: two gates land more restrictive, one lands less. The genuinely weaker outcomes are:

1. **Policy mode downgrade.** `msh-ops/beacon/northstar-v2.json` declares version 2. If the live governance state carries version 2, an unreachable Durable Object silently downgrades the reported mode from `strict` to `standard` (VERIFIED by reading the derivation; which version the live DO holds is UNKNOWN from this repo).
2. **Loss of Operator-approved state.** Any mandate or axis status the Operator has changed away from the defaults is silently replaced by the defaults for the duration of the outage. Whether the real state is stricter than the defaults is UNKNOWN.
3. **Beacon misreporting.** The response header `X-Governance-Mode` and `/api/system/state` report the substituted values as if authoritative (`kernel.ts:418,447`). A consumer cannot distinguish substituted policy from real policy without also reading `/api/system/health`.

## Paths affected

| Path | Role |
|---|---|
| `worker/kernel.ts:132-142` | the fallback itself |
| `worker/kernel.ts:100-110` | policy derivation from the substituted state |
| `worker/kernel.ts:165-170, 184-186` | `resolveEffectiveKernelContext`, `buildSystemState` |
| `worker/governanceDefaults.ts:4-34` | the substituted values |
| `worker/kernel.ts:342-360` | `enforceGovernancePolicy`, `enforceMarketplaceGovernance` consume the policy |
| `worker/health.ts:87` | reports `degraded` when `source !== "durable-object"` |
| `worker/telemetry.ts:151` | `recordSubsystemFailure` logs the outage to `TTX_STATE` |

Mitigating facts (VERIFIED): the degradation **is** observable at `/api/system/health` and in the subsystem failure log, and `governanceAutomation` only consults `policy.mode` to propose `enter_defensive_mode`, so `mode` is advisory rather than a hard gate.

## Failure consequence

During a `GOVERNANCE` Durable Object outage the Worker keeps serving with policy it invented. Marketplace validation and wildcard blocking get stricter, so no destructive action is newly permitted by the two hard gates. The real exposure is governance integrity rather than access control: the system reports a Beacon posture it did not read, and any Operator-approved deviation from defaults is silently ignored until the Durable Object recovers. This conflicts with the `AGENTS.md` doctrine that Beacon is the governance authority and that integrity doubt should produce `HOLD` / `SAFE_MODE`.

**Verified or inferred:** the code path, the substituted values, and the policy directions are VERIFIED by reading and by the derivation. Whether the live governance state differs from the defaults, and therefore the real-world blast radius, is **INFERRED / UNKNOWN**.

## Smallest fail-closed alternatives

Ordered smallest first. None implemented.

1. **Mark the substitution, do not hide it** (smallest, no behavior change). Add `governanceIntegrity.policySource: "fallback"` to `/api/system/state` and set a `X-Governance-Source: fallback` header alongside `X-Governance-Mode`. Makes substituted policy self-declaring. Roughly 5 lines.
2. **Never downgrade the mode.** Persist the last-known-good `northstar.version` (KV, already available) and take `max(persisted, substituted)` when computing `mode`, so an outage cannot move `strict` to `standard`. Roughly 15 lines plus one KV key.
3. **Fail closed on mutation only.** Keep serving reads from defaults, but have `enforceGovernancePolicy` and `enforceMarketplaceGovernance` refuse non-GET requests with 503 `GOVERNANCE_UNAVAILABLE` while `source === "fallback"`. Preserves availability for the cockpit while refusing to authorize mutations under invented policy. Roughly 20 lines.
4. **Full fail-closed.** Propagate the error and return 503 for every governance-dependent route. Largest blast radius: a Durable Object blip takes the cockpit down.

Recommended pairing if the Operator opens a mission: **1 + 2 + 3**. Option 4 alone trades a governance-integrity problem for an availability problem.

## Compatibility implications

| Alternative | Risk |
|---|---|
| 1 | None. Additive fields and one header. A consumer asserting an exact `/api/system/state` shape could notice. |
| 2 | Needs a KV write on every successful governance read, or a periodic one. Adds a small write cost; must not itself throw. |
| 3 | Behavior change: governance and marketplace mutations return 503 during an outage instead of proceeding. Callers must handle 503. Would need a note in `docs/RELEASE.md`. |
| 4 | Significant: any Durable Object blip becomes a full cockpit outage. Not recommended. |

## Regression test strategy

Unit-level, no deployment required, following the existing `tests/flywheel/governance.test.ts` mocking style:

1. Inject a `GOVERNANCE` stub whose fetch throws; assert `fetchGovernanceStateSafe` returns `source: "fallback"` and that `recordSubsystemFailure` was called.
2. Assert the substituted policy directions explicitly, so a future change to `governanceDefaults.ts` that flips `axis-market` to `active` (which would enable wildcard features during an outage) fails the suite. **This is the highest-value test and is worth adding even if no fix is chosen.**
3. For alternative 1: assert `/api/system/state` carries `policySource: "fallback"` and the header is set.
4. For alternative 2: with a persisted version 2 and a failing Durable Object, assert `mode` stays `strict`.
5. For alternative 3: with a failing Durable Object, assert POST to a governance-gated path returns 503 while GET still succeeds.

## Recommended priority

**P2.** It does not grant access that was previously denied, the two hard gates get stricter, and the condition is observable at `/api/system/health`. It is a governance-integrity and observability defect, not an authorization bypass. It ranks below the open F3 settings work and above the F9/F10/F12/F15 hardening batch.

Escalate to **P1** if either is true, both currently UNKNOWN: the live governance state is materially stricter than `defaultGovernanceState()`, or the live Northstar is version 2 so that outages silently downgrade `strict` to `standard` in a way something depends on.

## Should this be its own mission?

**Yes, a small one.** It touches `kernel.ts`, which every API request passes through, and alternative 3 changes response codes under failure, so it deserves its own change, review, and staging soak rather than riding along with unrelated work. Test 2 above is the exception: it is a pure characterization test of current behavior and could be added at any time with no behavior change.

Suggested mission shape: adopt alternatives 1 and 2, add tests 1, 2 and 4, and decide alternative 3 separately once the two UNKNOWNs are resolved.
