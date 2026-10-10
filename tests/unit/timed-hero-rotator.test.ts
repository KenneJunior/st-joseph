import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimedHeroRotator } from '../../src/features/hero/TimedHeroRotator.ts';
import { HERO_MESSAGES } from '../../src/features/hero/heroMessages.ts';
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
    public parentNode: MockElement | null = null;
    public nextSibling: MockElement | null = null;

    constructor(public tagName: string) {}

    get innerHTML(): string {
        return this._innerHTML;
    }

    set innerHTML(val: string) {
        this._innerHTML = val;
    }

    get textContent(): string {
        return this._innerHTML.replace(/<[^>]*>?/gm, '');
    }

    set textContent(val: string) {
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
            const list = this.className ? this.className.split(' ').filter(Boolean) : [];
            for (const c of cls) if (!list.includes(c)) list.push(c);
            this.className = list.join(' ');
        },
        remove: (...cls: string[]) => {
            const list = this.className ? this.className.split(' ').filter(Boolean) : [];
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
            return this.className.split(' ').filter(Boolean).includes(cls);
        },
    };

    public appendChild(child: MockElement): MockElement {
        this.children.push(child);
        child.parentElement = this;
        child.parentNode = this;
        return child;
    }

    public removeChild(child: MockElement): MockElement {
        this.children = this.children.filter((c) => c !== child);
        child.parentElement = null;
        child.parentNode = null;
        return child;
    }

    public insertBefore(newNode: MockElement, _referenceNode: MockElement | null): MockElement {
        this.children.push(newNode);
        newNode.parentElement = this;
        newNode.parentNode = this;
        return newNode;
    }

    public querySelector(selector: string): MockElement | null {
        if (selector === '.hero-buttons') {
            return this.children.find((c) => c.className.includes('hero-buttons')) || null;
        }
        if (selector === '.hero-pause-label') {
            return this.children.find((c) => c.className.includes('hero-pause-label')) || null;
        }
        if (selector === 'i') {
            return this.children.find((c) => c.tagName === 'i') || null;
        }
        return null;
    }

    public querySelectorAll(selector: string): MockElement[] {
        const found: MockElement[] = [];
        const check = (el: MockElement) => {
            if (selector === 'a, button, input') {
                if (['a', 'button', 'input'].includes(el.tagName)) found.push(el);
            }
            el.children.forEach(check);
        };
        this.children.forEach(check);
        return found;
    }

    public addEventListener(event: string, handler: Function): void {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(handler);
    }

    public removeEventListener(event: string, handler: Function): void {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter((h) => h !== handler);
        }
    }

    public dispatchEvent(event: { type: string; preventDefault?: Function; stopPropagation?: Function }): void {
        const listeners = this.eventListeners[event.type];
        if (listeners) {
            listeners.forEach((fn) => fn(event));
        }
    }
}

describe('TimedHeroRotator (Mode A — Apple Devices)', () => {
    let heroEl: MockElement;
    let containerEl: MockElement;
    let heroButtonsEl: MockElement;
    let observerCallback: ((entries: any[]) => void) | null = null;
    let mediaQueryListener: ((e: any) => void) | null = null;
    let reducedMotionMatches = false;

    beforeEach(() => {
        vi.useFakeTimers();

        heroEl = new MockElement('section');
        heroEl.id = 'heroSection';
        heroEl.className = 'hero-section';

        heroButtonsEl = new MockElement('div');
        heroButtonsEl.className = 'hero-buttons';
        heroEl.appendChild(heroButtonsEl);

        containerEl = new MockElement('div');
        containerEl.id = 'messageContainer';
        containerEl.className = 'scroll-message-wrapper';

        const docListeners: Record<string, Function[]> = {};

        // Mock document
        const mockDoc = {
            hidden: false,
            getElementById: (id: string) => {
                if (id === 'heroSection') return heroEl;
                if (id === 'messageContainer') return containerEl;
                return null;
            },
            createElement: (tag: string) => new MockElement(tag),
            addEventListener: (evt: string, handler: Function) => {
                if (!docListeners[evt]) docListeners[evt] = [];
                docListeners[evt].push(handler);
            },
            removeEventListener: (evt: string, handler: Function) => {
                if (docListeners[evt]) {
                    docListeners[evt] = docListeners[evt].filter((h) => h !== handler);
                }
            },
            dispatchEvent: (event: any) => {
                const list = docListeners[event.type];
                if (list) list.forEach((fn) => fn(event));
            },
        };

        // Mock window.matchMedia
        reducedMotionMatches = false;
        mediaQueryListener = null;
        const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('prefers-reduced-motion') ? reducedMotionMatches : false,
            media: query,
            addEventListener: (_event: string, cb: any) => {
                mediaQueryListener = cb;
            },
            removeEventListener: vi.fn(),
        }));

        // Mock IntersectionObserver
        observerCallback = null;
        class MockIntersectionObserver {
            constructor(cb: (entries: any[]) => void) {
                observerCallback = cb;
            }
            observe() {}
            unobserve() {}
            disconnect() {
                observerCallback = null;
            }
        }

        vi.stubGlobal('document', mockDoc);
        vi.stubGlobal('window', {
            matchMedia: mockMatchMedia,
        });
        vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('initializes immediately, applies data-hero-mode="apple-timed", and activates slide 0', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect(heroEl.getAttribute('data-hero-mode')).toBe('apple-timed');
        expect(heroEl.classList.contains('hero-apple-timed-mode')).toBe(true);
        expect(containerEl.getAttribute('data-mode')).toBe('apple-timed');

        // All 7 messages instantiated
        expect(containerEl.children).toHaveLength(7);

        // Slide 0 is active immediately
        expect(containerEl.children[0].classList.contains('active')).toBe(true);
        expect(containerEl.children[0].getAttribute('aria-hidden')).toBe('false');

        // Subsequent slides are inactive
        for (let i = 1; i < containerEl.children.length; i++) {
            expect(containerEl.children[i].classList.contains('active')).toBe(false);
            expect(containerEl.children[i].getAttribute('aria-hidden')).toBe('true');
        }

        expect(rotator.getCurrentIndex()).toBe(0);
        rotator.destroy();
    });

    it('advances to the next message after interval and wraps around to slide 0', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect(rotator.getCurrentIndex()).toBe(0);

        // Advance 5000ms -> slide 1
        vi.advanceTimersByTime(5000);
        expect(rotator.getCurrentIndex()).toBe(1);
        expect(containerEl.children[1].classList.contains('active')).toBe(true);
        expect(containerEl.children[1].getAttribute('aria-hidden')).toBe('false');
        expect(containerEl.children[0].classList.contains('active')).toBe(false);

        // Advance through all 7 slides: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 0
        vi.advanceTimersByTime(5000 * 5);
        expect(rotator.getCurrentIndex()).toBe(6);

        // Advance 5000ms from slide 6 -> wraps cleanly back to slide 0
        vi.advanceTimersByTime(5000);
        expect(rotator.getCurrentIndex()).toBe(0);
        expect(containerEl.children[0].classList.contains('active')).toBe(true);
        expect(containerEl.children[0].getAttribute('aria-hidden')).toBe('false');

        rotator.destroy();
    });

    it('preserves canonical message highlights and exact text in each face', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
        });

        // Face 0 contains MINDS and HANDS highlights
        expect(containerEl.children[0].innerHTML).toContain('MINDS');
        expect(containerEl.children[0].innerHTML).toContain('HANDS');

        // Face 1 contains FAITH and EXCELLENCE highlights
        expect(containerEl.children[1].innerHTML).toContain('FAITH');
        expect(containerEl.children[1].innerHTML).toContain('EXCELLENCE');

        rotator.destroy();
    });

    it('provides an accessible pause/resume control with keyboard support', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        const pauseBtn = (rotator as any).pauseBtn as MockElement;
        expect(pauseBtn).not.toBeNull();
        expect(pauseBtn.getAttribute('aria-pressed')).toBe('false');
        expect(pauseBtn.getAttribute('aria-label')).toContain('Pause');

        // Click pause button
        pauseBtn.dispatchEvent({ type: 'click', preventDefault: vi.fn() });
        expect(pauseBtn.getAttribute('aria-pressed')).toBe('true');
        expect(pauseBtn.getAttribute('aria-label')).toContain('Resume');
        expect(rotator.isPaused()).toBe(true);

        // Advance time: should NOT rotate while paused
        vi.advanceTimersByTime(15000);
        expect(rotator.getCurrentIndex()).toBe(0);

        // Click again to resume
        pauseBtn.dispatchEvent({ type: 'click', preventDefault: vi.fn() });
        expect(pauseBtn.getAttribute('aria-pressed')).toBe('false');
        expect(rotator.isPaused()).toBe(false);

        // Now advances normally
        vi.advanceTimersByTime(5000);
        expect(rotator.getCurrentIndex()).toBe(1);

        rotator.destroy();
    });

    it('pauses when document visibility changes to hidden and resumes when visible', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect(rotator.getCurrentIndex()).toBe(0);

        // Document hidden (tab switched)
        (document as any).hidden = true;
        (document as any).dispatchEvent({ type: 'visibilitychange' });
        expect(rotator.isPaused()).toBe(true);

        vi.advanceTimersByTime(15000);
        expect(rotator.getCurrentIndex()).toBe(0); // Did not advance

        // Document visible again
        (document as any).hidden = false;
        (document as any).dispatchEvent({ type: 'visibilitychange' });
        expect(rotator.isPaused()).toBe(false);

        vi.advanceTimersByTime(5000);
        expect(rotator.getCurrentIndex()).toBe(1);

        rotator.destroy();
    });

    it('pauses when hero scrolls offscreen via IntersectionObserver and resumes when visible', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect(observerCallback).not.toBeNull();

        // Hero scrolled offscreen
        observerCallback!([{ isIntersecting: false }]);
        expect(rotator.isPaused()).toBe(true);

        vi.advanceTimersByTime(15000);
        expect(rotator.getCurrentIndex()).toBe(0);

        // Hero scrolls back into view
        observerCallback!([{ isIntersecting: true }]);
        expect(rotator.isPaused()).toBe(false);

        vi.advanceTimersByTime(5000);
        expect(rotator.getCurrentIndex()).toBe(1);

        rotator.destroy();
    });

    it('pauses when system animations are suspended (e.g. Enquiry modal open)', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        // Modal opened -> suspend all
        motionSuspension.suspendAll('modal');
        expect(rotator.isPaused()).toBe(true);

        vi.advanceTimersByTime(15000);
        expect(rotator.getCurrentIndex()).toBe(0);

        // Modal closed -> resume
        motionSuspension.resumeAll('modal');
        expect(rotator.isPaused()).toBe(false);

        vi.advanceTimersByTime(5000);
        expect(rotator.getCurrentIndex()).toBe(1);

        rotator.destroy();
    });

    it('respects prefers-reduced-motion: reduce by staying static', () => {
        reducedMotionMatches = true;

        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect(rotator.isPaused()).toBe(true);

        vi.advanceTimersByTime(25000);
        expect(rotator.getCurrentIndex()).toBe(0); // Never auto-advances

        rotator.destroy();
    });

    it('destroy cleanly cleans up DOM attributes, timers, controls, and listeners', () => {
        const rotator = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect(heroEl.getAttribute('data-hero-mode')).toBe('apple-timed');

        rotator.destroy();

        expect(heroEl.hasAttribute('data-hero-mode')).toBe(false);
        expect(heroEl.classList.contains('hero-apple-timed-mode')).toBe(false);
        expect(containerEl.hasAttribute('data-mode')).toBe(false);

        // Timer cleared: advancing time causes no updates
        vi.advanceTimersByTime(20000);
        expect(rotator.getCurrentIndex()).toBe(0);
    });

    it('safely replaces an existing rotator on reinitialization without duplicate timers', () => {
        const rotator1 = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        // Reinitialize immediately
        const rotator2 = new TimedHeroRotator({
            heroId: 'heroSection',
            containerId: 'messageContainer',
            messages: HERO_MESSAGES,
            intervalMs: 5000,
        });

        expect((containerEl as any).__timedRotator).toBe(rotator2);

        vi.advanceTimersByTime(5000);
        expect(rotator2.getCurrentIndex()).toBe(1);

        rotator2.destroy();
    });
});
