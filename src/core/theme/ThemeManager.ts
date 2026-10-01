/**
 * ============================================================================
 * SJCCC – Theme Manager
 * Centralized theme controller supporting clip-path animations and smooth fades
 * with persistent localStorage synchronization
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
        this.listenForStorageChanges();
    }

    /**
     * Safely reads the theme preference stored in localStorage
     */
    public getStoredTheme(): ThemePreference | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.THEME) || localStorage.getItem('theme');
            if (saved === 'dark' || saved === 'light') {
                return saved;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Safely writes the theme preference to localStorage
     */
    public saveTheme(theme: ThemePreference): void {
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
        } catch (e) {
            console.warn('Unable to persist theme to localStorage', e);
        }
    }

    private loadSavedAnimation(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.THEME_ANIMATION);
            if (saved && this.animations.includes(saved as AnimationStyle)) {
                this.currentAnimation = saved as AnimationStyle;
            } else {
                this.currentAnimation = 'circle-center';
                localStorage.setItem(STORAGE_KEYS.THEME_ANIMATION, 'circle-center');
            }
        } catch {
            this.currentAnimation = 'circle-center';
        }
    }

    private cycleAnimation(): void {
        const currentIndex = this.animations.indexOf(this.currentAnimation);
        const nextIndex = (currentIndex + 1) % this.animations.length;
        this.currentAnimation = this.animations[nextIndex];
        try {
            localStorage.setItem(STORAGE_KEYS.THEME_ANIMATION, this.currentAnimation);
        } catch {
            // Storage restricted
        }
    }

    private applyInitialTheme(): void {
        const saved = this.getStoredTheme();

        if (saved === 'dark') {
            this.applyTheme(true, false);
        } else if (saved === 'light') {
            this.applyTheme(false, false);
        } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.applyTheme(true, false);
        } else {
            this.applyTheme(false, false);
        }
    }

    private getToggleElements(): HTMLElement[] {
        const elements: HTMLElement[] = [];
        if (this.toggle && !elements.includes(this.toggle)) {
            elements.push(this.toggle);
        }

        const candidateIds = ['themeToggle', 'darkModeToggle', 'wcoDarkModeToggle'];
        for (const id of candidateIds) {
            const el = document.getElementById(id);
            if (el && !elements.includes(el)) {
                elements.push(el);
            }
        }

        const dataToggles = document.querySelectorAll<HTMLElement>('[data-theme-toggle]');
        dataToggles.forEach((el) => {
            if (!elements.includes(el)) {
                elements.push(el);
            }
        });

        return elements;
    }

    private updateToggleA11y(dark: boolean): void {
        const buttons = this.getToggleElements();
        const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
        const modeName = dark ? 'Dark Mode' : 'Light Mode';

        buttons.forEach((btn) => {
            btn.setAttribute('aria-pressed', String(dark));
            btn.setAttribute('aria-checked', String(dark));
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);

            // Synchronize theme name labels inside or linked to toggle buttons
            const lightNameEl = btn.querySelector<HTMLElement>('.theme-name-light');
            const darkNameEl = btn.querySelector<HTMLElement>('.theme-name-dark');
            if (lightNameEl && darkNameEl) {
                lightNameEl.style.display = dark ? 'none' : 'inline';
                darkNameEl.style.display = dark ? 'inline' : 'none';
            } else {
                const labelSpan = btn.querySelector<HTMLElement>('.mobile-bottom-label, [data-theme-name]');
                if (labelSpan && !labelSpan.querySelector('.theme-name-text')) {
                    labelSpan.textContent = modeName;
                }
            }
        });

        // Also update any standalone theme name indicators
        const standaloneNames = document.querySelectorAll<HTMLElement>('[data-theme-name]');
        standaloneNames.forEach((el) => {
            el.textContent = modeName;
        });
    }

    private bindToggle(): void {
        const buttons = this.getToggleElements();
        buttons.forEach((btn) => {
            if (btn.dataset.themeBound === 'true') return;
            btn.dataset.themeBound = 'true';

            btn.addEventListener('click', (e: MouseEvent) => {
                e.preventDefault();
                if (!this.isAnimating) {
                    this.toggleTheme();
                }
            });
        });
    }

    private listenForSystemChanges(): void {
        try {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e: MediaQueryListEvent) => {
                const hasManual = this.getStoredTheme();
                if (!hasManual) {
                    this.applyTheme(e.matches, false);
                }
            });
        } catch {
            // Older browser support
        }
    }

    private listenForStorageChanges(): void {
        window.addEventListener('storage', (e: StorageEvent) => {
            if ((e.key === STORAGE_KEYS.THEME || e.key === 'theme') && e.newValue) {
                const isDark = e.newValue === 'dark';
                if (this.isDark !== isDark) {
                    this.applyTheme(isDark, false);
                }
            }
        });
    }

    public toggleTheme(): void {
        if (this.isAnimating) return;

        const nextDark = !this.isDark;

        // Immediately persist the user's explicit theme choice into localStorage
        this.saveTheme(nextDark ? 'dark' : 'light');

        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            this.applyTheme(nextDark, true);
            return;
        }

        if (this.mode === 'fade') {
            this.toggleThemeFade(nextDark);
        } else {
            this.toggleThemeAnimated(nextDark);
        }
    }

    /**
     * Animated mode: Multi-stage clip-path transition
     */
    private toggleThemeAnimated(targetDark?: boolean): void {
        if (this.isAnimating) return;

        const goingDark = typeof targetDark === 'boolean' ? targetDark : !this.isDark;
        this.isAnimating = true;

        // Ensure preference is saved immediately to survive fast reloads
        this.saveTheme(goingDark ? 'dark' : 'light');

        // Step 1: Expand overlay to cover the current theme
        this.expandOverlay(goingDark);

        // Step 2: Switch the theme UNDER the overlay (before it shrinks)
        setTimeout(() => {
            this.applyTheme(goingDark, true);
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
    private toggleThemeFade(targetDark?: boolean): void {
        const goingDark = typeof targetDark === 'boolean' ? targetDark : !this.isDark;
        this.saveTheme(goingDark ? 'dark' : 'light');

        const overlay = document.createElement('div');
        overlay.className = ThemeManager.FADE_OVERLAY_CLASS;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add('active'));

        window.setTimeout(() => {
            this.applyTheme(goingDark, true);

            window.setTimeout(() => {
                overlay.classList.remove('active');
                window.setTimeout(() => overlay.remove(), ThemeManager.FADE_OVERLAY_CLEANUP_MS);
            }, ThemeManager.FADE_OVERLAY_SETTLE_MS);
        }, ThemeManager.FADE_TOGGLE_DELAY_MS);
    }

    public applyTheme(dark: boolean, persist: boolean = true): void {
        this.isDark = dark;

        // Disable transitions temporarily on body and html to prevent flash
        this.body.style.transition = 'none';
        document.documentElement.style.transition = 'none';

        if (dark) {
            document.documentElement.classList.add(this.DARK_CLASS);
            document.documentElement.setAttribute('data-theme', 'dark');
            this.body.classList.add(this.DARK_CLASS);
        } else {
            document.documentElement.classList.remove(this.DARK_CLASS);
            document.documentElement.setAttribute('data-theme', 'light');
            this.body.classList.remove(this.DARK_CLASS);
        }

        // Keep accessibility tags and titles updated on toggle buttons
        this.updateToggleA11y(dark);

        // Force reflow
        void this.body.offsetWidth;

        // Re-enable transitions after a tiny delay
        setTimeout(() => {
            this.body.style.transition = '';
            document.documentElement.style.transition = '';
        }, 50);

        if (persist) {
            this.saveTheme(dark ? 'dark' : 'light');
        }

        // Dispatch themechange event for any listeners
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: dark ? 'dark' : 'light', isDark: dark }
        }));
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
        return this.isDark || this.body.classList.contains(this.DARK_CLASS);
    }
}

