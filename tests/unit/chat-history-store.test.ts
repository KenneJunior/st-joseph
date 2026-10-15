import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiChatHistoryStore } from '../../src/core/storage/AiChatHistoryStore.ts';
import { STORAGE_KEYS } from '../../src/core/storage/storageKeys.ts';

class MockStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
    private store = new Map<string, string>();

    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}

describe('AiChatHistoryStore Unit Tests', () => {
    let mockStorage: MockStorage;
    let store: AiChatHistoryStore;

    beforeEach(() => {
        mockStorage = new MockStorage();
        store = new AiChatHistoryStore(STORAGE_KEYS.AI_CHAT_HISTORY, {
            storage: mockStorage,
            maxEntries: 10,
        });
    });

    it('should initialize with empty history', () => {
        expect(store.getHistory()).toEqual([]);
        expect(store.hasHistory()).toBe(false);
    });

    it('should add user and assistant messages and persist to storage', () => {
        const time1 = 1700000000000;
        const time2 = 1700000001000;

        store.addMessage('user', 'What are the admission requirements?', time1);
        store.addMessage('model', 'Admissions require Common Entrance pass.', time2);

        const history = store.getHistory();
        expect(history.length).toBe(2);
        expect(history[0]).toEqual({
            role: 'user',
            text: 'What are the admission requirements?',
            timestamp: time1,
        });
        expect(history[1]).toEqual({
            role: 'model',
            text: 'Admissions require Common Entrance pass.',
            timestamp: time2,
        });

        // Verify JSON was written to mockStorage
        const raw = mockStorage.getItem(STORAGE_KEYS.AI_CHAT_HISTORY);
        expect(raw).not.toBeNull();
        const parsed = JSON.parse(raw!);
        expect(parsed.length).toBe(2);
        expect(parsed[0].text).toBe('What are the admission requirements?');
    });

    it('should enforce maxEntries bound and retain only the most recent messages', () => {
        const boundedStore = new AiChatHistoryStore('test-bounded-chat', {
            storage: mockStorage,
            maxEntries: 4,
        });

        for (let i = 1; i <= 6; i++) {
            boundedStore.addMessage(i % 2 === 1 ? 'user' : 'model', `Message ${i}`);
        }

        const history = boundedStore.getHistory();
        expect(history.length).toBe(4);
        expect(history[0].text).toBe('Message 3');
        expect(history[1].text).toBe('Message 4');
        expect(history[2].text).toBe('Message 5');
        expect(history[3].text).toBe('Message 6');
    });

    it('should gracefully handle malformed JSON in storage', () => {
        mockStorage.setItem(STORAGE_KEYS.AI_CHAT_HISTORY, 'INVALID_JSON{{{');

        const history = store.getHistory();
        expect(history).toEqual([]);
        expect(store.hasHistory()).toBe(false);
    });

    it('should filter out corrupted or invalid entries during deserialization', () => {
        const corruptedData = [
            null,
            { role: 'invalid_role', text: 'Bad role' },
            { role: 'user', text: '' }, // empty text
            { role: 'user', text: 'Valid user question', timestamp: 12345 },
            'random string',
            { role: 'model', text: 'Valid model answer', timestamp: 67890 },
        ];
        mockStorage.setItem(STORAGE_KEYS.AI_CHAT_HISTORY, JSON.stringify(corruptedData));

        const history = store.getHistory();
        expect(history.length).toBe(2);
        expect(history[0].text).toBe('Valid user question');
        expect(history[1].text).toBe('Valid model answer');
    });

    it('should clear history from storage and memory', () => {
        store.addMessage('user', 'Hello');
        store.addMessage('model', 'Hello, how can I help?');
        expect(store.hasHistory()).toBe(true);

        store.clearHistory();
        expect(store.getHistory()).toEqual([]);
        expect(store.hasHistory()).toBe(false);
        expect(mockStorage.getItem(STORAGE_KEYS.AI_CHAT_HISTORY)).toBeNull();
    });

    it('should operate cleanly in memory fallback mode when storage is null or throws', () => {
        const failingStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
            getItem: () => { throw new Error('SecurityError: Access Denied'); },
            setItem: () => { throw new Error('QuotaExceededError'); },
            removeItem: () => { throw new Error('SecurityError'); },
        };

        const fallbackStore = new AiChatHistoryStore('test-fallback', {
            storage: failingStorage,
            maxEntries: 5,
        });

        expect(fallbackStore.getHistory()).toEqual([]);
        fallbackStore.addMessage('user', 'Can I register online?');
        expect(fallbackStore.getHistory().length).toBe(1);
        expect(fallbackStore.getHistory()[0].text).toBe('Can I register online?');

        fallbackStore.clearHistory();
        expect(fallbackStore.getHistory()).toEqual([]);
    });
});
