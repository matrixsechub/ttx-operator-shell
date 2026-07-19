import { DurableObject } from "cloudflare:workers";

/**
 * Historical Durable Object class for migration tag `v37-receipt-authority`.
 * Live production already applied this migration. The class export must remain so
 * Wrangler migration history matches Cloudflare. Full Receipt Authority application
 * behavior is out of scope for this reconciliation mission.
 */
export class ReceiptAuthority extends DurableObject {}
