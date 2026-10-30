import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    DeviceCapabilityDetector,
    DetectorEnvironment,
} from '../../src/core/performance/DeviceCapabilityDetector.ts';
import {
    PerformanceManager,
} from '../../src/core/performance/PerformanceManager.ts';
import { STORAGE_KEYS } from '../../src/core/storage/storageKeys.ts';
import type { PerformanceCapabilities } from '../../src/core/performance/performanceTypes.ts';

class MockClassList {
    private classes = new Set<string>();
    add(...cls: string[]): void {
        for (const c of cls) this.classes.add(c);
    }
    remove(...cls: string[]): void {
        for (const c of cls) this.classes.delete(c);
    }
    contains(c: string): boolean {
        return this.classes.has(c);
    }
    toggle(c: string, force?: boolean): boolean {
        if (force === true) {
            this.classes.add(c);
            return true;
        }
        if (force === false) {
            this.classes.delete(c);
            return false;
        }
        if (this.classes.has(c)) {
            this.classes.delete(c);
            return false;
        }
        this.classes.add(c);
        return true;
    }
}

class MockElement {
    public attributes = new Map<string, string>();
    public classList = new MockClassList();
    setAttribute(k: string, v: string): void {
        this.attributes.set(k, v);
    }
    getAttribute(k: string): string | null {
        return this.attributes.get(k) ?? null;
    }
    removeAttribute(k: string): void {
        this.attributes.delete(k);
    }
}

describe('SJCCC Intelligent Adaptive Performance System', () => {
    describe('DeviceCapabilityDetector — Capability Assessment', () => {
        it('classifies powerful hardware as Full profile with high confidence', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 8,
                    deviceMemory: 8,
                },
                createCanvas: () => {
                    const canvas = {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockImplementation((param) => {
                                return 16384;
                            }),
                            getExtension: vi.fn().mockReturnValue({
                                loseContext: vi.fn(),
                            }),
                        }),
                    } as unknown as HTMLCanvasElement;
                    return canvas;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('full');
            expect(result.snapshot.hardwareConcurrency).toBe(8);
            expect(result.snapshot.deviceMemory).toBe(8);
            expect(result.snapshot.hasWebGL).toBe(true);
            expect(result.snapshot.confidence).toBe('high');
            expect(result.snapshot.reasons.length).toBeGreaterThan(0);
        });

        it('classifies 6-core machine with WebGL as Full profile', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 6,
                    deviceMemory: 4,
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(8192),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('full');
            expect(result.snapshot.reasons[0]).toContain('6 cores');
        });

        it('classifies constrained CPU (<= 2 cores) as Lite profile', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 2,
                    deviceMemory: 4,
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(4096),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('lite');
            expect(result.snapshot.reasons[0]).toContain('Severely constrained CPU');
        });

        it('classifies constrained RAM (<= 1 GB) as Lite profile', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 4,
                    deviceMemory: 1,
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(8192),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('lite');
            expect(result.snapshot.reasons[0]).toContain('Severely constrained RAM');
        });

        it('classifies combined low RAM (2GB) and low CPU (4 cores) as Lite profile', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 4,
                    deviceMemory: 2,
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(8192),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('lite');
            expect(result.snapshot.reasons[0]).toContain('Low memory (2GB) combined with low core count');
        });

        it('classifies saveData: true as Lite profile immediately', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 16,
                    deviceMemory: 16,
                    connection: {
                        saveData: true,
                        effectiveType: '4g',
                    },
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(16384),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('lite');
            expect(result.snapshot.saveData).toBe(true);
            expect(result.snapshot.reasons[0]).toContain('Data-saver mode active');
        });

        it('handles missing RAM (e.g. Safari / Firefox) gracefully without crashing and selects Balanced for standard 4-core hardware', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 4,
                    deviceMemory: undefined, // Safari/Firefox do not expose deviceMemory
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(4096),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('balanced');
            expect(result.snapshot.deviceMemory).toBeUndefined();
            expect(result.snapshot.hardwareConcurrency).toBe(4);
            expect(result.snapshot.hasWebGL).toBe(true);
        });

        it('handles failed or unsupported WebGL gracefully without throwing errors', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 4,
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockImplementation(() => {
                            throw new Error('WebGL disabled');
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.snapshot.hasWebGL).toBe(false);
            expect(result.snapshot.hasWebGL2).toBe(false);
            expect(result.profile).toBe('lite');
            expect(result.snapshot.reasons[0]).toContain('WebGL unavailable');
        });

        it('classifies constrained GPU MAX_TEXTURE_SIZE (< 4096) as Lite profile', () => {
            const env: DetectorEnvironment = {
                navigator: {
                    hardwareConcurrency: 4,
                    deviceMemory: 4,
                },
                createCanvas: () => {
                    return {
                        getContext: vi.fn().mockReturnValue({
                            getParameter: vi.fn().mockReturnValue(2048),
                            getExtension: vi.fn().mockReturnValue({ loseContext: vi.fn() }),
                        }),
                    } as unknown as HTMLCanvasElement;
                },
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.profile).toBe('lite');
            expect(result.snapshot.reasons[0]).toContain('Constrained GPU texture limit');
        });

        it('detects user reduced motion preference accurately', () => {
            const env: DetectorEnvironment = {
                navigator: { hardwareConcurrency: 8 },
                matchMedia: (query: string) => ({
                    matches: query.includes('prefers-reduced-motion'),
                }),
                createCanvas: () => null,
            };

            const detector = new DeviceCapabilityDetector(env);
            const result = detector.evaluate();

            expect(result.snapshot.prefersReducedMotion).toBe(true);
        });
    });

    describe('PerformanceManager — URL Override, Persistence & Resolution', () => {
        let storageMock: Record<string, string>;
        let mockDocEl: MockElement;

        beforeEach(() => {
            storageMock = {};
            mockDocEl = new MockElement();

            const mockWin = {
                location: {
                    search: '',
                    pathname: '/',
                    hostname: 'localhost',
                },
                localStorage: {
                    getItem: vi.fn((key: string) => storageMock[key] ?? null),
                    setItem: vi.fn((key: string, val: string) => {
                        storageMock[key] = val;
                    }),
                    removeItem: vi.fn((key: string) => {
                        delete storageMock[key];
                    }),
                    clear: vi.fn(() => {
                        storageMock = {};
                    }),
                },
                matchMedia: vi.fn().mockImplementation((query: string) => ({
                    matches: false,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                })),
                requestAnimationFrame: vi.fn(),
                cancelAnimationFrame: vi.fn(),
            };

            const mockDoc = {
                documentElement: mockDocEl,
                hidden: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            };

            vi.stubGlobal('window', mockWin);
            vi.stubGlobal('document', mockDoc);
            vi.stubGlobal('localStorage', mockWin.localStorage);

            PerformanceManager.resetInstance();
        });

        afterEach(() => {
            PerformanceManager.resetInstance();
            vi.restoreAllMocks();
        });

        it('activates Lite Mode immediately when ?performance=lite URL parameter is present', () => {
            window.location.search = '?performance=lite';

            const manager = new PerformanceManager();
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getResolutionSource()).toBe('url-override');
            expect(manager.getCapabilities().allowBackdropBlur).toBe(false);
            expect(manager.getCapabilities().allowParticles).toBe(false);
            expect(manager.getCapabilities().enableLiquidGlass).toBe(false);
        });

        it('guarantees URL override ?performance=lite does NOT mutate persistent preference', () => {
            storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE] = 'full';
            window.location.search = '?performance=lite';

            const manager = new PerformanceManager();

            // Active profile is Lite due to URL override
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getResolutionSource()).toBe('url-override');

            // Saved preference MUST remain 'full' in storage
            expect(manager.getPreference()).toBe('full');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('full');
        });

        it('safely ignores invalid URL parameters and falls back to normal resolution', () => {
            window.location.search = '?performance=invalid_mode_tier&otherParam=123';

            const manager = new PerformanceManager();
            expect(manager.getUrlOverride()).toBeNull();
            expect(manager.getResolutionSource()).not.toBe('url-override');
        });

        it('gives precedence to explicit saved preference when no URL override is present', () => {
            storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE] = 'lite';
            window.location.search = '';

            const manager = new PerformanceManager();
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getResolutionSource()).toBe('user-preference');
        });

        it('gives precedence to explicit saved balanced preference when no URL override is present', () => {
            storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE] = 'balanced';
            window.location.search = '';

            const manager = new PerformanceManager();
            expect(manager.getPreference()).toBe('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(manager.getResolutionSource()).toBe('user-preference');
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(manager.getCapabilities().particleCount).toBe(24);
        });

        it('preserves saved balanced preference when URL override ?performance=lite is active', () => {
            storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE] = 'balanced';
            window.location.search = '?performance=lite';

            const manager = new PerformanceManager();
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getResolutionSource()).toBe('url-override');
            expect(manager.getPreference()).toBe('balanced');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('balanced');
        });

        it('gives precedence to URL override over explicit saved preference', () => {
            storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE] = 'lite';
            window.location.search = '?performance=full';

            const manager = new PerformanceManager();
            expect(manager.getProfile()).toBe('full');
            expect(manager.getResolutionSource()).toBe('url-override');
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
        });

        it('defaults to auto preference and persists resolved profile hint', () => {
            window.location.search = '';
            delete storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE];

            const manager = new PerformanceManager();
            expect(manager.getPreference()).toBe('auto');
            expect(manager.getResolutionSource()).toBe('capability-assessment');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PROFILE]).toBeDefined();
        });

        it('recovers safely with in-memory fallback when localStorage is blocked or throws', () => {
            const failingStorage = {
                getItem: vi.fn(() => {
                    throw new Error('SecurityError: Cookies disabled');
                }),
                setItem: vi.fn(() => {
                    throw new Error('QuotaExceededError');
                }),
            };
            (window as unknown as { localStorage: unknown }).localStorage = failingStorage;

            const manager = new PerformanceManager();
            expect(manager.getPreference()).toBe('auto');

            // Setting preference should not throw and should use in-memory state
            expect(() => manager.setPreference('lite')).not.toThrow();
            expect(manager.getPreference()).toBe('lite');
            expect(manager.getProfile()).toBe('lite');
        });

        it('recovers from obsolete or corrupted stored preference values safely', () => {
            storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE] = 'corrupted_value_123';

            const manager = new PerformanceManager();
            expect(manager.getPreference()).toBe('auto');
        });
    });

    describe('PerformanceManager — Capabilities Mapping & Invariants', () => {
        let storageMock: Record<string, string>;
        let mockDocEl: MockElement;
        let prefersReducedMotionValue = false;

        beforeEach(() => {
            storageMock = {};
            mockDocEl = new MockElement();
            prefersReducedMotionValue = false;

            const mockWin = {
                location: { search: '' },
                localStorage: {
                    getItem: vi.fn((key: string) => storageMock[key] ?? null),
                    setItem: vi.fn((key: string, val: string) => {
                        storageMock[key] = String(val);
                    }),
                },
                matchMedia: vi.fn().mockImplementation((query: string) => ({
                    matches: query.includes('prefers-reduced-motion') ? prefersReducedMotionValue : false,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                })),
                requestAnimationFrame: vi.fn(),
                cancelAnimationFrame: vi.fn(),
            };

            const mockDoc = {
                documentElement: mockDocEl,
                hidden: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            };

            vi.stubGlobal('window', mockWin);
            vi.stubGlobal('document', mockDoc);
            vi.stubGlobal('localStorage', mockWin.localStorage);

            PerformanceManager.resetInstance();
        });

        afterEach(() => {
            PerformanceManager.resetInstance();
            vi.restoreAllMocks();
        });

        it('configures Full profile capabilities accurately', () => {
            const manager = new PerformanceManager();
            const caps = manager.buildCapabilities('full');

            expect(caps.profile).toBe('full');
            expect(caps.allowBackdropBlur).toBe(true);
            expect(caps.allowComplexTransitions).toBe(true);
            expect(caps.allowParallax).toBe(true);
            expect(caps.allowContinuousCanvas).toBe(true);
            expect(caps.allowParticles).toBe(true);
            expect(caps.particleCount).toBe(60);
            expect(caps.dustDensity).toBe(0.65);
            expect(caps.enableLiquidGlass).toBe(true);
            expect(caps.enableTilt).toBe(true);
            expect(caps.scrollThrottleMs).toBe(0);
        });

        it('configures Balanced profile capabilities accurately', () => {
            const manager = new PerformanceManager();
            const caps = manager.buildCapabilities('balanced');

            expect(caps.profile).toBe('balanced');
            expect(caps.allowBackdropBlur).toBe(true);
            expect(caps.allowComplexTransitions).toBe(true);
            expect(caps.allowParallax).toBe(false);
            expect(caps.allowContinuousCanvas).toBe(true);
            expect(caps.allowParticles).toBe(true);
            expect(caps.particleCount).toBe(24);
            expect(caps.dustDensity).toBe(0.35);
            expect(caps.enableLiquidGlass).toBe(true);
            expect(caps.enableTilt).toBe(false);
            expect(caps.scrollThrottleMs).toBe(16);
        });

        it('configures Lite profile capabilities accurately', () => {
            const manager = new PerformanceManager();
            const caps = manager.buildCapabilities('lite');

            expect(caps.profile).toBe('lite');
            expect(caps.allowBackdropBlur).toBe(false);
            expect(caps.allowComplexTransitions).toBe(false);
            expect(caps.allowParallax).toBe(false);
            expect(caps.allowContinuousCanvas).toBe(false);
            expect(caps.allowParticles).toBe(false);
            expect(caps.particleCount).toBe(0);
            expect(caps.dustDensity).toBe(0);
            expect(caps.enableLiquidGlass).toBe(false);
            expect(caps.enableTilt).toBe(false);
            expect(caps.scrollThrottleMs).toBe(32);
        });

        it('enforces prefers-reduced-motion accessibility invariant independently of profile', () => {
            prefersReducedMotionValue = true;

            const manager = new PerformanceManager();
            const caps = manager.buildCapabilities('full');

            // Even under 'full' profile, reduced-motion disables decorative motion
            expect(caps.allowParallax).toBe(false);
            expect(caps.allowParticles).toBe(false);
            expect(caps.particleCount).toBe(0);
            expect(caps.allowContinuousCanvas).toBe(false);
            expect(caps.dustDensity).toBe(0);
            expect(caps.enableTilt).toBe(false);
        });
    });

    describe('PerformanceManager — Reactive Subscriptions & DOM Sync', () => {
        let storageMock: Record<string, string>;
        let mockDocEl: MockElement;

        beforeEach(() => {
            storageMock = {};
            mockDocEl = new MockElement();

            const mockWin = {
                location: { search: '' },
                localStorage: {
                    getItem: vi.fn((key: string) => storageMock[key] ?? null),
                    setItem: vi.fn((key: string, val: string) => {
                        storageMock[key] = String(val);
                    }),
                },
                matchMedia: vi.fn().mockImplementation(() => ({
                    matches: false,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                })),
                requestAnimationFrame: vi.fn(),
                cancelAnimationFrame: vi.fn(),
            };

            const mockDoc = {
                documentElement: mockDocEl,
                hidden: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            };

            vi.stubGlobal('window', mockWin);
            vi.stubGlobal('document', mockDoc);
            vi.stubGlobal('localStorage', mockWin.localStorage);

            PerformanceManager.resetInstance();
        });

        afterEach(() => {
            PerformanceManager.resetInstance();
            vi.restoreAllMocks();
        });

        it('synchronizes data-performance-mode attribute and helper classes on documentElement', () => {
            const manager = new PerformanceManager();
            manager.applyProfile('lite');

            expect(mockDocEl.getAttribute('data-performance-mode')).toBe('lite');
            expect(mockDocEl.classList.contains('perf-mode-lite')).toBe(true);
            expect(mockDocEl.classList.contains('lite-mode')).toBe(true);

            manager.applyProfile('full');

            expect(mockDocEl.getAttribute('data-performance-mode')).toBe('full');
            expect(mockDocEl.classList.contains('perf-mode-full')).toBe(true);
            expect(mockDocEl.classList.contains('lite-mode')).toBe(false);
        });

        it('notifies subscribers immediately upon subscription and when profile changes', () => {
            const manager = new PerformanceManager();
            const notified: PerformanceCapabilities[] = [];

            const unsubscribe = manager.subscribe((caps) => {
                notified.push(caps);
            });

            // Immediate initial callback
            expect(notified.length).toBe(1);

            // Change preference to lite
            manager.setPreference('lite');
            expect(notified.length).toBe(2);
            expect(notified[1].profile).toBe('lite');

            // Unsubscribe cleanly
            unsubscribe();
            manager.setPreference('full');
            expect(notified.length).toBe(2); // No further notifications after unsubscribe
        });

        it('handles bidirectional transitions seamlessly between Full, Balanced, and Lite modes', () => {
            const manager = new PerformanceManager();

            // 1. Full -> Balanced
            manager.setPreference('full');
            expect(manager.getPreference()).toBe('full');
            expect(manager.getProfile()).toBe('full');
            expect(mockDocEl.getAttribute('data-performance-mode')).toBe('full');
            expect(mockDocEl.classList.contains('perf-mode-full')).toBe(true);
            expect(mockDocEl.classList.contains('perf-mode-balanced')).toBe(false);
            expect(mockDocEl.classList.contains('lite-mode')).toBe(false);

            manager.setPreference('balanced');
            expect(manager.getPreference()).toBe('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(manager.getResolutionSource()).toBe('user-preference');
            expect(mockDocEl.getAttribute('data-performance-mode')).toBe('balanced');
            expect(mockDocEl.classList.contains('perf-mode-balanced')).toBe(true);
            expect(mockDocEl.classList.contains('perf-mode-full')).toBe(false);
            expect(mockDocEl.classList.contains('lite-mode')).toBe(false);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(manager.getCapabilities().particleCount).toBe(24);
            expect(manager.getCapabilities().allowParallax).toBe(false);

            // 2. Balanced -> Lite
            manager.setPreference('lite');
            expect(manager.getPreference()).toBe('lite');
            expect(manager.getProfile()).toBe('lite');
            expect(manager.getResolutionSource()).toBe('user-preference');
            expect(mockDocEl.getAttribute('data-performance-mode')).toBe('lite');
            expect(mockDocEl.classList.contains('perf-mode-lite')).toBe(true);
            expect(mockDocEl.classList.contains('perf-mode-balanced')).toBe(false);
            expect(mockDocEl.classList.contains('lite-mode')).toBe(true);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(false);
            expect(manager.getCapabilities().particleCount).toBe(0);

            // 3. Lite -> Balanced
            manager.setPreference('balanced');
            expect(manager.getPreference()).toBe('balanced');
            expect(manager.getProfile()).toBe('balanced');
            expect(manager.getResolutionSource()).toBe('user-preference');
            expect(mockDocEl.getAttribute('data-performance-mode')).toBe('balanced');
            expect(mockDocEl.classList.contains('perf-mode-balanced')).toBe(true);
            expect(mockDocEl.classList.contains('perf-mode-lite')).toBe(false);
            expect(mockDocEl.classList.contains('lite-mode')).toBe(false);
            expect(manager.getCapabilities().allowBackdropBlur).toBe(true);
            expect(manager.getCapabilities().particleCount).toBe(24);

            // 4. Reload while Balanced is saved
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('balanced');
            PerformanceManager.resetInstance();
            const reloadedManager = new PerformanceManager();
            expect(reloadedManager.getPreference()).toBe('balanced');
            expect(reloadedManager.getProfile()).toBe('balanced');
            expect(reloadedManager.getResolutionSource()).toBe('user-preference');
            expect(reloadedManager.getCapabilities().allowBackdropBlur).toBe(true);

            // 5. Automatic mode resolves appropriate profile
            reloadedManager.setPreference('auto');
            expect(reloadedManager.getPreference()).toBe('auto');
            expect(reloadedManager.getResolutionSource()).toBe('capability-assessment');

            // 6. ?performance=lite overrides effective profile while preserving saved preference
            reloadedManager.setPreference('balanced');
            expect(reloadedManager.getPreference()).toBe('balanced');
            window.location.search = '?performance=lite';
            reloadedManager.recalculate();
            expect(reloadedManager.getProfile()).toBe('lite');
            expect(reloadedManager.getResolutionSource()).toBe('url-override');
            expect(reloadedManager.getPreference()).toBe('balanced');
            expect(storageMock[STORAGE_KEYS.PERFORMANCE_PREFERENCE]).toBe('balanced');
        });

        it('ensures chosen mode persists through the session without mid-session frame-rate degradation loops', () => {
            const rafSpy = window.requestAnimationFrame;
            const manager = new PerformanceManager();
            manager.setPreference('full');
            expect(manager.getProfile()).toBe('full');

            // Window rAF should NOT have been invoked to start a frame degradation monitor loop
            expect(rafSpy).not.toHaveBeenCalled();

            // The profile strictly remains 'full' throughout the session without mid-session flapping
            expect(manager.getProfile()).toBe('full');
            expect(manager.getResolutionSource()).toBe('user-preference');
        });
    });
});

