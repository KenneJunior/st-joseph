import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { showUpdateNotification } from '../../src/services/serviceWorker.ts';

describe('Service Worker Update Notification Subsystem', () => {
    let dom: JSDOM;
    let window: any;
    let document: Document;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>', {
            url: 'https://sjccc.vercel.app/',
        });
        window = dom.window;
        document = window.document;

        (globalThis as any).window = window;
        (globalThis as any).document = document;
        (globalThis as any).sessionStorage = window.sessionStorage;
        (globalThis as any).CustomEvent = window.CustomEvent;
        (globalThis as any).setTimeout = setTimeout;
        (globalThis as any).clearTimeout = clearTimeout;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        window.sessionStorage.clear();
        document.body.innerHTML = '';
    });

    it('creates an accessible, theme-tokenized update pill when an update is available', () => {
        const mockRegistration = {
            waiting: {
                postMessage: vi.fn(),
            },
        } as unknown as ServiceWorkerRegistration;

        showUpdateNotification(mockRegistration);

        const banner = document.getElementById('sw-update-banner');
        expect(banner).not.toBeNull();
        expect(banner?.getAttribute('role')).toBe('status');
        expect(banner?.getAttribute('aria-live')).toBe('polite');

        const title = banner?.querySelector('.sw-pill__title');
        expect(title?.textContent).toBe('Website update available');

        const meta = banner?.querySelector('.sw-pill__meta');
        expect(meta?.textContent).toBe('A new version of the SJCCC website is ready.');

        const updateBtn = banner?.querySelector('#updateBtn') as HTMLButtonElement;
        expect(updateBtn).not.toBeNull();
        expect(updateBtn.textContent).toContain('Update now');

        const dismissBtn = banner?.querySelector('#dismissBtn') as HTMLButtonElement;
        expect(dismissBtn).not.toBeNull();
        expect(dismissBtn.textContent).toContain('Later');
    });

    it('persists session postponement when Later is clicked and prevents re-prompting in the same session', () => {
        const mockRegistration = {
            waiting: {
                postMessage: vi.fn(),
            },
        } as unknown as ServiceWorkerRegistration;

        showUpdateNotification(mockRegistration);

        const banner = document.getElementById('sw-update-banner');
        expect(banner).not.toBeNull();

        const dismissBtn = banner?.querySelector('#dismissBtn') as HTMLButtonElement;
        dismissBtn.click();

        expect(window.sessionStorage.getItem('sjccc_sw_update_postponed')).toBe('true');
        expect(banner?.classList.contains('sw-pill--dismissing')).toBe(true);

        // Attempting to show update notification again during this session should do nothing
        banner?.remove();
        showUpdateNotification(mockRegistration);
        expect(document.getElementById('sw-update-banner')).toBeNull();
    });

    it('transitions to loading state and sends SKIP_WAITING when Update now is clicked', () => {
        const postMessageSpy = vi.fn();
        const mockRegistration = {
            waiting: {
                postMessage: postMessageSpy,
            },
        } as unknown as ServiceWorkerRegistration;

        showUpdateNotification(mockRegistration);

        const banner = document.getElementById('sw-update-banner');
        const updateBtn = banner?.querySelector('#updateBtn') as HTMLButtonElement;
        const dismissBtn = banner?.querySelector('#dismissBtn') as HTMLButtonElement;

        updateBtn.click();

        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
        expect(updateBtn.disabled).toBe(true);
        expect(dismissBtn.disabled).toBe(true);
        expect(updateBtn.getAttribute('aria-busy')).toBe('true');
        expect(updateBtn.innerHTML).toContain('Updating...');
    });

    it('verifies that sw-update.css declares the required mobile safe-dock clearance and dark mode tokens', () => {
        const cssPath = path.resolve(process.cwd(), 'src/css/features/sw-update.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        expect(cssContent).toContain('#sw-update-banner');
        expect(cssContent).toContain('--sw-pill-bg');
        expect(cssContent).toContain('html.dark-mode');
        // Clear mobile bottom bar elevation check
        expect(cssContent).toContain('var(--dock-bottom-offset');
        expect(cssContent).toContain('prefers-reduced-motion');
    });
});
