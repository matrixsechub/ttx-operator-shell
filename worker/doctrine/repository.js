const APPROVED_FLAG = 1;
const QUARANTINE_FLAG = 0;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeClassification(value) {
  return normalizeText(value).toUpperCase();
}

function requireDoctrineDb(env) {
  if (!env.DOCTRINE_DB) {
    throw new Error("DOCTRINE_DB binding is required.");
  }
  return env.DOCTRINE_DB;
}

function mapDoctrineVersion(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    source_url: row.source_url,
    created_at: row.created_at,
    approved: Number(row.approved) === APPROVED_FLAG,
    operator_id: row.operator_id || null,
  };
}

function mapDoctrineChunk(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    version_id: row.version_id,
    hash: row.hash,
    classification: row.classification,
    created_at: row.created_at,
    approved: Number(row.approved) === APPROVED_FLAG,
  };
}

function mapDoctrineAcl(row) {
  if (!row) {
    return null;
  }

  return {
    agent_id: row.agent_id,
    allowed_classifications: row.allowed_classifications || "",
  };
}

async function getDoctrineVersion(env, versionId) {
  const normalizedVersionId = normalizeText(versionId);
  if (!normalizedVersionId) {
    return null;
  }

  const row = await requireDoctrineDb(env)
    .prepare(
      `SELECT id, source_url, created_at, approved, operator_id
       FROM doctrine_versions
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(normalizedVersionId)
    .first();

  return mapDoctrineVersion(row);
}

async function getLatestDoctrineVersion(env) {
  const row = await requireDoctrineDb(env)
    .prepare(
      `SELECT id, source_url, created_at, approved, operator_id
       FROM doctrine_versions
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .first();

  return mapDoctrineVersion(row);
}

async function createDoctrineVersion(env, { id, sourceUrl, createdAt, approved = QUARANTINE_FLAG, operatorId = null }) {
  const normalizedId = normalizeText(id);
  const normalizedSourceUrl = normalizeText(sourceUrl);
  const normalizedCreatedAt = normalizeText(createdAt);

  if (!normalizedId || !normalizedSourceUrl || !normalizedCreatedAt) {
    throw new Error("id, sourceUrl, and createdAt are required.");
  }

  await requireDoctrineDb(env)
    .prepare(
      `INSERT INTO doctrine_versions (id, source_url, created_at, approved, operator_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      normalizedId,
      normalizedSourceUrl,
      normalizedCreatedAt,
      Number(approved) === APPROVED_FLAG ? APPROVED_FLAG : QUARANTINE_FLAG,
      normalizeText(operatorId) || null,
    )
    .run();

  return getDoctrineVersion(env, normalizedId);
}

async function getDoctrineChunk(env, versionId, chunkHash) {
  const row = await requireDoctrineDb(env)
    .prepare(
      `SELECT id, version_id, hash, classification, created_at, approved
       FROM doctrine_chunks
       WHERE version_id = ? AND hash = ?
       LIMIT 1`,
    )
    .bind(normalizeText(versionId), normalizeText(chunkHash))
    .first();

  return mapDoctrineChunk(row);
}

async function insertDoctrineChunkMetadata(env, { versionId, hash, classification, createdAt, approved = QUARANTINE_FLAG }) {
  const normalizedVersionId = normalizeText(versionId);
  const normalizedHash = normalizeText(hash);
  const normalizedClassification = normalizeClassification(classification);
  const normalizedCreatedAt = normalizeText(createdAt);

  if (!normalizedVersionId || !normalizedHash || !normalizedClassification || !normalizedCreatedAt) {
    throw new Error("versionId, hash, classification, and createdAt are required.");
  }

  await requireDoctrineDb(env)
    .prepare(
      `INSERT INTO doctrine_chunks (version_id, hash, classification, created_at, approved)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      normalizedVersionId,
      normalizedHash,
      normalizedClassification,
      normalizedCreatedAt,
      Number(approved) === APPROVED_FLAG ? APPROVED_FLAG : QUARANTINE_FLAG,
    )
    .run();

  return getDoctrineChunk(env, normalizedVersionId, normalizedHash);
}

async function listDoctrineChunksByVersion(env, versionId) {
  const normalizedVersionId = normalizeText(versionId);
  if (!normalizedVersionId) {
    return [];
  }

  const result = await requireDoctrineDb(env)
    .prepare(
      `SELECT id, version_id, hash, classification, created_at, approved
       FROM doctrine_chunks
       WHERE version_id = ?
       ORDER BY id ASC`,
    )
    .bind(normalizedVersionId)
    .all();

  return (result.results || []).map(mapDoctrineChunk);
}

async function listDoctrineHashesByVersion(env, versionId) {
  const chunks = await listDoctrineChunksByVersion(env, versionId);
  return chunks.map((chunk) => chunk.hash);
}

async function approveDoctrineVersion(env, { versionId, operatorId }) {
  const version = await getDoctrineVersion(env, versionId);
  if (!version) {
    return null;
  }

  await requireDoctrineDb(env)
    .prepare(
      `UPDATE doctrine_versions
       SET approved = ?, operator_id = ?
       WHERE id = ?`,
    )
    .bind(APPROVED_FLAG, normalizeText(operatorId) || null, version.id)
    .run();

  return getDoctrineVersion(env, version.id);
}

async function approveDoctrineChunk(env, { versionId, chunkHash }) {
  const chunk = await getDoctrineChunk(env, versionId, chunkHash);
  if (!chunk) {
    return null;
  }

  await requireDoctrineDb(env)
    .prepare(
      `UPDATE doctrine_chunks
       SET approved = ?
       WHERE version_id = ? AND hash = ?`,
    )
    .bind(APPROVED_FLAG, chunk.version_id, chunk.hash)
    .run();

  return getDoctrineChunk(env, chunk.version_id, chunk.hash);
}

async function getDoctrineAclEntry(env, agentId) {
  const normalizedAgentId = normalizeText(agentId);
  if (!normalizedAgentId) {
    return null;
  }

  const row = await requireDoctrineDb(env)
    .prepare(
      `SELECT agent_id, allowed_classifications
       FROM doctrine_acl
       WHERE agent_id = ?
       LIMIT 1`,
    )
    .bind(normalizedAgentId)
    .first();

  return mapDoctrineAcl(row);
}

async function listApprovedDoctrineChunks(env, { versionId, classification }) {
  const result = await requireDoctrineDb(env)
    .prepare(
      `SELECT id, version_id, hash, classification, created_at, approved
       FROM doctrine_chunks
       WHERE version_id = ?
         AND classification = ?
         AND approved = ?
       ORDER BY id ASC`,
    )
    .bind(normalizeText(versionId), normalizeClassification(classification), APPROVED_FLAG)
    .all();

  return (result.results || []).map(mapDoctrineChunk);
}

async function countApprovedDoctrineChunks(env, { versionId, classification }) {
  const row = await requireDoctrineDb(env)
    .prepare(
      `SELECT COUNT(*) AS count
       FROM doctrine_chunks
       WHERE version_id = ?
         AND classification = ?
         AND approved = ?`,
    )
    .bind(normalizeText(versionId), normalizeClassification(classification), APPROVED_FLAG)
    .first();

  return Number(row?.count || 0);
}

async function insertDoctrineAccessLog(env, { agentId, versionId, classification, timestamp }) {
  const normalizedAgentId = normalizeText(agentId);
  const normalizedVersionId = normalizeText(versionId);
  const normalizedClassification = normalizeClassification(classification);
  const normalizedTimestamp = normalizeText(timestamp);

  if (!normalizedAgentId || !normalizedVersionId || !normalizedClassification || !normalizedTimestamp) {
    throw new Error("agentId, versionId, classification, and timestamp are required.");
  }

  await requireDoctrineDb(env)
    .prepare(
      `INSERT INTO doctrine_access_logs (agent_id, version_id, classification, timestamp)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(normalizedAgentId, normalizedVersionId, normalizedClassification, normalizedTimestamp)
    .run();
}

async function insertDoctrineEvidenceLog(
  env,
  {
    eventType,
    actorType,
    operatorId = null,
    agentId = null,
    versionId = null,
    chunkHash = null,
    classification = null,
    sourceUrl = null,
    timestamp,
    state,
    details = null,
  },
) {
  const normalizedTimestamp = normalizeText(timestamp);
  const normalizedEventType = normalizeText(eventType);
  const normalizedActorType = normalizeText(actorType);
  const normalizedState = normalizeText(state).toUpperCase();

  if (!normalizedTimestamp || !normalizedEventType || !normalizedActorType || !normalizedState) {
    throw new Error("timestamp, eventType, actorType, and state are required.");
  }

  await requireDoctrineDb(env)
    .prepare(
      `INSERT INTO doctrine_evidence_logs (
        event_type,
        actor_type,
        operator_id,
        agent_id,
        version_id,
        chunk_hash,
        classification,
        source_url,
        timestamp,
        state,
        details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      normalizedEventType,
      normalizedActorType,
      normalizeText(operatorId) || null,
      normalizeText(agentId) || null,
      normalizeText(versionId) || null,
      normalizeText(chunkHash) || null,
      normalizeClassification(classification) || null,
      normalizeText(sourceUrl) || null,
      normalizedTimestamp,
      normalizedState,
      normalizeText(details) || null,
    )
    .run();
}

export {
  APPROVED_FLAG,
  QUARANTINE_FLAG,
  approveDoctrineChunk,
  approveDoctrineVersion,
  countApprovedDoctrineChunks,
  createDoctrineVersion,
  getDoctrineAclEntry,
  getDoctrineChunk,
  getDoctrineVersion,
  getLatestDoctrineVersion,
  insertDoctrineAccessLog,
  insertDoctrineChunkMetadata,
  insertDoctrineEvidenceLog,
  listApprovedDoctrineChunks,
  listDoctrineChunksByVersion,
  listDoctrineHashesByVersion,
  normalizeClassification,
  normalizeText,
  requireDoctrineDb,
};
