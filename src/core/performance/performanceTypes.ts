/**
 * ============================================================================
 * SJCCC – Intelligent Adaptive Performance System Types
 * (src/core/performance/performanceTypes.ts)
 *
 * Core domain contracts for device capability detection, persistent preference
 * management, runtime profiles, and centralized feature toggles.
 * ============================================================================
 */

/** User or environment preference for performance mode */
export type PerformancePreference = 'auto' | 'full' | 'balanced' | 'lite';

/** Effective runtime performance profile resolved by the system */
export type PerformanceProfile = 'full' | 'balanced' | 'lite';

/** Source of the active performance profile decision */
export type ProfileResolutionSource = 'url-override' | 'user-preference' | 'capability-assessment';

/** Normalized hardware, graphics, and environment capability snapshot */
export interface CapabilitySnapshot {
    /** Logical CPU cores reported by the browser (privacy coarsened) */
    hardwareConcurrency?: number;
    /** Approximate physical device RAM in gigabytes (privacy coarsened) */
    deviceMemory?: number;
    /** Whether standard WebGL 1.0 context is supported and operational */
    hasWebGL: boolean;
    /** Whether WebGL 2.0 context is supported and operational */
    hasWebGL2: boolean;
    /** Maximum 2D/cube texture dimension supported by the graphics processor */
    maxTextureSize?: number;
    /** Unmasked GPU renderer string if available (via WEBGL_debug_renderer_info) */
    gpuRenderer?: string;
    /** Whether user or browser has requested data-saver mode */
    saveData?: boolean;
    /** Effective network connection tier ('slow-2g' | '2g' | '3g' | '4g') */
    effectiveConnectionType?: string;
    /** Whether the user prefers reduced motion (WCAG AA requirement) */
    prefersReducedMotion: boolean;
    /** Whether the user prefers reduced transparency */
    prefersReducedTransparency: boolean;
    /** Confidence level in the accuracy and completeness of available signals */
    confidence: 'high' | 'medium' | 'low';
    /** Explanatory reasons that contributed to the profile assessment */
    reasons: string[];
}

/** Centralized feature flags and budget limits consumed across the app */
export interface PerformanceCapabilities {
    /** Resolved effective profile */
    profile: PerformanceProfile;
    /** Whether backdrop-filter blur and frosted glass surfaces are allowed */
    allowBackdropBlur: boolean;
    /** Whether complex multi-element or clip-path transitions are enabled */
    allowComplexTransitions: boolean;
    /** Whether scroll-driven parallax translations are permitted */
    allowParallax: boolean;
    /** Whether continuous decorative canvas RAF loops are active */
    allowContinuousCanvas: boolean;
    /** Whether decorative DOM floating particles are spawned */
    allowParticles: boolean;
    /** Maximum hero DOM particle count permitted (0 disables particles) */
    particleCount: number;
    /** Ambient dust canvas particle density factor (0 disables dust) */
    dustDensity: number;
    /** Scale factor for CSS animation and transition durations (1.0 = normal) */
    animationDurationScale: number;
    /** Whether external LiquidGlass optical refraction is initialized */
    enableLiquidGlass: boolean;
    /** Whether interactive 3D pointer hover tilt is allowed on surfaces */
    enableTilt: boolean;
    /** Target scroll event throttle interval in milliseconds (0 = pure rAF) */
    scrollThrottleMs: number;
}

/** Listener callback invoked when performance capabilities transition */
export type PerformanceListener = (
    capabilities: PerformanceCapabilities,
    previousCapabilities?: PerformanceCapabilities
) => void;

/** Complete evaluation result returned by the capability detector */
export interface PerformanceEvaluationResult {
    profile: PerformanceProfile;
    snapshot: CapabilitySnapshot;
    timestamp: number;
}
