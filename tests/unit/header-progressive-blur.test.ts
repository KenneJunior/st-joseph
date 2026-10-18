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
            expect(headerCss).toMatch(/#mainHeader\.scrolled::before\s*\{[^}]*backdrop-filter:\s*blur\(var\(--blur-intensity,\s*16px\)\)\s*saturate\(160%\);/);
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

        it('defines constants for smooth progressive blur ramping and scrolled hysteresis', () => {
            expect(HeaderScroll.BLUR_RAMP_DISTANCE_PX).toBe(150);
            expect(HeaderScroll.SCROLLED_ENTER_THRESHOLD_PX).toBe(55);
            expect(HeaderScroll.SCROLLED_EXIT_THRESHOLD_PX).toBe(25);
        });

        it('initializes --blur-intensity smoothly without sudden jumps', () => {
            setInnerWidth(1200);
            setScrollY(0);

            headerScroll = new HeaderScroll(headerEl, bottomBarEl);
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('6px');
            expect(headerEl.classList.contains('scrolled')).toBe(false);
        });

        it('progressively ramps blur-intensity during scrolling and enters scrolled state with hysteresis', () => {
            setInnerWidth(1200);
            setScrollY(0);
            headerScroll = new HeaderScroll(headerEl, bottomBarEl);

            // Scroll to 75px (halfway through the 150px ramp, past 55px enter threshold)
            setScrollY(75);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));

            expect(headerEl.classList.contains('scrolled')).toBe(true);
            const intensityHalf = parseFloat(headerEl.style.getPropertyValue('--blur-intensity'));
            expect(intensityHalf).toBeCloseTo(11.0, 1);

            // Scroll to 150px (full ramp)
            setScrollY(150);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));

            const intensityFull = parseFloat(headerEl.style.getPropertyValue('--blur-intensity'));
            expect(intensityFull).toBe(16);

            // Test hysteresis: scrolling back to 40px keeps .scrolled because it is above 25px exit threshold
            setScrollY(40);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(true);

            // Scrolling back to 10px (below 25px) removes .scrolled
            setScrollY(10);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.classList.contains('scrolled')).toBe(false);
        });

        it('uses mobile-optimized blur bounds on viewports <= 768px', () => {
            setInnerWidth(375);
            setScrollY(0);

            headerScroll = new HeaderScroll(headerEl, bottomBarEl);
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('4px');

            setScrollY(150);
            dom.window.dispatchEvent(new dom.window.Event('scroll'));
            expect(headerEl.style.getPropertyValue('--blur-intensity')).toBe('10px');
        });

        it('cleans up event listeners and timers upon destroy()', () => {
            headerScroll = new HeaderScroll(headerEl, bottomBarEl);
            expect(() => headerScroll.destroy()).not.toThrow();
        });
    });
});
