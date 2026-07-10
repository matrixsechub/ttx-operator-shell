import { withCfAccessHeaders } from "./cfAccess.ts";

export async function stagingFetch(input: URL | string, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: withCfAccessHeaders(init?.headers),
  });
}
