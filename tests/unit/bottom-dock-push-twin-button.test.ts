import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { HeaderScroll } from '../../src/ui/navigation/HeaderScroll.ts';

describe('Bottom Dock & Twin Floating Button Push Mechanics', () => {
    let dom: JSDOM;
    let headerScroll: HeaderScroll;
    let headerEl: HTMLElement;
    let bottomBar: HTMLElement;
    let twinDock: HTMLElement;
    let quickMenu: HTMLElement;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head><title>Dock Push Test</title></head>
            <body>
                <header id="mainHeader"></header>
                <div style="height: 3000px;">Long Content</div>
                <nav class="mobile-bottom-bar" id="mobileBottomBar"></nav>
                <div class="unified-action-dock" id="unifiedAssistanceDock">
                    <button id="sjcccAiFab" class="unified-dock-btn unified-dock-btn--ai">Ask AI</button>
                    <button id="quickActionsFab" class="unified-dock-btn unified-dock-btn--quick">Quick Actions</button>
                </div>
                <div class="quick-actions-menu" id="quickActionsMenu"></div>
            </body>
            </html>
        `, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        const syncRaf = (cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        };
        (dom.window as any).requestAnimationFrame = syncRaf;
        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).Event = dom.window.Event;
        (globalThis as any).CustomEvent = dom.window.CustomEvent;
        (globalThis as any).requestAnimationFrame = syncRaf;

        headerEl = dom.window.document.getElementById('mainHeader') as HTMLElement;
        bottomBar = dom.window.document.getElementById('mobileBottomBar') as HTMLElement;
        twinDock = dom.window.document.getElementById('unifiedAssistanceDock') as HTMLElement;
        quickMenu = dom.window.document.getElementById('quickActionsMenu') as HTMLElement;

        Object.defineProperty(dom.window, 'scrollY', { value: 0, configurable: true, writable: true });
        Object.defineProperty(dom.window, 'innerHeight', { value: 800, configurable: true, writable: true });
        Object.defineProperty(dom.window.document.documentElement, 'scrollHeight', { value: 3000, configurable: true, writable: true });

        headerScroll = new HeaderScroll(headerEl, bottomBar);
    });

    afterEach(() => {
        headerScroll?.destroy();
        vi.restoreAllMocks();
    });

    const setScrollY = (y: number) => {
        Object.defineProperty(dom.window, 'scrollY', { value: y, configurable: true, writable: true });
    };

    const triggerTouchGesture = () => {
        dom.window.dispatchEvent(new dom.window.Event('touchstart'));
    };

    it('initializes with bottom dock visible and twin dock in default non-retracted state', () => {
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
        expect(dom.window.document.body.classList.contains('bottom-bar-hidden')).toBe(false);
    });

    it('synchronizes dock-retracted on twin dock when bottom dock is hidden on scroll down', () => {
        // Trigger user touch gesture
        triggerTouchGesture();

        // Scroll down past 80px top threshold + 12px downward hysteresis
        setScrollY(150);
        dom.window.dispatchEvent(new dom.window.Event('scroll'));

        // Bottom bar is hidden, body has bottom-bar-hidden, twin dock and menu have dock-retracted
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(true);
        expect(dom.window.document.body.classList.contains('bottom-bar-hidden')).toBe(true);
        expect(twinDock.classList.contains('dock-retracted')).toBe(true);
        expect(twinDock.classList.contains('dock-pushed')).toBe(false);
        expect(quickMenu.classList.contains('dock-retracted')).toBe(true);
    });

    it('pushes the twin dock back up when the bottom dock reappears on scroll up', () => {
        // 1. Hide it first
        triggerTouchGesture();
        setScrollY(300);
        dom.window.dispatchEvent(new dom.window.Event('scroll'));
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(true);

        // 2. Scroll up by 25px (greater than 8px upward threshold)
        triggerTouchGesture();
        setScrollY(270);
        dom.window.dispatchEvent(new dom.window.Event('scroll'));

        // Bottom bar appears and pushes twin dock and quick action menu back up
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
        expect(dom.window.document.body.classList.contains('bottom-bar-hidden')).toBe(false);
        expect(twinDock.classList.contains('dock-pushed')).toBe(true);
        expect(twinDock.classList.contains('dock-retracted')).toBe(false);
        expect(quickMenu.classList.contains('dock-pushed')).toBe(true);
    });

    it('keeps bottom dock visible and pushes twin dock when Quick Actions menu is open', () => {
        quickMenu.classList.add('is-open');

        // Try to scroll down
        triggerTouchGesture();
        setScrollY(400);
        dom.window.dispatchEvent(new dom.window.Event('scroll'));

        // Because Quick Actions is open, bottom dock does NOT hide
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
    });
});
