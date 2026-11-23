import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { HeaderScroll } from '../../src/ui/navigation/HeaderScroll.ts';

describe('Mobile Bottom Bar Collapse Behavior', () => {
    let dom: JSDOM;
    let headerEl: HTMLElement;
    let bottomBar: HTMLElement;
    let headerScroll: HeaderScroll;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <header id="mainHeader"></header>
                <nav class="mobile-bottom-bar" id="mobileBottomBar" aria-label="Mobile Navigation">
                    <button class="mobile-bottom-item mobile-bottom-item--theme" id="bottomThemeToggle"></button>
                    <a href="#heroSection" class="mobile-bottom-item mobile-bottom-item--home active">Home</a>
                    <a href="#academics" class="mobile-bottom-item mobile-bottom-item--academics">Academics</a>
                    <button class="mobile-bottom-item mobile-bottom-item--menu" id="bottomNavMenuToggle">
                        <i class="bi bi-grid-fill"></i>
                        <span class="mobile-bottom-label">Menu</span>
                    </button>
                </nav>
            </body>
            </html>
        `, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true
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
        (globalThis as any).MouseEvent = dom.window.MouseEvent;
        (globalThis as any).requestAnimationFrame = syncRaf;

        headerEl = dom.window.document.getElementById('mainHeader')!;
        bottomBar = dom.window.document.getElementById('mobileBottomBar')!;
        headerScroll = new HeaderScroll(headerEl, bottomBar);
    });

    afterEach(() => {
        headerScroll.destroy();
    });

    it('taps on collapsed bottom bar trigger notifyProgrammaticScroll to expand it', () => {
        const notifySpy = vi.spyOn(headerScroll, 'notifyProgrammaticScroll');

        // Simulate collapsed state
        bottomBar.classList.add('bottom-bar--hidden');

        // Click on the collapsed bottom bar
        bottomBar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

        expect(notifySpy).toHaveBeenCalledWith(1500);
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
    });

    it('preserves mobile bottom bar presence in DOM without translating offscreen', () => {
        bottomBar.classList.add('bottom-bar--hidden');
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(true);
        expect(bottomBar.getAttribute('id')).toBe('mobileBottomBar');
    });

    it('clears body.bottom-bar-collapsed when notifyProgrammaticScroll is invoked', () => {
        dom.window.document.body.classList.add('bottom-bar-collapsed');
        bottomBar.classList.add('bottom-bar--hidden');

        headerScroll.notifyProgrammaticScroll(800);

        expect(dom.window.document.body.classList.contains('bottom-bar-collapsed')).toBe(false);
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
    });

    it('marks bottom-bar--collapsing on scroll down and bottom-bar--expanding on swipe up until width transitionend', () => {
        Object.defineProperty(dom.window, 'scrollY', { value: 0, configurable: true, writable: true });
        Object.defineProperty(dom.window, 'innerHeight', { value: 800, configurable: true, writable: true });
        Object.defineProperty(dom.window.document.documentElement, 'scrollHeight', { value: 3000, configurable: true, writable: true });

        // Simulate touch scroll down past threshold
        dom.window.dispatchEvent(new dom.window.Event('touchstart'));
        Object.defineProperty(dom.window, 'scrollY', { value: 220, configurable: true, writable: true });
        dom.window.dispatchEvent(new dom.window.Event('scroll'));

        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(true);
        expect(bottomBar.classList.contains('bottom-bar--collapsing')).toBe(true);

        // Complete width transition
        const collapseEndEvent = new dom.window.Event('transitionend') as TransitionEvent;
        Object.defineProperty(collapseEndEvent, 'propertyName', { value: 'width' });
        bottomBar.dispatchEvent(collapseEndEvent);
        expect(bottomBar.classList.contains('bottom-bar--collapsing')).toBe(false);

        // Swipe up by 10px (> UPWARD_THRESHOLD_PX)
        dom.window.dispatchEvent(new dom.window.Event('touchstart'));
        Object.defineProperty(dom.window, 'scrollY', { value: 210, configurable: true, writable: true });
        dom.window.dispatchEvent(new dom.window.Event('scroll'));

        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
        expect(bottomBar.classList.contains('bottom-bar--expanding')).toBe(true);

        const expandEndEvent = new dom.window.Event('transitionend') as TransitionEvent;
        Object.defineProperty(expandEndEvent, 'propertyName', { value: 'width' });
        bottomBar.dispatchEvent(expandEndEvent);
        expect(bottomBar.classList.contains('bottom-bar--expanding')).toBe(false);
    });

    it('allows immediate swipe-up expansion when already near the bottom of the page', () => {
        Object.defineProperty(dom.window, 'innerHeight', { value: 800, configurable: true, writable: true });
        Object.defineProperty(dom.window.document.documentElement, 'scrollHeight', { value: 3000, configurable: true, writable: true });
        // maxScroll is 2200
        dom.window.dispatchEvent(new dom.window.Event('touchstart'));
        Object.defineProperty(dom.window, 'scrollY', { value: 1800, configurable: true, writable: true });
        dom.window.dispatchEvent(new dom.window.Event('scroll'));
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(true);

        // Reach document bottom (2198 >= maxScroll - 10)
        Object.defineProperty(dom.window, 'scrollY', { value: 2198, configurable: true, writable: true });
        dom.window.dispatchEvent(new dom.window.Event('scroll'));
        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(true);

        // Swipe up cleanly inside the last 10px zone (2198 -> 2191, delta = -7px)
        dom.window.dispatchEvent(new dom.window.Event('touchstart'));
        Object.defineProperty(dom.window, 'scrollY', { value: 2191, configurable: true, writable: true });
        dom.window.dispatchEvent(new dom.window.Event('scroll'));

        expect(bottomBar.classList.contains('bottom-bar--hidden')).toBe(false);
        expect(bottomBar.classList.contains('bottom-bar--expanding')).toBe(true);
    });

    it('centers the expanded bottom dockbar across iPad/mobile viewports while keeping collapsed orb left-anchored', () => {
        const navMobileCss = fs.readFileSync(
            path.join(process.cwd(), 'src/css/layout/navigation-mobile.css'),
            'utf-8'
        );

        const expandedMatch = navMobileCss.match(/@media \(max-width: 768px\)[\s\S]*?\.mobile-bottom-bar\s*\{([\s\S]*?)\}/);
        expect(expandedMatch).not.toBeNull();
        const expandedBlock = expandedMatch![1];

        expect(expandedBlock).toContain(
            'left: calc(50% + (env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)) / 2 - (var(--dock-expanded-width) / 2));'
        );
        expect(expandedBlock).toContain('right: auto;');
        expect(expandedBlock).toContain('width 320ms cubic-bezier(0.22, 1, 0.36, 1)');
        expect(expandedBlock).toContain('left 320ms cubic-bezier(0.22, 1, 0.36, 1)');

        const collapsedMatch = navMobileCss.match(/\.mobile-bottom-bar\.bottom-bar--hidden\s*\{([\s\S]*?)\}/);
        expect(collapsedMatch).not.toBeNull();
        const collapsedBlock = collapsedMatch![1];
        expect(collapsedBlock).toContain('left: calc(12px + env(safe-area-inset-left, 0px));');
        expect(collapsedBlock).toContain('transform-origin: left center;');

        expect(navMobileCss).toContain('@media (min-width: 481px) and (max-width: 768px)');
    });
});

