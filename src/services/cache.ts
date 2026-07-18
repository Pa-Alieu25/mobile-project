import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';

type CacheEntry<T> = { data: T; cachedAt: number };

export type CachedResult<T> = { data: T; fromCache: boolean; cachedAt?: number };

export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
    } catch {
        return null;
    }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() } satisfies CacheEntry<T>));
    } catch {
        // Caching is best-effort; ignore write failures.
    }
}

/**
 * Network-first with cache fallback. When online, fetches fresh data and
 * refreshes the cache. When the request fails (e.g. offline), returns the last
 * synced data if available; otherwise rethrows so the screen shows its error
 * state. This gives offline access to previously loaded academic data (FR-10).
 */
export async function fetchWithCache<T>(
    cacheKey: string,
    endpoint: string,
    token?: string | null
): Promise<CachedResult<T>> {
    try {
        const data = await apiRequest<T>(endpoint, { token });
        await writeCache(cacheKey, data);
        return { data, fromCache: false };
    } catch (err) {
        const cached = await readCache<T>(cacheKey);
        if (cached) {
            return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
        }
        throw err;
    }
}

export const CacheKeys = {
    timetable: 'cache:timetable',
    announcements: 'cache:announcements',
    assignments: 'cache:assignments',
    examVenues: 'cache:examVenues',
} as const;

/** Remove all cached academic data. Called on sign-out so a shared device does
 * not show one user's cached class data to the next person who signs in. */
export async function clearCachedData(): Promise<void> {
    try {
        await AsyncStorage.multiRemove(Object.values(CacheKeys));
    } catch {
        // best-effort; a failed cache clear must not block sign-out
    }
}
