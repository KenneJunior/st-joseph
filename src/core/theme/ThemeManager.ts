/**
 * ============================================================================
 * SJCCC – Theme Manager
 * Centralized theme controller supporting clip-path animations and smooth fades
 * ============================================================================
 */

import { STORAGE_KEYS } from '../storage/storageKeys.ts';
import type { AnimationStyle, ThemeManagerOptions, ThemePreference } from './themeTypes.ts';

export class ThemeManager {
    private readonly body: HTMLElement;
    private readonly toggle: HTMLElement | null;
    private readonly mode: 'animated' | 'fade';
    private transitionOverlay: HTMLElement | null = null;

    private readonly DARK_CLASS = 'dark-mode';
    private isDark: boolean = false;
    private isAnimating: boolean = false;

    // Timing constants for 'animated' mode (in milliseconds)
    private readonly EXPAND_DURATION = 800;
    private readonly THEME_SWITCH_DELAY = 650;
    private readonly HOLD_DURATION = 150;
    private readonly SHRINK_DURATION = 600;
    private readonly TOTAL_DURATION = 1600;

    // Timing constants for 'fade' mode (in milliseconds)
    private static readonly FADE_TOGGLE_DELAY_MS = 120;
    private static readonly FADE_OVERLAY_SETTLE_MS = 150;
    private static readonly FADE_OVERLAY_CLEANUP_MS = 400;
    private static readonly FADE_OVERLAY_CLASS = 'theme-transition-overlay';

    private readonly animations: AnimationStyle[] = [
        'circle-center',
        'circle-top-left',
        'circle-top-right',
        'rect-top-down',
        'rect-bottom-up',
        'rect-left-right',
        'rect-right-left',
        'blur',
    ];

    private currentAnimation: AnimationStyle = 'circle-center';

    constructor(options: string | ThemeManagerOptions = 'themeToggle') {
        const opts: ThemeManagerOptions = typeof options === 'string'
            ? { toggleId: options, mode: 'animated' }
            : { mode: 'animated', ...options };

        this.body = document.body;
        this.mode = opts.mode ?? 'animated';
        this.toggle = opts.toggleId ? document.getElementById(opts.toggleId) : null;

        if (this.mode === 'animated') {
            const overlayId = opts.overlayId ?? 'themeTransitionOverlay';
            this.transitionOverlay = document.getElementById(overlayId);

            // Create overlay if it doesn't exist
            if (!this.transitionOverlay) {
                this.transitionOverlay = document.createElement('div');
                this.transitionOverlay.id = overlayId;
                this.transitionOverlay.className = 'theme-transition-overlay';
                document.body.insertBefore(this.transitionOverlay, document.body.firstChild);
            }
        }

        this.init();
    }

    private init(): void {
        if (this.mode === 'animated') {
            this.loadSavedAnimation();
        }
        this.applyInitialTheme();
        this.bindToggle();
        this.listenForSystemChanges();
    }

    private loadSavedAnimation(): void {
        const saved = localStorage.getItem(STORAGE_KEYS.THEME_ANIMATION);
        if (saved && this.animations.includes(saved as AnimationStyle)) {
            this.currentAnimation = saved as AnimationStyle;
        } else {
            this.currentAnimation = 'circle-center';
            localStorage.setItem(STORAGE_KEYS.THEME_ANIMATION, 'circle-center');
        }
    }

    private cycleAnimation(): void {
        const currentIndex = this.animations.indexOf(this.currentAnimation);
        const nextIndex = (currentIndex + 1) % this.animations.length;
        this.currentAnimation = this.animations[nextIndex];
        localStorage.setItem(STORAGE_KEYS.THEME_ANIMATION, this.currentAnimation);
    }

    private applyInitialTheme(): void {
        const saved = localStorage.getItem(STORAGE_KEYS.THEME);

        if (saved === 'dark') {
            this.applyTheme(true);
        } else if (saved === 'light') {
            this.applyTheme(false);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.applyTheme(true);
        } else {
            this.applyTheme(false);
        }
    }

    private bindToggle(): void {
        this.toggle?.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            if (!this.isAnimating) {
                this.toggleTheme();
            }
        });
    }

    private listenForSystemChanges(): void {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e: MediaQueryListEvent) => {
            const hasManual = localStorage.getItem(STORAGE_KEYS.THEME);
            if (!hasManual) {
                this.applyTheme(e.matches);
            }
        });
    }

    public toggleTheme(): void {
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            this.applyTheme(!this.isDark);
            return;
        }

        if (this.mode === 'fade') {
            this.toggleThemeFade();
        } else {
            this.toggleThemeAnimated();
        }
    }

    /**
     * Animated mode: Multi-stage clip-path transition
     */
    private toggleThemeAnimated(): void {
        if (this.isAnimating) return;

        const goingDark = !this.isDark;
        this.isAnimating = true;

        // Step 1: Expand overlay to cover the current theme
        this.expandOverlay(goingDark);

        // Step 2: Switch the theme UNDER the overlay (before it shrinks)
        setTimeout(() => {
            this.applyTheme(goingDark);
        }, this.THEME_SWITCH_DELAY);

        // Step 3: Start shrinking overlay to reveal new theme
        setTimeout(() => {
            this.shrinkOverlay();
        }, this.EXPAND_DURATION + this.HOLD_DURATION);

        // Step 4: Clean up everything
        setTimeout(() => {
            this.cleanupOverlay();
            this.cycleAnimation();
            this.isAnimating = false;
        }, this.TOTAL_DURATION);
    }

    /**
     * Fade mode: Lightweight overlay fade for prospectus or minimal pages
     */
    private toggleThemeFade(): void {
        const overlay = document.createElement('div');
        overlay.className = ThemeManager.FADE_OVERLAY_CLASS;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add('active'));

        window.setTimeout(() => {
            const goingDark = !this.body.classList.contains(this.DARK_CLASS);
            this.applyTheme(goingDark);

            window.setTimeout(() => {
                overlay.classList.remove('active');
                window.setTimeout(() => overlay.remove(), ThemeManager.FADE_OVERLAY_CLEANUP_MS);
            }, ThemeManager.FADE_OVERLAY_SETTLE_MS);
        }, ThemeManager.FADE_TOGGLE_DELAY_MS);
    }

    public applyTheme(dark: boolean): void {
        this.isDark = dark;

        // Disable transitions temporarily to prevent flash
        this.body.style.transition = 'none';

        if (dark) {
            this.body.classList.add(this.DARK_CLASS);
        } else {
            this.body.classList.remove(this.DARK_CLASS);
        }

        // Force reflow
        void this.body.offsetWidth;

        // Re-enable transitions after a tiny delay
        setTimeout(() => {
            this.body.style.transition = '';
        }, 50);

        const currentTheme: ThemePreference = dark ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
    }

    private expandOverlay(goingDark: boolean): void {
        const overlay = this.transitionOverlay;
        if (!overlay) return;

        const newBg = goingDark ? '#121a2a' : '#ffffff';

        overlay.style.transition = 'none';
        overlay.style.clipPath = this.getStartClipPath();
        overlay.style.background = newBg;
        overlay.style.opacity = '1';
        overlay.style.filter = 'none';
        overlay.classList.add('animating');

        void overlay.offsetWidth;

        const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1.0)';
        overlay.style.transition = `clip-path ${this.EXPAND_DURATION}ms ${easing}`;

        requestAnimationFrame(() => {
            overlay.style.clipPath = this.getFullScreenClipPath();

            if (this.currentAnimation === 'blur') {
                overlay.style.transition = `clip-path ${this.EXPAND_DURATION}ms ${easing}, filter 0.6s ease`;
                overlay.style.filter = 'blur(8px)';
            }
        });
    }

    private shrinkOverlay(): void {
        const overlay = this.transitionOverlay;
        if (!overlay) return;

        if (this.currentAnimation === 'blur') {
            overlay.style.filter = 'blur(0px)';
        }

        const easing = 'cubic-bezier(0.55, 0.0, 0.45, 1.0)';
        overlay.style.transition = `clip-path ${this.SHRINK_DURATION}ms ${easing}`;

        requestAnimationFrame(() => {
            overlay.style.clipPath = this.getStartClipPath();
        });
    }

    private cleanupOverlay(): void {
        const overlay = this.transitionOverlay;
        if (!overlay) return;

        overlay.classList.remove('animating');
        overlay.style.opacity = '0';
        overlay.style.clipPath = 'none';
        overlay.style.filter = 'none';
        overlay.style.background = 'transparent';
        overlay.style.transition = 'none';
    }

    private getStartClipPath(): string {
        switch (this.currentAnimation) {
            case 'circle-center':
                return 'circle(0% at 50% 50%)';
            case 'circle-top-left':
                return 'circle(0% at 0% 0%)';
            case 'circle-top-right':
                return 'circle(0% at 100% 0%)';
            case 'rect-top-down':
                return 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';
            case 'rect-bottom-up':
                return 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)';
            case 'rect-left-right':
                return 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)';
            case 'rect-right-left':
                return 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)';
            case 'blur':
                return 'circle(0% at 50% 50%)';
            default:
                return 'circle(0% at 50% 50%)';
        }
    }

    private getFullScreenClipPath(): string {
        if (this.currentAnimation.startsWith('rect-')) {
            return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
        }
        return 'circle(150% at 50% 50%)';
    }

    public isDarkMode(): boolean {
        return this.body.classList.contains(this.DARK_CLASS);
    }
}
