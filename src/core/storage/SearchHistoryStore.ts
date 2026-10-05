/**
 * ============================================================================
 * SJCCC – Local Search History Storage & Normalization Engine
 * Lightweight, privacy-preserving client-side search history store with
 * query normalization, case-insensitive deduplication, bounded capacity,
 * and graceful fallback when localStorage is unavailable or malformed.
 * ============================================================================
 */

export interface SearchHistoryOptions {
    /** Maximum number of recent queries to retain (default: 8) */
    maxEntries?: number;
    /** Minimum normalized character length to save (default: 2) */
    minQueryLength?: number;
    /** Maximum normalized character length allowed (default: 80) */
    maxQueryLength?: number;
    /** Optional custom Storage provider (defaults to window.localStorage) */
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
}

export const DEFAULT_MAX_SEARCH_HISTORY = 8;
export const DEFAULT_MIN_QUERY_LENGTH = 2;
export const DEFAULT_MAX_QUERY_LENGTH = 80;

/**
 * Normalizes a user-facing search query by trimming leading/trailing whitespace
 * and collapsing repeated internal whitespace while preserving original casing.
 */
export function normalizeSearchQuery(rawQuery: string): string {
    if (typeof rawQuery !== 'string') return '';
    return rawQuery.trim().replace(/\s+/g, ' ');
}

/**
 * Produces the canonical comparison key for case-insensitive deduplication.
 */
export function getCanonicalQueryKey(rawQuery: string): string {
    return normalizeSearchQuery(rawQuery).toLowerCase();
}

export class SearchHistoryStore {
    private readonly storageKey: string;
    private readonly maxEntries: number;
    private readonly minQueryLength: number;
    private readonly maxQueryLength: number;
    private readonly customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
    private memoryFallback: string[] = [];

    constructor(storageKey: string, options: SearchHistoryOptions = {}) {
        this.storageKey = storageKey;
        this.maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_SEARCH_HISTORY);
        this.minQueryLength = Math.max(1, options.minQueryLength ?? DEFAULT_MIN_QUERY_LENGTH);
        this.maxQueryLength = Math.max(this.minQueryLength, options.maxQueryLength ?? DEFAULT_MAX_QUERY_LENGTH);
        this.customStorage = options.storage;
    }

    /**
     * Resolves the active storage adapter safely without throwing in private browsing or SSR
     */
    private getStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
        if (this.customStorage !== undefined) {
            return this.customStorage;
        }
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage;
            }
        } catch {
            // Access denied in restricted iframe / private mode
        }
        return null;
    }

    /**
     * Reads, validates, normalizes, deduplicates, and bounds the stored history array.
     * Malformed JSON or non-array data gracefully resets to an empty list.
     */
    public getHistory(): string[] {
        const storage = this.getStorage();
        if (!storage) {
            return [...this.memoryFallback];
        }

        try {
            const raw = storage.getItem(this.storageKey);
            if (!raw) {
                return [];
            }

            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            const sanitized = this.sanitizeEntries(parsed);
            this.memoryFallback = [...sanitized];
            return sanitized;
        } catch {
            return [...this.memoryFallback];
        }
    }

    /**
     * Sanitizes an arbitrary array into normalized, deduplicated, length-bounded strings.
     */
    private sanitizeEntries(rawItems: unknown[]): string[] {
        const result: string[] = [];
        const seenKeys = new Set<string>();

        for (const item of rawItems) {
            if (typeof item !== 'string') continue;
            const clean = normalizeSearchQuery(item).slice(0, this.maxQueryLength);
            if (clean.length < this.minQueryLength) continue;

            const key = clean.toLowerCase();
            if (seenKeys.has(key)) continue;

            seenKeys.add(key);
            result.push(clean);

            if (result.length >= this.maxEntries) {
                break;
            }
        }

        return result;
    }

    /**
     * Saves a valid search query to the front of the history list.
     * - Ignores empty or too-short queries
     * - Removes any existing case-insensitive duplicate
     * - Places the clean user-facing query at index 0
     * - Enforces the maximum history size (default: 8)
     * Returns the updated history list.
     */
    public addQuery(rawQuery: string): string[] {
        const clean = normalizeSearchQuery(rawQuery).slice(0, this.maxQueryLength);
        if (clean.length < this.minQueryLength) {
            return this.getHistory();
        }

        const canonicalKey = clean.toLowerCase();
        const current = this.getHistory();
        const filtered = current.filter((entry) => getCanonicalQueryKey(entry) !== canonicalKey);
        const updated = [clean, ...filtered].slice(0, this.maxEntries);

        this.persist(updated);
        return updated;
    }

    /**
     * Removes a single query from history (case-insensitive match).
     * Returns the updated history list.
     */
    public removeQuery(rawQuery: string): string[] {
        const canonicalKey = getCanonicalQueryKey(rawQuery);
        if (!canonicalKey) {
            return this.getHistory();
        }

        const current = this.getHistory();
        const updated = current.filter((entry) => getCanonicalQueryKey(entry) !== canonicalKey);

        if (updated.length === 0) {
            this.clearHistory();
            return [];
        }

        this.persist(updated);
        return updated;
    }

    /**
     * Clears all stored searches for this history key.
     */
    public clearHistory(): void {
        this.memoryFallback = [];
        const storage = this.getStorage();
        if (!storage) return;

        try {
            storage.removeItem(this.storageKey);
        } catch {
            // Ignore storage restriction errors
        }
    }

    /**
     * Returns the storage key associated with this store instance.
     */
    public getStorageKey(): string {
        return this.storageKey;
    }

    private persist(entries: string[]): void {
        this.memoryFallback = [...entries];
        const storage = this.getStorage();
        if (!storage) return;

        try {
            if (entries.length === 0) {
                storage.removeItem(this.storageKey);
            } else {
                storage.setItem(this.storageKey, JSON.stringify(entries));
            }
        } catch {
            // QuotaExceededError or private browsing restriction — memoryFallback stays current
        }
    }
}
