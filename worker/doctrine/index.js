import { checkDoctrineAcl } from "./acl.js";
import {
  logDoctrineAccess,
  logDoctrineChunkApproval,
  logDoctrineDeniedAccess,
  logDoctrineSyncQuarantine,
  logDoctrineVersionApproval,
} from "./evidence.js";
import {
  QUARANTINE_FLAG,
  approveDoctrineChunk,
  approveDoctrineVersion,
  createDoctrineVersion,
  getDoctrineVersion,
  getLatestDoctrineVersion,
  insertDoctrineChunkMetadata,
  listApprovedDoctrineChunks,
  listDoctrineHashesByVersion,
  normalizeClassification,
  normalizeText,
} from "./repository.js";
import { buildDoctrineSyncPayload } from "./pipeline.js";
import { hydrateDoctrineChunks, storeDoctrineChunk } from "./storage.js";

class DoctrineHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Doctrine-Mode": "reference-only",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getRequestToken(request) {
  const authorization = normalizeText(request.headers.get("Authorization"));
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return normalizeText(request.headers.get("X-MSH-Operator-Token"));
}

function requireOperatorToken(request, env) {
  const configuredToken = normalizeText(env.DOCTRINE_OPERATOR_TOKEN);
  if (!configuredToken) {
    throw new DoctrineHttpError(500, "DOCTRINE_OPERATOR_TOKEN is not configured.");
  }

  if (getRequestToken(request) !== configuredToken) {
    throw new DoctrineHttpError(403, "Operator token is invalid.");
  }
}

function requireOperatorId(request, body) {
  const operatorId = normalizeText(
    body.operatorId ||
      body.operator_id ||
      request.headers.get("X-MSH-Operator-Id"),
  );

  if (!operatorId) {
    throw new DoctrineHttpError(400, "operatorId is required.");
  }

  return operatorId;
}

async function handleDoctrineSync(request, env) {
  requireOperatorToken(request, env);

  const body = await readBody(request);
  const latestVersion = await getLatestDoctrineVersion(env);
  const previousHashes = latestVersion ? await listDoctrineHashesByVersion(env, latestVersion.id) : [];
  const syncPayload = await buildDoctrineSyncPayload(env, {
    sourceUrl: body.sourceUrl || body.source_url || body.url || null,
    previousHashes,
  });

  if (!syncPayload.hasChanges && latestVersion) {
    return json({
      status: "NO_CHANGE",
      versionId: latestVersion.id,
      sourceUrl: syncPayload.sourceUrl,
      approved: latestVersion.approved,
      totalChunkCount: syncPayload.totalChunkCount,
      newChunkCount: 0,
    });
  }

  const versionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await createDoctrineVersion(env, {
    id: versionId,
    sourceUrl: syncPayload.sourceUrl,
    createdAt,
    approved: QUARANTINE_FLAG,
    operatorId: null,
  });

  for (const chunk of syncPayload.chunks) {
    await storeDoctrineChunk(env, {
      versionId,
      hash: chunk.hash,
      classification: chunk.classification,
      markdown: chunk.markdown,
    });

    await insertDoctrineChunkMetadata(env, {
      versionId,
      hash: chunk.hash,
      classification: chunk.classification,
      createdAt,
      approved: QUARANTINE_FLAG,
    });
  }

  await logDoctrineSyncQuarantine(env, {
    versionId,
    sourceUrl: syncPayload.sourceUrl,
    chunkCount: syncPayload.totalChunkCount,
    newChunkCount: syncPayload.newChunkCount,
    timestamp: createdAt,
  });

  return json(
    {
      status: "QUARANTINE",
      versionId,
      sourceUrl: syncPayload.sourceUrl,
      approved: false,
      totalChunkCount: syncPayload.totalChunkCount,
      newChunkCount: syncPayload.newChunkCount,
      chunks: syncPayload.chunks.map((chunk) => ({
        index: chunk.index,
        hash: chunk.hash,
        classification: chunk.classification,
        diffStatus: chunk.diffStatus,
        approved: false,
      })),
    },
    201,
  );
}

async function handleDoctrineApproveVersion(request, env) {
  requireOperatorToken(request, env);

  const body = await readBody(request);
  const versionId = normalizeText(body.versionId || body.version_id);
  const operatorId = requireOperatorId(request, body);

  if (!versionId) {
    throw new DoctrineHttpError(400, "versionId is required.");
  }

  const version = await approveDoctrineVersion(env, {
    versionId,
    operatorId,
  });
  if (!version) {
    throw new DoctrineHttpError(404, "Doctrine version not found.");
  }

  const timestamp = await logDoctrineVersionApproval(env, {
    operatorId,
    versionId: version.id,
  });

  return json({
    status: "APPROVED",
    operator_id: operatorId,
    version_id: version.id,
    approved: true,
    timestamp,
  });
}

async function handleDoctrineApproveChunk(request, env) {
  requireOperatorToken(request, env);

  const body = await readBody(request);
  const versionId = normalizeText(body.versionId || body.version_id);
  const chunkHash = normalizeText(body.chunkHash || body.chunk_hash || body.hash);
  const operatorId = requireOperatorId(request, body);

  if (!versionId || !chunkHash) {
    throw new DoctrineHttpError(400, "versionId and chunkHash are required.");
  }

  const chunk = await approveDoctrineChunk(env, {
    versionId,
    chunkHash,
  });
  if (!chunk) {
    throw new DoctrineHttpError(404, "Doctrine chunk not found.");
  }

  const timestamp = await logDoctrineChunkApproval(env, {
    operatorId,
    versionId,
    chunkHash,
    classification: chunk.classification,
  });

  return json({
    status: "APPROVED",
    operator_id: operatorId,
    version_id: versionId,
    chunk_hash: chunkHash,
    approved: true,
    timestamp,
  });
}

async function handleDoctrineBroker(request, env) {
  const body = await readBody(request);
  const agentId = normalizeText(body.agentId || body.agent_id);
  const versionId = normalizeText(body.versionId || body.version_id);
  const classification = normalizeClassification(body.classification);

  if (!agentId || !versionId || !classification) {
    throw new DoctrineHttpError(400, "agentId, versionId, and classification are required.");
  }

  const aclResult = await checkDoctrineAcl(env, agentId, classification, versionId);
  if (!aclResult.allowed) {
    await logDoctrineDeniedAccess(env, {
      agentId,
      versionId,
      classification,
      reason: aclResult.reason,
    });
    throw new DoctrineHttpError(403, `Doctrine access denied: ${aclResult.reason}`);
  }

  const version = await getDoctrineVersion(env, versionId);
  if (!version || !version.approved) {
    await logDoctrineDeniedAccess(env, {
      agentId,
      versionId,
      classification,
      reason: "version_not_approved",
    });
    throw new DoctrineHttpError(403, "Doctrine version is not approved.");
  }

  const chunkRows = await listApprovedDoctrineChunks(env, {
    versionId,
    classification,
  });
  if (!chunkRows.length) {
    await logDoctrineDeniedAccess(env, {
      agentId,
      versionId,
      classification,
      reason: "no_approved_chunks",
    });
    throw new DoctrineHttpError(403, "No approved chunks are available for this classification.");
  }

  const chunks = await hydrateDoctrineChunks(env, chunkRows);
  const timestamp = await logDoctrineAccess(env, {
    agentId,
    versionId,
    classification,
  });

  return json({
    referenceOnly: true,
    nonExecutable: true,
    agentId,
    versionId,
    classification,
    timestamp,
    constraints: [
      "REFERENCE_ONLY",
      "NON_EXECUTABLE",
      "NO_DIRECT_WRITING_IO_FETCH",
      "NO_DOCTRINE_MUTATION",
      "NO_PERMISSION_EXPANSION",
    ],
    chunks,
  });
}

async function handleDoctrineRequest(request, env, url = new URL(request.url)) {
  try {
    const pathname = url.pathname;
    const method = request.method || "GET";

    if (method === "POST" && pathname === "/doctrine/sync") {
      return handleDoctrineSync(request, env);
    }

    if (method === "POST" && pathname === "/doctrine/approve-version") {
      return handleDoctrineApproveVersion(request, env);
    }

    if (method === "POST" && pathname === "/doctrine/approve-chunk") {
      return handleDoctrineApproveChunk(request, env);
    }

    if (method === "POST" && pathname === "/doctrine/broker") {
      return handleDoctrineBroker(request, env);
    }

    return json({ error: "Doctrine route not found." }, 404);
  } catch (error) {
    const status = error instanceof DoctrineHttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Doctrine request failed.";
    return json({ error: message }, status);
  }
}

export default handleDoctrineRequest;
