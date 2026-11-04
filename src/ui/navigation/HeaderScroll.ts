/**
 * ============================================================================
 * SJCCC – Header & Mobile Bottom Bar Scroll Controller
 * Manages:
 * - Sticky header blur & dynamic blur intensity
 * - Dynamic --header-height CSS variable
 * - Mobile bottom bar scroll-direction hide/reveal with directional hysteresis:
 *   12px downward and 8px upward thresholds to ensure stability during small movements,
 *   user-gesture discrimination to eliminate phantom hiding while reading,
 *   top-of-page safety, bottom overscroll clamping, programmatic scroll guard,
 *   and focus/drawer protection
 * ============================================================================
 */

export class HeaderScroll {
    private ticking: boolean = false;
    private lastScrollY: number = 0;
    private bottomBar: HTMLElement | null = null;
    private isBottomBarHidden: boolean = false;
    private isProgrammaticScroll: boolean = false;
    private programmaticScrollTimer: number | null = null;

    // Directional hysteresis thresholds
    public static readonly DOWNWARD_THRESHOLD_PX: number = 12;
    public static readonly UPWARD_THRESHOLD_PX: number = 8;
    public static readonly TOP_PAGE_THRESHOLD_PX: number = 80;

    // Header scrolled class hysteresis thresholds (activating at 70px, deactivating at 50px)
    public static readonly SCROLLED_ACTIVATION_THRESHOLD_PX: number = 70;
    public static readonly SCROLLED_DEACTIVATION_THRESHOLD_PX: number = 50;
    public static readonly SCROLLED_ENTER_THRESHOLD_PX: number = 70;
    public static readonly SCROLLED_EXIT_THRESHOLD_PX: number = 50;
    public static readonly BLUR_RAMP_DISTANCE_PX: number = 150;
    public static readonly MIN_BLUR_PX: number = 3;
    public static readonly MAX_BLUR_PX: number = 8;

    // Direction and pivot tracking for hysteresis
    private scrollPivotY: number = 0;
    private currentDirection: 'up' | 'down' | 'none' = 'none';

    // User gesture detection: guarantees the bar never hides/reveals while user is reading without touching
    private isUserGesture: boolean = false;
    private userGestureTimer: number | null = null;

    // Cached layout geometry and blur progress to eliminate forced reflows during scrolling
    private cachedHeaderHeight: number = 0;
    private cachedBlurProgress: number = 0;
    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private header: HTMLElement,
        bottomBar: HTMLElement | null = null
    ) {
        this.bottomBar = bottomBar ?? document.getElementById('mobileBottomBar');
        this.init();
    }

    private init(): void {
        const initialScrollY = Math.max(0, window.scrollY);
        this.lastScrollY = initialScrollY;
        this.scrollPivotY = initialScrollY;

        // Event-driven geometry observer: caches header height and mutates --header-height
        // ONLY upon genuine element size changes, eliminating forced reflows on scroll events
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.syncHeaderHeight();
            });
            this.resizeObserver.observe(this.header);
            const announcementEl = document.getElementById('announcementBar');
            if (announcementEl) {
                this.resizeObserver.observe(announcementEl);
            }
        }
        this.syncHeaderHeight();

        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('touchstart', this.onTouchStart, { passive: true });
        window.addEventListener('touchmove', this.onTouchMove, { passive: true });
        window.addEventListener('touchend', this.onTouchEnd, { passive: true });
        window.addEventListener('wheel', this.onWheel, { passive: true });
        window.addEventListener('keydown', this.onKeyDown, { passive: true });

        this.onScroll();

        // Guard anchor link clicks in bottom bar from triggering downward hide
        this.bottomBar?.querySelectorAll('a').forEach((anchor) => {
            anchor.addEventListener('click', () => {
                this.notifyProgrammaticScroll();
            });
        });
    }

    private markUserGestureActive = (lingerMs: number = 800): void => {
        this.isUserGesture = true;
        if (this.userGestureTimer !== null) {
            window.clearTimeout(this.userGestureTimer);
        }
        this.userGestureTimer = window.setTimeout(() => {
            this.isUserGesture = false;
            // Settle pivot at current resting position when user gesture ends
            this.scrollPivotY = Math.max(0, window.scrollY);
            this.lastScrollY = this.scrollPivotY;
        }, lingerMs);
    };

    private onTouchStart = (): void => {
        this.isUserGesture = true;
        if (this.userGestureTimer !== null) {
            window.clearTimeout(this.userGestureTimer);
            this.userGestureTimer = null;
        }
    };

    private onTouchMove = (): void => {
        this.isUserGesture = true;
    };

    private onTouchEnd = (): void => {
        // Linger to cover momentum/inertial scrolling after finger release
        this.markUserGestureActive(900);
    };

    private onWheel = (): void => {
        this.markUserGestureActive(450);
    };

    private onKeyDown = (e: KeyboardEvent): void => {
        const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'];
        if (scrollKeys.includes(e.key) || scrollKeys.includes(e.code)) {
            this.markUserGestureActive(600);
        }
    };

    /**
     * Temporarily locks the bottom bar in the visible state during programmatic smooth scrolling.
     */
    public notifyProgrammaticScroll(durationMs: number = 1200): void {
        this.isProgrammaticScroll = true;
        this.isBottomBarHidden = false;
        this.currentDirection = 'none';
        this.bottomBar?.classList.remove('bottom-bar--hidden');
        document.body.classList.remove('bottom-bar-hidden');
        document.documentElement.classList.remove('bottom-bar-hidden');
        const assistanceDock = document.getElementById('unifiedAssistanceDock');
        if (assistanceDock) {
            assistanceDock.classList.remove('dock-retracted');
            assistanceDock.classList.add('dock-pushed');
        }
        const quickMenu = document.getElementById('quickActionsMenu');
        if (quickMenu) {
            quickMenu.classList.remove('dock-retracted');
            quickMenu.classList.add('dock-pushed');
        }

        if (this.programmaticScrollTimer !== null) {
            window.clearTimeout(this.programmaticScrollTimer);
        }

        this.programmaticScrollTimer = window.setTimeout(() => {
            this.isProgrammaticScroll = false;
            const currentScrollY = Math.max(0, window.scrollY);
            this.lastScrollY = currentScrollY;
            this.scrollPivotY = currentScrollY;
        }, durationMs);
    }

    private onScroll = (): void => {
        const currentScrollY = Math.max(0, window.scrollY);
        const delta = currentScrollY - this.lastScrollY;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

        // 1. Process Bottom Bar Hysteresis Logic
        if (this.bottomBar) {
            const isDrawerOpen = document.body.classList.contains('drawer-open') ||
                document.getElementById('navMenu')?.classList.contains('active');
            const isFocusInBar = document.activeElement ? this.bottomBar.contains(document.activeElement) : false;
            const isQuickActionsOpen = Boolean(document.getElementById('quickActionsMenu')?.classList.contains('is-open'));
            const isAiWindowOpen = Boolean(document.querySelector('.sjccc-ai-window.is-open, .sjccc-ai-overlay.is-open'));

            if (currentScrollY <= HeaderScroll.TOP_PAGE_THRESHOLD_PX) {
                // Near top of page: always visible and reset hysteresis pivot
                this.isBottomBarHidden = false;
                this.currentDirection = 'none';
                this.scrollPivotY = currentScrollY;
            } else if (isDrawerOpen || isFocusInBar || isQuickActionsOpen || isAiWindowOpen || this.isProgrammaticScroll) {
                // Focus, drawer, quick actions menu, AI modal, or programmatic scroll active: keep visible and update pivot
                this.isBottomBarHidden = false;
                this.scrollPivotY = currentScrollY;
            } else if (currentScrollY >= maxScroll - 10) {
                // Overscroll / bounce at document bottom: ignore downward trigger to prevent bounce jitter
                this.scrollPivotY = currentScrollY;
            } else if (this.isUserGesture) {
                // ONLY evaluate hide/reveal transitions during active user scroll gestures
                if (delta > 0) {
                    // Moving DOWNWARD
                    if (this.currentDirection !== 'down') {
                        // Turnaround to downward: reset pivot
                        this.currentDirection = 'down';
                        this.scrollPivotY = this.lastScrollY;
                    }

                    // Check 12px downward hysteresis threshold
                    const downwardDistance = currentScrollY - this.scrollPivotY;
                    if (downwardDistance >= HeaderScroll.DOWNWARD_THRESHOLD_PX) {
                        this.isBottomBarHidden = true;
                    }
                } else if (delta < 0) {
                    // Moving UPWARD
                    if (this.currentDirection !== 'up') {
                        // Turnaround to upward: reset pivot
                        this.currentDirection = 'up';
                        this.scrollPivotY = this.lastScrollY;
                    }

                    // Check 8px upward hysteresis threshold
                    const upwardDistance = this.scrollPivotY - currentScrollY;
                    if (upwardDistance >= HeaderScroll.UPWARD_THRESHOLD_PX) {
                        this.isBottomBarHidden = false;
                    }
                }
            } else {
                // User is stationary reading (no touch/wheel gesture active):
                // Align the pivot so no background layout change can cause phantom movements
                this.scrollPivotY = currentScrollY;
            }
        }

        this.lastScrollY = currentScrollY;

        if (!this.ticking) {
            this.ticking = true;
            window.requestAnimationFrame(() => {
                // Progressive blur & glass state: add/remove .scrolled class with hysteresis
                // Activating at 70px, deactivating at 50px to eliminate boundary flickering
                const isCurrentlyScrolled = this.header.classList.contains('scrolled');
                const shouldBeScrolled = isCurrentlyScrolled
                    ? this.lastScrollY > HeaderScroll.SCROLLED_DEACTIVATION_THRESHOLD_PX
                    : this.lastScrollY >= HeaderScroll.SCROLLED_ACTIVATION_THRESHOLD_PX;

                if (isCurrentlyScrolled !== shouldBeScrolled) {
                    this.header.classList.toggle('scrolled', shouldBeScrolled);
                }

                // Continuous Progressive Blur:
                // Tracks continuous blur progression over BLUR_RAMP_DISTANCE_PX (150px) using quantized steps (0.05)
                // to eliminate layout reflows and micro-jitter while providing fluid scroll-depth blur.
                if (this.lastScrollY <= 0) {
                    if (this.cachedBlurProgress !== 0) {
                        this.cachedBlurProgress = 0;
                        this.header.style.removeProperty('--header-blur-progress');
                        this.header.style.removeProperty('--blur-intensity');
                    }
                } else {
                    const rawProgress = Math.min(1, Math.max(0, this.lastScrollY / HeaderScroll.BLUR_RAMP_DISTANCE_PX));
                    const quantizedProgress = Math.round(rawProgress * 20) / 20;
                    if (this.cachedBlurProgress !== quantizedProgress) {
                        this.cachedBlurProgress = quantizedProgress;
                        this.header.style.setProperty('--header-blur-progress', quantizedProgress.toFixed(2));
                        // Continuous dynamic blur ramp: faint at beginning (3px) and gently increases to at most 8px
                        const dynamicBlur = Math.round(
                            HeaderScroll.MIN_BLUR_PX +
                            (HeaderScroll.MAX_BLUR_PX - HeaderScroll.MIN_BLUR_PX) * quantizedProgress
                        );
                        this.header.style.setProperty('--blur-intensity', `${dynamicBlur}px`);
                    }
                }

                // Mobile bottom bar visibility class & twin floating dock push coordination
                if (this.bottomBar) {
                    this.bottomBar.classList.toggle('bottom-bar--hidden', this.isBottomBarHidden);
                    document.body.classList.toggle('bottom-bar-hidden', this.isBottomBarHidden);
                    document.documentElement.classList.toggle('bottom-bar-hidden', this.isBottomBarHidden);

                    const assistanceDock = document.getElementById('unifiedAssistanceDock');
                    if (assistanceDock) {
                        assistanceDock.classList.toggle('dock-retracted', this.isBottomBarHidden);
                        assistanceDock.classList.toggle('dock-pushed', !this.isBottomBarHidden);
                    }
                    const quickMenu = document.getElementById('quickActionsMenu');
                    if (quickMenu) {
                        quickMenu.classList.toggle('dock-retracted', this.isBottomBarHidden);
                        quickMenu.classList.toggle('dock-pushed', !this.isBottomBarHidden);
                    }
                }

                this.ticking = false;
            });
        }
    };

    /**
     * Synchronizes cached header height and sets --header-height
     * ONLY when the measured height genuinely changes.
     */
    public syncHeaderHeight(): void {
        const headerHeight = Math.round(this.header.offsetHeight);
        if (headerHeight > 0 && headerHeight !== this.cachedHeaderHeight) {
            this.cachedHeaderHeight = headerHeight;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

    public destroy(): void {
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('touchstart', this.onTouchStart);
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('touchend', this.onTouchEnd);
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('keydown', this.onKeyDown);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.userGestureTimer !== null) {
            window.clearTimeout(this.userGestureTimer);
            this.userGestureTimer = null;
        }
        if (this.programmaticScrollTimer !== null) {
            window.clearTimeout(this.programmaticScrollTimer);
            this.programmaticScrollTimer = null;
        }
        this.header?.style?.removeProperty?.('--header-blur-progress');
        this.header?.style?.removeProperty?.('--blur-intensity');
    }
}
