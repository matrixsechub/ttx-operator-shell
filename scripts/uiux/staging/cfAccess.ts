export function readCfAccessServiceTokenHeaders(): Record<string, string> {
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

export function withCfAccessHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  for (const [key, value] of Object.entries(readCfAccessServiceTokenHeaders())) {
    merged.set(key, value);
  }
  return merged;
}
