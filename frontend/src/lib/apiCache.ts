// Simple in-memory cache for API GET responses — avoids refetching on navigation
interface CacheEntry { data: any; ts: number; }
const store = new Map<string, CacheEntry>();

export function getCached(key: string, ttlMs = 20_000): any | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) { store.delete(key); return null; }
  return entry.data;
}

export function setCached(key: string, data: any): void {
  store.set(key, { data, ts: Date.now() });
}

export function invalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function cachedGet(
  fetcher: () => Promise<any>,
  key: string,
  ttlMs = 20_000
): Promise<any> {
  const hit = getCached(key, ttlMs);
  if (hit !== null) return hit;
  const data = await fetcher();
  setCached(key, data);
  return data;
}
