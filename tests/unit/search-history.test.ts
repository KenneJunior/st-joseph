import { describe, it, expect, beforeEach } from 'vitest';
import {
    SearchHistoryStore,
    normalizeSearchQuery,
    getCanonicalQueryKey,
    DEFAULT_MAX_SEARCH_HISTORY,
} from '../../src/core/storage/SearchHistoryStore.ts';
import { STORAGE_KEYS } from '../../src/core/storage/storageKeys.ts';

class MockStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
    private data = new Map<string, string>();

    public getItem(key: string): string | null {
        return this.data.has(key) ? this.data.get(key)! : null;
    }

    public setItem(key: string, value: string): void {
        this.data.set(key, value);
    }

    public removeItem(key: string): void {
        this.data.delete(key);
    }
}

describe('Local Search History Engine (Dates & FAQ)', () => {
    let mockStorage: MockStorage;

    beforeEach(() => {
        mockStorage = new MockStorage();
    });

    it('normalizes whitespace and preserves display casing while matching case-insensitively', () => {
        expect(normalizeSearchQuery('   Boarding   ')).toBe('Boarding');
        expect(normalizeSearchQuery('Academic    calendar  2026')).toBe('Academic calendar 2026');
        expect(getCanonicalQueryKey('  BOARDING ')).toBe('boarding');
    });

    it('keeps Dates and FAQ search histories completely separate', () => {
        const datesStore = new SearchHistoryStore(STORAGE_KEYS.DATES_SEARCH_HISTORY, { storage: mockStorage });
        const faqStore = new SearchHistoryStore(STORAGE_KEYS.FAQ_SEARCH_HISTORY, { storage: mockStorage });

        datesStore.addQuery('Mid-Term Break');
        datesStore.addQuery('Resumption');

        faqStore.addQuery('Tuition Fees');
        faqStore.addQuery('Mattress');

        expect(datesStore.getHistory()).toEqual(['Resumption', 'Mid-Term Break']);
        expect(faqStore.getHistory()).toEqual(['Mattress', 'Tuition Fees']);

        // Clearing FAQ history must not affect Dates history
        faqStore.clearHistory();
        expect(faqStore.getHistory()).toEqual([]);
        expect(datesStore.getHistory()).toEqual(['Resumption', 'Mid-Term Break']);
    });

    it('deduplicates case-insensitive queries and moves the most recent version to the front', () => {
        const store = new SearchHistoryStore(STORAGE_KEYS.FAQ_SEARCH_HISTORY, { storage: mockStorage });

        store.addQuery('Admission');
        store.addQuery('Fees');
        store.addQuery('  boarding ');
        store.addQuery('BOARDING');
        store.addQuery('Boarding');

        expect(store.getHistory()).toEqual(['Boarding', 'Fees', 'Admission']);
    });

    it('ignores empty, whitespace-only, or single-character queries', () => {
        const store = new SearchHistoryStore(STORAGE_KEYS.DATES_SEARCH_HISTORY, { storage: mockStorage });

        store.addQuery('');
        store.addQuery('    ');
        store.addQuery('a');

        expect(store.getHistory()).toEqual([]);
    });

    it('enforces the maximum capacity of 8 recent searches and evicts the oldest entry', () => {
        const store = new SearchHistoryStore(STORAGE_KEYS.FAQ_SEARCH_HISTORY, { storage: mockStorage });

        for (let i = 1; i <= 10; i++) {
            store.addQuery(`Query ${i}`);
        }

        const history = store.getHistory();
        expect(history).toHaveLength(DEFAULT_MAX_SEARCH_HISTORY);
        expect(history[0]).toBe('Query 10');
        expect(history[DEFAULT_MAX_SEARCH_HISTORY - 1]).toBe('Query 3');
        expect(history).not.toContain('Query 1');
        expect(history).not.toContain('Query 2');
    });

    it('removes an individual history entry case-insensitively', () => {
        const store = new SearchHistoryStore(STORAGE_KEYS.FAQ_SEARCH_HISTORY, { storage: mockStorage });

        store.addQuery('Uniform');
        store.addQuery('OPSEC');
        store.addQuery('Boarding');

        const updated = store.removeQuery('opsec');
        expect(updated).toEqual(['Boarding', 'Uniform']);
        expect(store.getHistory()).toEqual(['Boarding', 'Uniform']);
    });

    it('recovers gracefully when localStorage contains malformed JSON or non-array data', () => {
        mockStorage.setItem(STORAGE_KEYS.DATES_SEARCH_HISTORY, '{corrupted-json');
        const store = new SearchHistoryStore(STORAGE_KEYS.DATES_SEARCH_HISTORY, { storage: mockStorage });
        expect(store.getHistory()).toEqual([]);

        mockStorage.setItem(STORAGE_KEYS.DATES_SEARCH_HISTORY, JSON.stringify({ invalid: true }));
        expect(store.getHistory()).toEqual([]);

        // Subsequent valid additions overwrite corrupted data cleanly
        store.addQuery('Exams');
        expect(store.getHistory()).toEqual(['Exams']);
    });

    it('functions safely when localStorage throws or is unavailable', () => {
        const throwingStorage = {
            getItem(): string | null {
                throw new Error('SecurityError');
            },
            setItem(): void {
                throw new Error('QuotaExceededError');
            },
            removeItem(): void {
                throw new Error('SecurityError');
            },
        };

        const store = new SearchHistoryStore(STORAGE_KEYS.FAQ_SEARCH_HISTORY, { storage: throwingStorage });
        expect(() => store.addQuery('Scholarship')).not.toThrow();
        expect(store.getHistory()).toEqual(['Scholarship']);
        expect(() => store.clearHistory()).not.toThrow();
        expect(store.getHistory()).toEqual([]);
    });
});
