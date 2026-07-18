# Flywheel adapter contracts

All ten stage adapter types use the common `FlywheelStageAdapter` contract: `validateConfiguration`, `healthCheck`, `execute`, `cancel`, `normalizeError`, and `emitTelemetry`.

V1 registers deterministic mock adapters only. Their output is derived from tenant, run, stage, and idempotency identifiers and includes a mock artifact, SHA256 evidence, and deterministic metrics. No email, CRM, n8n, AI provider, or other external integration is active.

`SignedWebhookClient` is dormant unless an endpoint and secret are injected. It signs the bounded payload with HMAC SHA256, propagates trace/mission/stage/idempotency fields, applies an eight-second timeout, retries three times with exponential backoff and jitter, validates an object response, and never embeds credentials.
