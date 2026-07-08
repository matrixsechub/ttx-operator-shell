import {
  countApprovedDoctrineChunks,
  getDoctrineAclEntry,
  getDoctrineVersion,
  normalizeClassification,
  normalizeText,
} from "./repository.js";

function parseAllowedClassifications(value) {
  return normalizeText(value)
    .split(",")
    .map((entry) => normalizeClassification(entry))
    .filter(Boolean);
}

function hasDoctrineClassificationAccess(allowedClassifications, classification) {
  const normalizedClassification = normalizeClassification(classification);
  return Boolean(
    normalizedClassification &&
      (allowedClassifications.includes("*") || allowedClassifications.includes(normalizedClassification)),
  );
}

async function checkDoctrineAcl(env, agentId, classification, versionId) {
  const normalizedAgentId = normalizeText(agentId);
  const normalizedClassification = normalizeClassification(classification);
  const normalizedVersionId = normalizeText(versionId);

  if (!normalizedAgentId || !normalizedClassification || !normalizedVersionId) {
    return {
      allowed: false,
      reason: "missing_required_fields",
      allowedClassifications: [],
      versionApproved: false,
      approvedChunkCount: 0,
    };
  }

  const aclEntry = await getDoctrineAclEntry(env, normalizedAgentId);
  if (!aclEntry) {
    return {
      allowed: false,
      reason: "acl_not_found",
      allowedClassifications: [],
      versionApproved: false,
      approvedChunkCount: 0,
    };
  }

  const allowedClassifications = parseAllowedClassifications(aclEntry.allowed_classifications);
  if (!hasDoctrineClassificationAccess(allowedClassifications, normalizedClassification)) {
    return {
      allowed: false,
      reason: "classification_not_allowed",
      allowedClassifications,
      versionApproved: false,
      approvedChunkCount: 0,
    };
  }

  const version = await getDoctrineVersion(env, normalizedVersionId);
  if (!version || !version.approved) {
    return {
      allowed: false,
      reason: "version_not_approved",
      allowedClassifications,
      versionApproved: false,
      approvedChunkCount: 0,
    };
  }

  const approvedChunkCount = await countApprovedDoctrineChunks(env, {
    versionId: normalizedVersionId,
    classification: normalizedClassification,
  });
  if (approvedChunkCount < 1) {
    return {
      allowed: false,
      reason: "no_approved_chunks",
      allowedClassifications,
      versionApproved: true,
      approvedChunkCount: 0,
    };
  }

  return {
    allowed: true,
    reason: "allowed",
    allowedClassifications,
    versionApproved: true,
    approvedChunkCount,
  };
}

export { checkDoctrineAcl, hasDoctrineClassificationAccess, parseAllowedClassifications };
