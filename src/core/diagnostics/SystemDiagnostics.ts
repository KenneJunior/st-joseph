/**
 * SJCCC Developer Tooling — System & Runtime Diagnostics
 * 
 * Inspects:
 * - App version & build mode
 * - Viewport dimensions & Device Pixel Ratio
 * - User preferences (prefers-reduced-motion, prefers-color-scheme)
 * - Network status (online/offline, connection API)
 * - Service Worker & CacheStorage status
 * - Theming & LocalStorage persistence state
 * - Prospectus zoom / density state
 * 
 * Accessible in developer console:
 * window.sjcccDiagnostics() or window.__SJCCC_DIAGNOSTICS__.printReport()
 */

import { performanceManager } from '../performance/PerformanceManager.ts';
import { backdropBlurDetector, type BlurDetectionResult } from './BackdropBlurDetector.ts';

export interface DiagnosticReport {
    timestamp: string;
    environment: {
        mode: string;
        isDev: boolean;
        userAgent: string;
        language: string;
        platform: string;
    };
    viewport: {
        width: number;
        height: number;
        dpr: number;
        orientation: string;
    };
    preferences: {
        reducedMotion: boolean;
        systemColorScheme: 'dark' | 'light' | 'no-preference';
        activeTheme: 'dark' | 'light';
        storedTheme: string | null;
    };
    performance?: {
        preference: string;
        profile: string;
        source: string;
        allowBackdropBlur: boolean;
        hardwareConcurrency?: number;
        deviceMemory?: number;
        hasWebGL: boolean;
        hasWebGL2: boolean;
        maxTextureSize?: number;
    };
    backdropBlur?: BlurDetectionResult;
    connectivity: {
        online: boolean;
        connectionType?: string;
        downlinkMb?: number;
    };
    storage: {
        localStorageAvailable: boolean;
        indexedDbAvailable: boolean;
        keysTracked: Record<string, string | null>;
    };
    serviceWorker: {
        supported: boolean;
        controllerActive: boolean;
        scope?: string;
        state?: string;
        cacheNames?: string[];
    };
    page: {
        title: string;
        pathname: string;
        isProspectus: boolean;
        prospectusZoom?: string;
    };
}

export class SystemDiagnostics {
    /**
     * Gathers all runtime diagnostics asynchronously
     */
    public async collect(): Promise<DiagnosticReport> {
        const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
        if (!isBrowser) {
            return this.collectNodeReport();
        }

        const win = window;
        const nav = navigator as Navigator & {
            connection?: { effectiveType?: string; downlink?: number };
        };

        // Preferences
        const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const isSystemDark = win.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const systemColorScheme = isSystemDark ? 'dark' : 'light';
        const isDarkTheme = document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode');

        // Storage test
        let storageOk = false;
        let storedTheme: string | null = null;
        try {
            localStorage.setItem('__sjccc_test__', '1');
            localStorage.removeItem('__sjccc_test__');
            storageOk = true;
            storedTheme = localStorage.getItem('sjccc_theme');
        } catch {
            storageOk = false;
        }

        // Service Worker & Caches
        const swSupported = 'serviceWorker' in nav;
        const controllerActive = Boolean(nav.serviceWorker?.controller);
        let swScope: string | undefined;
        let swState: string | undefined;
        let cacheNames: string[] | undefined;

        if (swSupported) {
            try {
                const reg = await nav.serviceWorker.getRegistration();
                if (reg) {
                    swScope = reg.scope;
                    swState = reg.active ? 'active' : reg.installing ? 'installing' : reg.waiting ? 'waiting' : 'registered';
                }
            } catch {
                // Ignore SW inspection errors
            }

            if ('caches' in win) {
                try {
                    cacheNames = await caches.keys();
                } catch {
                    // Ignore cache inspection errors
                }
            }
        }

        // Page specific
        const isProspectus = window.location.pathname.includes('prospectus');
        let prospectusZoom: string | undefined;
        if (isProspectus) {
            const container = document.querySelector('.prospectus-container') as HTMLElement | null;
            if (container) {
                prospectusZoom = getComputedStyle(container).zoom || getComputedStyle(document.documentElement).getPropertyValue('--prospectus-zoom');
            }
        }

        return {
            timestamp: new Date().toISOString(),
            environment: {
                mode: (import.meta as { env?: { MODE?: string } })?.env?.MODE || 'production',
                isDev: Boolean((import.meta as { env?: { DEV?: boolean } })?.env?.DEV),
                userAgent: nav.userAgent,
                language: nav.language,
                platform: nav.platform,
            },
            viewport: {
                width: win.innerWidth,
                height: win.innerHeight,
                dpr: win.devicePixelRatio || 1,
                orientation: win.innerWidth > win.innerHeight ? 'landscape' : 'portrait',
            },
            preferences: {
                reducedMotion,
                systemColorScheme,
                activeTheme: isDarkTheme ? 'dark' : 'light',
                storedTheme,
            },
            performance: {
                preference: performanceManager.getPreference(),
                profile: performanceManager.getProfile(),
                source: performanceManager.getResolutionSource(),
                allowBackdropBlur: performanceManager.getCapabilities().allowBackdropBlur,
                hardwareConcurrency: performanceManager.getSnapshot()?.hardwareConcurrency,
                deviceMemory: performanceManager.getSnapshot()?.deviceMemory,
                hasWebGL: performanceManager.getSnapshot()?.hasWebGL ?? false,
                hasWebGL2: performanceManager.getSnapshot()?.hasWebGL2 ?? false,
                maxTextureSize: performanceManager.getSnapshot()?.maxTextureSize,
            },
            backdropBlur: backdropBlurDetector.evaluate(),
            connectivity: {
                online: nav.onLine,
                connectionType: nav.connection?.effectiveType,
                downlinkMb: nav.connection?.downlink,
            },
            storage: {
                localStorageAvailable: storageOk,
                indexedDbAvailable: 'indexedDB' in win,
                keysTracked: {
                    theme: storedTheme,
                    pwaDismissed: storageOk && win.localStorage ? win.localStorage.getItem('sjccc_pwa_dismissed') : null,
                    announcementDismissed: storageOk && win.localStorage ? win.localStorage.getItem('sjccc_announcement_dismissed') : null,
                },
            },
            serviceWorker: {
                supported: swSupported,
                controllerActive,
                scope: swScope,
                state: swState,
                cacheNames,
            },
            page: {
                title: document.title,
                pathname: window.location.pathname,
                isProspectus,
                prospectusZoom,
            },
        };
    }

    private collectNodeReport(): DiagnosticReport {
        const g = globalThis as unknown as { process?: { env?: Record<string, string>; version?: string; platform?: string } };
        return {
            timestamp: new Date().toISOString(),
            environment: {
                mode: g.process?.env?.NODE_ENV || 'test',
                isDev: g.process?.env?.NODE_ENV !== 'production',
                userAgent: `Node.js/${g.process?.version || 'unknown'}`,
                language: 'en-US',
                platform: g.process?.platform || 'unknown',
            },
            viewport: { width: 0, height: 0, dpr: 1, orientation: 'none' },
            preferences: {
                reducedMotion: false,
                systemColorScheme: 'light',
                activeTheme: 'light',
                storedTheme: null,
            },
            performance: {
                preference: performanceManager.getPreference(),
                profile: performanceManager.getProfile(),
                source: performanceManager.getResolutionSource(),
                allowBackdropBlur: performanceManager.getCapabilities().allowBackdropBlur,
                hasWebGL: false,
                hasWebGL2: false,
            },
            backdropBlur: {
                supported: false,
                throttled: true,
                aesthetic: 'glassmorphism-lite',
                reason: 'Node runtime environment (SSR/CLI)',
            },
            connectivity: { online: true },
            storage: {
                localStorageAvailable: false,
                indexedDbAvailable: false,
                keysTracked: {},
            },
            serviceWorker: { supported: false, controllerActive: false },
            page: { title: 'Node CLI', pathname: '/', isProspectus: false },
        };
    }

    /**
     * Formats and prints a structured, high-visibility diagnostic card to console
     */
    public async printReport(): Promise<DiagnosticReport> {
        const data = await this.collect();

        if (typeof window !== 'undefined') {
            console.group('%c[SJCCC] System Diagnostics Report', 'color: #C9A229; font-size: 13px; font-weight: bold;');
            console.log(`%cEnvironment: %c${data.environment.mode} (Dev: ${data.environment.isDev})`, 'font-weight: bold;', 'color: #38BDF8;');
            console.log(`%cViewport:    %c${data.viewport.width}x${data.viewport.height} @ ${data.viewport.dpr}x (${data.viewport.orientation})`, 'font-weight: bold;', 'color: #10B981;');
            console.log(`%cTheming:     %cActive: ${data.preferences.activeTheme} | System: ${data.preferences.systemColorScheme} | Reduced-Motion: ${data.preferences.reducedMotion}`, 'font-weight: bold;', 'color: #F59E0B;');
            if (data.performance) {
                console.log(`%cPerformance: %cProfile: ${data.performance.profile.toUpperCase()} (Source: ${data.performance.source} | Pref: ${data.performance.preference} | Blur: ${data.performance.allowBackdropBlur})`, 'font-weight: bold;', data.performance.profile === 'lite' ? 'color: #EF4444;' : data.performance.profile === 'balanced' ? 'color: #F59E0B;' : 'color: #10B981;');
            }
            if (data.backdropBlur) {
                console.log(`%cBackdropBlur:%c ${data.backdropBlur.aesthetic.toUpperCase()} (Supported: ${data.backdropBlur.supported} | Throttled: ${data.backdropBlur.throttled}) - ${data.backdropBlur.reason}`, 'font-weight: bold;', data.backdropBlur.throttled ? 'color: #F59E0B;' : 'color: #10B981;');
            }
            console.log(`%cNetwork:     %cOnline: ${data.connectivity.online}${data.connectivity.connectionType ? ` (${data.connectivity.connectionType})` : ''}`, 'font-weight: bold;', data.connectivity.online ? 'color: #10B981;' : 'color: #EF4444;');
            console.log(`%cServiceWorker: %cSupported: ${data.serviceWorker.supported} | Controller: ${data.serviceWorker.controllerActive} | State: ${data.serviceWorker.state || 'none'}`, 'font-weight: bold;', 'color: #38BDF8;');
            if (data.serviceWorker.cacheNames && data.serviceWorker.cacheNames.length > 0) {
                console.log(`%cCaches:     %c${data.serviceWorker.cacheNames.join(', ')}`, 'font-weight: bold;', 'color: #94A3B8;');
            }
            if (data.page.isProspectus) {
                console.log(`%cProspectus:  %cZoom: ${data.page.prospectusZoom || '1'}`, 'font-weight: bold;', 'color: #C9A229;');
            }
            console.groupEnd();
        } else {
            console.log('\n=== SJCCC System Diagnostics ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('================================\n');
        }

        return data;
    }

    /**
     * Registers diagnostic helpers on window object.
     */
    public registerWindowHelpers(targetWin?: any): void {
        const win = targetWin || (typeof window !== 'undefined' ? (window as any) : null);
        if (!win) return;

        win.__SJCCC_DIAGNOSTICS__ = Object.assign(this, {
            toggleBlurOverlay: (show?: boolean) => backdropBlurDetector.toggleOverlay(show),
            setBlurThrottled: (throttled: boolean | null) => backdropBlurDetector.setThrottled(throttled),
            getBlurStatus: () => backdropBlurDetector.evaluate(),
        });
        win.sjcccDiagnostics = () => this.printReport();
    }
}

export const systemDiagnostics = new SystemDiagnostics();

// Register global developer helper
systemDiagnostics.registerWindowHelpers();
