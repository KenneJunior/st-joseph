/**
 * ============================================================================
 * SJCCC – Timeline Drag-to-Scroll Controller (TimelineDragScroller.ts)
 * 
 * Provides a fluid, momentum-driven 'drag-to-scroll' interaction for the
 * academic milestones timeline track container across desktop mouse, stylus,
 * and touch devices.
 * 
 * Features:
 * - Unified Pointer Events (mouse, touch, pen) with robust drag tracking
 * - Configurable deadband threshold (default 5px) preserving click fidelity
 * - Click interception in capture phase to suppress button activation after dragging
 * - Kinetic momentum scrolling with exponential friction deceleration (inertia)
 * - Scroll boundary awareness with `.can-scroll-up` and `.can-scroll-down` edge cues
 * - Dynamic height synchronization for `.timeline-track-line` spine
 * - Accessible keyboard navigation (ArrowUp/Down, PageUp/Down, Home/End)
 * - Subtle drag hint affordance with automatic interaction-based fade
 * ============================================================================
 */

export interface TimelineDragScrollerOptions {
    /** Target scrollable container or selector (defaults to '.timeline-track-container') */
    container?: HTMLElement | string;
    /** Minimum movement in pixels before drag mode activates */
    dragThreshold?: number;
    /** Friction factor per animation frame (0 < friction < 1, defaults to 0.94) */
    friction?: number;
    /** Whether to enable keyboard arrow navigation when container is focused */
    enableKeyboard?: boolean;
}

interface VelocitySample {
    time: number;
    y: number;
    x: number;
}

export class TimelineDragScroller {
    private readonly container: HTMLElement | null;
    private readonly milestonesList: HTMLElement | null;
    private readonly spineLine: HTMLElement | null;
    private readonly dragHint: HTMLElement | null;

    private readonly dragThreshold: number;
    private readonly friction: number;
    private readonly enableKeyboard: boolean;

    private isPointerDown: boolean = false;
    private isDragging: boolean = false;
    private wasDragging: boolean = false;

    private startPointerX: number = 0;
    private startPointerY: number = 0;
    private startScrollTop: number = 0;
    private startScrollLeft: number = 0;

    private velocityHistory: VelocitySample[] = [];
    private momentumRafId: number | null = null;
    private resizeObserver: ResizeObserver | null = null;

    // Bound listeners for precise teardown
    private boundPointerDown: (e: PointerEvent) => void;
    private boundPointerMove: (e: PointerEvent) => void;
    private boundPointerUp: (e: PointerEvent) => void;
    private boundPointerCancel: (e: PointerEvent) => void;
    private boundClickCapture: (e: MouseEvent) => void;
    private boundScroll: () => void;
    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(options: TimelineDragScrollerOptions = {}) {
        if (typeof options.container === 'string') {
            this.container = (typeof document !== 'undefined') ? document.querySelector<HTMLElement>(options.container) : null;
        } else if (typeof HTMLElement !== 'undefined' && options.container instanceof HTMLElement) {
            this.container = options.container;
        } else if (options.container && typeof (options.container as any).addEventListener === 'function') {
            this.container = options.container as HTMLElement;
        } else {
            this.container = (typeof document !== 'undefined') ? document.querySelector<HTMLElement>('.timeline-track-container') : null;
        }

        this.dragThreshold = options.dragThreshold ?? 5;
        this.friction = options.friction ?? 0.94;
        this.enableKeyboard = options.enableKeyboard ?? true;

        this.milestonesList = this.container?.querySelector<HTMLElement>('.timeline-milestones-list') ?? null;
        this.spineLine = this.container?.querySelector<HTMLElement>('.timeline-track-line') ?? null;
        this.dragHint = document.getElementById('timelineDragHint') ??
            this.container?.querySelector<HTMLElement>('.timeline-drag-hint') ?? null;

        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundPointerUp = this.handlePointerUp.bind(this);
        this.boundPointerCancel = this.handlePointerCancel.bind(this);
        this.boundClickCapture = this.handleClickCapture.bind(this);
        this.boundScroll = this.handleScroll.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);

        if (this.container) {
            this.init();
        }
    }

    private init(): void {
        if (!this.container) return;

        // Enhance accessibility: enable focus & semantic region description
        if (!this.container.hasAttribute('tabindex')) {
            this.container.setAttribute('tabindex', '0');
        }
        if (!this.container.hasAttribute('role')) {
            this.container.setAttribute('role', 'region');
        }
        if (!this.container.hasAttribute('aria-label')) {
            this.container.setAttribute('aria-label', 'Academic milestones timeline (drag or scroll to navigate)');
        }

        // Pointer event listeners
        this.container.addEventListener('pointerdown', this.boundPointerDown);
        this.container.addEventListener('scroll', this.boundScroll, { passive: true });

        // Capture phase click listener on container to intercept accidental button triggers
        this.container.addEventListener('click', this.boundClickCapture, true);

        // Keyboard navigation
        if (this.enableKeyboard) {
            this.container.addEventListener('keydown', this.boundKeyDown);
        }

        // Sync initial scroll edge indicators and spine line height
        this.updateScrollIndicators();
        this.syncSpineLine();

        // Observe DOM size changes (e.g. accordion expansions, filters)
        if (typeof ResizeObserver !== 'undefined' && this.milestonesList) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateScrollIndicators();
                this.syncSpineLine();
            });
            this.resizeObserver.observe(this.milestonesList);
        }
    }

    /**
     * Pointerdown handler initiating tracking.
     */
    private handlePointerDown(e: PointerEvent): void {
        if (!this.container) return;

        // Only handle primary button (left mouse click) or touch/pen touches
        if (e.button !== 0) return;

        // Do not intercept if clicking inside an interactive form control (e.g. text search)
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            return;
        }

        this.stopMomentum();

        this.isPointerDown = true;
        this.isDragging = false;
        this.wasDragging = false;

        this.startPointerX = e.clientX;
        this.startPointerY = e.clientY;
        this.startScrollTop = this.container.scrollTop;
        this.startScrollLeft = this.container.scrollLeft;

        this.velocityHistory = [{
            time: performance.now(),
            y: e.clientY,
            x: e.clientX,
        }];

        // Attach global move/up handlers to window to ensure continuity outside container boundary
        window.addEventListener('pointermove', this.boundPointerMove, { passive: false });
        window.addEventListener('pointerup', this.boundPointerUp);
        window.addEventListener('pointercancel', this.boundPointerCancel);
    }

    /**
     * Pointermove handler calculating distance and performing active scrolling.
     */
    private handlePointerMove(e: PointerEvent): void {
        if (!this.isPointerDown || !this.container) return;

        const deltaX = e.clientX - this.startPointerX;
        const deltaY = e.clientY - this.startPointerY;
        const distance = Math.hypot(deltaX, deltaY);

        if (!this.isDragging) {
            if (distance >= this.dragThreshold) {
                this.isDragging = true;
                this.wasDragging = true;
                this.container.classList.add('is-dragging');
                this.hideDragHint();
            } else {
                return;
            }
        }

        // Prevent default native selection & dragging behavior while actively moving
        if (e.cancelable) {
            e.preventDefault();
        }

        // Primary vertical scroll
        this.container.scrollTop = this.startScrollTop - deltaY;

        // Horizontal scroll if container has horizontal overflow
        if (this.container.scrollWidth > this.container.clientWidth) {
            this.container.scrollLeft = this.startScrollLeft - deltaX;
        }

        // Record velocity sample for momentum calculation
        const now = performance.now();
        this.velocityHistory.push({ time: now, y: e.clientY, x: e.clientX });

        // Retain only samples within the last 120ms
        while (this.velocityHistory.length > 1 && now - this.velocityHistory[0].time > 120) {
            this.velocityHistory.shift();
        }

        this.updateScrollIndicators();
    }

    /**
     * Pointerup handler terminating drag and applying momentum.
     */
    private handlePointerUp(_e: PointerEvent): void {
        if (!this.isPointerDown || !this.container) return;

        this.isPointerDown = false;

        window.removeEventListener('pointermove', this.boundPointerMove);
        window.removeEventListener('pointerup', this.boundPointerUp);
        window.removeEventListener('pointercancel', this.boundPointerCancel);

        if (this.isDragging) {
            this.isDragging = false;
            this.container.classList.remove('is-dragging');

            // Calculate release velocity in pixels per millisecond
            let vy = 0;
            if (this.velocityHistory.length >= 2) {
                const oldest = this.velocityHistory[0];
                const newest = this.velocityHistory[this.velocityHistory.length - 1];
                const dt = newest.time - oldest.time;
                if (dt > 10 && dt < 250) {
                    vy = (newest.y - oldest.y) / dt;
                }
            }

            this.velocityHistory = [];

            // Apply momentum scrolling if velocity exceeds threshold
            if (Math.abs(vy) > 0.15) {
                // Invert because dragging down moves content down (scroll decreases)
                this.startMomentum(-vy * 16);
            }

            // Keep wasDragging true briefly so click capture can prevent accidental button activation
            window.setTimeout(() => {
                this.wasDragging = false;
            }, 80);
        } else {
            this.wasDragging = false;
            this.velocityHistory = [];
        }
    }

    private handlePointerCancel(_e: PointerEvent): void {
        this.handlePointerUp(_e);
    }

    /**
     * Intercepts and suppresses click events following a drag gesture.
     */
    private handleClickCapture(e: MouseEvent): void {
        if (this.wasDragging) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') {
                e.stopImmediatePropagation();
            }
            this.wasDragging = false;
        }
    }

    /**
     * Starts kinetic momentum scrolling with deceleration.
     */
    public startMomentum(initialVelocity: number): void {
        if (!this.container) return;

        this.stopMomentum();

        let currentVelocity = initialVelocity;
        const maxVelocity = 45;
        if (currentVelocity > maxVelocity) currentVelocity = maxVelocity;
        if (currentVelocity < -maxVelocity) currentVelocity = -maxVelocity;

        const step = () => {
            if (!this.container) return;

            if (Math.abs(currentVelocity) < 0.3) {
                this.momentumRafId = null;
                this.updateScrollIndicators();
                return;
            }

            this.container.scrollTop += currentVelocity;
            currentVelocity *= this.friction;

            this.updateScrollIndicators();
            this.momentumRafId = requestAnimationFrame(step);
        };

        this.momentumRafId = requestAnimationFrame(step);
    }

    /**
     * Stops active momentum animation immediately.
     */
    public stopMomentum(): void {
        if (this.momentumRafId !== null) {
            cancelAnimationFrame(this.momentumRafId);
            this.momentumRafId = null;
        }
    }

    private handleScroll(): void {
        this.updateScrollIndicators();
        this.hideDragHint();
    }

    /**
     * Keyboard navigation support when the timeline container has focus.
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.container || e.target !== this.container) return;

        let delta = 0;
        switch (e.key) {
            case 'ArrowDown':
                delta = 70;
                break;
            case 'ArrowUp':
                delta = -70;
                break;
            case 'PageDown':
                delta = Math.max(120, this.container.clientHeight * 0.75);
                break;
            case 'PageUp':
                delta = -Math.max(120, this.container.clientHeight * 0.75);
                break;
            case 'Home':
                e.preventDefault();
                this.container.scrollTo({ top: 0, behavior: 'smooth' });
                this.hideDragHint();
                return;
            case 'End':
                e.preventDefault();
                this.container.scrollTo({ top: this.container.scrollHeight, behavior: 'smooth' });
                this.hideDragHint();
                return;
            default:
                return;
        }

        if (delta !== 0) {
            e.preventDefault();
            this.container.scrollBy({ top: delta, behavior: 'smooth' });
            this.hideDragHint();
        }
    }

    /**
     * Updates boundary classes (.can-scroll-up, .can-scroll-down, .is-scrollable)
     */
    public updateScrollIndicators(): void {
        if (!this.container) return;

        const { scrollTop, scrollHeight, clientHeight } = this.container;
        const isScrollable = scrollHeight > clientHeight + 4;
        const canScrollUp = isScrollable && scrollTop > 8;
        const canScrollDown = isScrollable && (scrollHeight - clientHeight - scrollTop > 8);

        this.container.classList.toggle('is-scrollable', isScrollable);
        this.container.classList.toggle('can-scroll-up', canScrollUp);
        this.container.classList.toggle('can-scroll-down', canScrollDown);
    }

    /**
     * Dynamically stretches the timeline vertical spine line to connect
     * the first milestone node marker down to the last milestone node marker.
     */
    public syncSpineLine(): void {
        if (!this.container || !this.spineLine || !this.milestonesList) return;

        const visibleMarkers = Array.from(
            this.milestonesList.querySelectorAll<HTMLElement>('.timeline-milestone:not(.timeline-hidden) .timeline-node-marker')
        );

        if (visibleMarkers.length >= 2) {
            const firstMarker = visibleMarkers[0];
            const lastMarker = visibleMarkers[visibleMarkers.length - 1];

            const containerRect = this.container.getBoundingClientRect();
            const firstRect = firstMarker.getBoundingClientRect();
            const lastRect = lastMarker.getBoundingClientRect();

            const top = (firstRect.top - containerRect.top) + this.container.scrollTop + (firstRect.height / 2);
            const bottom = (lastRect.top - containerRect.top) + this.container.scrollTop + (lastRect.height / 2);
            const calculatedHeight = Math.max(0, bottom - top);

            this.spineLine.style.top = `${Math.round(top)}px`;
            this.spineLine.style.height = `${Math.round(calculatedHeight)}px`;
        } else if (visibleMarkers.length === 1) {
            this.spineLine.style.top = '20px';
            this.spineLine.style.height = '40px';
        } else {
            this.spineLine.style.top = '20px';
            this.spineLine.style.height = `${Math.max(0, this.milestonesList.scrollHeight - 40)}px`;
        }
    }

    /**
     * Smoothly scrolls to target milestone element.
     */
    public scrollToMilestone(milestoneEl: HTMLElement): void {
        if (!this.container || !milestoneEl) return;

        const containerRect = this.container.getBoundingClientRect();
        const elementRect = milestoneEl.getBoundingClientRect();
        const targetScrollTop = this.container.scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 3);

        this.container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth',
        });
    }

    private hideDragHint(): void {
        if (this.dragHint && !this.dragHint.classList.contains('is-hidden')) {
            this.dragHint.classList.add('is-hidden');
        }
    }

    public getContainer(): HTMLElement | null {
        return this.container;
    }

    public isCurrentlyDragging(): boolean {
        return this.isDragging;
    }

    /**
     * Complete lifecycle teardown.
     */
    public destroy(): void {
        this.stopMomentum();

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        window.removeEventListener('pointermove', this.boundPointerMove);
        window.removeEventListener('pointerup', this.boundPointerUp);
        window.removeEventListener('pointercancel', this.boundPointerCancel);

        if (this.container) {
            this.container.removeEventListener('pointerdown', this.boundPointerDown);
            this.container.removeEventListener('scroll', this.boundScroll);
            this.container.removeEventListener('click', this.boundClickCapture, true);
            this.container.removeEventListener('keydown', this.boundKeyDown);

            this.container.classList.remove('is-dragging', 'is-scrollable', 'can-scroll-up', 'can-scroll-down');
        }
    }
}
