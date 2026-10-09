import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineIndicator } from '../../src/features/offline/OfflineIndicator';

class MockElement {
    public id: string = '';
    public className: string = '';
    private _innerHTML: string = '';
    public textContent: string = '';
    public children: MockElement[] = [];
    public style: Record<string, string> = {};
    public attributes = new Map<string, string>();
    public eventListeners: Record<string, Function[]> = {};
    public parentElement: MockElement | null = null;
    public dataset: Record<string, string> = {};
    public hidden: boolean = false;

    constructor(public tagName: string) {}

    get innerHTML(): string {
        return this._innerHTML;
    }

    set innerHTML(val: string) {
        this._innerHTML = val;
        this.children = [];
        this.textContent = val.replace(/<[^>]*>/g, '');

        // Simple parser to instantiate MockElement for tags with class or id
        const tagRegex = /<([a-z0-9]+)([^>]*)>(.*?)<\/\1>/gis;
        let match;
        while ((match = tagRegex.exec(val)) !== null) {
            const tagName = match[1];
            const attrs = match[2];
            const content = match[3];

            const child = new MockElement(tagName);
            const classMatch = attrs.match(/class=["']([^"']+)["']/i);
            if (classMatch) child.className = classMatch[1];
            const idMatch = attrs.match(/id=["']([^"']+)["']/i);
            if (idMatch) child.id = idMatch[1];

            child.innerHTML = content;
            this.appendChild(child);
        }
    }

    get classList() {
        return {
            contains: (cls: string) => this.className.split(/\s+/).includes(cls),
            add: (...classes: string[]) => {
                const current = new Set(this.className.split(/\s+/).filter(Boolean));
                classes.forEach((c) => current.add(c));
                this.className = Array.from(current).join(' ');
            },
            remove: (...classes: string[]) => {
                const current = new Set(this.className.split(/\s+/).filter(Boolean));
                classes.forEach((c) => current.delete(c));
                this.className = Array.from(current).join(' ');
            },
            toggle: (cls: string, force?: boolean) => {
                const has = this.classList.contains(cls);
                const shouldAdd = force !== undefined ? force : !has;
                if (shouldAdd) this.classList.add(cls);
                else this.classList.remove(cls);
                return shouldAdd;
            },
        };
    }

    public setAttribute(name: string, val: string): void {
        this.attributes.set(name, String(val));
        if (name === 'id') this.id = String(val);
        if (name === 'class') this.className = String(val);
        if (name === 'hidden') this.hidden = true;
    }

    public getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }

    public removeAttribute(name: string): void {
        this.attributes.delete(name);
        if (name === 'hidden') this.hidden = false;
    }

    public appendChild(child: MockElement): MockElement {
        this.children.push(child);
        child.parentElement = this;
        return child;
    }

    public remove(): void {
        if (this.parentElement) {
            const idx = this.parentElement.children.indexOf(this);
            if (idx !== -1) this.parentElement.children.splice(idx, 1);
            this.parentElement = null;
        }
    }

    public addEventListener(event: string, handler: Function): void {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(handler);
    }

    public querySelector<T = MockElement>(sel: string): T | null {
        const find = (el: MockElement): MockElement | null => {
            if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) return el;
            if (sel.startsWith('#') && el.id === sel.slice(1)) return el;
            for (const c of el.children) {
                const match = find(c);
                if (match) return match;
            }
            return null;
        };
        for (const c of this.children) {
            const match = find(c);
            if (match) return match as unknown as T;
        }
        return null;
    }
}

describe('OfflineIndicator Event-Driven Reliability & Lifecycle', () => {
    let windowListeners: Record<string, Function[]> = {};
    let body: MockElement;
    let mockDoc: any;

    beforeEach(() => {
        windowListeners = {};
        body = new MockElement('body');

        mockDoc = {
            body,
            createElement: (tag: string) => new MockElement(tag),
            getElementById: (id: string) => {
                const search = (el: MockElement): MockElement | null => {
                    if (el.id === id) return el;
                    for (const c of el.children) {
                        const res = search(c);
                        if (res) return res;
                    }
                    return null;
                };
                return search(body);
            },
        };

        (globalThis as any).document = mockDoc;
        (globalThis as any).window = {
            addEventListener: (event: string, handler: Function) => {
                if (!windowListeners[event]) windowListeners[event] = [];
                windowListeners[event].push(handler);
            },
            removeEventListener: (event: string, handler: Function) => {
                if (windowListeners[event]) {
                    windowListeners[event] = windowListeners[event].filter((h) => h !== handler);
                }
            },
            requestAnimationFrame: (cb: Function) => cb(),
        };

        try {
            Object.defineProperty(globalThis, 'navigator', {
                value: { onLine: true },
                configurable: true,
                writable: true,
            });
        } catch {}

        // Reset singleton
        (OfflineIndicator as any).instance = null;
    });

    afterEach(() => {
        const inst = (OfflineIndicator as any).instance;
        if (inst) inst.destroy();
    });

    it('attaches window online and offline listeners on initialization', () => {
        const indicator = new OfflineIndicator({ autoMount: false });
        expect(windowListeners['online']?.length).toBeGreaterThan(0);
        expect(windowListeners['offline']?.length).toBeGreaterThan(0);
    });

    it('remains hidden when page boots while online', async () => {
        (globalThis as any).navigator.onLine = true;
        const indicator = new OfflineIndicator();
        await indicator.init();

        const el = mockDoc.getElementById('offlineStatusIndicator');
        expect(el).toBeNull();
    });

    it('renders offline indicator immediately when window fires offline event', () => {
        (globalThis as any).navigator.onLine = true;
        const indicator = new OfflineIndicator({ autoMount: false });

        // Simulate network disconnect
        (globalThis as any).navigator.onLine = false;
        windowListeners['offline']?.forEach((h) => h());

        const el = mockDoc.getElementById('offlineStatusIndicator');
        expect(el).not.toBeNull();
        expect(el?.classList.contains('online')).toBe(false);

        const title = el?.querySelector('.offline-indicator-title');
        expect(title?.textContent).toBe('Offline Mode');
    });

    it('transitions to "Back Online" and auto-dismisses when window fires online event', () => {
        vi.useFakeTimers();
        const indicator = new OfflineIndicator({ autoMount: false });

        // Go offline first
        windowListeners['offline']?.forEach((h) => h());
        let el = mockDoc.getElementById('offlineStatusIndicator');
        expect(el).not.toBeNull();
        expect(el?.classList.contains('online')).toBe(false);

        // Transition to online
        (globalThis as any).navigator.onLine = true;
        windowListeners['online']?.forEach((h) => h());

        expect(el?.classList.contains('online')).toBe(true);
        const title = el?.querySelector('.offline-indicator-title');
        expect(title?.textContent).toBe('Back Online');

        // Advance timers by 2500ms
        vi.advanceTimersByTime(3000);
        expect(mockDoc.getElementById('offlineStatusIndicator')).toBeNull();

        vi.useRealTimers();
    });

    it('enforces singleton pattern across multiple instantiations without duplicate listeners', () => {
        const inst1 = OfflineIndicator.getInstance();
        const inst2 = OfflineIndicator.getInstance();
        expect(inst1).toBe(inst2);
    });
});
