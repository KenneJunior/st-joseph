import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { PwaInstallPrompt } from '../../src/features/pwa/PwaInstallPrompt.ts';

describe('Institutional PWA Install Card Subsystem', () => {
    let dom: JSDOM;
    let window: any;
    let document: Document;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><head></head><body><button id="installApp">Install</button></body></html>', {
            url: 'https://sjccc.vercel.app/',
        });
        window = dom.window;
        document = window.document;

        (globalThis as any).window = window;
        (globalThis as any).document = document;
        (globalThis as any).localStorage = window.localStorage;
        (globalThis as any).sessionStorage = window.sessionStorage;
        (globalThis as any).CustomEvent = window.CustomEvent;
        (globalThis as any).HTMLElement = window.HTMLElement;
        (globalThis as any).HTMLButtonElement = window.HTMLButtonElement;
        (globalThis as any).setTimeout = setTimeout;
        (globalThis as any).clearTimeout = clearTimeout;

        // Mock matchMedia for non-standalone mode
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
        document.body.innerHTML = '<button id="installApp">Install</button>';
    });

    it('renders a non-modal institutional card without backdrop overlay or focus trap', async () => {
        const prompt = new PwaInstallPrompt({
            afterInteraction: false,
            dismissDays: 14,
        });

        await prompt.trigger(true);

        const card = document.getElementById('pwaInstallCard');
        expect(card).not.toBeNull();
        expect(card?.getAttribute('role')).toBe('region');
        expect(card?.getAttribute('aria-label')).toBe('SJCCC Application Installation');
        expect(card?.getAttribute('aria-describedby')).toBe('pwaCardDesc');

        // Confirm NO modal overlay (.cd-overlay) is rendered
        expect(document.querySelector('.cd-overlay')).toBeNull();

        const crest = card?.querySelector('.pwa-card__crest');
        expect(crest?.textContent).toBe('SJCCC');

        const title = card?.querySelector('.pwa-card__title');
        expect(title?.textContent).toBe('Install SJCCC Academic Portal');

        prompt.destroy();
    });

    it('persists a 14-day dismissal cooldown when dismissed via Later or Close', async () => {
        const prompt = new PwaInstallPrompt({
            afterInteraction: false,
            dismissDays: 14,
        });

        await prompt.trigger(true);

        const card = document.getElementById('pwaInstallCard');
        expect(card).not.toBeNull();

        const dismissBtn = card?.querySelector('#pwaCardDismissBtn') as HTMLButtonElement;
        dismissBtn.click();
        await new Promise((r) => setTimeout(r, 260));

        const rawData = window.localStorage.getItem('pwa-install-prompt');
        expect(rawData).not.toBeNull();
        const parsed = JSON.parse(rawData!);
        expect(parsed.cooldownDays).toBe(14);
        expect(parsed.ts).toBeGreaterThan(0);

        // Immediate automatic prompt trigger should be suppressed by cooldown
        const secondPrompt = new PwaInstallPrompt({
            afterInteraction: false,
            dismissDays: 14,
        });
        await secondPrompt.trigger(false);

        // Card should not be recreated automatically due to cooldown
        expect(document.getElementById('pwaInstallCard')).toBeNull();

        prompt.destroy();
        secondPrompt.destroy();
    });

    it('allows manual install button (#installApp) to trigger guidance even during cooldown', async () => {
        // Set an active cooldown in localStorage
        window.localStorage.setItem('pwa-install-prompt', JSON.stringify({
            ts: Date.now(),
            cooldownDays: 14,
        }));

        const prompt = new PwaInstallPrompt({
            afterInteraction: false,
            dismissDays: 14,
        });

        // Manual trigger should bypass cooldown
        await prompt.trigger(true);

        const card = document.getElementById('pwaInstallCard');
        expect(card).not.toBeNull();

        prompt.destroy();
    });

    it('dismisses install card when Escape key is pressed', async () => {
        const prompt = new PwaInstallPrompt({
            afterInteraction: false,
        });

        await prompt.trigger(true);

        const card = document.getElementById('pwaInstallCard');
        expect(card).not.toBeNull();

        card?.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(card?.classList.contains('pwa-card--dismissing')).toBe(true);

        prompt.destroy();
    });

    it('coordinates with update banner by hiding install card when update banner appears', async () => {
        const prompt = new PwaInstallPrompt({
            afterInteraction: false,
        });

        await prompt.trigger(true);

        const card = document.getElementById('pwaInstallCard');
        expect(card).not.toBeNull();

        // Dispatch update banner visible event
        window.dispatchEvent(new window.CustomEvent('sjccc-update-banner-visible', {
            detail: { visible: true }
        }));

        expect(card?.classList.contains('pwa-card--dismissing')).toBe(true);

        prompt.destroy();
    });

    it('verifies that pwa-install-card.css declares theme tokens and safe-area dock offset', () => {
        const cssPath = path.resolve(process.cwd(), 'src/css/components/pwa-install-card.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        expect(cssContent).toContain('.pwa-install-card');
        expect(cssContent).toContain('--pwa-card-bg');
        expect(cssContent).toContain('html.dark-mode');
        expect(cssContent).toContain('var(--dock-bottom-offset');
        expect(cssContent).toContain('prefers-reduced-motion');
    });
});
