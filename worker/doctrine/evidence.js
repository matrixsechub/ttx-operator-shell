import { insertDoctrineAccessLog, insertDoctrineEvidenceLog, normalizeClassification, normalizeText } from "./repository.js";

async function logDoctrineSyncQuarantine(env, { versionId, sourceUrl, chunkCount, newChunkCount, timestamp = null }) {
  const resolvedTimestamp = normalizeText(timestamp) || new Date().toISOString();

  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.sync",
    actorType: "system",
    operatorId: null,
    versionId,
    sourceUrl,
    timestamp: resolvedTimestamp,
    state: "QUARANTINE",
    details: `Doctrine sync stored ${Number(chunkCount) || 0} chunks; ${Number(newChunkCount) || 0} marked new.`,
  });

  return resolvedTimestamp;
}

async function logDoctrineVersionApproval(env, { operatorId, versionId, timestamp = null }) {
  const resolvedTimestamp = normalizeText(timestamp) || new Date().toISOString();

  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.version.approval",
    actorType: "operator",
    operatorId,
    versionId,
    timestamp: resolvedTimestamp,
    state: "APPROVED",
    details: "Doctrine version approved by operator token workflow.",
  });

  return resolvedTimestamp;
}

async function logDoctrineChunkApproval(env, { operatorId, versionId, chunkHash, classification = null, timestamp = null }) {
  const resolvedTimestamp = normalizeText(timestamp) || new Date().toISOString();

  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.chunk.approval",
    actorType: "operator",
    operatorId,
    versionId,
    chunkHash,
    classification,
    timestamp: resolvedTimestamp,
    state: "APPROVED",
    details: "Doctrine chunk approved by operator token workflow.",
  });

  return resolvedTimestamp;
}

async function logDoctrineAccess(env, { agentId, versionId, classification, timestamp = null }) {
  const resolvedTimestamp = normalizeText(timestamp) || new Date().toISOString();

  await insertDoctrineAccessLog(env, {
    agentId,
    versionId,
    classification,
    timestamp: resolvedTimestamp,
  });

  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.access",
    actorType: "agent",
    agentId,
    versionId,
    classification: normalizeClassification(classification),
    timestamp: resolvedTimestamp,
    state: "APPROVED",
    details: "Approved doctrine delivered through broker.",
  });

  return resolvedTimestamp;
}

async function logDoctrineDeniedAccess(env, { agentId, versionId, classification, reason, timestamp = null }) {
  const resolvedTimestamp = normalizeText(timestamp) || new Date().toISOString();

  await insertDoctrineEvidenceLog(env, {
    eventType: "doctrine.access.denied",
    actorType: "agent",
    agentId,
    versionId,
    classification: normalizeClassification(classification),
    timestamp: resolvedTimestamp,
    state: "DENIED",
    details: normalizeText(reason) || "Doctrine broker access denied.",
  });

  return resolvedTimestamp;
}

export {
  logDoctrineAccess,
  logDoctrineChunkApproval,
  logDoctrineDeniedAccess,
  logDoctrineSyncQuarantine,
  logDoctrineVersionApproval,
};
