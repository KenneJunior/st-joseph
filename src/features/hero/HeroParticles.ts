/**
 * ============================================================================
 * SJCCC – Hero Particles
 * Lightweight DOM floating ambient particles in the hero banner
 * ============================================================================
 */

/**
 * ============================================================================
 * SJCCC – Hero Particles
 * Lightweight DOM floating ambient particles in the hero banner.
 * Deferred via requestIdleCallback and batched with DocumentFragment
 * to prevent blocking critical hero and header rendering.
 * ============================================================================
 */

import { motionSuspension } from '../../core/physics/MotionSuspension.ts';
import { performanceManager } from '../../core/performance/PerformanceManager.ts';

export class HeroParticles {
    private idleHandle: number | null = null;
    private timerHandle: ReturnType<typeof setTimeout> | null = null;
    private unsubscribeSuspension: (() => void) | null = null;
    private unsubscribePerf: (() => void) | null = null;
    private readonly containerId: string;
    private readonly maxCount: number;

    constructor(containerId: string = 'heroParticles', count = 40) {
        this.containerId = containerId;
        this.maxCount = count;
        if (typeof window === 'undefined') return;

        this.init();
    }

    private init(): void {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Suspend DOM CSS animation when modal is open or hero is offscreen
        this.unsubscribeSuspension = motionSuspension.subscribe('heroParticles', (suspended) => {
            const particles = container.querySelectorAll<HTMLElement>('.hero-particle');
            particles.forEach((p) => {
                p.style.animationPlayState = suspended ? 'paused' : 'running';
            });
        });

        // React to central performance profile changes bidirectionally
        this.unsubscribePerf = performanceManager.subscribe((caps) => {
            const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!caps.allowParticles || caps.particleCount <= 0 || reducedMotion) {
                this.clearParticles(container);
            } else if (container.children.length === 0) {
                const effectiveCount = Math.min(this.maxCount, caps.particleCount);
                this.schedulePopulate(container, effectiveCount);
            }
        });
    }

    private schedulePopulate(container: HTMLElement, count: number): void {
        if ('requestIdleCallback' in window) {
            this.idleHandle = (window as Window & { requestIdleCallback: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number }).requestIdleCallback(
                () => this.populateParticles(container, count),
                { timeout: 1500 }
            );
        } else {
            this.timerHandle = setTimeout(() => {
                requestAnimationFrame(() => this.populateParticles(container, count));
            }, 120);
        }
    }

    private populateParticles(container: HTMLElement, count: number): void {
        if (!container || container.children.length > 0) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'hero-particle';
            const size = (Math.random() * 3 + 1.5).toFixed(1);
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${(Math.random() * 100).toFixed(1)}%`;
            particle.style.top = `${(Math.random() * 100).toFixed(1)}%`;
            particle.style.animationDuration = `${(Math.random() * 8 + 6).toFixed(1)}s`;
            particle.style.animationDelay = `${(Math.random() * 5).toFixed(1)}s`;
            fragment.appendChild(particle);
        }
        container.appendChild(fragment);
    }

    private clearParticles(container: HTMLElement): void {
        if (this.idleHandle !== null && 'cancelIdleCallback' in window) {
            (window as Window & { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(this.idleHandle);
            this.idleHandle = null;
        }
        if (this.timerHandle !== null) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
        container.innerHTML = '';
    }

    public destroy(): void {
        if (this.unsubscribePerf) {
            this.unsubscribePerf();
            this.unsubscribePerf = null;
        }
        if (this.unsubscribeSuspension) {
            this.unsubscribeSuspension();
            this.unsubscribeSuspension = null;
        }
        const container = document.getElementById(this.containerId);
        if (container) {
            this.clearParticles(container);
        }
    }
}

