import { getCachedApiResponse, logApiCall, saveApiResponseCache } from './firebase';

interface FirebaseBackendOptions<T> {
  service: string;
  request: Record<string, unknown>;
  cacheTtlMs?: number;
  execute: () => Promise<T>;
}

function stableStringify(value: unknown): string {
  if (value == null) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${k}:${stableStringify(v)}`).join(',')}}`;
  }
  return String(value);
}

export async function executeFirebaseBackedApi<T>({
  service,
  request,
  cacheTtlMs = 2 * 60 * 1000,
  execute,
}: FirebaseBackendOptions<T>): Promise<T> {
  const requestKey = stableStringify(request);
  const started = Date.now();

  const cached = await getCachedApiResponse<T>(service, requestKey);
  if (cached != null) {
    await logApiCall({
      service: `${service}/firebase-cache-hit`,
      request,
      response: { cache: 'hit' },
      durationMs: Date.now() - started,
      success: true,
    });
    return cached;
  }

  try {
    const response = await execute();
    // Don't cache empty arrays – avoid poisoning the cache with no-result responses
    const skip = Array.isArray(response) && response.length === 0;
    if (!skip) {
      await saveApiResponseCache(service, requestKey, response, cacheTtlMs);
    }
    await logApiCall({
      service: `${service}/firebase-cache-miss`,
      request,
      response: { cache: 'miss' },
      durationMs: Date.now() - started,
      success: true,
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logApiCall({
      service,
      request,
      response: {},
      durationMs: Date.now() - started,
      success: false,
      error: message,
    });
    throw err;
  }
}
