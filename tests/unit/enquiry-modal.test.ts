import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnquiryModal } from '../../src/features/enquiry/EnquiryModal.ts';
import { SmoothTypingEffect } from '../../src/features/enquiry/SmoothTypingEffect.ts';
import { motionSuspension } from '../../src/core/physics/MotionSuspension.ts';

class MockElement {
    public id: string = '';
    public className: string = '';
    private _innerHTML: string = '';
    public value: string = '';
    public children: MockElement[] = [];
    public style: Record<string, string> = {};
    public attributes = new Map<string, string>();
    public eventListeners: Record<string, Function[]> = {};
    public parentElement: MockElement | null = null;

    constructor(public tagName: string) {}

    get innerHTML(): string {
        return this._innerHTML;
    }

    set innerHTML(val: string) {
        this._innerHTML = val;
    }

    public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }
    public getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }
    public removeAttribute(name: string): void {
        this.attributes.delete(name);
    }
    public hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    public classList = {
        add: (...cls: string[]) => {
            const list = this.className ? this.className.split(' ') : [];
            for (const c of cls) if (!list.includes(c)) list.push(c);
            this.className = list.join(' ');
        },
        remove: (...cls: string[]) => {
            const list = this.className ? this.className.split(' ') : [];
            this.className = list.filter((c) => !cls.includes(c)).join(' ');
        },
        toggle: (cls: string, force?: boolean) => {
            const has = this.classList.contains(cls);
            const shouldAdd = force !== undefined ? force : !has;
            if (shouldAdd) this.classList.add(cls);
            else this.classList.remove(cls);
            return shouldAdd;
        },
        contains: (cls: string) => {
            return this.className.split(' ').includes(cls);
        }
    };

    public addEventListener(event: string, handler: Function, options?: any): void {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(handler);
        if (options?.signal) {
            options.signal.addEventListener('abort', () => {
                this.removeEventListener(event, handler);
            });
        }
    }

    public removeEventListener(event: string, handler: Function): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }

    public dispatchEvent(event: { type: string; key?: string; target?: any }): void {
        event.target = event.target || this;
        this.eventListeners[event.type]?.forEach((h) => h(event));
    }

    public click(): void {
        this.dispatchEvent({ type: 'click' });
    }

    public closest(selector: string): MockElement | null {
        if (selector === '.form-group') {
            let cur: MockElement | null = this;
            while (cur) {
                if (cur.className.includes('form-group')) return cur;
                cur = cur.parentElement;
            }
        }
        return null;
    }

    public querySelector(selector: string): MockElement | null {
        return (globalThis as any).mockQuerySelector(selector, this);
    }

    public querySelectorAll(selector: string): MockElement[] {
        return (globalThis as any).mockQuerySelectorAll(selector, this);
    }

    public focus(): void {}
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
        addEventListener: (event: string, handler: Function, options?: any) => {
            body.addEventListener(event, handler, options);
        },
        removeEventListener: (event: string, handler: Function) => {
            body.removeEventListener(event, handler);
        },
        documentElement: { clientWidth: 1024 },
        activeElement: null
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
            return pool.find((el) => el.className.includes(cls)) || null;
        }
        return pool.find((el) => el.tagName.toLowerCase() === selector.toLowerCase()) || null;
    };

    (globalThis as any).mockQuerySelectorAll = (selector: string, parent?: MockElement) => {
        const pool = parent ? getAllDescendants(parent) : elements;
        if (selector.includes(',')) {
            const parts = selector.split(',').map(s => s.trim());
            return pool.filter(el => parts.some(p => {
                if (p.startsWith('#')) return el.id === p.slice(1);
                if (p.startsWith('.')) return el.className.includes(p.slice(1));
                return el.tagName.toLowerCase() === p.toLowerCase();
            }));
        }
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            return pool.filter((el) => el.id === id);
        }
        if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            return pool.filter((el) => el.className.includes(cls));
        }
        return pool.filter((el) => el.tagName.toLowerCase() === selector.toLowerCase());
    };

    (globalThis as any).document = doc;
    (globalThis as any).window = {
        innerWidth: 1024,
        document: doc
    };
}

describe('EnquiryModal & SmoothTypingEffect Forensic Integrity Tests', () => {
    let fabBtn: MockElement;
    let modalEl: MockElement;
    let contentEl: MockElement;
    let closeBtn: MockElement;
    let enquiryModal: EnquiryModal;

    beforeEach(() => {
        setupMockDom();

        fabBtn = new MockElement('button');
        fabBtn.id = 'enquiryFab';
        (globalThis as any).mockDomElements.push(fabBtn);

        modalEl = new MockElement('div');
        modalEl.id = 'enquiryModal';
        modalEl.setAttribute('hidden', '');
        (globalThis as any).mockDomElements.push(modalEl);

        contentEl = new MockElement('div');
        contentEl.className = 'modal-content';
        contentEl.parentElement = modalEl;
        modalEl.children.push(contentEl);
        (globalThis as any).mockDomElements.push(contentEl);

        closeBtn = new MockElement('button');
        closeBtn.id = 'modalClose';
        closeBtn.parentElement = contentEl;
        contentEl.children.push(closeBtn);
        (globalThis as any).mockDomElements.push(closeBtn);

        enquiryModal = new EnquiryModal(['#enquiryFab'], 'enquiryModal', 'modalClose');
    });

    afterEach(() => {
        enquiryModal.destroy();
        vi.restoreAllMocks();
    });

    it('should coordinate with MotionSuspension on modal open and close', () => {
        const suspendSpy = vi.spyOn(motionSuspension, 'suspendAll');
        const resumeSpy = vi.spyOn(motionSuspension, 'resumeAll');

        expect(enquiryModal.isModalOpen()).toBe(false);
        expect(modalEl.hasAttribute('hidden')).toBe(true);

        enquiryModal.open(fabBtn as any);
        expect(enquiryModal.isModalOpen()).toBe(true);
        expect(modalEl.hasAttribute('hidden')).toBe(false);
        expect(suspendSpy).toHaveBeenCalledWith('modal');

        enquiryModal.close();
        expect(enquiryModal.isModalOpen()).toBe(false);
        expect(resumeSpy).toHaveBeenCalledWith('modal');
    });

    it('should close on escape keypress when modal is open', () => {
        enquiryModal.open();
        expect(enquiryModal.isModalOpen()).toBe(true);

        const docBody = (globalThis as any).document.body;
        docBody.dispatchEvent({ type: 'keydown', key: 'Escape' });

        expect(enquiryModal.isModalOpen()).toBe(false);
    });

    it('should close when backdrop click is detected', () => {
        enquiryModal.open();
        expect(enquiryModal.isModalOpen()).toBe(true);

        modalEl.dispatchEvent({ type: 'click', target: modalEl });
        expect(enquiryModal.isModalOpen()).toBe(false);
    });

    it('should correctly calculate character limits in SmoothTypingEffect', () => {
        const formGroup = new MockElement('div');
        formGroup.className = 'form-group';
        (globalThis as any).mockDomElements.push(formGroup);

        const textarea = new MockElement('textarea');
        textarea.setAttribute('maxlength', '100');
        textarea.parentElement = formGroup;
        formGroup.children.push(textarea);
        (globalThis as any).mockDomElements.push(textarea);

        const charCount = new MockElement('div');
        charCount.className = 'char-count';
        charCount.parentElement = formGroup;
        formGroup.children.push(charCount);
        (globalThis as any).mockDomElements.push(charCount);

        const typingEffect = new SmoothTypingEffect('textarea');

        // Test normal input
        textarea.value = 'Hello SJCCC';
        textarea.dispatchEvent({ type: 'input' });
        expect(charCount.textContent).toBe('11/100');
        expect(charCount.classList.contains('near-limit')).toBe(false);
        expect(charCount.classList.contains('at-limit')).toBe(false);

        // Test near-limit threshold (>= 80%)
        textarea.value = 'a'.repeat(85);
        textarea.dispatchEvent({ type: 'input' });
        expect(charCount.textContent).toBe('85/100');
        expect(charCount.classList.contains('near-limit')).toBe(true);
        expect(charCount.classList.contains('at-limit')).toBe(false);

        // Test at-limit threshold (100%)
        textarea.value = 'a'.repeat(100);
        textarea.dispatchEvent({ type: 'input' });
        expect(charCount.textContent).toBe('100/100');
        expect(charCount.classList.contains('at-limit')).toBe(true);

        typingEffect.destroy();
    });

    it('should activate and deactivate typing indicator on focus and blur within message-field-wrapper', () => {
        const formGroup = new MockElement('div');
        formGroup.className = 'form-group';
        (globalThis as any).mockDomElements.push(formGroup);

        const msgWrapper = new MockElement('div');
        msgWrapper.className = 'message-field-wrapper';
        msgWrapper.parentElement = formGroup;
        formGroup.children.push(msgWrapper);
        (globalThis as any).mockDomElements.push(msgWrapper);

        const textarea = new MockElement('textarea');
        textarea.id = 'enqMessage';
        textarea.setAttribute('maxlength', '500');
        textarea.parentElement = msgWrapper;
        msgWrapper.children.push(textarea);
        (globalThis as any).mockDomElements.push(textarea);

        const charCount = new MockElement('span');
        charCount.className = 'char-count';
        charCount.parentElement = msgWrapper;
        msgWrapper.children.push(charCount);
        (globalThis as any).mockDomElements.push(charCount);

        const typingIndicator = new MockElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.parentElement = msgWrapper;
        msgWrapper.children.push(typingIndicator);
        (globalThis as any).mockDomElements.push(typingIndicator);

        const typingEffect = new SmoothTypingEffect('#enqMessage');

        expect(typingIndicator.classList.contains('active')).toBe(false);

        // Focus activates indicator
        textarea.dispatchEvent({ type: 'focus' });
        expect(typingIndicator.classList.contains('active')).toBe(true);

        // Blur deactivates indicator
        textarea.dispatchEvent({ type: 'blur' });
        expect(typingIndicator.classList.contains('active')).toBe(false);

        typingEffect.destroy();
    });
});
