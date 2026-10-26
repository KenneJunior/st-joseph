/**
 * ============================================================================
 * SJCCC – Intelligent Adaptive Performance Manager
 * (src/core/performance/PerformanceManager.ts)
 *
 * Centralized, authoritative performance controller coordinating:
 * 1. Automatic hardware and graphics capability assessment.
 * 2. Persistent performance preference ('auto' | 'full' | 'balanced' | 'lite') with safe storage.
 * 3. URL override handling (?performance=lite) with strict non-mutation of preferences.
 * 4. Synchronization of root DOM attributes (data-performance-mode="full|balanced|lite").
 * 5. Reactive pub/sub notification for animation, canvas, and layout subsystems.
 * 6. Runtime performance adaptation with hysteresis to protect against sustained frame drops.
 * ============================================================================
 */

import { STORAGE_KEYS } from '../storage/storageKeys.ts';
import { DeviceCapabilityDetector } from './DeviceCapabilityDetector.ts';
import type {
    CapabilitySnapshot,
    PerformanceCapabilities,
    PerformanceListener,
    PerformancePreference,
    PerformanceProfile,
    ProfileResolutionSource,
} from './performanceTypes.ts';

export class PerformanceManager {
    private static instance: PerformanceManager | null = null;

    private detector: DeviceCapabilityDetector;
    private preference: PerformancePreference = 'auto';
    private profile: PerformanceProfile = 'balanced';
    private capabilities: PerformanceCapabilities;
    private snapshot?: CapabilitySnapshot;
    private resolutionSource: ProfileResolutionSource = 'capability-assessment';
    private listeners = new Set<PerformanceListener>();

    // In-memory fallback if localStorage throws or is blocked
    private memoryStorage: Record<string, string> = {};

    // Runtime frame monitoring state
    private isMonitoring = false;
    private frameMonitorRafId: number | null = null;
    private lastFrameTime = 0;
    private degradedFrameCount = 0;
    private monitorWindowStart = 0;
    private static readonly FRAME_BUDGET_MS = 50; // Threshold for dropped/delayed frames (20fps floor)
    private static readonly DEGRADED_THRESHOLD = 8; // Sustained frame drops required for hysteresis
    private static readonly MONITOR_WINDOW_MS = 3000; // 3-second evaluation window

    constructor(detector?: DeviceCapabilityDetector) {
        this.detector = detector ?? new DeviceCapabilityDetector();
        this.capabilities = this.buildCapabilities('balanced');
        this.init();
    }

    /**
     * Retrieves the singleton PerformanceManager instance.
     */
    public static getInstance(): PerformanceManager {
        if (!PerformanceManager.instance) {
            PerformanceManager.instance = new PerformanceManager();
        }
        return PerformanceManager.instance;
    }

    /**
     * Resets singleton instance (useful in test runner isolation).
     */
    public static resetInstance(): void {
        if (PerformanceManager.instance) {
            PerformanceManager.instance.destroy();
            PerformanceManager.instance = null;
        }
    }

    private init(): void {
        this.preference = this.loadPreference();
        this.resolveAndApplyProfile();
        this.setupVisibilityListener();
        this.setupReducedMotionListener();
    }

    // ========================================================================
    // STORAGE & PERSISTENCE
    // ========================================================================

    private getStorageItem(key: string): string | null {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch {
            // Storage access blocked or restricted
        }
        return this.memoryStorage[key] ?? null;
    }

    private setStorageItem(key: string, value: string): void {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch {
            // Storage write blocked or quota exceeded
        }
        this.memoryStorage[key] = value;
    }

    private loadPreference(): PerformancePreference {
        const stored = this.getStorageItem(STORAGE_KEYS.PERFORMANCE_PREFERENCE);
        if (stored === 'full' || stored === 'balanced' || stored === 'lite' || stored === 'auto') {
            return stored;
        }
        return 'auto';
    }

    // ========================================================================
    // URL OVERRIDE PARSING
    // ========================================================================

    /**
     * Inspects window.location.search for a performance override parameter.
     * Precedence: ?performance=lite (or full/auto).
     * Strictly does NOT mutate persistent preferences.
     */
    public getUrlOverride(): PerformanceProfile | null {
        if (typeof window === 'undefined' || !window.location || !window.location.search) {
            return null;
        }

        try {
            const params = new URLSearchParams(window.location.search);
            const param = params.get('performance')?.toLowerCase().trim();

            if (param === 'lite') return 'lite';
            if (param === 'full') return 'full';
            if (param === 'balanced') return 'balanced';
        } catch {
            // Malformed search parameters
        }

        return null;
    }

    // ========================================================================
    // PROFILE RESOLUTION & CAPABILITIES
    // ========================================================================

    /**
     * Resolves the active performance profile following strict precedence:
     * 1. URL override (?performance=lite)
     * 2. Explicit saved user preference ('full' | 'balanced' | 'lite')
     * 3. Automatic capability assessment
     */
    public resolveAndApplyProfile(): void {
        const urlOverride = this.getUrlOverride();
        let targetProfile: PerformanceProfile;

        if (urlOverride) {
            targetProfile = urlOverride;
            this.resolutionSource = 'url-override';
        } else if (this.preference === 'full' || this.preference === 'balanced' || this.preference === 'lite') {
            targetProfile = this.preference;
            this.resolutionSource = 'user-preference';

            // Persist the resolved profile hint for early-startup zero-flicker restoration
            this.setStorageItem(STORAGE_KEYS.PERFORMANCE_PROFILE, targetProfile);
        } else {
            // Automatic mode: perform fresh capability assessment
            const evalResult = this.detector.evaluate();
            this.snapshot = evalResult.snapshot;
            targetProfile = evalResult.profile;
            this.resolutionSource = 'capability-assessment';

            // Persist the resolved profile hint for early-startup zero-flicker restoration
            this.setStorageItem(STORAGE_KEYS.PERFORMANCE_PROFILE, targetProfile);
        }

        this.applyProfile(targetProfile);
    }

    /**
     * Builds concrete capabilities from a profile while respecting accessibility invariants.
     */
    public buildCapabilities(profile: PerformanceProfile): PerformanceCapabilities {
        const reducedMotion = this.snapshot?.prefersReducedMotion ??
            Boolean(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
        const reducedTransparency = this.snapshot?.prefersReducedTransparency ??
            Boolean(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-transparency: reduce)')?.matches);

        let caps: PerformanceCapabilities;

        switch (profile) {
            case 'full':
                caps = {
                    profile: 'full',
                    allowBackdropBlur: true,
                    allowComplexTransitions: true,
                    allowParallax: true,
                    allowContinuousCanvas: true,
                    allowParticles: true,
                    particleCount: 60,
                    dustDensity: 0.65,
                    animationDurationScale: 1.0,
                    enableLiquidGlass: true,
                    enableTilt: true,
                    scrollThrottleMs: 0,
                };
                break;

            case 'balanced':
                caps = {
                    profile: 'balanced',
                    allowBackdropBlur: true,
                    allowComplexTransitions: true,
                    allowParallax: false,
                    allowContinuousCanvas: true,
                    allowParticles: true,
                    particleCount: 24,
                    dustDensity: 0.35,
                    animationDurationScale: 1.0,
                    enableLiquidGlass: true,
                    enableTilt: false,
                    scrollThrottleMs: 16,
                };
                break;

            case 'lite':
            default:
                caps = {
                    profile: 'lite',
                    allowBackdropBlur: false,
                    allowComplexTransitions: false,
                    allowParallax: false,
                    allowContinuousCanvas: false,
                    allowParticles: false,
                    particleCount: 0,
                    dustDensity: 0,
                    animationDurationScale: 0.6,
                    enableLiquidGlass: false,
                    enableTilt: false,
                    scrollThrottleMs: 32,
                };
                break;
        }

        // Accessibility Invariant 1: prefers-reduced-motion overrides decorative movement
        if (reducedMotion) {
            caps.allowParallax = false;
            caps.allowParticles = false;
            caps.particleCount = 0;
            caps.allowContinuousCanvas = false;
            caps.dustDensity = 0;
            caps.enableTilt = false;
            caps.animationDurationScale = 0.001; // Instantaneous transitions
        }

        // Accessibility Invariant 2: prefers-reduced-transparency forces solid surfaces
        if (reducedTransparency) {
            caps.allowBackdropBlur = false;
            caps.enableLiquidGlass = false;
        }

        return caps;
    }

    /**
     * Applies a new profile, updates DOM attributes, synchronizes capabilities, and notifies listeners.
     */
    public applyProfile(newProfile: PerformanceProfile): void {
        const previousCaps = this.capabilities;
        this.profile = newProfile;
        this.capabilities = this.buildCapabilities(newProfile);

        // Synchronize root DOM representation
        this.syncDomAttributes();

        // Manage runtime degradation monitoring: only monitor in full or balanced mode
        if (newProfile !== 'lite') {
            this.startRuntimeMonitoring();
        } else {
            this.stopRuntimeMonitoring();
        }

        // Notify active subscribers
        this.notifyListeners(previousCaps);
    }

    /**
     * Updates document.documentElement with standard attributes and helper classes.
     */
    private syncDomAttributes(): void {
        if (typeof document === 'undefined' || !document.documentElement) return;

        const docEl = document.documentElement;
        docEl.setAttribute('data-performance-mode', this.profile);

        docEl.classList.remove('perf-mode-full', 'perf-mode-balanced', 'perf-mode-lite');
        docEl.classList.add(`perf-mode-${this.profile}`);

        if (this.profile === 'lite') {
            docEl.classList.add('lite-mode');
        } else {
            docEl.classList.remove('lite-mode');
        }
    }

    // ========================================================================
    // PUBLIC ACCESSORS & MUTATORS
    // ========================================================================

    public getPreference(): PerformancePreference {
        return this.preference;
    }

    public setPreference(pref: PerformancePreference): void {
        this.preference = pref;
        this.setStorageItem(STORAGE_KEYS.PERFORMANCE_PREFERENCE, pref);
        this.resolveAndApplyProfile();
    }

    public getProfile(): PerformanceProfile {
        return this.profile;
    }

    public getCapabilities(): Readonly<PerformanceCapabilities> {
        return this.capabilities;
    }

    public getSnapshot(): CapabilitySnapshot | undefined {
        return this.snapshot;
    }

    public getResolutionSource(): ProfileResolutionSource {
        return this.resolutionSource;
    }

    /**
     * Forces recalculation of device capabilities and reapplication of effective profile.
     */
    public recalculate(): void {
        this.resolveAndApplyProfile();
    }

    // ========================================================================
    // PUB / SUB REACTIVE NOTIFICATION
    // ========================================================================

    /**
     * Subscribes to performance capability changes. Immediately invokes callback with current state.
     */
    public subscribe(listener: PerformanceListener): () => void {
        this.listeners.add(listener);
        try {
            listener(this.capabilities);
        } catch (err) {
            console.error('[PerformanceManager] Error in subscriber during initial callback:', err);
        }

        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(previousCaps?: PerformanceCapabilities): void {
        for (const listener of this.listeners) {
            try {
                listener(this.capabilities, previousCaps);
            } catch (err) {
                console.error('[PerformanceManager] Error notifying subscriber:', err);
            }
        }
    }

    // ========================================================================
    // RUNTIME DEGRADATION SAFEGUARD WITH HYSTERESIS
    // ========================================================================

    private startRuntimeMonitoring(): void {
        if (this.isMonitoring || typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
            return;
        }

        // Do not monitor if user has forced an explicit preference or URL override is active
        if (this.resolutionSource === 'url-override' || this.preference !== 'auto') {
            return;
        }

        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        this.monitorWindowStart = this.lastFrameTime;
        this.degradedFrameCount = 0;

        const monitorLoop = (timestamp: number) => {
            if (!this.isMonitoring) return;

            const delta = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;

            // Only evaluate frame times if document is visible (avoid throttling in background tabs)
            if (typeof document !== 'undefined' && !document.hidden) {
                if (delta > PerformanceManager.FRAME_BUDGET_MS) {
                    this.degradedFrameCount++;
                }

                // Check window expiration
                if (timestamp - this.monitorWindowStart >= PerformanceManager.MONITOR_WINDOW_MS) {
                    if (this.degradedFrameCount >= PerformanceManager.DEGRADED_THRESHOLD) {
                        // Sustained degradation detected: gradually step down profile
                        this.handleRuntimeDegradation();
                        return; // Stop current monitoring cycle
                    }
                    // Reset sliding window
                    this.monitorWindowStart = timestamp;
                    this.degradedFrameCount = 0;
                }
            } else {
                // Reset frame time on tab resume
                this.monitorWindowStart = timestamp;
                this.degradedFrameCount = 0;
            }

            this.frameMonitorRafId = requestAnimationFrame(monitorLoop);
        };

        this.frameMonitorRafId = requestAnimationFrame(monitorLoop);
    }

    private stopRuntimeMonitoring(): void {
        this.isMonitoring = false;
        if (this.frameMonitorRafId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.frameMonitorRafId);
            this.frameMonitorRafId = null;
        }
    }

    private handleRuntimeDegradation(): void {
        this.stopRuntimeMonitoring();

        let downgradedProfile: PerformanceProfile;
        if (this.profile === 'full') {
            downgradedProfile = 'balanced';
        } else if (this.profile === 'balanced') {
            downgradedProfile = 'lite';
        } else {
            return;
        }

        this.resolutionSource = 'runtime-degradation';
        if (this.snapshot) {
            this.snapshot.reasons.push(
                `Runtime degradation detected: ${this.degradedFrameCount} frames exceeded ${PerformanceManager.FRAME_BUDGET_MS}ms within ${PerformanceManager.MONITOR_WINDOW_MS}ms window`
            );
        }

        this.applyProfile(downgradedProfile);
    }

    // ========================================================================
    // ACCESSIBILITY & VISIBILITY HOOKS
    // ========================================================================

    private setupVisibilityListener(): void {
        if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopRuntimeMonitoring();
            } else if (this.profile !== 'lite') {
                this.startRuntimeMonitoring();
            }
        });
    }

    private setupReducedMotionListener(): void {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

        try {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            const onChange = (event: MediaQueryListEvent) => {
                if (this.snapshot) {
                    this.snapshot.prefersReducedMotion = event.matches;
                }
                // Rebuild capabilities with updated accessibility constraint
                this.applyProfile(this.profile);
            };

            if (typeof mq.addEventListener === 'function') {
                mq.addEventListener('change', onChange);
            } else if (typeof mq.addListener === 'function') {
                mq.addListener(onChange);
            }
        } catch {
            // Ignore matchMedia listener failure
        }
    }

    /**
     * Teardown listeners and monitoring for clean disposal.
     */
    public destroy(): void {
        this.stopRuntimeMonitoring();
        this.listeners.clear();
    }
}

/** Authoritative singleton export for application consumers */
export const performanceManager = PerformanceManager.getInstance();
