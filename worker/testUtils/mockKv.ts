// Minimal in-memory KVNamespace stand-in for unit tests — implements just
// the get/put/delete/list surface the worker modules actually call.
// list() sorts keys lexicographically ascending, matching real Cloudflare
// KV's ordering (which the ISO-8601-prefixed keys in this repo rely on for
// oldest-first retention).
export function createMockKv(): KVNamespace {
  const store = new Map<string, string>();

  return {
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: { prefix?: string; limit?: number }) {
      const prefix = options?.prefix ?? "";
      const limit = options?.limit ?? 1000;
      const keys = [...store.keys()]
        .filter((name) => name.startsWith(prefix))
        .sort()
        .slice(0, limit)
        .map((name) => ({ name }));
      return { keys, list_complete: true, cacheStatus: null };
    },
  } as unknown as KVNamespace;
}
