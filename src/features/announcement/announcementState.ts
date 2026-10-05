/**
 * ============================================================================
 * SJCCC – Centralized Announcement State & Custom Event Bus Management
 * Provides a typed Event Bus emitting 'notice-read' events, reactive persistence
 * with localStorage, ID alias resolution, and cross-component synchronization
 * between the Announcement Bar and the Past Announcements Modal.
 * ============================================================================
 */

export interface NoticeReadPayload {
    id: string;
    isRead: boolean;
    allReadIds: string[];
}

export interface AnnouncementReadChangeEvent extends NoticeReadPayload {}

export type AnnouncementEventType = 'notice-read' | 'notice-cleared' | 'announcement-dismissed';

export type EventCallback<T = unknown> = (payload: T) => void;

/**
 * Lightweight, typed Custom Event Bus for announcement events
 */
export class AnnouncementEventBus {
    private readonly listeners: Map<string, Set<EventCallback<any>>> = new Map();

    /**
     * Subscribes to an event on the bus.
     * Returns an unsubscribe function.
     */
    public on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback as EventCallback<any>);

        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Unsubscribes a specific listener
     */
    public off<T = unknown>(event: string, callback: EventCallback<T>): void {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(callback as EventCallback<any>);
            if (set.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Emits an event with strongly typed payload to all subscribers
     */
    public emit<T = unknown>(event: string, payload: T): void {
        const set = this.listeners.get(event);
        if (set) {
            set.forEach((cb) => {
                try {
                    cb(payload);
                } catch (err) {
                    console.error(`[AnnouncementEventBus] Error in listener for "${event}":`, err);
                }
            });
        }
    }

    /**
     * Clears all registered listeners
     */
    public clear(): void {
        this.listeners.clear();
    }
}

export type ReadChangeSubscriber = (event: AnnouncementReadChangeEvent) => void;

class AnnouncementStateManager {
    public readonly eventBus: AnnouncementEventBus = new AnnouncementEventBus();
    private readonly legacySubscribers: Set<ReadChangeSubscriber> = new Set();

    /**
     * Map aliases between banner notice IDs and historical archive notice IDs
     */
    private readonly ID_ALIASES: Record<string, string[]> = {
        'school-resumption-2026': ['notice-resumption-2026'],
        'notice-resumption-2026': ['school-resumption-2026'],
        'form-one-interviews-august-2026': ['notice-form-one-2026'],
        'notice-form-one-2026': ['form-one-interviews-august-2026'],
    };

    /**
     * Resolves all aliases for a given notice ID (including the ID itself)
     */
    public resolveAliases(id: string): string[] {
        if (!id) return [];
        const aliases = this.ID_ALIASES[id] || [];
        return Array.from(new Set([id, ...aliases]));
    }

    /**
     * Checks if two notice IDs match or are known aliases of each other
     */
    public matchesNoticeId(idA: string, idB: string): boolean {
        if (!idA || !idB) return false;
        if (idA === idB) return true;
        const aliasesA = this.ID_ALIASES[idA] || [];
        if (aliasesA.includes(idB)) return true;
        const aliasesB = this.ID_ALIASES[idB] || [];
        return aliasesB.includes(idA);
    }

    /**
     * Checks if a given announcement ID (or its known alias) is marked as read in localStorage
     */
    public isNoticeRead(id: string): boolean {
        if (!id) return false;
        try {
            if (localStorage.getItem(`sjccc_notice_read_${id}`) === 'true') {
                return true;
            }
            const aliases = this.ID_ALIASES[id] || [];
            for (const alias of aliases) {
                if (localStorage.getItem(`sjccc_notice_read_${alias}`) === 'true') {
                    return true;
                }
            }
        } catch {
            return false;
        }
        return false;
    }

    /**
     * Sets the read state for an announcement and its aliases,
     * updates localStorage, and emits the 'notice-read' event on the Event Bus.
     */
    public setNoticeRead(id: string, isRead: boolean): void {
        if (!id) return;
        const aliases = this.resolveAliases(id);

        try {
            aliases.forEach((keyId) => {
                const storageKey = `sjccc_notice_read_${keyId}`;
                if (isRead) {
                    localStorage.setItem(storageKey, 'true');
                } else {
                    localStorage.removeItem(storageKey);
                }
            });
        } catch {
            // Storage quota fallback
        }

        const allReadIds = this.getAllReadNoticeIds();
        const payload: NoticeReadPayload = { id, isRead, allReadIds };

        // 1. Emit typed 'notice-read' event on the Custom Event Bus
        this.eventBus.emit<NoticeReadPayload>('notice-read', payload);

        // 2. Notify legacy subscribers
        this.notifyLegacy(payload);

        // 3. Dispatch CustomEvent for document/window listeners
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sjccc:notice-read', { detail: payload }));
            window.dispatchEvent(new CustomEvent('sjccc:announcement-read-changed', { detail: payload }));
        }
    }

    /**
     * Toggles the read state of an announcement
     */
    public toggleNoticeRead(id: string): boolean {
        const nextState = !this.isNoticeRead(id);
        this.setNoticeRead(id, nextState);
        return nextState;
    }

    /**
     * Returns an array of all notice IDs currently marked as read
     */
    public getAllReadNoticeIds(): string[] {
        const ids: string[] = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sjccc_notice_read_') && localStorage.getItem(key) === 'true') {
                    ids.push(key.replace('sjccc_notice_read_', ''));
                }
            }
        } catch {
            // Storage access fallback
        }
        return ids;
    }

    /**
     * Clears all announcement read receipts from localStorage,
     * emits 'notice-read' with '*' wildcard and 'notice-cleared'
     */
    public clearAllReadStates(): void {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sjccc_notice_read_')) {
                    localStorage.removeItem(key);
                }
            }
        } catch {
            // Storage quota fallback
        }

        const payload: NoticeReadPayload = { id: '*', isRead: false, allReadIds: [] };
        this.eventBus.emit<NoticeReadPayload>('notice-read', payload);
        this.eventBus.emit('notice-cleared', payload);
        this.notifyLegacy(payload);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sjccc:notice-read', { detail: payload }));
        }
    }

    /**
     * Legacy subscription support
     */
    public subscribe(subscriber: ReadChangeSubscriber): () => void {
        this.legacySubscribers.add(subscriber);
        return () => {
            this.legacySubscribers.delete(subscriber);
        };
    }

    private notifyLegacy(event: AnnouncementReadChangeEvent): void {
        this.legacySubscribers.forEach((cb) => {
            try {
                cb(event);
            } catch {
                // Ignore subscriber runtime error
            }
        });
    }
}

export const announcementState = new AnnouncementStateManager();
export const announcementEventBus = announcementState.eventBus;

/**
 * Convenience functional helpers
 */
export function isNoticeRead(id: string): boolean {
    return announcementState.isNoticeRead(id);
}

export function setNoticeRead(id: string, isRead: boolean): void {
    announcementState.setNoticeRead(id, isRead);
}

export function toggleNoticeRead(id: string): boolean {
    return announcementState.toggleNoticeRead(id);
}

export function subscribeToAnnouncementReadState(subscriber: ReadChangeSubscriber): () => void {
    return announcementState.subscribe(subscriber);
}

export function onNoticeRead(callback: EventCallback<NoticeReadPayload>): () => void {
    return announcementEventBus.on<NoticeReadPayload>('notice-read', callback);
}
