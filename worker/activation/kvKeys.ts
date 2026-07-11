const MAX_SEGMENT_LENGTH = 128;
const INVALID_SEGMENT = /[^a-zA-Z0-9_-]/;

export class ActivationKvKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivationKvKeyError";
  }
}

export function sanitizeKvSegment(value: string, label: string): string {
  if (!value || value.includes("..")) {
    throw new ActivationKvKeyError(`${label} contains invalid path segment`);
  }
  if (value.length > MAX_SEGMENT_LENGTH) {
    throw new ActivationKvKeyError(`${label} exceeds max length`);
  }
  if (INVALID_SEGMENT.test(value)) {
    throw new ActivationKvKeyError(`${label} contains invalid characters`);
  }
  return value;
}

export function campaignKey(campaignId: string): string {
  return `activation:v1:campaign:${sanitizeKvSegment(campaignId, "campaignId")}`;
}

export function campaignIndexKey(status: string): string {
  return `activation:v1:campaign:index:${sanitizeKvSegment(status, "status")}`;
}

export function assetKey(assetId: string): string {
  return `activation:v1:asset:${sanitizeKvSegment(assetId, "assetId")}`;
}

export function taskKey(taskId: string): string {
  return `activation:v1:task:${sanitizeKvSegment(taskId, "taskId")}`;
}

export function queueKey(date: string): string {
  return `activation:v1:queue:${sanitizeKvSegment(date, "date")}`;
}

export function attributionKey(sessionId: string): string {
  return `activation:v1:attribution:${sanitizeKvSegment(sessionId, "sessionId")}`;
}

export function qualityKey(sessionId: string): string {
  return `activation:v1:quality:${sanitizeKvSegment(sessionId, "sessionId")}`;
}

export function campaignMetricsKey(campaignId: string): string {
  return `activation:v1:metrics:campaign:${sanitizeKvSegment(campaignId, "campaignId")}`;
}

export function channelMetricsKey(channel: string): string {
  return `activation:v1:metrics:channel:${sanitizeKvSegment(channel, "channel")}`;
}

export function auditKey(auditId: string): string {
  return `activation:v1:audit:${sanitizeKvSegment(auditId, "auditId")}`;
}

export function campaignAuditIndexKey(campaignId: string): string {
  return `activation:v1:audit:index:campaign:${sanitizeKvSegment(campaignId, "campaignId")}`;
}

export const ACTIVATION_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const ACTIVATION_INDEX_MAX_IDS = 500;
