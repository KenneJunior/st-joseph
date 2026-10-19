/**
 * ============================================================================
 * SJCCC – LiquidGlass UI Adapter
 * Architectural bridge for the external `@kennejunior/liquidglass` package.
 *
 * Responsibilities:
 * - Controls WHEN and WHERE LiquidGlass is initialized across SJCCC pages
 * - Enforces strict performance budgets (targeted surfaces only; no long lists)
 * - Evaluates device performance tiers and mobile breakpoints
 * - Integrates with SJCCC's reduced-motion accessibility architecture
 * - Provides graceful fallback to native CSS backdrop-filter on unsupported devices
 * - Manages lifecycle cleanup and tactile ripple event bindings
 *
 * Strict Architectural Rule:
 * This adapter NEVER reimplements LiquidGlass physics, SVG filter generation,
 * or displacement calculations; all glass rendering is owned by the npm package.
 * ============================================================================
 */

import {LiquidGlass} from '@kennejunior/liquidglass';

export interface LiquidGlassAdapterConfig {
    /** Refractive index for optical bending (defaults to 1.45 - 1.6) */
    refractiveIndex?: number;
    /** Virtual glass thickness in pixels (defaults to 60 - 80) */
    glassThickness?: number;
    /** Bezel border rim width in pixels (defaults to 18) */
    bezelWidth?: number;
    /** Refraction scale multiplier (defaults to 1.1) */
    refractionScale?: number;
    /** Specular highlight opacity 0-1 (defaults to 0.45) */
    specularAlpha?: number;
    /** Maximum tilt angle in degrees on pointer hover */
    maxTilt?: number;
    /** Ambient trailing light orb toggle */
    enableOrb?: boolean;
    /** RGBA color for the ambient orb */
    orbColor?: string;
    /** Mobile gyroscope support toggle */
    enableMobileSupport?: boolean;
    /** Chromatic aberration intensity (defaults to 0.03) */
    aberration?: number;
    /** Ripple color for click/tap interaction */
    rippleColor?: string;
}

export const POPUP_SELECTORS = [
    '#pwaInstallCard',
    '.pwa-install-card',
    '#sw-update-banner',
    '.cd-card',
    '.dialog-box',
    '.enquiry-modal-content',
    '#enquiryModal .modal-content',
    '.past-announcements-modal__dialog',
    '.my-reminders-modal__dialog',
    '.notification-guidance-dialog',
    '.calendar-action-sheet',
    '.location-qr-modal',
    '#offlineStatusIndicator',
    '.offline-status-indicator',
];

export const DEFAULT_POPUP_GLASS_CONFIG: LiquidGlassAdapterConfig = {
    refractiveIndex: 1.54,
    glassThickness: 75,
    bezelWidth: 18,
    refractionScale: 1.08,
    specularAlpha: 0.55,
    maxTilt: 2,
    aberration: 0.02,
    rippleColor: 'rgba(201, 162, 41, 0.35)', // Catholic Gold brand accent
};

export class LiquidGlassAdapter {
    public static readonly shared: LiquidGlassAdapter = new LiquidGlassAdapter();

    private isDestroyed = false;
    private cleanups: Array<() => void> = [];
    private popupObserver: MutationObserver | null = null;
    private enhancedSurfaces: WeakSet<HTMLElement> = new WeakSet();

    /**
     * Checks if the user or system prefers reduced motion.
     */
    public static prefersReducedMotion(): boolean {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Checks if the device is a mobile or touch-dominant device with constrained performance budget.
     */
    public static isMobileOrConstrained(): boolean {
        if (typeof window === 'undefined') return false;
        const isSmallScreen = window.innerWidth <= 768;
        const hasCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const isLowCoreCount = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;
        return isSmallScreen || hasCoarsePointer || isLowCoreCount;
    }

    /**
     * Builds device-aware LiquidGlass options respecting accessibility and performance budgets.
     */
    private buildOptions(customConfig: LiquidGlassAdapterConfig = {}) {
        const reducedMotion = LiquidGlassAdapter.prefersReducedMotion();
        const isMobile = LiquidGlassAdapter.isMobileOrConstrained();

        return {
            refractiveIndex: customConfig.refractiveIndex ?? 1.5,
            glassThickness: customConfig.glassThickness ?? (isMobile ? 50 : 75),
            bezelWidth: customConfig.bezelWidth ?? (isMobile ? 14 : 20),
            refractionScale: customConfig.refractionScale ?? (isMobile ? 0.9 : 1.15),
            specularAlpha: customConfig.specularAlpha ?? 0.5,
            // Disable or clamp tilt under reduced-motion or mobile conditions
            maxTilt: reducedMotion ? 1 : (isMobile ? 1 : (customConfig.maxTilt ?? 6)),
            magneticPull: reducedMotion || isMobile ? 0 : 8,
            aberration: reducedMotion ? 0 : (customConfig.aberration ?? 0.03),
            // Disable ambient orb and mobile gyroscope listeners on mobile/reduced-motion to conserve battery and CPU
            enableOrb: !reducedMotion && !isMobile && (customConfig.enableOrb ?? true),
            orbColor: customConfig.orbColor ?? 'rgba(201, 162, 41, 0.12)', // SJCCC Catholic Gold brand accent
            enableMobileSupport: false, // Explicitly avoid continuous orientation listeners to save battery
            reducedMotion: reducedMotion,
            backdrop: {
                blur: 0.6,
                saturation: 1.25,
                brightness: 1.0,
                reducedMotion: reducedMotion,
            },
        };
    }

    /**
     * Initializes LiquidGlass on targeted elements matching a selector or direct HTMLElement.
     * Wrapped in a try/catch boundary so that any environment limitations
     * gracefully fall back to native CSS backdrop-filter without breaking UI.
     *
     * @param target CSS selector string or HTMLElement instance
     * @param config Optional adapter configuration
     */
    public enhanceSurface(target: string | HTMLElement, config: LiquidGlassAdapterConfig = {}): void {
        if (typeof window === 'undefined' || typeof document === 'undefined' || this.isDestroyed) return;

        try {
            let selector: string;
            let elements: HTMLElement[] = [];

            if (typeof target === 'string') {
                selector = target;
                elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
            } else if (target && typeof target === 'object' && 'nodeType' in target && target.nodeType === 1) {
                const el = target as HTMLElement;
                elements = [el];
                if (el.id) {
                    selector = `#${el.id}`;
                } else {
                    const tempId = `lg-${Math.random().toString(36).slice(2, 9)}`;
                    el.setAttribute('data-lg-surface', tempId);
                    selector = `[data-lg-surface="${tempId}"]`;
                }
            } else {
                return;
            }

            if (!elements || elements.length === 0) return;

            // Filter out already enhanced elements to avoid redundant attachment
            const unenhanced = elements.filter((el) => !this.enhancedSurfaces.has(el));
            if (unenhanced.length === 0) return;
            unenhanced.forEach((el) => this.enhancedSurfaces.add(el));

            const options = this.buildOptions(config);

            // Initialize LiquidGlass from the external npm package
            LiquidGlass.init(selector, options);

            // Attach tactile click/tap ripple effect using the external package's addRipple API
            const rippleColor = config.rippleColor ?? 'rgba(201, 162, 41, 0.32)'; // SJCCC Gold Accent
            unenhanced.forEach((el) => {
                const handlePointerDown = (event: MouseEvent | PointerEvent) => {
                    // Skip or soften interactive motion if reduced motion is preferred
                    if (LiquidGlassAdapter.prefersReducedMotion()) return;

                    try {
                        LiquidGlass.addRipple(el, event, {
                            color: rippleColor,
                            sizeMultiplier: 2.2,
                            durationMs: 1200,
                            startOpacity: 0.8,
                            endOpacity: 0,
                        });
                    } catch {
                        // Non-critical interactive ripple fallback
                    }
                };

                el.addEventListener('pointerdown', handlePointerDown as EventListener);
                this.cleanups.push(() => {
                    el.removeEventListener('pointerdown', handlePointerDown as EventListener);
                });
            });
        } catch (error) {
            // Graceful degradation: The underlying semantic DOM and existing CSS
            // (backdrop-filter: blur) remain completely functional.
            if (typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1')) {
                console.warn('[LiquidGlassAdapter] Initialization skipped; falling back to CSS glass:', error);
            }
        }
    }

    /**
     * Enhances a modal dialog, floating notification card, or popup sheet
     * with physical liquid glass refractive effect, specular highlights, and gold ripple.
     */
    public enhancePopup(target: string | HTMLElement, config: LiquidGlassAdapterConfig = {}): void {
        const mergedConfig = { ...DEFAULT_POPUP_GLASS_CONFIG, ...config };
        this.enhanceSurface(target, mergedConfig);
    }

    /**
     * Static convenience method for enhancing popups via the shared adapter.
     */
    public static enhancePopup(target: string | HTMLElement, config: LiquidGlassAdapterConfig = {}): void {
        LiquidGlassAdapter.shared.enhancePopup(target, config);
    }

    /**
     * Initializes a MutationObserver that automatically detects when any popup,
     * install prompt, update notification, or modal dialog is added to the DOM
     * and enhances it with LiquidGlass immediately.
     */
    public initPopupObserver(): void {
        if (typeof window === 'undefined' || typeof document === 'undefined' || typeof MutationObserver === 'undefined' || this.isDestroyed) {
            return;
        }

        if (this.popupObserver) return;

        // Immediately enhance any existing popups currently mounted in DOM
        this.enhanceExistingPopups();

        this.popupObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Node.ELEMENT_NODE
                            const el = node as HTMLElement;
                            for (const selector of POPUP_SELECTORS) {
                                if (typeof el.matches === 'function' && el.matches(selector)) {
                                    this.enhancePopup(el);
                                }
                                if (typeof el.querySelectorAll === 'function') {
                                    const nested = el.querySelectorAll<HTMLElement>(selector);
                                    nested.forEach((match) => this.enhancePopup(match));
                                }
                            }
                        }
                    });
                }
            }
        });

        this.popupObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        this.cleanups.push(() => {
            this.popupObserver?.disconnect();
            this.popupObserver = null;
        });
    }

    private enhanceExistingPopups(): void {
        for (const selector of POPUP_SELECTORS) {
            const matches = document.querySelectorAll<HTMLElement>(selector);
            matches.forEach((el) => this.enhancePopup(el));
        }
    }

    /**
     * Initializes targeted high-impact glass elements on the SJCCC Homepage:
     * 1. Dynamic popup surfaces & observer (Install Card, Update Banner, Modals)
     * 2. `.map-tour-btn`, `.campus-map-zoom-controls`, `.news-card__category-badge`
     * 3. `.unified-action-dock`
     */
    public initHomepageSurfaces(): void {
        if (typeof window === 'undefined' || this.isDestroyed) return;

        // Auto-enhance popups (install app, update available, enquiry, etc.)
        this.initPopupObserver();

        this.enhanceSurface('.map-tour-btn');
        this.enhanceSurface('.campus-map-zoom-controls');
        this.enhanceSurface('.news-card__category-badge');
        this.enhanceSurface('.unified-action-dock', {
            refractiveIndex: 1.55,
            glassThickness: 80,
            bezelWidth: 20,
            maxTilt: 1,
            rippleColor: 'rgba(255, 255, 255, 0.5)',
        });
    }

    /**
     * Initializes targeted high-impact glass elements on the SJCCC Prospectus:
     * 1. Dynamic popup surfaces & observer (Update Banner, Modals)
     * 2. `#downloadPdfBtn`: Floating PDF export / print trigger button
     */
    public initProspectusSurfaces(): void {
        if (typeof window === 'undefined' || this.isDestroyed) return;

        // Auto-enhance popups (update available, dialogs, etc.)
        this.initPopupObserver();

        // Targeted selection: Floating Action Button for PDF download
        this.enhanceSurface('#downloadPdfBtn', {
            refractiveIndex: 1.55,
            glassThickness: 80,
            bezelWidth: 20,
            maxTilt: 1,
            rippleColor: 'rgba(255, 255, 255, 0.5)',
        });
    }

    /**
     * Lifecycle teardown: removes event listeners and clears state.
     */
    public destroy(): void {
        this.isDestroyed = true;
        this.popupObserver?.disconnect();
        this.popupObserver = null;
        this.cleanups.forEach((cleanup) => {
            try {
                cleanup();
            } catch {
                // Ignore teardown error
            }
        });
        this.cleanups = [];
    }
}
