# Flywheel rollback runbook

Rollback must be separately authorized. Do not delete Durable Object storage.

1. Enter tenant safe mode and pause active runs.
2. Record affected run IDs, trace IDs, proposals, receipts, and execution receipts.
3. Route cockpit navigation away from the Flywheel page if required.
4. Roll Worker code back to the last approved release while retaining the `FlywheelDO` class and migration declaration; Cloudflare Durable Object migrations are additive and are not reversed by deleting a class.
5. Verify legacy routes, authentication, Beacon, Receipt Authority, telemetry, and asset serving.
6. Preserve Flywheel SQLite and `TTX_STATE` evidence for audit and later reconciliation.

Never remove the binding or migrated class until a separately reviewed data-retention and class-retirement plan exists.
