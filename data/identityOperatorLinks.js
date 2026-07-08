const identityOperatorLinks = [];

function listIdentityOperatorLinks() {
  return identityOperatorLinks.map((entry) => ({
    identityId: entry.identityId,
    operatorId: entry.operatorId,
    linkageState: entry.linkageState,
    linkedAt: entry.linkedAt,
    verificationSource: entry.verificationSource
  }));
}

function getOperatorLinkByIdentityId(identityId) {
  return identityOperatorLinks.find((entry) => entry.identityId === identityId) || null;
}

function linkIdentityToOperator({
  identityId,
  operatorId,
  linkageState = "placeholder",
  verificationSource = "manual-review",
  linkedAt = new Date().toISOString()
}) {
  const existing = getOperatorLinkByIdentityId(identityId);
  if (existing) {
    return existing;
  }

  const record = {
    identityId,
    operatorId,
    linkageState,
    verificationSource,
    linkedAt
  };

  identityOperatorLinks.push(record);
  return record;
}

module.exports = {
  identityOperatorLinks,
  listIdentityOperatorLinks,
  getOperatorLinkByIdentityId,
  linkIdentityToOperator
};
