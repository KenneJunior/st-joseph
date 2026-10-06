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

export class HeroParticles {
    private idleHandle: number | null = null;
    private timerHandle: ReturnType<typeof setTimeout> | null = null;
    private unsubscribeSuspension: (() => void) | null = null;

    constructor(containerId: string = 'heroParticles', count = 40) {
        if (typeof window === 'undefined') return;

        // Skip immediately if reduced motion is requested
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        // On smartphone screens (<= 768px), disable redundant DOM particles entirely:
        // The regulated lightweight canvas provides sufficient ambient depth without redundant DOM layer pressure.
        if (window.innerWidth <= 768) {
            return;
        }

        // Defer particle generation so critical header and hero content render instantly
        if ('requestIdleCallback' in window) {
            this.idleHandle = (window as Window & { requestIdleCallback: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number }).requestIdleCallback(
                () => this.init(containerId, count),
                { timeout: 1500 }
            );
        } else {
            this.timerHandle = setTimeout(() => {
                requestAnimationFrame(() => this.init(containerId, count));
            }, 120);
        }
    }

    private init(containerId: string, count: number): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Batch all DOM particle additions using a DocumentFragment (single reflow)
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

        // Suspend DOM CSS animation when modal is open or hero is offscreen
        this.unsubscribeSuspension = motionSuspension.subscribe('heroParticles', (suspended) => {
            const particles = container.querySelectorAll<HTMLElement>('.hero-particle');
            particles.forEach((p) => {
                p.style.animationPlayState = suspended ? 'paused' : 'running';
            });
        });
    }

    public destroy(): void {
        if (this.unsubscribeSuspension) {
            this.unsubscribeSuspension();
            this.unsubscribeSuspension = null;
        }
        if (this.idleHandle !== null && 'cancelIdleCallback' in window) {
            (window as Window & { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(this.idleHandle);
            this.idleHandle = null;
        }
        if (this.timerHandle !== null) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
    }
}

