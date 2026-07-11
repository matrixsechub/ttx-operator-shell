export function readCfAccessServiceTokenHeaders() {
  const clientId =
    process.env.PRISM_CF_ACCESS_CLIENT_ID?.trim() ?? process.env.CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret =
    process.env.PRISM_CF_ACCESS_CLIENT_SECRET?.trim() ?? process.env.CF_ACCESS_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {};
  }

  return {
    "CF-Access-Client-Id": clientId,
    "CF-Access-Client-Secret": clientSecret,
  };
}

export function cfAccessConfigured() {
  return Object.keys(readCfAccessServiceTokenHeaders()).length > 0;
}

export function validateAccessCredentialPair() {
  const clientId =
    process.env.PRISM_CF_ACCESS_CLIENT_ID?.trim() ?? process.env.CF_ACCESS_CLIENT_ID?.trim() ?? "";
  const clientSecret =
    process.env.PRISM_CF_ACCESS_CLIENT_SECRET?.trim() ?? process.env.CF_ACCESS_CLIENT_SECRET?.trim() ?? "";
  if (!clientId && !clientSecret) {
    return { ok: true };
  }
  if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
    return { ok: false, code: "ACCESS_CREDENTIAL_PAIR_INCOMPLETE" };
  }
  return { ok: true };
}
