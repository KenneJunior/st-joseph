import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimelineDragScroller } from '../../src/features/calendar/TimelineDragScroller';

class MockElement {
    public id: string = '';
    public className: string = '';
    private _innerHTML: string = '';
    public textContent: string = '';
    public children: MockElement[] = [];
    public style: Record<string, string> = {};
    public attributes = new Map<string, string>();
    public eventListeners: Record<string, { handler: Function; capture?: boolean }[]> = {};
    public parentElement: MockElement | null = null;
    public dataset: Record<string, string> = {};
    public scrollTop: number = 0;
    public scrollLeft: number = 0;
    public scrollHeight: number = 1000;
    public clientHeight: number = 500;
    public scrollWidth: number = 800;
    public clientWidth: number = 800;

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
            contains: (cls: string) => this.className.split(/\s+/).filter(Boolean).includes(cls),
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

    public addEventListener(event: string, handler: Function, options?: boolean | { capture?: boolean }): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        const capture = typeof options === 'boolean' ? options : !!options?.capture;
        this.eventListeners[event].push({ handler, capture });
    }

    public removeEventListener(event: string, handler: Function, options?: boolean | { capture?: boolean }): void {
        if (!this.eventListeners[event]) return;
        const capture = typeof options === 'boolean' ? options : !!options?.capture;
        this.eventListeners[event] = this.eventListeners[event].filter(
            (entry) => !(entry.handler === handler && entry.capture === capture)
        );
    }

    public dispatchEvent(event: any): boolean {
        const entries = this.eventListeners[event.type] || [];
        for (const { handler } of entries) {
            handler(event);
        }
        return !event.defaultPrevented;
    }

    public appendChild(child: MockElement): MockElement {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    public querySelector<T = MockElement>(selector: string): T | null {
        return (this.querySelectorAll(selector)[0] as unknown as T) || null;
    }

    public querySelectorAll<T = MockElement>(selector: string): T[] {
        const results: MockElement[] = [];

        const walk = (el: MockElement) => {
            for (const child of el.children) {
                if (selector.startsWith('#') && child.id === selector.slice(1)) {
                    results.push(child);
                } else if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) {
                    results.push(child);
                } else if (selector.includes('.timeline-milestone:not(.timeline-hidden) .timeline-node-marker')) {
                    if (child.classList.contains('timeline-node-marker') &&
                        child.parentElement && !child.parentElement.classList.contains('timeline-hidden')) {
                        results.push(child);
                    }
                }
                walk(child);
            }
        };

        walk(this);
        return results as unknown as T[];
    }

    public getBoundingClientRect() {
        return {
            top: 100,
            bottom: 600,
            left: 20,
            right: 820,
            width: 800,
            height: 500,
        };
    }

    public scrollTo(options: { top?: number; left?: number; behavior?: string }) {
        if (options.top !== undefined) this.scrollTop = options.top;
        if (options.left !== undefined) this.scrollLeft = options.left;
    }

    public scrollBy(options: { top?: number; left?: number; behavior?: string }) {
        if (options.top !== undefined) this.scrollTop += options.top;
        if (options.left !== undefined) this.scrollLeft += options.left;
    }
}

describe('TimelineDragScroller (Academic Calendar Drag-to-Scroll)', () => {
    let containerEl: MockElement;
    let milestonesList: MockElement;
    let spineLine: MockElement;
    let dragHint: MockElement;
    let actionBtn: MockElement;

    beforeEach(() => {
        vi.useFakeTimers();

        // Construct mock DOM
        containerEl = new MockElement('div');
        containerEl.className = 'timeline-track-container';
        containerEl.id = 'timelineTrackContainer';

        dragHint = new MockElement('div');
        dragHint.className = 'timeline-drag-hint';
        dragHint.id = 'timelineDragHint';
        containerEl.appendChild(dragHint);

        spineLine = new MockElement('div');
        spineLine.className = 'timeline-track-line';
        containerEl.appendChild(spineLine);

        milestonesList = new MockElement('div');
        milestonesList.className = 'timeline-milestones-list';
        milestonesList.id = 'timelineMilestonesList';
        containerEl.appendChild(milestonesList);

        const card1 = new MockElement('article');
        card1.className = 'timeline-milestone';
        const marker1 = new MockElement('div');
        marker1.className = 'timeline-node-marker';
        marker1.getBoundingClientRect = () => ({ top: 120, bottom: 160, left: 50, right: 90, width: 40, height: 40 });
        card1.appendChild(marker1);

        actionBtn = new MockElement('button');
        actionBtn.className = 'btn-calendar-action';
        card1.appendChild(actionBtn);

        milestonesList.appendChild(card1);

        const card2 = new MockElement('article');
        card2.className = 'timeline-milestone';
        const marker2 = new MockElement('div');
        marker2.className = 'timeline-node-marker';
        marker2.getBoundingClientRect = () => ({ top: 400, bottom: 440, left: 50, right: 90, width: 40, height: 40 });
        card2.appendChild(marker2);
        milestonesList.appendChild(card2);

        // Global mocks
        (globalThis as any).document = {
            getElementById: (id: string) => {
                if (id === 'timelineDragHint') return dragHint;
                if (id === 'timelineTrackContainer') return containerEl;
                if (id === 'timelineMilestonesList') return milestonesList;
                return null;
            },
            querySelector: (sel: string) => {
                if (sel === '.timeline-track-container') return containerEl;
                return null;
            },
        };

        (globalThis as any).window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
            clearTimeout: (id: any) => clearTimeout(id),
        };

        (globalThis as any).requestAnimationFrame = (fn: Function) => setTimeout(fn, 16);
        (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('initializes accessibility attributes on the timeline track container', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any });

        expect(containerEl.getAttribute('tabindex')).toBe('0');
        expect(containerEl.getAttribute('role')).toBe('region');
        expect(containerEl.getAttribute('aria-label')).toContain('Academic milestones timeline');

        scroller.destroy();
    });

    it('does not trigger drag mode if movement is below the deadband threshold (< 5px)', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any, dragThreshold: 5 });

        // Pointer down
        containerEl.dispatchEvent({
            type: 'pointerdown',
            button: 0,
            clientX: 100,
            clientY: 200,
            target: containerEl,
        });

        expect(scroller.isCurrentlyDragging()).toBe(false);
        expect(containerEl.classList.contains('is-dragging')).toBe(false);

        // Small movement (2px)
        const moveHandler = vi.mocked((window as any).addEventListener).mock.calls.find(
            ([name]) => name === 'pointermove'
        )?.[1];
        expect(moveHandler).toBeDefined();

        moveHandler({
            type: 'pointermove',
            clientX: 100,
            clientY: 202,
            cancelable: true,
            preventDefault: vi.fn(),
        });

        expect(scroller.isCurrentlyDragging()).toBe(false);
        expect(containerEl.classList.contains('is-dragging')).toBe(false);

        // Pointer up terminates without drag state
        const upHandler = vi.mocked((window as any).addEventListener).mock.calls.find(
            ([name]) => name === 'pointerup'
        )?.[1];
        expect(upHandler).toBeDefined();

        upHandler({
            type: 'pointerup',
            clientX: 100,
            clientY: 202,
        });

        expect(scroller.isCurrentlyDragging()).toBe(false);

        // Click on button should NOT be suppressed
        const clickEvent = {
            type: 'click',
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        };
        containerEl.dispatchEvent(clickEvent);
        expect(clickEvent.preventDefault).not.toHaveBeenCalled();

        scroller.destroy();
    });

    it('activates drag mode when moving beyond threshold, scrolls container, and suppresses button click', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any, dragThreshold: 5 });

        containerEl.scrollTop = 100;

        // Pointer down
        containerEl.dispatchEvent({
            type: 'pointerdown',
            button: 0,
            clientX: 100,
            clientY: 300,
            target: containerEl,
        });

        const moveHandler = vi.mocked((window as any).addEventListener).mock.calls.find(
            ([name]) => name === 'pointermove'
        )?.[1];

        // Drag upwards by 50px (cursor moves from Y=300 to Y=250)
        const preventDefaultSpy = vi.fn();
        moveHandler({
            type: 'pointermove',
            clientX: 100,
            clientY: 250,
            cancelable: true,
            preventDefault: preventDefaultSpy,
        });

        expect(scroller.isCurrentlyDragging()).toBe(true);
        expect(containerEl.classList.contains('is-dragging')).toBe(true);
        expect(preventDefaultSpy).toHaveBeenCalled();
        // startScrollTop (100) - deltaY (-50) = 150
        expect(containerEl.scrollTop).toBe(150);
        expect(dragHint.classList.contains('is-hidden')).toBe(true);

        // Release drag
        const upHandler = vi.mocked((window as any).addEventListener).mock.calls.find(
            ([name]) => name === 'pointerup'
        )?.[1];

        upHandler({
            type: 'pointerup',
            clientX: 100,
            clientY: 250,
        });

        expect(scroller.isCurrentlyDragging()).toBe(false);
        expect(containerEl.classList.contains('is-dragging')).toBe(false);

        // The next click immediately following the drag MUST be suppressed to avoid accidental card action
        const clickEvent = {
            type: 'click',
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            stopImmediatePropagation: vi.fn(),
        };
        containerEl.dispatchEvent(clickEvent);

        expect(clickEvent.preventDefault).toHaveBeenCalled();
        expect(clickEvent.stopPropagation).toHaveBeenCalled();

        scroller.destroy();
    });

    it('handles keyboard navigation with arrow keys, page navigation, and home/end', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any });

        containerEl.scrollTop = 100;
        containerEl.clientHeight = 400;

        // ArrowDown (+70px)
        const eventDown = { key: 'ArrowDown', target: containerEl, preventDefault: vi.fn() };
        containerEl.dispatchEvent({ type: 'keydown', ...eventDown });
        expect(eventDown.preventDefault).toHaveBeenCalled();
        expect(containerEl.scrollTop).toBe(170);

        // ArrowUp (-70px)
        const eventUp = { key: 'ArrowUp', target: containerEl, preventDefault: vi.fn() };
        containerEl.dispatchEvent({ type: 'keydown', ...eventUp });
        expect(eventUp.preventDefault).toHaveBeenCalled();
        expect(containerEl.scrollTop).toBe(100);

        // Home
        const eventHome = { key: 'Home', target: containerEl, preventDefault: vi.fn() };
        containerEl.dispatchEvent({ type: 'keydown', ...eventHome });
        expect(eventHome.preventDefault).toHaveBeenCalled();
        expect(containerEl.scrollTop).toBe(0);

        // End
        const eventEnd = { key: 'End', target: containerEl, preventDefault: vi.fn() };
        containerEl.dispatchEvent({ type: 'keydown', ...eventEnd });
        expect(eventEnd.preventDefault).toHaveBeenCalled();
        expect(containerEl.scrollTop).toBe(containerEl.scrollHeight);

        scroller.destroy();
    });

    it('updates edge indicator classes when scrolled', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any });

        containerEl.scrollHeight = 1000;
        containerEl.clientHeight = 400;

        // At top: can scroll down, cannot scroll up
        containerEl.scrollTop = 0;
        scroller.updateScrollIndicators();
        expect(containerEl.classList.contains('can-scroll-up')).toBe(false);
        expect(containerEl.classList.contains('can-scroll-down')).toBe(true);

        // In middle: can scroll both up and down
        containerEl.scrollTop = 200;
        scroller.updateScrollIndicators();
        expect(containerEl.classList.contains('can-scroll-up')).toBe(true);
        expect(containerEl.classList.contains('can-scroll-down')).toBe(true);

        // At bottom: can scroll up, cannot scroll down
        containerEl.scrollTop = 600;
        scroller.updateScrollIndicators();
        expect(containerEl.classList.contains('can-scroll-up')).toBe(true);
        expect(containerEl.classList.contains('can-scroll-down')).toBe(false);

        scroller.destroy();
    });

    it('synchronizes the spine line position and height with milestone nodes', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any });

        scroller.syncSpineLine();

        expect(spineLine.style.top).toBeDefined();
        expect(spineLine.style.height).toBeDefined();

        scroller.destroy();
    });

    it('cleanly destroys and removes all event listeners and state classes', () => {
        const scroller = new TimelineDragScroller({ container: containerEl as any });

        containerEl.classList.add('is-dragging', 'can-scroll-up');
        scroller.destroy();

        expect(containerEl.classList.contains('is-dragging')).toBe(false);
        expect(containerEl.classList.contains('can-scroll-up')).toBe(false);
    });
});
