/**
 * ============================================================================
 * SJCCC – Mobile Backdrop Filter & Glassmorphism-Lite Diagnostic System
 * (src/core/diagnostics/BackdropBlurDetector.ts)
 *
 * Responsibilities:
 * - Detects whether 'backdrop-filter: blur()' is actively supported and triggered
 *   on mobile hardware vs throttled by OS/browser/performance constraints.
 * - Applies 'glassmorphism-lite' fallback (semi-transparent rgba(x,x,x,0.65))
 *   when blur is throttled or unsupported, preserving visual consistency.
 * - Renders a diagnostic overlay on CSS Header, Stat Cards, and Floating Buttons
 *   to visually confirm whether native blur or glassmorphism-lite is active.
 * ============================================================================
 */

import { performanceManager } from '../performance/PerformanceManager.ts';

export interface BlurDetectionResult {
    supported: boolean;
    throttled: boolean;
    aesthetic: 'native-blur' | 'glassmorphism-lite';
    reason: string;
}

export class BackdropBlurDetector {
    public static readonly shared = new BackdropBlurDetector();

    private isForceThrottled: boolean | null = null;
    private isOverlayVisible = false;
    private targets: HTMLElement[] = [];
    private observer: MutationObserver | null = null;

    /**
     * Probes the browser environment to verify native backdrop-filter support.
     */
    public checkNativeSupport(): boolean {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return false;
        }

        // 1. CSS.supports probe for standard or webkit-prefixed backdrop-filter
        if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
            const hasStandard = CSS.supports('backdrop-filter', 'blur(1px)');
            const hasWebkit = CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
            if (hasStandard || hasWebkit) {
                return true;
            }
            return false;
        }

        // 2. Fallback DOM computed style probe if CSS.supports is unavailable
        try {
            const testEl = document.createElement('div');
            testEl.style.cssText = 'backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); position: absolute; top: -9999px;';
            document.documentElement.appendChild(testEl);
            const style = window.getComputedStyle(testEl);
            const bf = style.backdropFilter ||
                (style as any).WebkitBackdropFilter ||
                (style as any).webkitBackdropFilter ||
                style.getPropertyValue('backdrop-filter') ||
                style.getPropertyValue('-webkit-backdrop-filter');
            const isSupported = Boolean(bf && bf !== 'none' && bf !== '');
            testEl.remove();
            return isSupported;
        } catch {
            return true; // Fall back to optimistic true if DOM probe encounters environment issues
        }
    }

    /**
     * Determines if backdrop-filter is currently being throttled.
     * Throttling can be caused by:
     * - User/device in 'lite' performance profile
     * - Forced throttling toggle for diagnostics
     * - prefers-reduced-transparency media query
     * - Battery saver / data saver flags
     */
    public isThrottled(): boolean {
        if (this.isForceThrottled !== null) {
            return this.isForceThrottled;
        }

        if (typeof window === 'undefined') {
            return false;
        }

        // 1. Reduced transparency preference throttles blur to opaque/semi-opaque
        const prefersReducedTransparency = typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
        if (prefersReducedTransparency) {
            return true;
        }

        // 2. Performance manager profile: 'full' mode guarantees unthrottled blurs
        const profile = performanceManager.getProfile();
        if (profile === 'full') {
            return false;
        }
        if (profile === 'lite') {
            return true;
        }

        // 3. Central capability flag
        const caps = performanceManager.getCapabilities();
        if (caps.allowBackdropBlur === false) {
            return true;
        }

        return false;
    }

    /**
     * Evaluates current status and resolves the active aesthetic.
     */
    public evaluate(): BlurDetectionResult {
        const supported = this.checkNativeSupport();
        const throttled = !supported || this.isThrottled();

        let reason = 'Native GPU blur active and operational';
        if (!supported) {
            reason = 'Browser does not support CSS backdrop-filter';
        } else if (this.isForceThrottled === true) {
            reason = 'Diagnostic force-throttle enabled by tester';
        } else if (this.isThrottled()) {
            reason = 'Performance mode or device capability constrained; glassmorphism-lite active';
        }

        return {
            supported,
            throttled,
            aesthetic: throttled ? 'glassmorphism-lite' : 'native-blur',
            reason,
        };
    }

    /**
     * Applies status classes and data-attributes to document and target components.
     */
    public apply(): void {
        if (typeof document === 'undefined') return;

        const evalResult = this.evaluate();
        const root = document.documentElement;

        // Synchronize root markers
        root.setAttribute('data-backdrop-blur', evalResult.throttled ? 'throttled' : 'active');
        root.setAttribute('data-glass-aesthetic', evalResult.aesthetic);
        root.classList.toggle('blur-throttled', evalResult.throttled);
        root.classList.toggle('blur-active', !evalResult.throttled);
        root.classList.toggle('glassmorphism-lite', evalResult.throttled);

        // Update target components
        this.updateTargetElements(evalResult);

        // Update diagnostic overlay badges if enabled
        if (this.isOverlayVisible) {
            this.renderOverlayBadges(evalResult);
        }
    }

    /**
     * Resolves and updates target elements: Header, Stat cards, and Floating buttons/docks.
     */
    public updateTargetElements(result: BlurDetectionResult = this.evaluate()): void {
        if (typeof document === 'undefined') return;

        const selectors = [
            '#mainHeader',
            '.stat-card',
            '.unified-action-dock',
            '#mobileBottomBar',
            '.mobile-bottom-bar',
            '.enquiry-fab',
            '#askAiFab',
        ];

        this.targets = Array.from(document.querySelectorAll<HTMLElement>(selectors.join(', ')));

        this.targets.forEach((el) => {
            el.setAttribute('data-backdrop-blur', result.throttled ? 'throttled' : 'active');
            el.setAttribute('data-glass-aesthetic', result.aesthetic);
            el.classList.toggle('blur-throttled', result.throttled);
            el.classList.toggle('blur-active', !result.throttled);
            el.classList.toggle('glassmorphism-lite', result.throttled);
        });
    }

    /**
     * Initializes the blur diagnostic system and binds URL param / DOM listeners.
     */
    public init(): void {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        // Check URL parameter e.g. ?diagnostics=blur or ?blur=debug
        const urlParams = new URLSearchParams(window.location.search);
        const shouldShowOverlay = urlParams.get('diagnostics') === 'blur' ||
            urlParams.get('blur') === 'debug' ||
            urlParams.get('blur-overlay') === 'true';

        if (urlParams.get('blur-throttle') === 'true') {
            this.isForceThrottled = true;
        } else if (urlParams.get('blur-throttle') === 'false') {
            this.isForceThrottled = false;
        }

        // Subscribe to performanceManager profile changes
        performanceManager.subscribe(() => {
            this.apply();
        });

        this.apply();

        if (shouldShowOverlay) {
            this.toggleOverlay(true);
        }

        // Observe DOM additions (e.g. dynamic modals or late-rendered components)
        if (typeof MutationObserver !== 'undefined' && !this.observer) {
            this.observer = new MutationObserver(() => {
                this.updateTargetElements();
                if (this.isOverlayVisible) {
                    this.renderOverlayBadges();
                }
            });
            this.observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    /**
     * Toggles visual diagnostic overlay badges on the Header, Stat cards, and Floating buttons.
     */
    public toggleOverlay(force?: boolean): boolean {
        this.isOverlayVisible = force !== undefined ? force : !this.isOverlayVisible;
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('show-blur-diagnostics', this.isOverlayVisible);
            document.documentElement.setAttribute('data-blur-diagnostics', this.isOverlayVisible ? 'true' : 'false');

            if (this.isOverlayVisible) {
                this.renderOverlayBadges();
                this.mountFloatingController();
            } else {
                this.removeOverlayBadges();
                this.unmountFloatingController();
            }
        }

        return this.isOverlayVisible;
    }

    /**
     * Manually overrides throttle state for testing fallback aesthetic.
     */
    public setThrottled(throttled: boolean | null): void {
        this.isForceThrottled = throttled;
        this.apply();
    }

    /**
     * Injects diagnostic badge chips into each observed element.
     */
    private renderOverlayBadges(result: BlurDetectionResult = this.evaluate()): void {
        if (typeof document === 'undefined') return;

        this.updateTargetElements(result);

        this.targets.forEach((el) => {
            let badge = el.querySelector<HTMLElement>('.blur-diagnostic-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'blur-diagnostic-badge';
                badge.setAttribute('aria-hidden', 'true');
                el.appendChild(badge);
            }

            const isThrottled = result.throttled;
            badge.className = `blur-diagnostic-badge ${isThrottled ? 'is-throttled' : 'is-active'}`;
            badge.innerHTML = isThrottled
                ? '<span class="blur-diag-dot"></span><span>Blur Throttled (rgba 0.65 fallback)</span>'
                : '<span class="blur-diag-dot"></span><span>Blur Active (GPU)</span>';
        });
    }

    /**
     * Cleans up diagnostic badges from observed elements.
     */
    private removeOverlayBadges(): void {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('.blur-diagnostic-badge').forEach((badge) => badge.remove());
    }

    /**
     * Mounts an interactive floating diagnostic controller HUD pill on mobile.
     */
    private mountFloatingController(): void {
        if (typeof document === 'undefined') return;

        let hud = document.getElementById('blurDiagnosticHud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'blurDiagnosticHud';
            hud.className = 'blur-diagnostic-hud';
            document.body.appendChild(hud);
        }

        const evalResult = this.evaluate();
        hud.innerHTML = `
            <div class="blur-hud-content">
                <span class="blur-hud-status ${evalResult.throttled ? 'status-throttled' : 'status-active'}">
                    <i class="bi ${evalResult.throttled ? 'bi-shield-shaded' : 'bi-check-circle-fill'}"></i>
                    ${evalResult.throttled ? 'Fallback (rgba 0.65)' : 'Blur Triggered'}
                </span>
                <button type="button" class="blur-hud-toggle-btn" id="blurHudToggleThrottleBtn">
                    ${evalResult.throttled ? 'Force GPU Blur' : 'Force Throttle'}
                </button>
                <button type="button" class="blur-hud-close-btn" id="blurHudCloseBtn" aria-label="Close Diagnostics">✕</button>
            </div>
        `;

        document.getElementById('blurHudToggleThrottleBtn')?.addEventListener('click', () => {
            const current = this.isThrottled();
            this.setThrottled(!current);
            this.mountFloatingController();
        });

        document.getElementById('blurHudCloseBtn')?.addEventListener('click', () => {
            this.toggleOverlay(false);
        });
    }

    private unmountFloatingController(): void {
        if (typeof document === 'undefined') return;
        document.getElementById('blurDiagnosticHud')?.remove();
    }

    public destroy(): void {
        this.observer?.disconnect();
        this.observer = null;
        this.removeOverlayBadges();
        this.unmountFloatingController();
    }
}

export const backdropBlurDetector = BackdropBlurDetector.shared;
