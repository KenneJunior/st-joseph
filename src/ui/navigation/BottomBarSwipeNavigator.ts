/**
 * ============================================================================
 * SJCCC – Mobile Bottom Bar Swipe Navigator
 * Enables horizontal swipe gestures to switch between bottom navigation tabs
 * on mobile devices (< 768px).
 *
 * Supports:
 * - Direct swipe gestures on the bottom dock pill (#mobileBottomBar)
 * - Fluid horizontal page swipes across the mobile viewport
 * - Angle-locked horizontal dominance detection to prevent vertical scroll conflicts
 * - Interactive element exclusion (carousels, timeline scrubbers, interactive maps, dialogs)
 * - Seamless synchronization with DockGlider and ScrollSpy
 * ============================================================================
 */

import { DockGlider } from './DockGlider.ts';
import { ScrollSpy } from './ScrollSpy.ts';

export interface SwipeNavigatorOptions {
    minSwipeDistance?: number;
    maxSwipeDurationMs?: number;
    horizontalRatioThreshold?: number;
}

export class BottomBarSwipeNavigator {
    public static instance: BottomBarSwipeNavigator | null = null;

    private readonly bottomBar: HTMLElement | null;
    private readonly minDistance: number;
    private readonly maxDuration: number;
    private readonly horizontalRatio: number;

    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;
    private isTracking: boolean = false;
    private isGestureOnDock: boolean = false;

    private boundTouchStart: (e: TouchEvent) => void;
    private boundTouchMove: (e: TouchEvent) => void;
    private boundTouchEnd: (e: TouchEvent) => void;
    private boundTouchCancel: () => void;

    constructor(
        bottomBar: HTMLElement | string = 'mobileBottomBar',
        options: SwipeNavigatorOptions = {}
    ) {
        BottomBarSwipeNavigator.instance = this;

        this.bottomBar = typeof bottomBar === 'string'
            ? document.getElementById(bottomBar)
            : bottomBar;

        this.minDistance = options.minSwipeDistance ?? 40;
        this.maxDuration = options.maxSwipeDurationMs ?? 450;
        this.horizontalRatio = options.horizontalRatioThreshold ?? 1.4;

        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundTouchCancel = this.handleTouchCancel.bind(this);

        this.init();
    }

    private init(): void {
        if (!this.bottomBar || typeof window === 'undefined') return;

        // 1. Direct gesture listener on the bottom navigation dock pill
        this.bottomBar.addEventListener('touchstart', this.boundTouchStart, { passive: true });
        this.bottomBar.addEventListener('touchmove', this.boundTouchMove, { passive: true });
        this.bottomBar.addEventListener('touchend', this.boundTouchEnd, { passive: true });
        this.bottomBar.addEventListener('touchcancel', this.boundTouchCancel, { passive: true });

        // 2. Viewport gesture listener on document body for mobile page-wide swipe navigation
        document.addEventListener('touchstart', this.boundTouchStart, { passive: true });
        document.addEventListener('touchmove', this.boundTouchMove, { passive: true });
        document.addEventListener('touchend', this.boundTouchEnd, { passive: true });
        document.addEventListener('touchcancel', this.boundTouchCancel, { passive: true });
    }

    /**
     * Returns true if the bottom bar is currently visible on screen.
     */
    public isDockActive(): boolean {
        if (!this.bottomBar) return false;
        return typeof window !== 'undefined' &&
            window.innerWidth < 768 &&
            this.bottomBar.offsetWidth > 0 &&
            this.bottomBar.offsetHeight > 0;
    }

    /**
     * Returns all interactive items in the bottom navigation bar.
     */
    public getNavItems(): HTMLElement[] {
        if (!this.bottomBar) return [];
        return Array.from(
            this.bottomBar.querySelectorAll<HTMLElement>('.mobile-bottom-item')
        ).filter((item) => {
            const style = window.getComputedStyle(item);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }

    /**
     * Determines the zero-based index of the currently active bottom navigation item.
     */
    public getCurrentIndex(): number {
        const items = this.getNavItems();
        if (items.length === 0) return 0;

        const activeIdx = items.findIndex((item) =>
            item.classList.contains('active') ||
            item.getAttribute('aria-current') === 'location'
        );

        return activeIdx !== -1 ? activeIdx : 0;
    }

    /**
     * Navigates to the next bottom navigation tab.
     */
    public nextTab(): boolean {
        const items = this.getNavItems();
        if (items.length <= 1) return false;

        const currentIdx = this.getCurrentIndex();
        if (currentIdx < items.length - 1) {
            this.goToItem(items[currentIdx + 1]);
            return true;
        }
        return false;
    }

    /**
     * Navigates to the previous bottom navigation tab.
     */
    public prevTab(): boolean {
        const items = this.getNavItems();
        if (items.length <= 1) return false;

        const currentIdx = this.getCurrentIndex();
        if (currentIdx > 0) {
            this.goToItem(items[currentIdx - 1]);
            return true;
        }
        return false;
    }

    /**
     * Navigates directly to a target bottom bar item element.
     */
    public goToItem(targetItem: HTMLElement): void {
        if (!targetItem) return;

        // If target is an anchor link to an in-page section
        if (targetItem.tagName.toLowerCase() === 'a') {
            const href = targetItem.getAttribute('href');
            const dataTarget = targetItem.getAttribute('data-nav-target');

            if (href?.startsWith('#')) {
                const sectionId = href.replace(/^#/, '') || dataTarget || '';
                const targetSection = document.getElementById(sectionId);

                if (targetSection) {
                    if (ScrollSpy.instance) {
                        ScrollSpy.instance.lockActiveTarget(sectionId, 850);
                    }

                    this.updateActiveItem(targetItem);

                    const headerEl = document.getElementById('mainHeader');
                    const headerHeight = headerEl ? headerEl.offsetHeight : 56;
                    const targetY = targetSection.getBoundingClientRect().top + window.scrollY - headerHeight + 2;

                    window.scrollTo({
                        top: Math.max(0, targetY),
                        behavior: 'smooth',
                    });
                } else {
                    this.updateActiveItem(targetItem);
                }
            } else if (href && !href.startsWith('#')) {
                // External navigation target (e.g. /prospectus.html)
                this.updateActiveItem(targetItem);
                const isTest = typeof process !== 'undefined' && process.env && (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST));
                if (!isTest && typeof window !== 'undefined' && window.location) {
                    window.location.href = href;
                }
            } else {
                this.updateActiveItem(targetItem);
            }
        } else {
            // Target is an interactive button (Reminders, Theme, Menu)
            this.updateActiveItem(targetItem);
            targetItem.click();
        }

        // Haptic feedback on modern touch devices
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                navigator.vibrate(14);
            } catch {
                // Ignore if not permitted
            }
        }
    }

    private updateActiveItem(targetItem: HTMLElement): void {
        const items = this.getNavItems();
        items.forEach((item) => {
            const isActive = item === targetItem;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'location');
            } else {
                item.removeAttribute('aria-current');
            }
        });

        DockGlider.instance?.update(targetItem);
    }

    private handleTouchStart(e: TouchEvent): void {
        if (!this.isDockActive()) return;
        if (e.touches.length !== 1) {
            this.isTracking = false;
            return;
        }

        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Check if gesture originated directly on the bottom dock
        this.isGestureOnDock = Boolean(this.bottomBar?.contains(target));

        // If gesture originated on the page body, ignore if inside interactive elements
        if (!this.isGestureOnDock && this.isInteractiveElement(target)) {
            this.isTracking = false;
            return;
        }

        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
        this.isTracking = true;
    }

    private handleTouchMove(e: TouchEvent): void {
        if (!this.isTracking || e.touches.length !== 1) return;

        // If gesture originated on the bottom bar and is predominantly horizontal,
        // prevent page scroll interference
        if (this.isGestureOnDock) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = Math.abs(currentX - this.touchStartX);
            const deltaY = Math.abs(currentY - this.touchStartY);

            if (deltaX > deltaY && deltaX > 8 && e.cancelable) {
                e.preventDefault();
            }
        }
    }

    private handleTouchEnd(e: TouchEvent): void {
        if (!this.isTracking) return;
        this.isTracking = false;

        const touch = e.changedTouches[0];
        if (!touch) return;

        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const elapsed = Date.now() - this.touchStartTime;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Verify valid swipe gesture
        const isValidDistance = absX >= this.minDistance;
        const isValidTime = elapsed <= this.maxDuration;
        const isHorizontalDominant = absX > (absY * this.horizontalRatio);

        if (isValidDistance && isValidTime && isHorizontalDominant) {
            if (deltaX < 0) {
                // Swipe Left -> Next Tab
                this.nextTab();
            } else {
                // Swipe Right -> Previous Tab
                this.prevTab();
            }
        }
    }

    private handleTouchCancel(): void {
        this.isTracking = false;
        this.isGestureOnDock = false;
    }

    /**
     * Checks if a touch event target is an interactive child that handles its own drag/touch gestures.
     */
    private isInteractiveElement(el: HTMLElement): boolean {
        // Exclude carousels, timeline drag scrollers, interactive maps, modals, form inputs
        return Boolean(
            el.closest(
                '.carousel-container, #mainCarousel, .timeline-track-container, ' +
                '.timeline-milestones-track, #campusMapEmbed, .map-container, ' +
                'dialog[open], .my-reminders-overlay, .enquiry-modal.is-active, ' +
                'input, textarea, select, button[data-interactive]'
            ) ||
            document.body.classList.contains('drawer-open')
        );
    }

    public destroy(): void {
        if (this.bottomBar) {
            this.bottomBar.removeEventListener('touchstart', this.boundTouchStart);
            this.bottomBar.removeEventListener('touchmove', this.boundTouchMove);
            this.bottomBar.removeEventListener('touchend', this.boundTouchEnd);
            this.bottomBar.removeEventListener('touchcancel', this.boundTouchCancel);
        }

        document.removeEventListener('touchstart', this.boundTouchStart);
        document.removeEventListener('touchmove', this.boundTouchMove);
        document.removeEventListener('touchend', this.boundTouchEnd);
        document.removeEventListener('touchcancel', this.boundTouchCancel);

        BottomBarSwipeNavigator.instance = null;
    }
}
