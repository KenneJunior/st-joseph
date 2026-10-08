import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarActionSheet } from '../../src/features/calendar/CalendarActionSheet';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../src/data/academicCalendar';

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
        this.textContent = val.replace(/<[^>]*>/g, '');
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

    public hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    public addEventListener(event: string, handler: Function): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(handler);
    }

    public dispatchEvent(event: any): boolean {
        const handlers = this.eventListeners[event.type] || [];
        for (const handler of handlers) {
            handler(event);
        }
        return true;
    }

    public appendChild(child: MockElement): MockElement {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    public removeChild(child: MockElement): MockElement {
        this.children = this.children.filter((c) => c !== child);
        child.parentElement = null;
        return child;
    }

    public closest(selector: string): MockElement | null {
        let curr: MockElement | null = this;
        while (curr) {
            if (selector.startsWith('[data-action="close"]') && curr.dataset.action === 'close') return curr;
            if (selector.startsWith('[data-action]') && curr.dataset.action) return curr;
            if (selector.startsWith('[data-provider]') && curr.dataset.provider) return curr;
            if (selector.startsWith('.') && curr.classList.contains(selector.slice(1))) return curr;
            curr = curr.parentElement;
        }
        return null;
    }

    public querySelector(selector: string): MockElement | null {
        return (globalThis as any).mockQuerySelector(selector, this);
    }

    public querySelectorAll(selector: string): MockElement[] {
        return (globalThis as any).mockQuerySelectorAll(selector, this);
    }

    public focus(): void {
        (globalThis as any).document.activeElement = this;
    }

    public click(): void {
        this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {}, stopPropagation: () => {} });
    }
}

function setupMockDom() {
    const elements: MockElement[] = [];
    (globalThis as any).mockDomElements = elements;

    const body = new MockElement('body');
    elements.push(body);

    const doc = {
        body,
        createElement: (tagName: string) => {
            const el = new MockElement(tagName);
            elements.push(el);
            return el;
        },
        getElementById: (id: string) => {
            return elements.find((el) => el.id === id) || null;
        },
        querySelector: (selector: string) => (globalThis as any).mockQuerySelector(selector),
        querySelectorAll: (selector: string) => (globalThis as any).mockQuerySelectorAll(selector),
        activeElement: null as MockElement | null,
    };

    const getAllDescendants = (root: MockElement): MockElement[] => {
        const result: MockElement[] = [];
        for (const child of root.children) {
            result.push(child);
            result.push(...getAllDescendants(child));
        }
        return result;
    };

    (globalThis as any).mockQuerySelector = (selector: string, parent?: MockElement) => {
        const pool = parent ? getAllDescendants(parent) : elements;
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            return elements.find((el) => el.id === id) || null;
        }
        if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            return pool.find((el) => el.classList.contains(cls)) || null;
        }
        if (selector.startsWith('[data-provider=')) {
            const match = selector.match(/\[data-provider="?([^"\]]+)"?\]/);
            const val = match ? match[1] : '';
            return pool.find((el) => el.dataset.provider === val) || null;
        }
        return pool.find((el) => el.tagName.toLowerCase() === selector.toLowerCase()) || null;
    };

    (globalThis as any).mockQuerySelectorAll = (selector: string, parent?: MockElement) => {
        const pool = parent ? getAllDescendants(parent) : elements;
        if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            return pool.filter((el) => el.classList.contains(cls));
        }
        return pool.filter((el) => el.tagName.toLowerCase() === selector.toLowerCase());
    };

    (globalThis as any).document = doc;
    (globalThis as any).window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        open: vi.fn(),
    };
    try {
        Object.defineProperty(globalThis, 'navigator', {
            value: { onLine: true },
            configurable: true,
            writable: true,
        });
    } catch {}
    (globalThis as any).URL = {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
    };
}

describe('CalendarActionSheet Accessibility & Lifecycle', () => {
    let triggerBtn: MockElement;
    const testMilestone = ACADEMIC_MILESTONES_2026_2027[0];

    beforeEach(() => {
        setupMockDom();
        (CalendarActionSheet as any).instance = null; // reset singleton

        triggerBtn = (globalThis as any).document.createElement('button');
        triggerBtn.id = 'testTriggerBtn';
        triggerBtn.setAttribute('aria-expanded', 'false');
        triggerBtn.setAttribute('aria-haspopup', 'dialog');
        (globalThis as any).document.body.appendChild(triggerBtn);
    });

    it('initializes sheet instance cleanly without crashing', () => {
        const sheet = CalendarActionSheet.getInstance();
        expect(sheet).toBeDefined();
    });

    it('opens dialog, populates milestone info, and marks aria-expanded="true"', () => {
        const sheet = CalendarActionSheet.getInstance();
        sheet.open(testMilestone, triggerBtn as any);

        const dialog = (globalThis as any).document.getElementById('calendarActionDialog');
        expect(dialog).not.toBeNull();
        expect(dialog?.hidden).toBe(false);
        expect(dialog?.classList.contains('is-open')).toBe(true);
        expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');

        const desc = (globalThis as any).document.getElementById('calDialogDesc');
        expect(desc?.textContent).toContain(testMilestone.title);
        expect(desc?.textContent).toContain(testMilestone.location);
    });

    it('closes dialog, resets aria-expanded to "false", and removes open class', () => {
        const sheet = CalendarActionSheet.getInstance();
        sheet.open(testMilestone, triggerBtn as any);
        sheet.close();

        const dialog = (globalThis as any).document.getElementById('calendarActionDialog');
        expect(dialog?.hidden).toBe(true);
        expect(dialog?.classList.contains('is-open')).toBe(false);
        expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('handles Google Calendar provider action by opening web composer with safe parameters', () => {
        const sheet = CalendarActionSheet.getInstance();
        sheet.open(testMilestone, triggerBtn as any);

        const googleBtn = new MockElement('button');
        googleBtn.dataset.provider = 'google';
        (sheet as any).handleProviderAction('google');

        expect((globalThis as any).window.open).toHaveBeenCalledWith(
            expect.stringContaining('calendar.google.com'),
            '_blank',
            'noopener,noreferrer'
        );
    });

    it('handles Outlook provider action by opening Outlook compose with safe parameters', () => {
        const sheet = CalendarActionSheet.getInstance();
        sheet.open(testMilestone, triggerBtn as any);

        (sheet as any).handleProviderAction('outlook');

        expect((globalThis as any).window.open).toHaveBeenCalledWith(
            expect.stringContaining('outlook.live.com'),
            '_blank',
            'noopener,noreferrer'
        );
    });

    it('handles ICS provider action with Blob creation and truthful guidance (never claiming "Saved")', () => {
        const sheet = CalendarActionSheet.getInstance();
        sheet.open(testMilestone, triggerBtn as any);

        (sheet as any).handleProviderAction('ics');

        expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
        const guidanceText = (globalThis as any).document.getElementById('calGuidanceText');
        expect(guidanceText?.textContent).toContain('Calendar file download started');
        expect(guidanceText?.textContent).not.toContain('Saved (.ics)');
    });
});
