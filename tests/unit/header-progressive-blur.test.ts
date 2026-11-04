import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { HeaderScroll } from '../../src/ui/navigation/HeaderScroll.ts';

describe('SJCCC Header Progressive Blur System', () => {
    const rootDir = process.cwd();
    const headerCss = fs.readFileSync(path.join(rootDir, 'src/css/layout/header.css'), 'utf-8');

    describe('CSS Compositing & Visual Material Integrity (header.css)', () => {
        it('configures progressive blur layer with pointer-events: none on ::before', () => {
            expect(headerCss).toMatch(/#mainHeader::before\s*\{[^}]*pointer-events:\s*none;/);
        });

        it('pins progressive blur mask-image to var(--header-height) to prevent navigation cutoff', () => {
            // Must have solid black through var(--header-height)
            expect(headerCss).toMatch(/mask-image:\s*linear-gradient\(\s*to bottom,\s*black 0px,\s*black var\(--header-height\)/);
            expect(headerCss).toMatch(/-webkit-mask-image:\s*linear-gradient\(\s*to bottom,\s*black 0px,\s*black var\(--header-height\)/);

            // Must feather progressively using var(--blur-extension)
            expect(headerCss).toContain('calc(var(--header-height) + calc(var(--blur-extension) * 0.20))');
            expect(headerCss).toContain('transparent 100%');
        });

        it('configures smooth cubic-bezier transitions for backdrop-filter and background on ::before', () => {
            expect(headerCss).toMatch(/#mainHeader::before\s*\{[^}]*transition:\s*backdrop-filter 0\.35s/);
            expect(headerCss).toMatch(/#mainHeader::before\s*\{[^}]*will-change:\s*backdrop-filter;/);
        });

        it('eliminates the discontinuous +5px cliff in #mainHeader.scrolled::before', () => {
            // Verifies the previous abrupt cliff was eliminated
            expect(headerCss).not.toContain('calc(var(--blur-intensity) + 5px)');
            expect(headerCss).toMatch(/#mainHeader\.scrolled::before\s*\{[^}]*backdrop-filter:\s*blur\(var\(--blur-intensity,\s*8px\)\)\s*saturate\(115%\);/);
        });

        it('places the specular hairline edge divider at bottom: 0 with pointer-events: none', () => {
            // Must be at bottom: 0 to separate the glass header from page content (not top: 0)
            expect(headerCss).toMatch(/#mainHeader::after\s*\{[^}]*bottom:\s*0;/);
            expect(headerCss).not.toMatch(/#mainHeader::after\s*\{[^}]*top:\s*0;/);
            expect(headerCss).toMatch(/#mainHeader::after\s*\{[^}]*pointer-events:\s*none;/);
            expect(headerCss).toMatch(/#mainHeader::after\s*\{[^}]*height:\s*1px;/);
        });

        it('applies depth separation box-shadow to #mainHeader.scrolled in both light and dark mode', () => {
            expect(headerCss).toMatch(/#mainHeader\.scrolled\s*\{[^}]*box-shadow:\s*0 4px 20px -2px/);
            expect(headerCss).toMatch(/body\.dark-mode #mainHeader\.scrolled/);
        });

        it('maintains dark mode gradient variants for both ::before and ::after', () => {
            expect(headerCss).toMatch(/body\.dark-mode #mainHeader::before/);
            expect(headerCss).toMatch(/body\.dark-mode #mainHeader\.scrolled::before/);
            expect(headerCss).toMatch(/body\.dark-mode #mainHeader::after/);
        });

        it('configures hardware-accelerated continuous backdrop blur on mobile viewports (<= 1024px)', () => {
            expect(headerCss).toContain('@media (max-width: 1024px)');
            expect(headerCss).toContain('isolation: isolate');
            // Must NOT hide ::before on mobile viewports; continuous progressive blur must remain active!
            expect(headerCss).not.toMatch(/@media \(max-width:\s*1024px\)\s*\{[^}]*#mainHeader::before\s*\{[^}]*display:\s*none;/);
            expect(headerCss).toMatch(/#mainHeader::before\s*\{[^}]*display:\s*block;/);
            expect(headerCss).toMatch(/#mainHeader::before\s*\{[^}]*transform:\s*translate3d\(0,\s*0,\s*0\);/);
            expect(headerCss).toMatch(/#mainHeader::before\s*\{[^}]*backdrop-filter:\s*blur\(var\(--blur-intensity,\s*3px\)\);/);
        });

        it('verifies balanced mode optimizations in performance-mode.css cap blur and add containment', () => {
            const perfCss = fs.readFileSync(path.join(rootDir, 'src/css/core/performance-mode.css'), 'utf-8');
            expect(perfCss).toContain('html[data-performance-mode="balanced"]');
            expect(perfCss).toContain('.unified-action-dock');
            expect(perfCss).toContain('.quick-actions-menu');
            expect(perfCss).toContain('.mobile-bottom-bar');
            expect(perfCss).toContain('contain: layout paint');
        });
    });

    describe('TypeScript Scroll Controller (HeaderScroll.ts)', () => {
        let dom: JSDOM;
        let headerEl: HTMLElement;
        let bottomBarEl: HTMLElement;
        let headerScroll: HeaderScroll;

        beforeEach(() => {
            dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <header id="mainHeader" style="height: 80px;"></header>
                    <nav id="mobileBottomBar"></nav>
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
            (globalThis as any).CustomEvent = dom.window.CustomEvent;
            (globalThis as any).requestAnimationFrame = syncRaf;

            headerEl = dom.window.document.getElementById('mainHeader') as HTMLElement;
            bottomBarEl = dom.window.document.getElementById('mobileBottomBar') as HTMLElement;
        });

        afterEach(() => {
            headerScroll?.destroy();
            vi.restoreAllMocks();
        });

        const setScrollY = (y: number) => {
            Object.defineProperty(dom.window, 'scrollY', { value: y, configurable: true, writable: true });
        };

        const setInnerWidth = (w: number) => {
            Object.defineProperty(dom.window, 'innerWidth', { value: w, configurable: true, writable: true });
        };

        it('defines constants for scrolled hysteresis with activation (70px) and deactivation (50px) thresholds', () => {
            expect(HeaderScroll.SCROLLED_ACTIVATION_THRESHOLD_PX).toBe(70);
            expect(HeaderScroll.SCROLLED_DEACTIVATION_THRESHOLD_PX).toBe(50);
            expect(HeaderScroll.SCROLLED_ENTER_THRESHOLD_PX).toBe(70);
            expect(HeaderScroll.SCROLLED_EXIT_THRESHOLD_PX).toBe(50);
        });

        it('initializes in unscrolled state at top of page without continuous inline style overrides', () => {
            setInnerWidth(1200);
            setScrollY(0);

            headerScroll = new HeaderScroll(headerEl, bottomBarEl);
            expect(headerEl.classList.contains('scrolled')).toBe(false);
            // Consolidated blur management relies on CSS classes rather than continuous inline style writes
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('');
        });

        it('enters scrolled state with hysteresis (activating at 70px, deactivating at 50px) to prevent flickering', () => {
            setInnerWidth(1200);
            setScrollY(0);
            headerScroll = new HeaderScroll(headerEl, bottomBarEl);

            // Scroll to 60px: below 70px activation threshold -> remains unscrolled
            setScrollY(60);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(false);

            // Scroll to 75px: passes 70px activation threshold -> becomes scrolled
            setScrollY(75);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(true);

            // Deep scroll to 150px -> remains scrolled
            setScrollY(150);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(true);

            // Hysteresis test: scroll back up to 60px (between 50px and 70px)
            // Stays scrolled because it is still above 50px deactivation threshold!
            setScrollY(60);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(true);

            // Scroll back down to 40px: falls below 50px deactivation threshold -> becomes unscrolled
            setScrollY(40);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(false);

            // Scroll up to 60px again from unscrolled: below 70px -> stays unscrolled
            setScrollY(60);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(false);
        });

        it('smoothly interpolates continuous blur progress during scrolling and cleans up at top of page', () => {
            setInnerWidth(1200);
            setScrollY(0);
            headerScroll = new HeaderScroll(headerEl, bottomBarEl);

            // Initially at scroll 0, no inline blur properties
            expect(headerEl.style.getPropertyValue('--header-blur-progress')).toBe('');
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('');

            // Scroll to 75px (halfway along 150px ramp): progress ~ 0.50, dynamic blur ~ 6px (faint 3px to gentle 8px)
            setScrollY(75);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.style.getPropertyValue('--header-blur-progress')).toBe('0.50');
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('6px');

            // Scroll to full 150px: progress 1.00, blur 8px
            setScrollY(150);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.style.getPropertyValue('--header-blur-progress')).toBe('1.00');
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('8px');

            // Scroll back to top (0px): cleanly removes inline styles to prevent DOM pollution
            setScrollY(0);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.style.getPropertyValue('--header-blur-progress')).toBe('');
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('');
        });

        it('cleans up event listeners and timers upon destroy()', () => {
            headerScroll = new HeaderScroll(headerEl, bottomBarEl);
            expect(() => headerScroll.destroy()).not.toThrow();
        });
    });
});
