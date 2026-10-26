/**
 * ============================================================================
 * SJCCC – Device Capability Detector
 * (src/core/performance/DeviceCapabilityDetector.ts)
 *
 * Evaluates browser-accessible hardware and environmental capabilities:
 * - CPU logical core capacity (navigator.hardwareConcurrency)
 * - Approximate device RAM (navigator.deviceMemory)
 * - Graphics / GPU capability & WebGL limits (MAX_TEXTURE_SIZE, WebGL2)
 * - Network data-saver & connection tier (navigator.connection)
 * - Accessibility media queries (prefers-reduced-motion, prefers-reduced-transparency)
 *
 * Implements a transparent, deterministic classification model that rejects
 * device-category throttling (phones can be powerful; desktops can be weak).
 * ============================================================================
 */

import type {
    CapabilitySnapshot,
    PerformanceEvaluationResult,
    PerformanceProfile,
} from './performanceTypes.ts';

export interface DetectorNavigator {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: {
        saveData?: boolean;
        effectiveType?: string;
    };
}

export interface DetectorEnvironment {
    navigator?: DetectorNavigator;
    matchMedia?: (query: string) => { matches: boolean };
    createCanvas?: () => HTMLCanvasElement | null;
}

export class DeviceCapabilityDetector {
    private env: DetectorEnvironment;

    constructor(env?: DetectorEnvironment) {
        this.env = env ?? {};
    }

    /**
     * Inspects browser capabilities and returns a normalized evaluation snapshot.
     */
    public evaluate(): PerformanceEvaluationResult {
        const snapshot = this.collectSnapshot();
        const profile = this.classify(snapshot);

        return {
            profile,
            snapshot,
            timestamp: Date.now(),
        };
    }

    /**
     * Collects all browser-accessible hardware, graphics, and network signals.
     */
    public collectSnapshot(): CapabilitySnapshot {
        const nav: DetectorNavigator | undefined = this.env.navigator ??
            (typeof navigator !== 'undefined' ? (navigator as unknown as DetectorNavigator) : undefined);
        const mm = this.env.matchMedia ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined);

        // 1. CPU capability
        let hardwareConcurrency: number | undefined;
        if (typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0) {
            hardwareConcurrency = nav.hardwareConcurrency;
        }

        // 2. RAM capacity (Chromium/secure context only)
        let deviceMemory: number | undefined;
        if (typeof nav?.deviceMemory === 'number' && nav.deviceMemory > 0) {
            deviceMemory = nav.deviceMemory;
        }

        // 3. Network Information API
        let saveData: boolean | undefined;
        let effectiveConnectionType: string | undefined;
        if (nav?.connection) {
            if (typeof nav.connection.saveData === 'boolean') {
                saveData = nav.connection.saveData;
            }
            if (typeof nav.connection.effectiveType === 'string') {
                effectiveConnectionType = nav.connection.effectiveType;
            }
        }

        // 4. User accessibility preferences
        const prefersReducedMotion = mm ? mm('(prefers-reduced-motion: reduce)').matches : false;
        const prefersReducedTransparency = mm ? mm('(prefers-reduced-transparency: reduce)').matches : false;

        // 5. GPU & WebGL capability probe
        const gpuInfo = this.probeGpu();

        // 6. Signal confidence scoring
        let signalsPresent = 0;
        if (hardwareConcurrency !== undefined) signalsPresent++;
        if (deviceMemory !== undefined) signalsPresent++;
        if (gpuInfo.hasWebGL) signalsPresent++;
        if (gpuInfo.maxTextureSize !== undefined) signalsPresent++;

        const confidence: 'high' | 'medium' | 'low' =
            signalsPresent >= 3 ? 'high' : signalsPresent >= 2 ? 'medium' : 'low';

        return {
            hardwareConcurrency,
            deviceMemory,
            hasWebGL: gpuInfo.hasWebGL,
            hasWebGL2: gpuInfo.hasWebGL2,
            maxTextureSize: gpuInfo.maxTextureSize,
            gpuRenderer: gpuInfo.gpuRenderer,
            saveData,
            effectiveConnectionType,
            prefersReducedMotion,
            prefersReducedTransparency,
            confidence,
            reasons: [],
        };
    }

    /**
     * Lightweight, bounded WebGL probe that inspects graphics limits and releases
     * context resources immediately without running heavy benchmarks.
     */
    private probeGpu(): {
        hasWebGL: boolean;
        hasWebGL2: boolean;
        maxTextureSize?: number;
        gpuRenderer?: string;
    } {
        try {
            let canvas: HTMLCanvasElement | null = null;
            if (this.env.createCanvas) {
                canvas = this.env.createCanvas();
            } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
                canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
            }

            if (!canvas || typeof canvas.getContext !== 'function') {
                return { hasWebGL: false, hasWebGL2: false };
            }

            // Probe WebGL 2 first
            let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
            let hasWebGL2 = false;

            try {
                gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
                if (gl) hasWebGL2 = true;
            } catch {
                // Graceful fallback to WebGL 1
            }

            if (!gl) {
                try {
                    gl = (canvas.getContext('webgl') ||
                        canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
                } catch {
                    // WebGL completely unavailable
                }
            }

            if (!gl) {
                return { hasWebGL: false, hasWebGL2: false };
            }

            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number | undefined;

            // Attempt to read unmasked renderer string if extension is permitted
            let gpuRenderer: string | undefined;
            try {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const rendererStr = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    if (typeof rendererStr === 'string' && rendererStr.trim()) {
                        gpuRenderer = rendererStr.trim();
                    }
                }
            } catch {
                // Non-critical renderer string retrieval
            }

            // Clean up WebGL context immediately to avoid GPU memory leaks
            try {
                const loseContextExt = gl.getExtension('WEBGL_lose_context');
                loseContextExt?.loseContext();
            } catch {
                // Ignore cleanup error
            }

            return {
                hasWebGL: true,
                hasWebGL2,
                maxTextureSize: typeof maxTextureSize === 'number' && maxTextureSize > 0 ? maxTextureSize : undefined,
                gpuRenderer,
            };
        } catch {
            return { hasWebGL: false, hasWebGL2: false };
        }
    }

    /**
     * Transparent capability classification model.
     * Evaluates normalized signals against documented thresholds.
     */
    public classify(snapshot: CapabilitySnapshot): PerformanceProfile {
        const reasons: string[] = [];

        // 1. Data Saver intent: user requested minimal data and resource consumption
        if (snapshot.saveData === true) {
            reasons.push('Data-saver mode active (Save-Data header enabled)');
            snapshot.reasons = reasons;
            return 'lite';
        }

        // 2. Slow network constraint: primarily signals low-bandwidth loading, but in extreme cases ('slow-2g') Lite preserves responsiveness
        if (snapshot.effectiveConnectionType === 'slow-2g') {
            reasons.push('Severe network constraint (effectiveType: slow-2g)');
            snapshot.reasons = reasons;
            return 'lite';
        }

        // 3. Severely constrained hardware signals:
        // A. Extremely low CPU concurrency (<= 2 cores)
        if (snapshot.hardwareConcurrency !== undefined && snapshot.hardwareConcurrency <= 2) {
            reasons.push(`Severely constrained CPU (hardwareConcurrency: ${snapshot.hardwareConcurrency} <= 2)`);
            snapshot.reasons = reasons;
            return 'lite';
        }

        // B. Extremely low RAM (<= 1 GB)
        if (snapshot.deviceMemory !== undefined && snapshot.deviceMemory <= 1) {
            reasons.push(`Severely constrained RAM (deviceMemory: ${snapshot.deviceMemory}GB <= 1GB)`);
            snapshot.reasons = reasons;
            return 'lite';
        }

        // C. Both low RAM (<= 2GB) and low CPU (<= 4 cores)
        if (
            snapshot.deviceMemory !== undefined &&
            snapshot.deviceMemory <= 2 &&
            snapshot.hardwareConcurrency !== undefined &&
            snapshot.hardwareConcurrency <= 4
        ) {
            reasons.push(`Low memory (${snapshot.deviceMemory}GB) combined with low core count (${snapshot.hardwareConcurrency})`);
            snapshot.reasons = reasons;
            return 'lite';
        }

        // D. WebGL failure on modest hardware
        if (!snapshot.hasWebGL && (snapshot.hardwareConcurrency === undefined || snapshot.hardwareConcurrency <= 4)) {
            reasons.push('WebGL unavailable or unsupported on constrained device');
            snapshot.reasons = reasons;
            return 'lite';
        }

        // E. Severely constrained GPU texture capability
        if (snapshot.maxTextureSize !== undefined && snapshot.maxTextureSize < 4096) {
            reasons.push(`Constrained GPU texture limit (MAX_TEXTURE_SIZE: ${snapshot.maxTextureSize} < 4096)`);
            snapshot.reasons = reasons;
            return 'lite';
        }

        // 4. Capable hardware signals (qualifies for 'full'):
        // High core count (>= 8) or high RAM (>= 8GB) with operational WebGL
        if (snapshot.hardwareConcurrency !== undefined && snapshot.hardwareConcurrency >= 8 && snapshot.hasWebGL) {
            reasons.push(`High CPU capability (hardwareConcurrency: ${snapshot.hardwareConcurrency} >= 8) with WebGL`);
            snapshot.reasons = reasons;
            return 'full';
        }

        if (snapshot.deviceMemory !== undefined && snapshot.deviceMemory >= 8 && snapshot.hasWebGL) {
            reasons.push(`Generous memory budget (deviceMemory: ${snapshot.deviceMemory}GB >= 8GB) with WebGL`);
            snapshot.reasons = reasons;
            return 'full';
        }

        // Solid mid-to-high combination: >= 6 cores and >= 4GB RAM with WebGL
        if (
            snapshot.hardwareConcurrency !== undefined &&
            snapshot.hardwareConcurrency >= 6 &&
            (snapshot.deviceMemory === undefined || snapshot.deviceMemory >= 4) &&
            snapshot.hasWebGL
        ) {
            reasons.push(`Solid multi-core capability (${snapshot.hardwareConcurrency} cores) with WebGL`);
            snapshot.reasons = reasons;
            return 'full';
        }

        // Modern WebGL2 with large texture size (>= 8192) and at least 4 cores
        if (
            snapshot.hasWebGL2 &&
            snapshot.maxTextureSize !== undefined &&
            snapshot.maxTextureSize >= 8192 &&
            (snapshot.hardwareConcurrency === undefined || snapshot.hardwareConcurrency >= 4) &&
            (snapshot.deviceMemory === undefined || snapshot.deviceMemory >= 4)
        ) {
            reasons.push(`Capable GPU (WebGL2, texture size: ${snapshot.maxTextureSize}) and sufficient CPU/RAM`);
            snapshot.reasons = reasons;
            return 'full';
        }

        // 5. Balanced profile (conservative, dependable middle tier):
        // Covers mixed capability signals, missing deviceMemory (Safari, Firefox),
        // 4-core standard configurations, or moderate texture limits
        if (snapshot.hardwareConcurrency !== undefined && snapshot.hardwareConcurrency >= 4) {
            reasons.push(`Standard multi-core hardware (${snapshot.hardwareConcurrency} cores) assigned Balanced profile`);
        } else if (snapshot.hasWebGL) {
            reasons.push('Operational WebGL with moderate or unverified hardware signals assigned Balanced profile');
        } else {
            reasons.push('Conservative default assigned due to ambiguous capability signals');
        }

        snapshot.reasons = reasons;
        return 'balanced';
    }
}
