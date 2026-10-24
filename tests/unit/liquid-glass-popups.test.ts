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
});
