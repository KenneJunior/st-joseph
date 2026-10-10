/**
 * ============================================================================
 * SJCCC – Timed Hero Rotator (TimedHeroRotator.ts)
 * 
 * Lightweight, time-driven message progression designed specifically for
 * Apple devices (iOS, iPadOS, macOS) to bypass multi-viewport scroll-pinning,
 * eliminates heavy 120Hz physics loops, and enforces natural browser scrolling.
 * 
 * Features:
 * - Configurable rotation interval (default: 5000ms)
 * - Immediate rendering of initial message (no blank frames)
 * - Smooth, lightweight CSS transitions (250–350ms)
 * - Accessible pause/resume toggle with >= 44x44px touch target
 * - Auto-pause on tab hidden (visibilitychange), hero offscreen (IntersectionObserver),
 *   modal open (motionSuspension), and prefers-reduced-motion
 * - Non-intrusive screen reader semantics (aria-hidden toggles without live-region spam)
 * - Deterministic teardown and single-timer guarantee
 * ============================================================================
 */

import { motionSuspension } from '../../core/physics/MotionSuspension.ts';

export interface TimedHeroRotatorConfig {
    heroId: string;
    containerId: string;
    messages: readonly string[];
    intervalMs?: number;
    rotationControlContainerId?: string;
}

export class TimedHeroRotator {
    private static readonly DEFAULT_INTERVAL_MS = 5000;
    private static readonly TRANSITION_DURATION_MS = 320;

    private config: Required<TimedHeroRotatorConfig>;
    private heroEl: HTMLElement;
    private containerEl: HTMLElement;
    private faces: HTMLElement[] = [];
    private currentIndex = 0;

    private timerId: ReturnType<typeof setTimeout> | null = null;
    private exitTimerId: ReturnType<typeof setTimeout> | null = null;

    private isManuallyPaused = false;
    private isInteracting = false;
    private isOffscreen = false;
    private isDocumentHidden = false;
    private isReducedMotion = false;
    private isSuspendedBySystem = false;

    private pauseBtn: HTMLButtonElement | null = null;
    private controlContainer: HTMLElement | null = null;

    private intersectionObserver: IntersectionObserver | null = null;
    private unsubscribeSuspension: (() => void) | null = null;
    private boundVisibilityHandler: (() => void) | null = null;
    private boundInteractionHandlers: {
        target: HTMLElement;
        event: string;
        handler: () => void;
    }[] = [];

    constructor(config: TimedHeroRotatorConfig) {
        this.config = {
            intervalMs: TimedHeroRotator.DEFAULT_INTERVAL_MS,
            rotationControlContainerId: 'heroRotationControl',
            ...config,
        };

        const hero = document.getElementById(this.config.heroId);
        const container = document.getElementById(this.config.containerId);

        if (!hero || !container) {
            throw new Error(`[TimedHeroRotator] Missing required DOM elements: #${this.config.heroId} or #${this.config.containerId}`);
        }

        this.heroEl = hero;
        this.containerEl = container;

        // Clean up any existing rotator attached to this container
        const existingRotator = (this.containerEl as HTMLElement & { __timedRotator?: TimedHeroRotator }).__timedRotator;
        if (existingRotator && typeof existingRotator.destroy === 'function') {
            existingRotator.destroy();
        }
        (this.containerEl as HTMLElement & { __timedRotator?: TimedHeroRotator }).__timedRotator = this;

        this.init();
    }

    private init(): void {
        // 1. Mark elements with Apple Timed Mode data attribute for CSS activation
        this.heroEl.setAttribute('data-hero-mode', 'apple-timed');
        this.heroEl.classList.add('hero-apple-timed-mode');
        this.containerEl.setAttribute('data-mode', 'apple-timed');

        // 2. Clear message container & generate faces
        this.containerEl.innerHTML = '';
        this.faces = [];

        this.config.messages.forEach((msg, idx) => {
            const face = document.createElement('div');
            face.className = idx === 0 ? 'message-face active' : 'message-face';
            face.setAttribute('aria-hidden', idx === 0 ? 'false' : 'true');
            face.innerHTML = msg;
            this.containerEl.appendChild(face);
            this.faces.push(face);
        });

        // 3. Inject accessible pause/resume control into hero
        this.setupAccessibleControls();

        // 4. Setup listeners & observers
        this.setupReducedMotion();
        this.setupVisibilityListener();
        this.setupIntersectionObserver();
        this.setupInteractionListeners();
        this.setupMotionSuspension();

        // 5. Start rotation if eligible
        this.currentIndex = 0;
        this.scheduleNext();
    }

    private setupAccessibleControls(): void {
        // Find hero-buttons container to neatly append the rotation toggle
        const heroButtons = this.heroEl.querySelector('.hero-buttons');
        if (!heroButtons) return;

        this.controlContainer = document.createElement('div');
        this.controlContainer.id = this.config.rotationControlContainerId;
        this.controlContainer.className = 'hero-rotation-control';

        this.pauseBtn = document.createElement('button');
        this.pauseBtn.type = 'button';
        this.pauseBtn.className = 'hero-pause-btn';
        this.pauseBtn.setAttribute('aria-label', 'Pause hero message rotation');
        this.pauseBtn.setAttribute('aria-pressed', 'false');
        this.pauseBtn.title = 'Pause automatic message rotation';
        this.pauseBtn.innerHTML = `
            <i class="bi bi-pause-fill" aria-hidden="true"></i>
            <span class="hero-pause-label">Pause</span>
            <span class="sr-only">Pause automatic hero message rotation</span>
        `;

        this.pauseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleManualPause();
        });

        this.controlContainer.appendChild(this.pauseBtn);
        // Insert right after the hero buttons
        heroButtons.parentNode?.insertBefore(this.controlContainer, heroButtons.nextSibling);
    }

    private updatePauseButtonUI(): void {
        if (!this.pauseBtn) return;
        const paused = this.isManuallyPaused;
        this.pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        this.pauseBtn.setAttribute('aria-label', paused ? 'Resume hero message rotation' : 'Pause hero message rotation');
        this.pauseBtn.title = paused ? 'Resume message rotation' : 'Pause message rotation';

        const icon = this.pauseBtn.querySelector('i');
        const label = this.pauseBtn.querySelector('.hero-pause-label');
        if (icon) {
            icon.className = paused ? 'bi bi-play-fill' : 'bi bi-pause-fill';
        }
        if (label) {
            label.textContent = paused ? 'Play' : 'Pause';
        }
    }

    private toggleManualPause(): void {
        this.isManuallyPaused = !this.isManuallyPaused;
        this.updatePauseButtonUI();

        if (this.isManuallyPaused) {
            this.clearTimer();
        } else {
            this.scheduleNext();
        }
    }

    private setupReducedMotion(): void {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.isReducedMotion = mediaQuery.matches;

            const onReducedMotionChange = (e: MediaQueryListEvent) => {
                this.isReducedMotion = e.matches;
                if (this.isReducedMotion) {
                    this.clearTimer();
                } else if (!this.shouldBePaused()) {
                    this.scheduleNext();
                }
            };

            if (typeof mediaQuery.addEventListener === 'function') {
                mediaQuery.addEventListener('change', onReducedMotionChange);
            }
        }
    }

    private setupVisibilityListener(): void {
        this.boundVisibilityHandler = () => {
            this.isDocumentHidden = document.hidden;
            if (this.isDocumentHidden) {
                this.clearTimer();
            } else if (!this.shouldBePaused()) {
                this.scheduleNext();
            }
        };
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    private setupIntersectionObserver(): void {
        if (typeof IntersectionObserver === 'undefined') {
            this.isOffscreen = false;
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    this.isOffscreen = !entry.isIntersecting;
                    if (this.isOffscreen) {
                        this.clearTimer();
                    } else if (!this.shouldBePaused()) {
                        this.scheduleNext();
                    }
                }
            },
            { rootMargin: '100px 0px 100px 0px' }
        );

        this.intersectionObserver.observe(this.heroEl);
    }

    private setupInteractionListeners(): void {
        const onInteractionStart = () => {
            this.isInteracting = true;
            this.clearTimer();
        };

        const onInteractionEnd = () => {
            this.isInteracting = false;
            if (!this.shouldBePaused()) {
                this.scheduleNext();
            }
        };

        // Pause rotation when user hovers or focuses on interactive elements inside the hero
        const interactiveTargets = this.heroEl.querySelectorAll('a, button, input');
        interactiveTargets.forEach((target) => {
            const el = target as HTMLElement;
            el.addEventListener('focusin', onInteractionStart);
            el.addEventListener('focusout', onInteractionEnd);
            el.addEventListener('mouseenter', onInteractionStart);
            el.addEventListener('mouseleave', onInteractionEnd);

            this.boundInteractionHandlers.push(
                { target: el, event: 'focusin', handler: onInteractionStart },
                { target: el, event: 'focusout', handler: onInteractionEnd },
                { target: el, event: 'mouseenter', handler: onInteractionStart },
                { target: el, event: 'mouseleave', handler: onInteractionEnd }
            );
        });
    }

    private setupMotionSuspension(): void {
        motionSuspension.registerTarget('heroRotator');
        this.unsubscribeSuspension = motionSuspension.subscribe('heroRotator', (suspended) => {
            this.isSuspendedBySystem = suspended;
            if (suspended) {
                this.clearTimer();
            } else if (!this.shouldBePaused()) {
                this.scheduleNext();
            }
        });
    }

    private shouldBePaused(): boolean {
        return (
            this.isManuallyPaused ||
            this.isInteracting ||
            this.isOffscreen ||
            this.isDocumentHidden ||
            this.isReducedMotion ||
            this.isSuspendedBySystem
        );
    }

    public scheduleNext(): void {
        this.clearTimer();
        if (this.shouldBePaused()) return;

        this.timerId = setTimeout(() => {
            this.next();
        }, this.config.intervalMs);
    }

    public next(): void {
        if (this.faces.length <= 1) return;

        const prevIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.faces.length;

        const prevFace = this.faces[prevIndex];
        const nextFace = this.faces[this.currentIndex];

        if (prevFace && nextFace) {
            // Apply lightweight CSS exit and entry classes
            prevFace.classList.remove('active');
            prevFace.classList.add('exit');
            prevFace.setAttribute('aria-hidden', 'true');

            nextFace.classList.remove('exit');
            nextFace.classList.add('active');
            nextFace.setAttribute('aria-hidden', 'false');

            // Clean up exit class after transition completes
            if (this.exitTimerId !== null) {
                clearTimeout(this.exitTimerId);
            }
            this.exitTimerId = setTimeout(() => {
                prevFace.classList.remove('exit');
                this.exitTimerId = null;
            }, TimedHeroRotator.TRANSITION_DURATION_MS);
        }

        this.scheduleNext();
    }

    public goTo(index: number): void {
        if (index < 0 || index >= this.faces.length || index === this.currentIndex) return;

        const prevFace = this.faces[this.currentIndex];
        this.currentIndex = index;
        const nextFace = this.faces[this.currentIndex];

        if (prevFace && nextFace) {
            prevFace.classList.remove('active');
            prevFace.classList.add('exit');
            prevFace.setAttribute('aria-hidden', 'true');

            nextFace.classList.remove('exit');
            nextFace.classList.add('active');
            nextFace.setAttribute('aria-hidden', 'false');

            if (this.exitTimerId !== null) {
                clearTimeout(this.exitTimerId);
            }
            this.exitTimerId = setTimeout(() => {
                prevFace.classList.remove('exit');
                this.exitTimerId = null;
            }, TimedHeroRotator.TRANSITION_DURATION_MS);
        }

        this.scheduleNext();
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    public isPaused(): boolean {
        return this.shouldBePaused();
    }

    private clearTimer(): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    public destroy(): void {
        this.clearTimer();

        if (this.exitTimerId !== null) {
            clearTimeout(this.exitTimerId);
            this.exitTimerId = null;
        }

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        if (this.boundVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
            this.boundVisibilityHandler = null;
        }

        if (this.unsubscribeSuspension) {
            this.unsubscribeSuspension();
            this.unsubscribeSuspension = null;
        }

        this.boundInteractionHandlers.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.boundInteractionHandlers = [];

        if (this.controlContainer && this.controlContainer.parentNode) {
            this.controlContainer.parentNode.removeChild(this.controlContainer);
            this.controlContainer = null;
            this.pauseBtn = null;
        }

        if (this.containerEl) {
            delete (this.containerEl as HTMLElement & { __timedRotator?: TimedHeroRotator }).__timedRotator;
        }

        this.heroEl.removeAttribute('data-hero-mode');
        this.heroEl.classList.remove('hero-apple-timed-mode');
        this.containerEl.removeAttribute('data-mode');
    }
}
