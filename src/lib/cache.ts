/**
 * Simple in-memory cache with TTL for rate-limited SmartOLT API endpoints.
 * This module lives at the module scope so it persists across API route calls
 * within the same Next.js server process.
 */

interface CacheEntry<T> {
    data: T;
    expiry: number; // timestamp in ms
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        store.delete(key);
        return null;
    }
    return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expiry: Date.now() + ttlMs });
}

/** 20 minutes in ms — safe for 3-calls-per-hour limit */
export const DETAILS_CACHE_TTL = 20 * 60 * 1000;

/** 30 minutes for zone data which rarely changes */
export const ZONES_CACHE_TTL = 30 * 60 * 1000;
