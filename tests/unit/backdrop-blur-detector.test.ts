import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { backdropBlurDetector } from '../../src/core/diagnostics/BackdropBlurDetector.ts';
import { performanceManager } from '../../src/core/performance/PerformanceManager.ts';
import { systemDiagnostics } from '../../src/core/diagnostics/SystemDiagnostics.ts';

describe('BackdropBlurDetector & Glassmorphism-Lite System', () => {
    let dom: JSDOM;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <header id="mainHeader" class="scrolled">Header Content</header>
                <div class="stat-card" id="testStatCard">Stat Card 1</div>
                <div class="unified-action-dock" id="testDock">Dock Pill</div>
                <div id="mobileBottomBar" class="mobile-bottom-bar">Bottom Bar</div>
                <button id="askAiFab" class="sjccc-ai-fab">AI</button>
                <button class="enquiry-fab">Enquiry</button>
            </body>
            </html>
        `, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true
        });

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).URLSearchParams = dom.window.URLSearchParams;
        (globalThis as any).localStorage = dom.window.localStorage;
        (globalThis as any).CSS = {
            supports: (_prop: string, _val: string) => true
        };
        (dom.window as any).matchMedia = (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        });

        systemDiagnostics.registerWindowHelpers(dom.window);
        backdropBlurDetector.setThrottled(null);
    });

    afterEach(() => {
        backdropBlurDetector.toggleOverlay(false);
        backdropBlurDetector.setThrottled(null);
    });

    it('evaluates blur detection state cleanly', () => {
        const result = backdropBlurDetector.evaluate();
        expect(result).toBeDefined();
        expect(typeof result.supported).toBe('boolean');
        expect(typeof result.throttled).toBe('boolean');
        expect(['native-blur', 'glassmorphism-lite']).toContain(result.aesthetic);
        expect(typeof result.reason).toBe('string');
    });

    it('applies throttled glassmorphism-lite classes and data attributes when throttled', () => {
        backdropBlurDetector.setThrottled(true);
        backdropBlurDetector.apply();

        const root = dom.window.document.documentElement;
        expect(root.getAttribute('data-backdrop-blur')).toBe('throttled');
        expect(root.getAttribute('data-glass-aesthetic')).toBe('glassmorphism-lite');
        expect(root.classList.contains('blur-throttled')).toBe(true);
        expect(root.classList.contains('glassmorphism-lite')).toBe(true);

        const header = dom.window.document.getElementById('mainHeader');
        expect(header?.getAttribute('data-backdrop-blur')).toBe('throttled');
        expect(header?.classList.contains('blur-throttled')).toBe(true);
        expect(header?.classList.contains('glassmorphism-lite')).toBe(true);

        const statCard = dom.window.document.getElementById('testStatCard');
        expect(statCard?.getAttribute('data-backdrop-blur')).toBe('throttled');
        expect(statCard?.classList.contains('glassmorphism-lite')).toBe(true);

        const dock = dom.window.document.getElementById('testDock');
        expect(dock?.getAttribute('data-backdrop-blur')).toBe('throttled');
        expect(dock?.classList.contains('glassmorphism-lite')).toBe(true);
    });

    it('reverts to native-blur active attributes when throttle is removed', () => {
        backdropBlurDetector.setThrottled(true);
        backdropBlurDetector.apply();

        // Force unthrottled
        backdropBlurDetector.setThrottled(false);
        backdropBlurDetector.apply();

        const root = dom.window.document.documentElement;
        expect(root.getAttribute('data-backdrop-blur')).toBe('active');
        expect(root.getAttribute('data-glass-aesthetic')).toBe('native-blur');
        expect(root.classList.contains('blur-active')).toBe(true);
        expect(root.classList.contains('blur-throttled')).toBe(false);
        expect(root.classList.contains('glassmorphism-lite')).toBe(false);

        const header = dom.window.document.getElementById('mainHeader');
        expect(header?.getAttribute('data-backdrop-blur')).toBe('active');
        expect(header?.classList.contains('blur-active')).toBe(true);
        expect(header?.classList.contains('blur-throttled')).toBe(false);
    });

    it('automatically triggers glassmorphism-lite fallback when performance profile is lite', () => {
        performanceManager.setPreference('lite');
        backdropBlurDetector.setThrottled(null); // allow auto-detection from performanceManager
        const result = backdropBlurDetector.evaluate();

        expect(result.throttled).toBe(true);
        expect(result.aesthetic).toBe('glassmorphism-lite');
        expect(result.reason).toContain('Performance mode or device capability constrained');

        // Restore balanced
        performanceManager.setPreference('balanced');
    });

    it('ensures blur is unthrottled and active when performance profile is full', () => {
        performanceManager.setPreference('full');
        backdropBlurDetector.setThrottled(null);
        const result = backdropBlurDetector.evaluate();

        expect(result.throttled).toBe(false);
        expect(result.aesthetic).toBe('native-blur');
        expect(result.reason).toContain('Native GPU blur active and operational');

        backdropBlurDetector.apply();
        const root = dom.window.document.documentElement;
        expect(root.getAttribute('data-backdrop-blur')).toBe('active');
        expect(root.getAttribute('data-glass-aesthetic')).toBe('native-blur');
        expect(root.classList.contains('blur-active')).toBe(true);
        expect(root.classList.contains('blur-throttled')).toBe(false);

        const bottomBar = dom.window.document.getElementById('mobileBottomBar');
        expect(bottomBar?.getAttribute('data-backdrop-blur')).toBe('active');
        expect(bottomBar?.classList.contains('blur-active')).toBe(true);

        const dock = dom.window.document.getElementById('testDock');
        expect(dock?.getAttribute('data-backdrop-blur')).toBe('active');
        expect(dock?.classList.contains('blur-active')).toBe(true);

        // Restore balanced
        performanceManager.setPreference('balanced');
    });

    it('correctly detects mobile WebKit devices supporting -webkit-backdrop-filter', () => {
        (globalThis as any).CSS = {
            supports: (prop: string, _val: string) => prop === '-webkit-backdrop-filter'
        };

        const isSupported = backdropBlurDetector.checkNativeSupport();
        expect(isSupported).toBe(true);

        // Reset
        (globalThis as any).CSS = {
            supports: (_prop: string, _val: string) => true
        };
    });

    it('renders and manages diagnostic overlay badges on target components', () => {
        backdropBlurDetector.setThrottled(true);
        backdropBlurDetector.toggleOverlay(true);

        const root = dom.window.document.documentElement;
        expect(root.classList.contains('show-blur-diagnostics')).toBe(true);
        expect(root.getAttribute('data-blur-diagnostics')).toBe('true');

        const headerBadge = dom.window.document.querySelector('#mainHeader .blur-diagnostic-badge');
        expect(headerBadge).not.toBeNull();
        expect(headerBadge?.classList.contains('is-throttled')).toBe(true);
        expect(headerBadge?.textContent).toContain('Blur Throttled (rgba 0.65 fallback)');

        const statCardBadge = dom.window.document.querySelector('#testStatCard .blur-diagnostic-badge');
        expect(statCardBadge).not.toBeNull();
        expect(statCardBadge?.classList.contains('is-throttled')).toBe(true);

        // Switch to unthrottled with overlay still visible
        backdropBlurDetector.setThrottled(false);
        const activeHeaderBadge = dom.window.document.querySelector('#mainHeader .blur-diagnostic-badge');
        expect(activeHeaderBadge?.classList.contains('is-active')).toBe(true);
        expect(activeHeaderBadge?.textContent).toContain('Blur Active (GPU)');

        // Hide overlay
        backdropBlurDetector.toggleOverlay(false);
        expect(dom.window.document.querySelectorAll('.blur-diagnostic-badge').length).toBe(0);
        expect(dom.window.document.getElementById('blurDiagnosticHud')).toBeNull();
    });

    it('mounts floating diagnostic HUD with interactive throttle toggle', () => {
        backdropBlurDetector.toggleOverlay(true);

        const hud = dom.window.document.getElementById('blurDiagnosticHud');
        expect(hud).not.toBeNull();

        const toggleBtn = hud?.querySelector<HTMLButtonElement>('#blurHudToggleThrottleBtn');
        expect(toggleBtn).not.toBeNull();

        const closeBtn = hud?.querySelector<HTMLButtonElement>('#blurHudCloseBtn');
        expect(closeBtn).not.toBeNull();

        // Click close button
        closeBtn?.click();
        expect(dom.window.document.getElementById('blurDiagnosticHud')).toBeNull();
    });

    it('integrates into systemDiagnostics report and global window helper', async () => {
        const report = await systemDiagnostics.collect();
        expect(report.backdropBlur).toBeDefined();
        expect(typeof report.backdropBlur?.supported).toBe('boolean');
        expect(typeof report.backdropBlur?.throttled).toBe('boolean');
        expect(['native-blur', 'glassmorphism-lite']).toContain(report.backdropBlur?.aesthetic);

        const win = dom.window as any;
        expect(win.__SJCCC_DIAGNOSTICS__).toBeDefined();
        expect(typeof win.__SJCCC_DIAGNOSTICS__.toggleBlurOverlay).toBe('function');
        expect(typeof win.__SJCCC_DIAGNOSTICS__.setBlurThrottled).toBe('function');
        expect(typeof win.__SJCCC_DIAGNOSTICS__.getBlurStatus).toBe('function');
    });

    it('verifies glassmorphism-lite.css adheres strictly to rgba(x,x,x,0.65) specifications', () => {
        const cssPath = path.resolve(process.cwd(), 'src/css/core/glassmorphism-lite.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        // Verify Header fallback colors with 0.65 opacity
        expect(cssContent).toContain('rgba(7, 24, 46, 0.65)');
        expect(cssContent).toContain('rgba(6, 14, 26, 0.65)');

        // Verify Stat Cards & Dock fallback colors with 0.65 opacity
        expect(cssContent).toContain('rgba(255, 255, 255, 0.65)');

        // Verify diagnostic overlay classes
        expect(cssContent).toContain('.blur-diagnostic-badge');
        expect(cssContent).toContain('.blur-diagnostic-hud');
        expect(cssContent).toContain('data-backdrop-blur="throttled"');
        expect(cssContent).toContain('.glassmorphism-lite');
    });
});
