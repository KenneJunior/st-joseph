/**
 * ============================================================================
 * SJCCC – Persistent AI Chat History Store (AiChatHistoryStore.ts)
 * 
 * Lightweight, privacy-preserving client-side storage engine for the SJCCC
 * AI Guidance Assistant.
 * 
 * Architectural Features:
 * 1. Resilient Persistence: Automatically retains conversation turns in localStorage
 *    so users can reload or navigate without losing guidance records.
 * 2. Defensive Boundaries: Enforces maximum message count (default: 60) and character
 *    bounds (default: 4000) to prevent localStorage quota exhaustion.
 * 3. Sanitized Restoration: Validates JSON schemas upon deserialization and discards
 *    malformed or corrupted entries safely.
 * 4. Graceful In-Memory Fallback: Operates flawlessly in private mode, restricted
 *    iframes, or SSR environments where Storage APIs are unavailable.
 * ============================================================================
 */

import { STORAGE_KEYS } from './storageKeys.ts';

export interface PersistedChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface AiChatHistoryOptions {
    /** Maximum number of messages to retain across sessions (default: 60) */
    maxEntries?: number;
    /** Maximum character length allowed per message text (default: 4000) */
    maxMessageLength?: number;
    /** Optional custom Storage provider (defaults to window.localStorage) */
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
}

export const DEFAULT_MAX_CHAT_HISTORY = 60;
export const DEFAULT_MAX_CHAT_MESSAGE_LENGTH = 4000;

export class AiChatHistoryStore {
    private readonly storageKey: string;
    private readonly maxEntries: number;
    private readonly maxMessageLength: number;
    private readonly customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
    private memoryFallback: PersistedChatMessage[] = [];

    constructor(
        storageKey: string = STORAGE_KEYS.AI_CHAT_HISTORY,
        options: AiChatHistoryOptions = {}
    ) {
        this.storageKey = storageKey;
        this.maxEntries = Math.max(2, options.maxEntries ?? DEFAULT_MAX_CHAT_HISTORY);
        this.maxMessageLength = Math.max(100, options.maxMessageLength ?? DEFAULT_MAX_CHAT_MESSAGE_LENGTH);
        this.customStorage = options.storage;
    }

    /**
     * Resolves the active Storage adapter safely without throwing in private browsing or headless environments.
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
            // Storage access blocked or restricted
        }
        return null;
    }

    /**
     * Reads, deserializes, sanitizes, and returns the persisted conversation history.
     * Corrupted or non-array records gracefully fall back to an empty list.
     */
    public getHistory(): PersistedChatMessage[] {
        const storage = this.getStorage();
        if (!storage) {
            return [...this.memoryFallback];
        }

        try {
            const raw = storage.getItem(this.storageKey);
            if (!raw) {
                return [...this.memoryFallback];
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
     * Appends a new user or model message to persistent storage.
     * Retains the most recent `maxEntries` messages.
     */
    public addMessage(
        role: 'user' | 'model',
        rawText: string,
        timestamp?: number
    ): PersistedChatMessage[] {
        const text = typeof rawText === 'string' ? rawText.trim() : '';
        if (!text) {
            return this.getHistory();
        }

        const validTimestamp = typeof timestamp === 'number' && Number.isFinite(timestamp)
            ? timestamp
            : Date.now();

        const boundedText = text.slice(0, this.maxMessageLength);
        const newMessage: PersistedChatMessage = {
            role,
            text: boundedText,
            timestamp: validTimestamp,
        };

        const current = this.getHistory();
        const updated = [...current, newMessage].slice(-this.maxEntries);
        this.persist(updated);
        return updated;
    }

    /**
     * Replaces the entire conversation history with a verified array of messages.
     */
    public setHistory(
        messages: Array<{ role: 'user' | 'model'; text: string; timestamp?: number }>
    ): PersistedChatMessage[] {
        if (!Array.isArray(messages)) {
            return this.getHistory();
        }

        const sanitized = this.sanitizeEntries(messages);
        this.persist(sanitized);
        return sanitized;
    }

    /**
     * Clears all persisted messages for this assistant conversation.
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
     * Returns true if there is at least one message currently saved in history.
     */
    public hasHistory(): boolean {
        return this.getHistory().length > 0;
    }

    /**
     * Returns the configured storage key name.
     */
    public getStorageKey(): string {
        return this.storageKey;
    }

    /**
     * Sanitizes raw items into valid, bounded PersistedChatMessage records.
     */
    private sanitizeEntries(rawItems: unknown[]): PersistedChatMessage[] {
        const result: PersistedChatMessage[] = [];

        for (const item of rawItems) {
            if (!item || typeof item !== 'object') continue;
            const candidate = item as Record<string, unknown>;

            const role = candidate.role;
            if (role !== 'user' && role !== 'model') continue;

            const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
            if (!text) continue;

            const timestamp = typeof candidate.timestamp === 'number' && Number.isFinite(candidate.timestamp)
                ? candidate.timestamp
                : Date.now();

            result.push({
                role,
                text: text.slice(0, this.maxMessageLength),
                timestamp,
            });
        }

        return result.slice(-this.maxEntries);
    }

    /**
     * Safely serializes history to storage with memory fallback.
     */
    private persist(entries: PersistedChatMessage[]): void {
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
            // QuotaExceededError or security block — memory fallback remains intact
        }
    }
}
