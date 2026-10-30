import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceManager } from '../../src/core/performance/PerformanceManager.ts';
import { motionSuspension } from '../../src/core/physics/MotionSuspension.ts';
import { HeroParticles } from '../../src/features/hero/HeroParticles.ts';
import { STORAGE_KEYS } from '../../src/core/storage/storageKeys.ts';
import { JSDOM } from 'jsdom';

describe('Performance Mode Reversibility & Audit Verification', () => {
    let dom: JSDOM;
    let storageMock: Record<string, string>;

    beforeEach(() => {
        storageMock = {};
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html data-performance-mode="full" class="perf-mode-full">
            <head></head>
            <body>
                <div id="heroParticles"></div>
                <canvas id="dustCanvas"></canvas>
            </body>
            </html>
        `, { url: 'https://sjccc.edu.cm/' });

        // @ts-expect-error Mock global window
        global.window = dom.window;
        // @ts-expect-error Mock global document
        global.document = dom.window.document;

        const mockLocalStorage = {
            getItem: vi.fn((key: string) => storageMock[key] ?? null),
            setItem: vi.fn((key: string, val: string) => {
                storageMock[key] = String(val);
            }),
            removeItem: vi.fn((key: string) => {
                delete storageMock[key];
            }),
            clear: vi.fn(() => {
                storageMock = {};
            }),
        };

        vi.stubGlobal('localStorage', mockLocalStorage);
        Object.defineProperty(dom.window, 'localStorage', {
            value: mockLocalStorage,
            configurable: true,
            writable: true,
        });

        // Stub matchMedia
        dom.window.matchMedia = vi.fn().mockImplementation(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));

        motionSuspension.reset();
        PerformanceManager.resetInstance();
    });

    afterEach(() => {
        PerformanceManager.resetInstance();
        motionSuspension.reset();
        vi.restoreAllMocks();
    });

    describe('Mode Transition Cycle 1: Full → Lite → Full', () => {
        it('seamlessly transitions from Full to Lite and fully restores to Full state', () => {
            const manager = new PerformanceManager();
            const particles = new HeroParticles('heroParticles', 40);

            // 1. Initial Full State
            manager.setPreference('full');
            expect(manager.getProfile()).toBe('full');
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('full');
            expect(dom.window.document.documentElement.classList.contains('perf-mode-full')).toBe(true);
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(false);
            expect(motionSuspension.isSuspended('particleSystem')).toBe(false);
            expect(motionSuspension.getReasons('particleSystem')).not.toContain('lite-mode');

            // 2. Transition Full -> Lite
            manager.setPreference('lite');
            expect(manager.getProfile()).toBe('lite');
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('lite');
            expect(dom.window.document.documentElement.classList.contains('perf-mode-lite')).toBe(true);
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(true);
            expect(dom.window.document.documentElement.classList.contains('perf-mode-full')).toBe(false);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(false);
            expect(manager.getCapabilities().allowParticles).toBe(false);
            expect(manager.getCapabilities().animationDurationScale).toBe(0.001);
            expect(motionSuspension.isSuspended('particleSystem')).toBe(true);
            expect(motionSuspension.getReasons('particleSystem')).toContain('lite-mode');

            // 3. Transition Lite -> Full (Reversibility)
            manager.setPreference('full');
            expect(manager.getProfile()).toBe('full');
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('full');
            expect(dom.window.document.documentElement.classList.contains('perf-mode-full')).toBe(true);
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(false);
            expect(dom.window.document.documentElement.classList.contains('perf-mode-lite')).toBe(false);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(manager.getCapabilities().allowParticles).toBe(true);
            expect(manager.getCapabilities().particleCount).toBe(60);
            expect(manager.getCapabilities().animationDurationScale).toBe(1.0);

            // Verify MotionSuspension resumed cleanly
            expect(motionSuspension.isSuspended('particleSystem')).toBe(false);
            expect(motionSuspension.getReasons('particleSystem')).not.toContain('lite-mode');

            particles.destroy();
        });
    });

    describe('Mode Transition Cycle 2: Balanced → Lite → Balanced', () => {
        it('transitions from Balanced to Lite and cleanly restores Balanced capabilities', () => {
            const manager = new PerformanceManager();

            // 1. Initial Balanced State
            manager.setPreference('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('balanced');
            expect(dom.window.document.documentElement.classList.contains('perf-mode-balanced')).toBe(true);
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(false);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(manager.getCapabilities().particleCount).toBe(24);
            expect(manager.getCapabilities().allowParallax).toBe(false);

            // 2. Transition Balanced -> Lite
            manager.setPreference('lite');
            expect(manager.getProfile()).toBe('lite');
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('lite');
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(true);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(false);
            expect(motionSuspension.getReasons('scrollEngine')).toContain('lite-mode');

            // 3. Transition Lite -> Balanced (Reversibility)
            manager.setPreference('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('balanced');
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(false);
            expect(dom.window.document.documentElement.classList.contains('perf-mode-balanced')).toBe(true);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(manager.getCapabilities().particleCount).toBe(24);
            expect(manager.getCapabilities().allowContinuousCanvas).toBe(true);
            expect(motionSuspension.getReasons('scrollEngine')).not.toContain('lite-mode');
        });
    });

    describe('Mode Transition Cycle 3: Lite → Balanced → Full', () => {
        it('progressively escalates from Lite to Balanced and then to Full', () => {
            const manager = new PerformanceManager();

            manager.setPreference('lite');
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getCapabilities().particleCount).toBe(0);

            manager.setPreference('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(manager.getCapabilities().particleCount).toBe(24);
            expect(manager.getCapabilities().allowParallax).toBe(false);

            manager.setPreference('full');
            expect(manager.getProfile()).toBe('full');
            expect(manager.getCapabilities().particleCount).toBe(60);
            expect(manager.getCapabilities().allowParallax).toBe(true);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(dom.window.document.documentElement.getAttribute('data-performance-mode')).toBe('full');
        });
    });

    describe('Mode Transition Cycle 4: Full → Balanced → Lite', () => {
        it('progressively steps down from Full to Balanced and then to Lite', () => {
            const manager = new PerformanceManager();

            manager.setPreference('full');
            expect(manager.getProfile()).toBe('full');

            manager.setPreference('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(manager.getCapabilities().allowParallax).toBe(false);
            expect(manager.getCapabilities().particleCount).toBe(24);

            manager.setPreference('lite');
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getCapabilities().particleCount).toBe(0);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(false);
            expect(dom.window.document.documentElement.classList.contains('lite-mode')).toBe(true);
        });
    });

    describe('Persistence & Temporary URL Override (?performance=lite)', () => {
        it('persists preferences across simulated reloads', () => {
            const manager1 = new PerformanceManager();
            manager1.setPreference('balanced');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('balanced');

            PerformanceManager.resetInstance();
            const manager2 = new PerformanceManager();
            expect(manager2.getPreference()).toBe('balanced');
            expect(manager2.getProfile()).toBe('balanced');
        });

        it('supports temporary ?performance=lite override without overwriting saved preference', () => {
            const manager = new PerformanceManager();
            manager.setPreference('full');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('full');

            // Simulate query parameter ?performance=lite
            dom.reconfigure({ url: 'https://sjccc.edu.cm/?performance=lite' });
            manager.recalculate();

            expect(manager.getProfile()).toBe('lite');
            expect(manager.getResolutionSource()).toBe('url-override');
            // Saved preference MUST remain untouched
            expect(manager.getPreference()).toBe('full');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('full');

            // Reverting query parameter restores user preference
            dom.reconfigure({ url: 'https://sjccc.edu.cm/' });
            manager.recalculate();
            expect(manager.getProfile()).toBe('full');
            expect(manager.getResolutionSource()).toBe('user-preference');
        });
    });
});
