/**
 * ============================================================================
 * SJCCC – Preloader Controller
 * Controls loading simulation, pillar layout creation, particles, and dismissal
 * Synchronizes lifecycle state with true CSS transition events (transitionend)
 * ============================================================================
 */

import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';
import {
    calculatePillarTimings,
    PRELOADER_ANIMATIONS,
    type PreloaderAnimationType,
    type PillarTiming,
} from './preloaderAnimations.ts';

export class Preloader {
    private readonly preloader: HTMLElement;
    private readonly topHalf: HTMLElement | null;
    private readonly bottomHalf: HTMLElement | null;
    private readonly content: HTMLElement | null;
    private readonly progressBar: HTMLElement | null;
    private readonly percentageText: HTMLElement | null;
    private readonly particlesContainer: HTMLElement | null;

    private topPillars: HTMLElement[] = [];
    private bottomPillars: HTMLElement[] = [];
    private pillarCount: number = 12;

    private isAnimating: boolean = false;
    private isExiting: boolean = false;
    private isDestroyed: boolean = false;

    // Cleanup and timing handles
    private animationFrameId: number | null = null;
    private pillarFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    private exitFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingPillarTimeouts: ReturnType<typeof setTimeout>[] = [];
    private resizeHandler: (() => void) | null = null;
    private loadHandler: (() => void) | null = null;

    private readonly STORAGE_KEY = STORAGE_KEYS.PRELOADER_ANIMATION;

    constructor() {
        this.preloader = document.getElementById('preloader') as HTMLElement;
        this.topHalf = document.getElementById('preloaderTopHalf');
        this.bottomHalf = document.getElementById('preloaderBottomHalf');
        this.content = document.getElementById('preloaderContent');
        this.progressBar = document.getElementById('preloaderProgressBar');
        this.percentageText = document.getElementById('preloaderPercentage');
        this.particlesContainer = document.getElementById('preloaderParticles');

        if (this.preloader) {
            this.init();
        }
    }

    private init(): void {
        // Accessibility: Immediate bypass for users requesting reduced motion
        const prefersReduced =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            this.updateProgress(100);
            this.preloader.style.display = 'none';
            this.isDestroyed = true;
            return;
        }

        this.adjustPillarCount();
        this.createPillars();
        this.createParticles();

        this.resizeHandler = () => {
            if (!this.isAnimating && !this.isExiting && !this.preloader.classList.contains('fade-out')) {
                this.adjustPillarCount();
                this.recreatePillars();
            }
        };
        window.addEventListener('resize', this.resizeHandler);

        this.startLoading();
    }

    private adjustPillarCount(): void {
        const width = window.innerWidth;
        if (width <= 480) this.pillarCount = 10;
        else if (width <= 768) this.pillarCount = 14;
        else if (width <= 1024) this.pillarCount = 18;
        else this.pillarCount = 24;
    }

    private createParticles(): void {
        if (!this.particlesContainer) return;
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'preloader-particle';
            const size = Math.random() * 3 + 1.5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${35 + Math.random() * 30}%`;
            particle.style.animationDelay = `${Math.random() * 4}s`;
            particle.style.animationDuration = `${3 + Math.random() * 5}s`;
            this.particlesContainer.appendChild(particle);
        }
    }

    private recreatePillars(): void {
        if (!this.topHalf || !this.bottomHalf) return;
        this.topHalf.innerHTML = '';
        this.bottomHalf.innerHTML = '';
        this.topPillars = [];
        this.bottomPillars = [];
        this.createPillars();
    }

    private createPillars(): void {
        if (!this.topHalf || !this.bottomHalf) return;

        for (let i = 0; i < this.pillarCount; i++) {
            const pillar = document.createElement('div');
            pillar.className = 'preloader-pillar';
            pillar.setAttribute('data-index', String(i));
            pillar.style.backgroundColor = 'var(--primary-dark)';
            this.topHalf.appendChild(pillar);
            this.topPillars.push(pillar);
        }

        for (let i = 0; i < this.pillarCount; i++) {
            const pillar = document.createElement('div');
            pillar.className = 'preloader-pillar';
            pillar.setAttribute('data-index', String(i));
            pillar.style.backgroundColor = 'var(--primary-dark)';
            this.bottomHalf.appendChild(pillar);
            this.bottomPillars.push(pillar);
        }
    }

    /**
     * Phase A: Loading / Readiness Phase
     * First visit: Smooth loading animation respecting minDuration = 2000ms.
     * Repeat visit: Fast loading ramp (~200ms), then advances directly to the next rotating pillar animation.
     */
    private startLoading(): void {
        const isRepeatVisit =
            typeof sessionStorage !== 'undefined' &&
            sessionStorage.getItem('sjccc_preloader_seen') === 'true';

        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('sjccc_preloader_seen', 'true');
        }

        // Repeat visit: accelerated loading phase (200ms) without skipping the visual pillar pattern
        const minDuration = isRepeatVisit ? 200 : 2000;
        const startTime = performance.now();
        let progress = 0;
        let isPageReady = document.readyState === 'complete';

        if (!isPageReady) {
            this.loadHandler = () => {
                isPageReady = true;
            };
            window.addEventListener('load', this.loadHandler, { once: true });
        }

        const updateLoading = (): void => {
            if (this.isDestroyed || this.isAnimating) return;

            const elapsed = performance.now() - startTime;
            const timeProgress = Math.min(1, elapsed / minDuration);

            if (isRepeatVisit) {
                // Swift linear ramp to 100% on repeat visits
                progress = Math.min(100, timeProgress * 100);
            } else {
                // Realistic progress curve that approaches ~95% during minDuration
                const targetSimulated = timeProgress < 0.9 ? timeProgress * 90 : 90 + (timeProgress - 0.9) * 100;
                progress = Math.max(progress, Math.min(99, targetSimulated));
            }

            // Both conditions required for normal load: minimum display time elapsed AND page is ready
            // (or fallback maximum safety duration of 4500ms so preloader never hangs if external assets lag)
            const canComplete = (elapsed >= minDuration && isPageReady) || elapsed >= 4500;

            if (canComplete) {
                progress = 100;
                this.updateProgress(100);

                // Small tick so 100% is visibly perceived before opening pillars
                const transitionDelay = isRepeatVisit ? 50 : 150;
                setTimeout(() => {
                    if (!this.isAnimating && !this.isDestroyed) {
                        this.startPillarAnimation();
                    }
                }, transitionDelay);
                return;
            }

            this.updateProgress(progress);
            this.animationFrameId = requestAnimationFrame(updateLoading);
        };

        this.animationFrameId = requestAnimationFrame(updateLoading);
    }

    private updateProgress(progress: number): void {
        const rounded = Math.round(progress);
        if (this.progressBar) this.progressBar.style.width = `${rounded}%`;
        if (this.percentageText) this.percentageText.textContent = `${rounded}%`;
    }

    private startPillarAnimation(): void {
        this.animatePillar();
    }

    /**
     * Phase B: Visual Animation Selection & Execution
     * Advances pattern sequentially via round-robin localStorage contract.
     */
    private animatePillar(): void {
        const lastAnimation = localStorage.getItem(this.STORAGE_KEY);
        let nextIndex = 0;

        if (lastAnimation) {
            const currentIndex = PRELOADER_ANIMATIONS.indexOf(lastAnimation as PreloaderAnimationType);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % PRELOADER_ANIMATIONS.length;
            }
        }

        const nextAnimation = PRELOADER_ANIMATIONS[nextIndex];
        localStorage.setItem(this.STORAGE_KEY, nextAnimation);

        const timings = calculatePillarTimings(nextAnimation, this.pillarCount);
        this.executeAnimation(timings);
    }

    /**
     * Phase C: Pillar Stagger Execution & True Transition Synchronization
     * Uses transitionend listeners on the animated pillar elements to guarantee
     * that all pillars have completely exited the viewport before starting preloader exit.
     */
    private executeAnimation(timings: PillarTiming[]): void {
        if (this.isAnimating || this.isDestroyed) return;
        this.isAnimating = true;

        if (this.content) {
            this.content.classList.add('fade-out');
        }

        // Set of all pillar elements expected to transition 'transform'
        const pendingPillars = new Set<HTMLElement>();

        timings.forEach(({ index }) => {
            if (this.topPillars[index]) pendingPillars.add(this.topPillars[index]);
            if (this.bottomPillars[index]) pendingPillars.add(this.bottomPillars[index]);
        });

        let animationFinished = false;

        const completePillarAnimation = () => {
            if (animationFinished || this.isDestroyed) return;
            animationFinished = true;

            cleanupPillarListeners();
            this.onComplete();
        };

        const onPillarTransitionEnd = (event: TransitionEvent) => {
            // Filter strictly: only transform events originating from our tracked pillars
            if (event.propertyName !== 'transform') return;
            const target = event.target as HTMLElement;

            if (pendingPillars.has(target)) {
                pendingPillars.delete(target);
                if (pendingPillars.size === 0) {
                    completePillarAnimation();
                }
            }
        };

        const cleanupPillarListeners = () => {
            if (this.pillarFallbackTimer !== null) {
                clearTimeout(this.pillarFallbackTimer);
                this.pillarFallbackTimer = null;
            }
            if (this.topHalf) {
                this.topHalf.removeEventListener('transitionend', onPillarTransitionEnd);
            }
            if (this.bottomHalf) {
                this.bottomHalf.removeEventListener('transitionend', onPillarTransitionEnd);
            }
        };

        // Attach event-delegated listeners to top and bottom containers
        if (this.topHalf) {
            this.topHalf.addEventListener('transitionend', onPillarTransitionEnd);
        }
        if (this.bottomHalf) {
            this.bottomHalf.addEventListener('transitionend', onPillarTransitionEnd);
        }

        // Calculate safety fallback deadline: maxDelay + 900ms transition + 400ms buffer
        const maxStaggerDelay = timings.reduce((max, t) => Math.max(max, t.delay), 0);
        const fallbackDeadline = maxStaggerDelay + 900 + 400;

        this.pillarFallbackTimer = setTimeout(() => {
            if (!animationFinished) {
                completePillarAnimation();
            }
        }, fallbackDeadline);

        // Schedule individual pillar stagger classes
        timings.forEach(({ index, delay }) => {
            const timer = setTimeout(() => {
                if (this.topPillars[index]) {
                    this.topPillars[index].classList.add('animate-out');
                }
                if (this.bottomPillars[index]) {
                    this.bottomPillars[index].classList.add('animate-out');
                }
            }, delay);
            this.pendingPillarTimeouts.push(timer);
        });
    }

    /**
     * Phase D: Preloader Exit & DOM Cleanup
     * Fades out the preloader shell and synchronizes display: none with the actual opacity transition.
     */
    private onComplete(): void {
        if (this.isExiting || this.isDestroyed) return;
        this.isExiting = true;

        this.preloader.classList.add('fade-out');

        let exitFinished = false;

        const finalizeExit = () => {
            if (exitFinished || this.isDestroyed) return;
            exitFinished = true;

            if (this.exitFallbackTimer !== null) {
                clearTimeout(this.exitFallbackTimer);
                this.exitFallbackTimer = null;
            }
            this.preloader.removeEventListener('transitionend', onPreloaderTransitionEnd);
            this.preloader.style.display = 'none';

            this.destroy();
        };

        const onPreloaderTransitionEnd = (event: TransitionEvent) => {
            // Strictly check that opacity transition completed on the root preloader container
            if (event.target === this.preloader && event.propertyName === 'opacity') {
                finalizeExit();
            }
        };

        this.preloader.addEventListener('transitionend', onPreloaderTransitionEnd);

        // Safety fallback: preloader.css transition has 0.3s delay + 0.6s duration = 900ms.
        // Fallback at 1200ms ensures display: none is never blocked if transition events are suppressed.
        this.exitFallbackTimer = setTimeout(finalizeExit, 1200);
    }

    private destroy(): void {
        this.isDestroyed = true;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.pillarFallbackTimer !== null) {
            clearTimeout(this.pillarFallbackTimer);
            this.pillarFallbackTimer = null;
        }

        if (this.exitFallbackTimer !== null) {
            clearTimeout(this.exitFallbackTimer);
            this.exitFallbackTimer = null;
        }

        this.pendingPillarTimeouts.forEach((timer) => clearTimeout(timer));
        this.pendingPillarTimeouts = [];

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.loadHandler) {
            window.removeEventListener('load', this.loadHandler);
            this.loadHandler = null;
        }
    }
}
