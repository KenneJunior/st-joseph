/**
 * ============================================================================
 * SJCCC – Timeline Milestones Staggered Entrance Controller
 * (TimelineStaggerEntrance.ts)
 * 
 * Provides a fluid, hardware-accelerated staggered entrance animation for
 * academic milestones within '.timeline-track-container'.
 * 
 * Features:
 * - Dual Scroll-Context Discovery:
 *   1) Page Scroll: Stagger cascades when '.timeline-track-container' scrolls
 *      into the browser window viewport.
 *   2) Track Scroll: As the user scrolls (or drags) inside the container,
 *      upcoming milestones animate into view in sequence.
 * - Dynamic Stagger Delay calculation with CSS custom property (--milestone-delay)
 * - Coordinated Node Marker pop & glow synchronization
 * - Progressive Disclosure & Filter Synergy: Smooth staggered cascades on filter/expand
 * - Full WCAG AA prefers-reduced-motion compliance
 * - Safe fallbacks for SSR, JSDOM, and non-supporting environments
 * ============================================================================
 */

export interface TimelineStaggerOptions {
    /** Target scrollable container element or CSS selector */
    container?: HTMLElement | string;
    /** Selector for milestone card elements within container */
    itemSelector?: string;
    /** Base stagger delay between sequential cards in milliseconds (default: 85ms) */
    baseDelay?: number;
    /** Maximum cumulative delay cap in milliseconds to avoid long waits (default: 420ms) */
    maxDelayCap?: number;
    /** Margin offset for window viewport intersection (default: '0px 0px -40px 0px') */
    windowRootMargin?: string;
    /** Intersection threshold for window detection (default: 0.1) */
    windowThreshold?: number;
}

export class TimelineStaggerEntrance {
    private readonly container: HTMLElement | null;
    private readonly itemSelector: string;
    private readonly baseDelay: number;
    private readonly maxDelayCap: number;
    private readonly windowRootMargin: string;
    private readonly windowThreshold: number;

    private isWindowIntersecting: boolean = false;
    private isInitialized: boolean = false;
    private windowObserver: IntersectionObserver | null = null;
    private itemObserver: IntersectionObserver | null = null;
    private boundScrollHandler: (() => void) | null = null;
    private boundResizeHandler: (() => void) | null = null;
    private rafId: number | null = null;

    constructor(options: TimelineStaggerOptions | string | HTMLElement = {}) {
        let opts: TimelineStaggerOptions;
        if (typeof options === 'string' || (typeof HTMLElement !== 'undefined' && options instanceof HTMLElement)) {
            opts = { container: options };
        } else {
            opts = options as TimelineStaggerOptions;
        }

        if (typeof opts.container === 'string') {
            this.container = (typeof document !== 'undefined')
                ? document.querySelector<HTMLElement>(opts.container)
                : null;
        } else if (opts.container && typeof (opts.container as any).addEventListener === 'function') {
            this.container = opts.container as HTMLElement;
        } else {
            this.container = (typeof document !== 'undefined')
                ? document.querySelector<HTMLElement>('.timeline-track-container')
                : null;
        }

        this.itemSelector = opts.itemSelector ?? '.timeline-milestone';
        this.baseDelay = opts.baseDelay ?? 85;
        this.maxDelayCap = opts.maxDelayCap ?? 420;
        this.windowRootMargin = opts.windowRootMargin ?? '0px 0px -40px 0px';
        this.windowThreshold = opts.windowThreshold ?? 0.1;

        if (this.container) {
            this.init();
        }
    }

    /**
     * Initializes the staggered entrance observers and container state.
     */
    public init(): void {
        if (this.isInitialized || !this.container) return;
        this.isInitialized = true;

        // Apply marker class to enable stagger styles in CSS
        this.container.classList.add('has-stagger-observer');

        // Accessibility check: instantly reveal all if reduced motion is requested
        if (this.prefersReducedMotion()) {
            this.revealAllInstantly();
            return;
        }

        // Check if environment supports IntersectionObserver
        if (typeof window !== 'undefined' && typeof IntersectionObserver === 'function') {
            this.setupWindowObserver();
            this.setupItemObserver();
        } else {
            // Fallback for non-observer environments
            this.revealAllInstantly();
            return;
        }

        // Add container scroll and window resize listeners with RAF throttling
        this.setupScrollListener();
    }

    /**
     * Window viewport observer detects when the timeline container scrolls into view.
     */
    private setupWindowObserver(): void {
        if (!this.container || typeof window === 'undefined') return;

        try {
            this.windowObserver = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            this.isWindowIntersecting = true;
                            this.checkAndStaggerVisible();
                        } else {
                            // Container scrolled out of view
                            this.isWindowIntersecting = false;
                        }
                    }
                },
                {
                    root: null, // window viewport
                    rootMargin: this.windowRootMargin,
                    threshold: this.windowThreshold,
                }
            );

            this.windowObserver.observe(this.container);
        } catch {
            this.isWindowIntersecting = true;
            this.checkAndStaggerVisible();
        }
    }

    /**
     * Item-level observer for milestones scrolling inside the container.
     */
    private setupItemObserver(): void {
        if (!this.container || typeof window === 'undefined') return;

        try {
            this.itemObserver = new IntersectionObserver(
                (entries) => {
                    if (!this.isWindowIntersecting) return;

                    let batchIndex = 0;
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            const milestone = entry.target as HTMLElement;
                            if (!milestone.classList.contains('is-entered')) {
                                this.enterMilestone(milestone, batchIndex);
                                batchIndex++;
                                this.itemObserver?.unobserve(milestone);
                            }
                        }
                    }
                },
                {
                    root: this.container,
                    rootMargin: '0px 0px 30px 0px',
                    threshold: 0.05,
                }
            );

            this.observeUnenteredItems();
        } catch {
            this.checkAndStaggerVisible();
        }
    }

    /**
     * Subscribes all visible (non-hidden, non-entered) milestone items to itemObserver.
     */
    private observeUnenteredItems(): void {
        if (!this.container || !this.itemObserver) return;

        const milestones = this.container.querySelectorAll<HTMLElement>(
            `${this.itemSelector}:not(.timeline-hidden):not(.is-entered)`
        );

        milestones.forEach((item) => {
            this.itemObserver?.observe(item);
        });
    }

    /**
     * Listens to scroll events on container and window to coordinate discovery.
     */
    private setupScrollListener(): void {
        if (!this.container || typeof window === 'undefined') return;

        this.boundScrollHandler = () => {
            if (this.rafId !== null) return;
            this.rafId = window.requestAnimationFrame(() => {
                this.rafId = null;
                if (this.isWindowIntersecting) {
                    this.checkAndStaggerVisible();
                } else {
                    this.verifyWindowIntersectionManual();
                }
            });
        };

        this.boundResizeHandler = () => {
            if (this.rafId !== null) return;
            this.rafId = window.requestAnimationFrame(() => {
                this.rafId = null;
                this.checkAndStaggerVisible();
            });
        };

        this.container.addEventListener('scroll', this.boundScrollHandler, { passive: true });
        window.addEventListener('scroll', this.boundScrollHandler, { passive: true });
        window.addEventListener('resize', this.boundResizeHandler, { passive: true });
    }

    /**
     * Fallback geometry check if window observer hasn't fired or during rapid scrolling.
     */
    private verifyWindowIntersectionManual(): boolean {
        if (!this.container || typeof window === 'undefined') return false;

        const rect = this.container.getBoundingClientRect();
        const isInWindow = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInWindow) {
            this.isWindowIntersecting = true;
            this.checkAndStaggerVisible();
        }
        return isInWindow;
    }

    /**
     * Checks all currently visible milestone cards inside the container that
     * have not yet entered, and triggers them in a staggered cascade.
     */
    public checkAndStaggerVisible(): void {
        if (!this.container) return;

        // Verify if window is intersecting if not already flagged
        if (!this.isWindowIntersecting && !this.verifyWindowIntersectionManual()) {
            return;
        }

        const unenteredItems = Array.from(
            this.container.querySelectorAll<HTMLElement>(
                `${this.itemSelector}:not(.timeline-hidden):not(.is-entered)`
            )
        );

        if (unenteredItems.length === 0) return;

        const containerRect = this.container.getBoundingClientRect();
        const visibleUnentered: HTMLElement[] = [];

        // Check which unentered items fall inside container visible area (with generous buffer)
        unenteredItems.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            // Card is visible inside container viewport or within buffer of next 150px
            const isVisibleInContainer =
                itemRect.bottom >= containerRect.top - 20 &&
                itemRect.top <= containerRect.bottom + 100;

            if (isVisibleInContainer) {
                visibleUnentered.push(item);
            }
        });

        // Trigger staggered entrance on visible items
        visibleUnentered.forEach((item, index) => {
            this.enterMilestone(item, index);
            if (this.itemObserver) {
                this.itemObserver.unobserve(item);
            }
        });
    }

    /**
     * Animates an individual milestone card into view with the calculated stagger delay.
     */
    public enterMilestone(item: HTMLElement, staggerIndex: number = 0): void {
        const delay = Math.min(staggerIndex * this.baseDelay, this.maxDelayCap);
        item.style.setProperty('--milestone-delay', `${delay}ms`);
        item.style.animationDelay = `${delay}ms`;

        item.classList.add('is-entered');
        item.classList.add('revealed');

        // Clean up will-change after animation settles to optimize GPU memory
        const totalDuration = delay + 600;
        window.setTimeout(() => {
            if (item.classList.contains('is-entered')) {
                item.style.willChange = 'auto';
            }
        }, totalDuration);
    }

    /**
     * Called whenever active filters change or disclosure ('View Full Calendar') toggles.
     * Re-observes unentered items and triggers a fresh staggered wave for newly revealed cards.
     */
    public onFilterOrDisclosureChange(): void {
        if (!this.container) return;

        // If reduced motion is requested, instantly reveal matching items
        if (this.prefersReducedMotion()) {
            this.revealAllInstantly();
            return;
        }

        // Re-subscribe any newly unhidden milestones
        this.observeUnenteredItems();

        // Stagger entrance on visible matching cards
        window.requestAnimationFrame(() => {
            this.checkAndStaggerVisible();
        });
    }

    /**
     * Reveals all non-hidden milestones instantly without delay or animation.
     */
    public revealAllInstantly(): void {
        if (!this.container) return;

        const items = this.container.querySelectorAll<HTMLElement>(
            `${this.itemSelector}:not(.timeline-hidden)`
        );

        items.forEach((item) => {
            item.style.removeProperty('--milestone-delay');
            item.style.animationDelay = '';
            item.style.willChange = 'auto';
            item.classList.add('is-entered');
            item.classList.add('revealed');
        });
    }

    private prefersReducedMotion(): boolean {
        return (
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
    }

    /**
     * Cleans up observers and event listeners.
     */
    public destroy(): void {
        if (this.windowObserver) {
            this.windowObserver.disconnect();
            this.windowObserver = null;
        }

        if (this.itemObserver) {
            this.itemObserver.disconnect();
            this.itemObserver = null;
        }

        if (this.rafId !== null && typeof window !== 'undefined') {
            window.cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.container && this.boundScrollHandler) {
            this.container.removeEventListener('scroll', this.boundScrollHandler);
        }

        if (typeof window !== 'undefined') {
            if (this.boundScrollHandler) {
                window.removeEventListener('scroll', this.boundScrollHandler);
            }
            if (this.boundResizeHandler) {
                window.removeEventListener('resize', this.boundResizeHandler);
            }
        }

        this.container?.classList.remove('has-stagger-observer');
        this.isInitialized = false;
    }
}
