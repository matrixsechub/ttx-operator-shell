import { listApprovedDoctrineChunks } from "./repository.js";

const DOCTRINE_OBJECT_PREFIX = "doctrine";
const DOCTRINE_CACHE_PREFIX = "doctrine:chunk";

function requireDoctrineCache(env) {
  if (!env.DOCTRINE_CACHE) {
    throw new Error("DOCTRINE_CACHE binding is required.");
  }
  return env.DOCTRINE_CACHE;
}

function requireDoctrineBucket(env) {
  if (!env.DOCTRINE_CHUNKS) {
    throw new Error("DOCTRINE_CHUNKS binding is required.");
  }
  return env.DOCTRINE_CHUNKS;
}

function buildDoctrineChunkCacheKey(versionId, hash) {
  return `${DOCTRINE_CACHE_PREFIX}:${versionId}:${hash}`;
}

function buildDoctrineChunkObjectKey(versionId, hash) {
  return `${DOCTRINE_OBJECT_PREFIX}/${versionId}/${hash}.md`;
}

async function storeDoctrineChunk(env, { versionId, hash, classification, markdown }) {
  if (!versionId || !hash || !classification || typeof markdown !== "string") {
    throw new Error("versionId, hash, classification, and markdown are required.");
  }

  const storedAt = new Date().toISOString();
  const cacheKey = buildDoctrineChunkCacheKey(versionId, hash);
  const objectKey = buildDoctrineChunkObjectKey(versionId, hash);

  await Promise.all([
    requireDoctrineCache(env).put(
      cacheKey,
      JSON.stringify({
        versionId,
        hash,
        classification,
        markdown,
        storedAt,
        referenceOnly: true,
      }),
    ),
    requireDoctrineBucket(env).put(objectKey, markdown, {
      httpMetadata: {
        contentType: "text/markdown; charset=utf-8",
      },
      customMetadata: {
        versionId,
        hash,
        classification,
        storedAt,
        referenceOnly: "true",
      },
    }),
  ]);

  return {
    cacheKey,
    objectKey,
    storedAt,
  };
}

async function readDoctrineChunk(env, { versionId, hash }) {
  if (!versionId || !hash) {
    throw new Error("versionId and hash are required.");
  }

  const cacheKey = buildDoctrineChunkCacheKey(versionId, hash);
  const cached = await requireDoctrineCache(env).get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return {
      versionId,
      hash,
      classification: parsed.classification || null,
      markdown: typeof parsed.markdown === "string" ? parsed.markdown : "",
      storedAt: parsed.storedAt || null,
    };
  }

  const objectKey = buildDoctrineChunkObjectKey(versionId, hash);
  const object = await requireDoctrineBucket(env).get(objectKey);
  if (!object) {
    return null;
  }

  const markdown = await object.text();
  const classification = object.customMetadata?.classification || null;
  const storedAt = object.customMetadata?.storedAt || null;

  await requireDoctrineCache(env).put(
    cacheKey,
    JSON.stringify({
      versionId,
      hash,
      classification,
      markdown,
      storedAt,
      referenceOnly: true,
    }),
  );

  return {
    versionId,
    hash,
    classification,
    markdown,
    storedAt,
  };
}

async function hydrateDoctrineChunks(env, chunkRows) {
  return Promise.all(
    chunkRows.map(async (chunkRow) => {
      const stored = await readDoctrineChunk(env, {
        versionId: chunkRow.version_id,
        hash: chunkRow.hash,
      });

      if (!stored) {
        throw new Error(`Doctrine chunk body missing for ${chunkRow.version_id}:${chunkRow.hash}`);
      }

      return {
        hash: chunkRow.hash,
        classification: chunkRow.classification,
        created_at: chunkRow.created_at,
        markdown: stored.markdown,
      };
    }),
  );
}

async function listApprovedDoctrineChunksForEmbedding(env, { versionId, classification }) {
  const approvedChunks = await listApprovedDoctrineChunks(env, { versionId, classification });
  return hydrateDoctrineChunks(env, approvedChunks);
}

export {
  buildDoctrineChunkCacheKey,
  buildDoctrineChunkObjectKey,
  hydrateDoctrineChunks,
  listApprovedDoctrineChunksForEmbedding,
  readDoctrineChunk,
  storeDoctrineChunk,
};
