<!-- DOCS_SCRIBE_GENERATED
generated_at: 2026-07-10T13:36:51.325Z
beacon_hash: ad68b558438ea83261da56c183f7a1d89738fe4d12be626219faf08f09e47e1f
codex_hash: 6525333eebed506e8444e947646504e220efc16c5e2c48fefb6d05e31c6f24cc
-->

# Operator OS Architecture

Governed operator storefront on Cloudflare Workers with multi-surface SPAs, KV-backed governance state, and signed Beacon/Codex validation gates.

## Spine

Intent → Action Proposal → Beacon/Codex validation → Operator Approval → Signed Receipt → Pre-execution revalidation → Governed execution → Execution receipt → Audit bundle.
