import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { geminiService, SJCCC_SYSTEM_PROMPT } from '../../src/features/ai-assistant/geminiService.ts';
import { AiAssistantWidget } from '../../src/features/ai-assistant/AiAssistantWidget.ts';
import { motionSuspension } from '../../src/core/physics/MotionSuspension.ts';

/**
 * Minimal DOM element mock for testing in Node.js test environment
 */
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
        this.children = [];
        if (!val) return;
        // Parse simple child tags with id or class so querySelector and getElementById find them
        const idMatches = val.matchAll(/id="([^"]+)"/g);
        for (const match of idMatches) {
            const childId = match[1];
            if (!(globalThis as any).mockDomElements.find((el: MockElement) => el.id === childId)) {
                const child = new MockElement('div');
                child.id = childId;
                (globalThis as any).mockDomElements.push(child);
                this.children.push(child);
            }
        }
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
        contains: (cls: string) => {
            return this.className.split(' ').includes(cls);
        }
    };

    public addEventListener(event: string, handler: Function): void {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(handler);
    }

    public dispatchEvent(event: { type: string }): void {
        this.eventListeners[event.type]?.forEach((h) => h(event));
    }

    public appendChild(child: MockElement): MockElement {
        child.parentElement = this;
        this.children.push(child);
        (globalThis as any).mockDomElements.push(child);
        return child;
    }

    public insertBefore(newNode: MockElement, referenceNode: MockElement): MockElement {
        newNode.parentElement = this;
        const idx = this.children.indexOf(referenceNode);
        if (idx >= 0) {
            this.children.splice(idx, 0, newNode);
        } else {
            this.children.push(newNode);
        }
        (globalThis as any).mockDomElements.push(newNode);
        return newNode;
    }

    public remove(): void {
        const idx = (globalThis as any).mockDomElements.indexOf(this);
        if (idx >= 0) (globalThis as any).mockDomElements.splice(idx, 1);
    }

    public querySelector(selector: string): MockElement | null {
        return (globalThis as any).mockQuerySelector(selector, this);
    }

    public querySelectorAll(selector: string): MockElement[] {
        return (globalThis as any).mockQuerySelectorAll(selector, this);
    }

    public focus(): void {}

    get textContent(): string {
        return this._innerHTML.replace(/<[^>]*>/g, '');
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
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelectorAll: (selector: string) => []
    };

    (globalThis as any).mockQuerySelector = (selector: string, parent?: MockElement) => {
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            return elements.find((el) => el.id === id) || null;
        }
        if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            return elements.find((el) => el.className.includes(cls)) || null;
        }
        return elements.find((el) => el.tagName.toLowerCase() === selector.toLowerCase()) || null;
    };

    (globalThis as any).mockQuerySelectorAll = (selector: string, parent?: MockElement) => {
        const pool = parent && parent.children.length > 0 ? parent.children : elements;
        if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            return pool.filter((el) => el.className.includes(cls));
        }
        return [];
    };

    (globalThis as any).document = doc;
    (globalThis as any).window = {
        innerWidth: 1024,
        requestAnimationFrame: (cb: Function) => cb()
    };
    (globalThis as any).requestAnimationFrame = (cb: Function) => cb();
}

describe('SJCCC AI Guidance Assistant Unit Tests', () => {
    describe('GeminiService Knowledge Base & Logic', () => {
        it('should embed authoritative SJCCC school context in system prompt', () => {
            expect(SJCCC_SYSTEM_PROMPT).toContain("St. Joseph's Catholic Comprehensive College");
            expect(SJCCC_SYSTEM_PROMPT).toContain('Mbengwi');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Archdiocese of Bamenda');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Rev. Fr. Joseph Gael Kenne, S.D');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Edificamus Regnum Dei');
            expect(SJCCC_SYSTEM_PROMPT).toContain('193,000 FCFA');
            expect(SJCCC_SYSTEM_PROMPT).toContain('200,500 FCFA');
            expect(SJCCC_SYSTEM_PROMPT).toContain('OPUS SECURITATIS (OPSEC)');
            expect(SJCCC_SYSTEM_PROMPT).toContain('100117');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Building Construction');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Fashion Design');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Electrical Power Systems');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Automobile Repair Mechanics');
            expect(SJCCC_SYSTEM_PROMPT).toContain('Home Economics');
        });

        it('should generate accurate fallback guidance for admission questions', () => {
            const fallback = geminiService.generateOfflineFallback('How do I apply for admission to Form 1?');
            expect(fallback.isFallback).toBe(true);
            expect(fallback.text).toContain('Admissions at SJCCC Mbengwi');
            expect(fallback.text).toContain('Common Entrance');
            expect(fallback.text).toContain('4th August 2026');
        });

        it('should generate accurate fallback guidance for tuition and banking questions', () => {
            const fallback = geminiService.generateOfflineFallback('What are the school fees and account number?');
            expect(fallback.isFallback).toBe(true);
            expect(fallback.text).toContain('193,000 FCFA');
            expect(fallback.text).toContain('OPUS SECURITATIS');
            expect(fallback.text).toContain('100117');
        });

        it('should generate accurate fallback guidance for academic programs and technical departments', () => {
            const fallback = geminiService.generateOfflineFallback('What technical courses and subjects do you offer?');
            expect(fallback.isFallback).toBe(true);
            expect(fallback.text).toContain('Building Construction');
            expect(fallback.text).toContain('Fashion Design');
            expect(fallback.text).toContain('Electrical Power Systems');
        });

        it('should return prompt warning for empty questions', async () => {
            const result = await geminiService.sendMessage('   ');
            expect(result.text).toContain('Please enter a question');
        });
    });

    describe('AiAssistantWidget DOM & Lifecycle', () => {
        let widget: AiAssistantWidget;

        beforeEach(() => {
            setupMockDom();
            vi.spyOn(geminiService, 'sendMessage').mockImplementation(async (prompt: string) => {
                return geminiService.generateOfflineFallback(prompt);
            });
            widget = new AiAssistantWidget();
            widget.init();
        });

        afterEach(() => {
            vi.restoreAllMocks();
            widget.destroy();
        });

        it('should render FAB and drawer modal into DOM with correct accessibility attributes', () => {
            const fab = document.getElementById('sjcccAiFab');
            const drawer = document.getElementById('sjcccAiDrawer');
            const overlay = document.getElementById('sjcccAiOverlay');

            expect(fab).not.toBeNull();
            expect(drawer).not.toBeNull();
            expect(overlay).not.toBeNull();

            expect(fab?.getAttribute('aria-label')).toBe('Open SJCCC AI Guidance Assistant');
            expect(drawer?.getAttribute('role')).toBe('dialog');
            expect(drawer?.getAttribute('aria-modal')).toBe('true');
            expect(drawer?.hasAttribute('hidden')).toBe(true);
        });

        it('should coordinate with MotionSuspensionController on open and close', () => {
            const suspendSpy = vi.spyOn(motionSuspension, 'suspendAll');
            const resumeSpy = vi.spyOn(motionSuspension, 'resumeAll');

            const drawer = document.getElementById('sjcccAiDrawer');
            const fab = document.getElementById('sjcccAiFab');

            widget.open();
            expect(drawer?.hasAttribute('hidden')).toBe(false);
            expect(fab?.getAttribute('aria-expanded')).toBe('true');
            expect(suspendSpy).toHaveBeenCalledWith('ai-assistant-modal');

            widget.close();
            expect(resumeSpy).toHaveBeenCalledWith('ai-assistant-modal');
        });

        it('should handle starter prompt execution and message rendering', async () => {
            await widget.handleUserPrompt('What academic programs are offered?');

            const messageList = document.getElementById('sjcccAiMessageList');
            expect(messageList).not.toBeNull();
            expect(messageList?.children.length).toBeGreaterThan(0);

            const userRow = messageList?.children.find((c) => c.className.includes('sjccc-msg-row--user'));
            const assistantRow = messageList?.children.find((c) => c.className.includes('sjccc-msg-row--assistant'));

            expect(userRow).toBeDefined();
            expect(assistantRow).toBeDefined();
            expect(userRow?.textContent).toContain('What academic programs are offered?');
            expect(assistantRow?.textContent).toContain('Academic Programs');
        });

        it('should reset conversation history when reset button is triggered', async () => {
            await widget.handleUserPrompt('How much are school fees?');
            const messageList = document.getElementById('sjcccAiMessageList');
            expect(messageList?.children.length).toBeGreaterThan(0);

            widget.resetConversation();
            expect(messageList?.children.length).toBe(0);
        });

        it('should combine seamlessly with existing #enquiryFab into unified assistance dock', () => {
            widget.destroy();
            setupMockDom();

            const existingEnquiry = document.createElement('button');
            existingEnquiry.id = 'enquiryFab';
            existingEnquiry.className = 'enquiry-fab';
            document.body.appendChild(existingEnquiry);

            const newWidget = new AiAssistantWidget();
            newWidget.init();

            const dock = document.getElementById('unifiedAssistanceDock');
            const aiFab = document.getElementById('sjcccAiFab');
            const enquiryFab = document.getElementById('enquiryFab');

            expect(dock).not.toBeNull();
            expect(aiFab).not.toBeNull();
            expect(enquiryFab).not.toBeNull();
            expect(dock?.children).toContain(aiFab);
            expect(dock?.children).toContain(enquiryFab);

            newWidget.destroy();
        });
    });
});
