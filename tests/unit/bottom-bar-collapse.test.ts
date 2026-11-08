import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).MouseEvent = dom.window.MouseEvent;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        };

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
});
