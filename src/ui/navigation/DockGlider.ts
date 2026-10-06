/**
 * ============================================================================
 * SJCCC – Mobile Bottom Dock Gliding Indicator Controller
 * Provides an organic gliding transition for the active pill in the floating
 * glass bottom dock (#mobileBottomBar).
 *
 * Instead of disappearing and popping into place, the pill smoothly slides
 * across tabs using GPU-accelerated translate3d transforms and synchronized
 * dimension tracking.
 * ============================================================================
 */

export class DockGlider {
    public static instance: DockGlider | null = null;

    private readonly bottomBar: HTMLElement | null;
    private glider: HTMLElement | null = null;
    private hasInitialized: boolean = false;
    private resizeObserver: ResizeObserver | null = null;
    private rafId: number | null = null;
    private currentTarget: HTMLElement | null = null;

    constructor(bottomBarId: string = 'mobileBottomBar') {
        DockGlider.instance = this;
        this.bottomBar = document.getElementById(bottomBarId);
        if (!this.bottomBar) return;

        this.init();
    }

    private init(): void {
        if (!this.bottomBar) return;

        this.ensureGlider();

        // Check if bottom bar is already visible and sync initial position
        requestAnimationFrame(() => {
            this.syncInitialState();
        });

        // Window resize and orientation listeners
        window.addEventListener('resize', () => this.scheduleUpdate(true), { passive: true });
        window.addEventListener('orientationchange', () => this.scheduleUpdate(true), { passive: true });

        // Responsive dock resize observer (detects when media queries show/hide or resize the dock)
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.scheduleUpdate(true);
            });
            this.resizeObserver.observe(this.bottomBar);
        }
    }

    private ensureGlider(): void {
        if (this.glider || !this.bottomBar) return;
        this.glider = this.bottomBar.querySelector<HTMLElement>('#mobileBottomGlider, .mobile-bottom-glider');
        if (!this.glider) {
            this.glider = document.createElement('div');
            this.glider.id = 'mobileBottomGlider';
            this.glider.className = 'mobile-bottom-glider';
            this.glider.setAttribute('aria-hidden', 'true');
            this.bottomBar.prepend(this.glider);
        }
    }

    private syncInitialState(): void {
        if (!this.bottomBar) return;
        const isVisible = this.bottomBar.offsetWidth > 0 && this.bottomBar.offsetHeight > 0;
        if (!isVisible) {
            if (this.glider) this.glider.style.opacity = '0';
            return;
        }

        const active = this.findActiveItem();
        if (active && active.offsetWidth > 0) {
            this.update(active, true);
        }
    }

    private findActiveItem(): HTMLElement | null {
        if (!this.bottomBar) return null;
        return this.bottomBar.querySelector<HTMLElement>(
            'a.mobile-bottom-item.active, button.mobile-bottom-item.active, .mobile-bottom-item[aria-current="location"]'
        );
    }

    public scheduleUpdate(immediate: boolean = false): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
        }
        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            if (!this.bottomBar) return;

            const isVisible = this.bottomBar.offsetWidth > 0 && this.bottomBar.offsetHeight > 0;
            if (!isVisible) {
                if (this.glider) this.glider.style.opacity = '0';
                return;
            }

            const active = this.currentTarget || this.findActiveItem();
            if (active && active.offsetWidth > 0) {
                this.update(active, immediate);
            }
        });
    }

    /**
     * Glides the active pill smoothly to the specified item or current active element.
     * Horizontal translation is GPU-accelerated and retains continuous visibility
     * so that the pill glides seamlessly between sections instead of disappearing/reappearing.
     */
    public update(targetItem?: HTMLElement | null, immediate: boolean = false): void {
        if (!this.bottomBar) return;
        this.ensureGlider();
        if (!this.glider) return;

        const isVisible = this.bottomBar.offsetWidth > 0 && this.bottomBar.offsetHeight > 0;
        if (!isVisible) {
            this.glider.style.opacity = '0';
            return;
        }

        const active = targetItem || this.findActiveItem();

        if (!active || active.offsetWidth === 0 || active.offsetHeight === 0) {
            this.glider.style.opacity = '0';
            this.currentTarget = null;
            return;
        }

        const barRect = this.bottomBar.getBoundingClientRect();
        const itemRect = active.getBoundingClientRect();

        const x = Math.round(itemRect.left - barRect.left);
        const width = Math.round(itemRect.width);

        if (immediate || !this.hasInitialized) {
            this.glider.style.transition = 'none';
            this.glider.style.transform = `translate3d(${x}px, 0, 0)`;
            this.glider.style.width = `${width}px`;
            this.glider.style.opacity = '1';
            this.hasInitialized = true;
            this.currentTarget = active;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (this.glider) {
                        this.glider.style.transition = '';
                    }
                });
            });
            return;
        }

        // Smooth continuous gliding transition to target item
        this.glider.style.transform = `translate3d(${x}px, 0, 0)`;
        this.glider.style.width = `${width}px`;
        this.glider.style.opacity = '1';
        this.currentTarget = active;
    }

    public destroy(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
        }
        this.resizeObserver?.disconnect();
        DockGlider.instance = null;
    }
}
