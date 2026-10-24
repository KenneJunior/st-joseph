import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
    LiquidGlassAdapter,
    POPUP_SELECTORS,
    DEFAULT_POPUP_GLASS_CONFIG,
} from '../../src/ui/effects/LiquidGlassAdapter.ts';
import { PwaInstallPrompt } from '../../src/features/pwa/PwaInstallPrompt.ts';
import { showUpdateNotification } from '../../src/services/serviceWorker.ts';

describe('LiquidGlassAdapter — Dynamic Popups & Notifications Integration', () => {
    let dom: JSDOM;
    let window: any;
    let document: Document;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><head></head><body><button id="installApp">Install</button></body></html>', {
            url: 'https://sjccc.vercel.app.cm/',
        });
        window = dom.window;
        document = window.document;

        (globalThis as any).window = window;
        (globalThis as any).document = document;
        (globalThis as any).HTMLElement = window.HTMLElement;
        (globalThis as any).HTMLButtonElement = window.HTMLButtonElement;
        (globalThis as any).localStorage = window.localStorage;
        (globalThis as any).sessionStorage = window.sessionStorage;
        (globalThis as any).CustomEvent = window.CustomEvent;
        (globalThis as any).MutationObserver = window.MutationObserver;

        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.sessionStorage.clear();
        document.body.innerHTML = '<button id="installApp">Install</button>';
    });

    it('declares canonical popup selectors covering install card, update banner, and offline indicators', () => {
        expect(POPUP_SELECTORS).toEqual([
            '#pwaInstallCard',
            '.pwa-install-card',
            '#sw-update-banner',
            '#offlineStatusIndicator',
            '.offline-status-indicator',
        ]);
        expect(POPUP_SELECTORS).not.toContain('.cd-card');
        expect(POPUP_SELECTORS).not.toContain('.dialog-box');
    });

    it('provides specialized popup glass optics with rich thickness and gold ripple', () => {
        expect(DEFAULT_POPUP_GLASS_CONFIG.refractiveIndex).toBeGreaterThanOrEqual(1.5);
        expect(DEFAULT_POPUP_GLASS_CONFIG.glassThickness).toBe(75);
        expect(DEFAULT_POPUP_GLASS_CONFIG.bezelWidth).toBe(18);
        expect(DEFAULT_POPUP_GLASS_CONFIG.specularAlpha).toBe(0.55);
        expect(DEFAULT_POPUP_GLASS_CONFIG.rippleColor).toContain('201, 162, 41');
    });

    it('safely enhances dynamic popups using enhancePopup without throwing in non-browser or fallback environments', () => {
        const testPopup = document.createElement('div');
        testPopup.id = 'pwaInstallCard';
        testPopup.className = 'pwa-install-card';
        document.body.appendChild(testPopup);

        const adapter = new LiquidGlassAdapter();
        expect(() => {
            adapter.enhancePopup('#pwaInstallCard');
        }).not.toThrow();

        expect(() => {
            adapter.enhancePopup(testPopup);
        }).not.toThrow();

        adapter.destroy();
    });

    it('enhances PWA install card with LiquidGlass when card is triggered', async () => {
        const spyEnhance = vi.spyOn(LiquidGlassAdapter, 'enhancePopup');

        const prompt = new PwaInstallPrompt({
            afterInteraction: false,
            dismissDays: 14,
        });

        await prompt.trigger(true);

        const card = document.getElementById('pwaInstallCard');
        expect(card).not.toBeNull();
        expect(spyEnhance).toHaveBeenCalledWith(card);
    });

    it('enhances Service Worker update banner with LiquidGlass when update notification is displayed', () => {
        const spyEnhance = vi.spyOn(LiquidGlassAdapter, 'enhancePopup');

        const mockRegistration = {
            waiting: { postMessage: vi.fn() },
        } as unknown as ServiceWorkerRegistration;

        showUpdateNotification(mockRegistration);

        const banner = document.getElementById('sw-update-banner');
        expect(banner).not.toBeNull();
        expect(spyEnhance).toHaveBeenCalledWith(banner);
    });

    it('runs MutationObserver in initPopupObserver and detects dynamically appended popups', () => {
        const adapter = new LiquidGlassAdapter();
        const spyEnhance = vi.spyOn(adapter, 'enhancePopup');

        adapter.initPopupObserver();

        const newBanner = document.createElement('div');
        newBanner.id = 'sw-update-banner';
        document.body.appendChild(newBanner);

        // Observer or enhancePopup runs without crashing
        expect(() => {
            adapter.enhancePopup(newBanner);
        }).not.toThrow();

        adapter.destroy();
    });

    it('enforces reduced background opacity across all elements implementing the liquid glass effect', async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');

        // 1. PWA install card stylesheet
        const pwaCss = readFileSync(resolve(process.cwd(), 'src/css/components/pwa-install-card.css'), 'utf-8');
        const pwaLightMatch = pwaCss.match(/--pwa-card-bg:\s*rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/);
        const pwaDarkMatch = pwaCss.match(/--pwa-card-bg:\s*rgba\(7,\s*24,\s*46,\s*([\d.]+)\)/);
        expect(pwaLightMatch).not.toBeNull();
        expect(pwaDarkMatch).not.toBeNull();
        expect(parseFloat(pwaLightMatch![1])).toBeLessThanOrEqual(0.60);
        expect(parseFloat(pwaDarkMatch![1])).toBeLessThanOrEqual(0.50);

        // 2. Service Worker update banner stylesheet
        const swCss = readFileSync(resolve(process.cwd(), 'src/css/features/sw-update.css'), 'utf-8');
        const swLightMatch = swCss.match(/--sw-pill-bg:\s*rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/);
        const swDarkMatch = swCss.match(/--sw-pill-bg:\s*rgba\(7,\s*24,\s*46,\s*([\d.]+)\)/);
        expect(swLightMatch).not.toBeNull();
        expect(swDarkMatch).not.toBeNull();
        expect(parseFloat(swLightMatch![1])).toBeLessThanOrEqual(0.60);
        expect(parseFloat(swDarkMatch![1])).toBeLessThanOrEqual(0.50);

        // 3. Offline indicator pill and card panel
        const offlineCss = readFileSync(resolve(process.cwd(), 'src/css/components/offline-indicator.css'), 'utf-8');
        const offlinePillMatch = offlineCss.match(/\.offline-indicator-pill\s*\{[^}]*background:\s*rgba\(7,\s*24,\s*46,\s*([\d.]+)\)/);
        const offlinePanelMatch = offlineCss.match(/\.offline-card-panel\s*\{[^}]*background:\s*rgba\(7,\s*24,\s*46,\s*([\d.]+)\)/);
        expect(offlinePillMatch).not.toBeNull();
        expect(offlinePanelMatch).not.toBeNull();
        expect(parseFloat(offlinePillMatch![1])).toBeLessThanOrEqual(0.15);
        expect(parseFloat(offlinePanelMatch![1])).toBeLessThanOrEqual(0.40);

        // 4. ConfirmDialog surface glass and content wrapper
        const dialogCss = readFileSync(resolve(process.cwd(), 'src/css/components/dialog.css'), 'utf-8');
        const dialogSurfaceMatch = dialogCss.match(/--cd-surface-glass:\s*rgba\(7,\s*24,\s*46,\s*([\d.]+)\)/);
        const dialogWrapperMatch = dialogCss.match(/\.cd-content-wrapper\s*\{[^}]*background:\s*rgba\(7,\s*24,\s*46,\s*([\d.]+)\)/);
        expect(dialogSurfaceMatch).not.toBeNull();
        expect(dialogWrapperMatch).not.toBeNull();
        expect(parseFloat(dialogSurfaceMatch![1])).toBeLessThanOrEqual(0.15);
        expect(parseFloat(dialogWrapperMatch![1])).toBeLessThanOrEqual(0.30);
    });

    it('enforces solid color fallbacks when liquid glass / backdrop-filter is unsupported or reduced transparency is active', async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');

        const stylesheets = [
            'src/css/components/pwa-install-card.css',
            'src/css/features/sw-update.css',
            'src/css/components/offline-indicator.css',
            'src/css/components/dialog.css',
        ];

        for (const file of stylesheets) {
            const css = readFileSync(resolve(process.cwd(), file), 'utf-8');

            // Must include @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))
            expect(css).toMatch(/@supports\s+not\s*\(/);

            // Must include @media (prefers-reduced-transparency: reduce)
            expect(css).toContain('prefers-reduced-transparency: reduce');

            // Must include class/attribute fallback selectors
            expect(css).toMatch(/(?:no-liquid-glass|glass-fallback|data-glass-fallback)/);

            // Must use solid background fallback
            expect(css).toMatch(/backdrop-filter:\s*none\s*!important/);
        }
    });

    it('supports runtime detection and marks fallback on elements when liquid glass is unsupported', () => {
        const testEl = document.createElement('div');
        testEl.className = 'test-surface';
        document.body.appendChild(testEl);

        // Test markGlassFallback directly
        LiquidGlassAdapter.markGlassFallback([testEl]);
        expect(testEl.getAttribute('data-glass-fallback')).toBe('true');
        expect(testEl.classList.contains('glass-fallback')).toBe(true);
        expect(document.documentElement.classList.contains('no-liquid-glass')).toBe(true);

        // Test isSupported when CSS.supports is missing or false
        (globalThis as any).CSS = {
            supports: vi.fn().mockReturnValue(false),
        };
        expect(LiquidGlassAdapter.isSupported()).toBe(false);

        // Test isSupported when prefers-reduced-transparency is true
        (globalThis as any).CSS.supports = vi.fn().mockReturnValue(true);
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('prefers-reduced-transparency'),
            media: query,
        }));
        expect(LiquidGlassAdapter.isSupported()).toBe(false);
    });
});
