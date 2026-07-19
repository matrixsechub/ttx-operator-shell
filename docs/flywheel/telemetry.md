# Flywheel telemetry

Full sanitized event records are retained in the tenant Durable Object. `TTX_STATE` holds a bounded 200-event index and 30-day event records under:

- `flywheel:event:{tenantId}:{eventId}`
- `flywheel:events:{tenantId}:{runId}`

Events cover run lifecycle, safe mode, stage lifecycle/retries, commands, approvals, evidence, cycle proposals, and KPI breaches. Every event carries tenant, mission, run, trace, actor, and governance fields. Metadata is recursively bounded and redacts authorization, token, secret, password, prompt, credential, cookie, and client-content fields. Bearer values are also redacted inside otherwise safe strings.
