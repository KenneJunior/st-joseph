/**
 * ============================================================================
 * SJCCC – Header & Mobile Bottom Bar Scroll Controller
 * Manages:
 * - Sticky header blur & dynamic blur intensity
 * - Dynamic --header-height CSS variable
 * - Back-to-top button visibility
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

    // Direction and pivot tracking for hysteresis
    private scrollPivotY: number = 0;
    private currentDirection: 'up' | 'down' | 'none' = 'none';

    // User gesture detection: guarantees the bar never hides/reveals while user is reading without touching
    private isUserGesture: boolean = false;
    private userGestureTimer: number | null = null;

    constructor(
        private header: HTMLElement,
        private backToTopBtn: HTMLElement | null = null,
        bottomBar: HTMLElement | null = null
    ) {
        this.bottomBar = bottomBar ?? document.getElementById('mobileBottomBar');
        this.init();
    }

    private init(): void {
        const initialScrollY = Math.max(0, window.scrollY);
        this.lastScrollY = initialScrollY;
        this.scrollPivotY = initialScrollY;

        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('touchstart', this.onTouchStart, { passive: true });
        window.addEventListener('touchmove', this.onTouchMove, { passive: true });
        window.addEventListener('touchend', this.onTouchEnd, { passive: true });
        window.addEventListener('wheel', this.onWheel, { passive: true });
        window.addEventListener('keydown', this.onKeyDown, { passive: true });

        this.onScroll();

        this.backToTopBtn?.addEventListener('click', () => {
            this.notifyProgrammaticScroll();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

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

            if (currentScrollY <= HeaderScroll.TOP_PAGE_THRESHOLD_PX) {
                // Near top of page: always visible and reset hysteresis pivot
                this.isBottomBarHidden = false;
                this.currentDirection = 'none';
                this.scrollPivotY = currentScrollY;
            } else if (isDrawerOpen || isFocusInBar || this.isProgrammaticScroll) {
                // Focus, drawer, or programmatic scroll active: keep visible and update pivot
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
            window.requestAnimationFrame(() => {
                // Progressive blur - add/remove scrolled class
                this.header.classList.toggle('scrolled', this.lastScrollY > 60);

                // Dynamic blur intensity based on scroll position
                const blurIntensity = Math.min(15, 5 + (this.lastScrollY / 500));
                this.header.style.setProperty('--blur-intensity', `${blurIntensity}px`);

                // Back to top button visibility
                this.backToTopBtn?.classList.toggle('visible', this.lastScrollY > 500);

                // Mobile bottom bar visibility class
                if (this.bottomBar) {
                    this.bottomBar.classList.toggle('bottom-bar--hidden', this.isBottomBarHidden);
                }

                this.ticking = false;
            });
            this.ticking = true;
        }

        // Update header height CSS variable for layout calculations
        this.updateHeaderHeight();
    };

    private updateHeaderHeight(): void {
        const headerHeight = this.header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
}
