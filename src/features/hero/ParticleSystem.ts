/**
 * ============================================================================
 * SJCCC – Particle System (Dust Canvas)
 * Stokes drag relaxation + Ornstein-Uhlenbeck mean-reverting Brownian jitter
 * Ambient golden dust motes with configurable density, speed, and opacity
 * ============================================================================
 */

import { gaussianRandom } from '../../core/physics/spring.ts';
import { motionSuspension } from '../../core/physics/MotionSuspension.ts';

export interface Particle {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    baseAlpha: number;
    pulseSpeed: number;
    pulsePhase: number;
    speedX: number;
    speedY: number;
    color: string;
}

export interface ParticleSystemConfig {
    /**
     * Relative density factor (0.1 to 2.5).
     * Controls how many particles are spawned across the viewport area.
     * Default: 0.65 (aesthetic, airy ambient distribution).
     */
    density?: number;

    /**
     * Direct target particle count override.
     * When provided (> 0), takes precedence over the area-based density calculation.
     */
    count?: number;

    /**
     * Motion speed multiplier (0.1 to 3.0).
     * Controls upward drift, Brownian jitter, and shimmer pulsation.
     * Default: 0.55 (gentle, hypnotic ambient floating motion).
     */
    speed?: number;

    /**
     * Opacity multiplier (0.1 to 1.5).
     * Modulates base particle alpha and glow halos for a subtle ambient aesthetic.
     * Default: 0.45 (subtle, delicate motes that never distract from content).
     */
    opacity?: number;

    /**
     * Minimum floor alpha for any visible particle (default: 0.06).
     */
    minOpacity?: number;

    /**
     * Maximum ceiling alpha for any particle (default: 0.52).
     */
    maxOpacity?: number;

    /**
     * Whether particles gently respond to vertical page scrolling.
     * Default: true.
     */
    scrollReactive?: boolean;

    /**
     * Array of 'R, G, B' color strings for the particle palette.
     */
    palette?: string[];
}

const DEFAULT_CONFIG: Required<ParticleSystemConfig> = {
    density: 0.65,
    count: 0,
    speed: 0.55,
    opacity: 0.45,
    minOpacity: 0.06,
    maxOpacity: 0.52,
    scrollReactive: true,
    palette: [
        '212, 168, 83',   // Warm gold
        '235, 195, 95',   // Sunlit gold
        '190, 140, 50',   // Rich amber gold
        '245, 215, 130',  // Soft luminous gold
        '255, 235, 175',  // Gilded sun mote
    ],
};

// Physics constants tuned for calm, subtle floating motes
const STOKES_BASE_DRIFT = -3.4;      // px/s, gentle upward drift
const STOKES_TERMINAL_COEFF = -1.2;  // px/s, radius-dependent terminal coefficient
const STOKES_RELAX_TIME = 0.16;     // s, relaxation time constant

// Ornstein-Uhlenbeck jitter: dv = -λ(v - mean)dt + σ√dt · N(0,1)
const OU_LAMBDA = 0.45;
const OU_SIGMA = 2.4;

export class ParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private config: Required<ParticleSystemConfig>;
    private particles: Particle[] = [];
    private width = 0;
    private height = 0;
    private lastTime = 0;
    private animFrameId: number | null = null;
    private isRunning = false;
    private scrollListenerAttached = false;
    private resizeHandler: (() => void) | null = null;
    private scrollHandler: (() => void) | null = null;
    private visibilityHandler: (() => void) | null = null;
    private loadHandler: (() => void) | null = null;
    private heroObserver: IntersectionObserver | null = null;
    private unsubscribeSuspension: (() => void) | null = null;

    constructor(canvas: HTMLCanvasElement, options?: ParticleSystemConfig) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });

        // Parse optional dataset attributes on the canvas element as secondary defaults
        const datasetConfig: Partial<ParticleSystemConfig> = {};
        if (canvas.dataset.density) {
            const parsed = parseFloat(canvas.dataset.density);
            if (!Number.isNaN(parsed) && parsed > 0) datasetConfig.density = parsed;
        }
        if (canvas.dataset.speed) {
            const parsed = parseFloat(canvas.dataset.speed);
            if (!Number.isNaN(parsed) && parsed > 0) datasetConfig.speed = parsed;
        }
        if (canvas.dataset.opacity) {
            const parsed = parseFloat(canvas.dataset.opacity);
            if (!Number.isNaN(parsed) && parsed > 0) datasetConfig.opacity = parsed;
        }
        if (canvas.dataset.count) {
            const parsed = parseInt(canvas.dataset.count, 10);
            if (!Number.isNaN(parsed) && parsed > 0) datasetConfig.count = parsed;
        }

        this.config = {
            ...DEFAULT_CONFIG,
            ...datasetConfig,
            ...(options || {}),
        };

        // Attach reference for debugging and external programmatic inspection
        (this.canvas as HTMLCanvasElement & { __particleSystem?: ParticleSystem }).__particleSystem = this;
        if (typeof window !== 'undefined') {
            (window as unknown as { __dustParticleSystem?: ParticleSystem }).__dustParticleSystem = this;
        }

        this.init();
    }

    /**
     * Returns an immutable copy of the current configuration.
     */
    public getConfig(): Readonly<Required<ParticleSystemConfig>> {
        return { ...this.config };
    }

    /**
     * Dynamically updates the particle system configuration.
     */
    public updateConfig(newConfig: Partial<ParticleSystemConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig,
        };

        // Clamp settings to safe operational bounds
        this.config.density = Math.max(0.05, Math.min(3.0, this.config.density));
        this.config.speed = Math.max(0.05, Math.min(4.0, this.config.speed));
        this.config.opacity = Math.max(0.05, Math.min(2.0, this.config.opacity));

        // Reconcile particle count with updated density or count
        this.syncParticleCount();

        // Update alphas immediately across all active particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.alpha = this.computeAlpha(p.baseAlpha, p.pulsePhase);
        }

        this.clear();
        this.render();
    }

    /**
     * Sets particle density multiplier (e.g. 0.3 for very sparse, 1.2 for rich).
     */
    public setDensity(density: number): void {
        this.updateConfig({ density });
    }

    /**
     * Sets motion speed multiplier (e.g. 0.3 for ultra slow, 1.5 for energetic).
     */
    public setSpeed(speed: number): void {
        this.updateConfig({ speed });
    }

    /**
     * Sets overall opacity multiplier (e.g. 0.2 for subtle, 0.8 for vivid).
     */
    public setOpacity(opacity: number): void {
        this.updateConfig({ opacity });
    }

    /**
     * Measures the exact viewport dimensions across browser configurations.
     */
    private getViewportDimensions(): { width: number; height: number } {
        const visualVp = window.visualViewport;
        const w = Math.max(
            visualVp?.width ?? 0,
            window.innerWidth ?? 0,
            document.documentElement.clientWidth ?? 0,
            document.body?.clientWidth ?? 0
        );
        const h = Math.max(
            visualVp?.height ?? 0,
            window.innerHeight ?? 0,
            document.documentElement.clientHeight ?? 0,
            document.body?.clientHeight ?? 0
        );

        return {
            width: w > 0 ? Math.round(w) : 1280,
            height: h > 0 ? Math.round(h) : 720,
        };
    }

    /**
     * Clears the entire canvas viewport buffer cleanly, resetting transform.
     */
    public clear(): void {
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    /**
     * Synchronously renders all active particles onto the canvas.
     */
    public render(): void {
        if (!this.ctx || this.width <= 0 || this.height <= 0) return;
        for (let i = 0; i < this.particles.length; i++) {
            this.drawParticle(this.particles[i]);
        }
    }

    /**
     * Computes the particle alpha given base alpha and pulse phase,
     * applying the configured opacity multiplier and clamping to min/max floors.
     */
    private computeAlpha(baseAlpha: number, pulsePhase: number): number {
        const shimmer = 0.82 + 0.18 * Math.sin(pulsePhase);
        const rawAlpha = baseAlpha * this.config.opacity * shimmer;
        return Math.max(this.config.minOpacity, Math.min(this.config.maxOpacity, rawAlpha));
    }

    private updateParticlePhysics(p: Particle, dt: number): void {
        const speedFactor = this.config.speed;
        const vTerm = this.terminalVelocity(p.radius);
        const k = this.dragRate(p.radius);
        const decay = Math.exp(-k * dt * speedFactor);
        p.speedY = vTerm + (p.speedY - vTerm) * decay;

        const sqrtDt = Math.sqrt(dt * speedFactor);
        p.speedX += -OU_LAMBDA * p.speedX * dt * speedFactor + OU_SIGMA * sqrtDt * gaussianRandom();
        p.speedY += OU_SIGMA * 0.35 * sqrtDt * gaussianRandom();

        p.x += p.speedX * speedFactor * dt;
        p.y += p.speedY * speedFactor * dt;

        // Subtle gentle breathing/shimmer of alpha
        p.pulsePhase += p.pulseSpeed * speedFactor * dt;
        p.alpha = this.computeAlpha(p.baseAlpha, p.pulsePhase);
    }

    private wrapParticlePosition(p: Particle): void {
        const padding = 20;
        if (p.y < -padding) {
            p.y = this.height + padding * 0.5;
            p.x = Math.random() * this.width;
        } else if (p.y > this.height + padding) {
            p.y = -padding * 0.5;
            p.x = Math.random() * this.width;
        }

        if (p.x < -padding) {
            p.x = this.width + padding * 0.5;
        } else if (p.x > this.width + padding) {
            p.x = -padding * 0.5;
        }
    }

    private drawParticle(p: Particle): void {
        if (!this.ctx || p.alpha <= 0.01) return;

        // Core dust mote
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${p.color}, ${p.alpha.toFixed(3)})`;
        this.ctx.fill();

        // Subtle ambient halo for larger motes on desktop; disabled on smartphone (<= 768px) to reduce GPU fill rate
        const isMobile = this.width <= 768;
        if (!isMobile && p.radius > 1.8) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 2.3, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${p.color}, ${(p.alpha * 0.18).toFixed(3)})`;
            this.ctx.fill();
        }
    }

    private prefersReducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private readonly animate = (time: number): void => {
        if (!this.isRunning || !this.ctx || motionSuspension.isSuspended('particleSystem')) {
            this.stopAnimationLoop();
            return;
        }

        if (this.prefersReducedMotion()) {
            this.clear();
            this.render();
            this.stopAnimationLoop();
            return;
        }

        if (this.lastTime === 0) this.lastTime = time;
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // Cap dt to prevent particle explosion if tab was frozen or throttled
        dt = Math.min(dt, 0.08);

        this.clear();

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            this.updateParticlePhysics(p, dt);
            this.wrapParticlePosition(p);
            this.drawParticle(p);
        }

        if (this.isRunning && !motionSuspension.isSuspended('particleSystem')) {
            this.animFrameId = requestAnimationFrame(this.animate);
        } else {
            this.stopAnimationLoop();
        }
    };

    private terminalVelocity(r: number): number {
        return STOKES_BASE_DRIFT + STOKES_TERMINAL_COEFF * r * r;
    }

    private dragRate(r: number): number {
        return 1 / (STOKES_RELAX_TIME * r * r);
    }

    /**
     * Determines particle count adaptively based on viewport area, density setting, and device profile.
     * On smartphone screens (<= 768px), strictly caps particle count to <= 16 to conserve mobile CPU/battery.
     */
    private getDesiredParticleCount(): number {
        if (this.config.count !== undefined && this.config.count > 0) {
            return this.config.count;
        }

        const isMobile = this.width <= 768;
        if (isMobile) {
            // Strict smartphone cap: <= 16 motes
            return Math.min(16, Math.max(6, Math.round(14 * this.config.density)));
        }

        const area = this.width * this.height;
        // 1920 x 1080 ≈ 2.07M px -> base ~45 motes at density = 0.65
        const rawCount = Math.round((area / 30000) * this.config.density);
        const minCount = Math.max(12, Math.round(18 * this.config.density));
        const maxCount = Math.max(minCount, Math.round(75 * this.config.density));

        return Math.min(Math.max(rawCount, minCount), maxCount);
    }

    /**
     * Creates a new particle with randomized attributes, distributed across the viewport.
     */
    private createParticle(spreadAcrossViewport: boolean = true): Particle {
        const rSeed = Math.random();
        let radius: number;
        if (rSeed > 0.88) {
            radius = Math.random() * 1.3 + 1.9; // Prominent luminous mote (1.9px - 3.2px)
        } else if (rSeed > 0.50) {
            radius = Math.random() * 0.7 + 1.2; // Medium ambient mote (1.2px - 1.9px)
        } else {
            radius = Math.random() * 0.5 + 0.7; // Fine dust speck (0.7px - 1.2px)
        }

        const baseAlpha = Math.random() * 0.35 + 0.28; // 0.28 to 0.63
        const pulsePhase = Math.random() * Math.PI * 2;
        const color = this.config.palette[Math.floor(Math.random() * this.config.palette.length)];

        const x = Math.random() * (this.width || 1280);
        const y = spreadAcrossViewport
            ? Math.random() * (this.height || 720)
            : (this.height || 720) + Math.random() * 15;

        return {
            x,
            y,
            radius,
            alpha: this.computeAlpha(baseAlpha, pulsePhase),
            baseAlpha,
            pulseSpeed: Math.random() * 1.4 + 0.7,
            pulsePhase,
            speedX: (Math.random() - 0.5) * 3,
            speedY: this.terminalVelocity(radius),
            color,
        };
    }

    /**
     * Adjusts active particles to match desired count, spawning or pruning cleanly.
     */
    private syncParticleCount(spreadAcrossViewport: boolean = true): void {
        const targetCount = this.getDesiredParticleCount();
        while (this.particles.length < targetCount) {
            this.particles.push(this.createParticle(spreadAcrossViewport));
        }
        if (this.particles.length > targetCount) {
            this.particles.length = targetCount;
        }
    }

    private setupScrollReaction(): void {
        if (!this.config.scrollReactive || this.scrollListenerAttached) return;

        let lastScrollY = window.scrollY;
        this.scrollHandler = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY;
            lastScrollY = currentScrollY;

            if (this.isHeroOffscreen || !this.isRunning || motionSuspension.isSuspended('particleSystem')) {
                return;
            }

            // Subtle inertial nudge scaled by particle inverse radius
            const impulse = Math.max(Math.min(delta * 0.08, 8), -8);
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.speedY -= impulse * (0.025 / p.radius);
            }
        };

        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        this.scrollListenerAttached = true;
    }

    private isHeroOffscreen = false;

    /**
     * Releases the GPU pixel backing store while the hero section is offscreen.
     * Collapses the drawing buffer to 1x1 and hides visibility so the compositor
     * skips the full-viewport layer while preserving logical dimensions and particle state.
     */
    private hibernateBackingStore(): void {
        if (this.isHeroOffscreen) return;
        this.isHeroOffscreen = true;
        this.stopAnimationLoop();
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.canvas.style.visibility = 'hidden';
    }

    /**
     * Restores the full-resolution canvas backing store, DPR transform,
     * and immediate particle rendering when the hero section approaches the viewport.
     */
    private restoreBackingStore(): void {
        if (!this.isHeroOffscreen) return;
        this.isHeroOffscreen = false;
        this.canvas.style.visibility = 'visible';
        this.resize();
    }

    /**
     * Sizes the canvas buffer accurately to the viewport, applies devicePixelRatio,
     * clears the full pixel buffer, and updates particle bounds.
     * Applies Smartphone Profile (<= 768px) with DPR capped at 1.0–1.25.
     */
    public resize(): void {
        const { width, height } = this.getViewportDimensions();
        const isMobile = width <= 768;
        const dpr = isMobile
            ? Math.min(window.devicePixelRatio || 1, 1.25)
            : Math.min(window.devicePixelRatio || 1, 2.0);

        this.width = width;
        this.height = height;

        // Clamp existing particles to updated bounds if viewport shrank
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.x > width + 20) p.x = Math.random() * width;
            if (p.y > height + 20) p.y = Math.random() * height;
        }

        this.syncParticleCount(true);

        // If hero is currently offscreen, keep backing store collapsed at 1x1 to avoid allocating GPU memory
        if (this.isHeroOffscreen) {
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            return;
        }

        // Size DOM element and drawing buffer
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        if (this.ctx) {
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        this.clear();
        this.render();
    }

    /**
     * Starts the canvas particle animation loop with safe time reset.
     */
    public startAnimationLoop(): void {
        if (this.isRunning || motionSuspension.isSuspended('particleSystem') || this.prefersReducedMotion()) return;
        this.isRunning = true;
        this.lastTime = 0; // safe reset: zero delta jump
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.animFrameId = requestAnimationFrame(this.animate);
    }

    /**
     * Completely stops active RAF execution and resets timing state.
     */
    public stopAnimationLoop(): void {
        if (!this.isRunning && this.animFrameId === null) return;
        this.isRunning = false;
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.lastTime = 0;
    }

    /**
     * Fully initializes the particle system:
     * Sizing canvas to viewport, clearing, scattering particles across viewport,
     * immediately drawing the first frame, and binding lifecycle listeners.
     */
    private init(): void {
        if (!this.ctx) return;

        // Ensure canvas element is styled for full-screen fixed ambient placement
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '90';

        // 1. Initial size and coordinate mapping across the viewport
        const { width, height } = this.getViewportDimensions();
        const isMobile = width <= 768;
        const dpr = isMobile
            ? Math.min(window.devicePixelRatio || 1, 1.25)
            : Math.min(window.devicePixelRatio || 1, 2.0);

        this.width = width;
        this.height = height;
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 2. Populate particle pool uniformly across the entire viewport
        const targetCount = this.getDesiredParticleCount();
        this.particles = Array.from({ length: targetCount }, () => this.createParticle(true));

        // 3. Guarantee canvas is properly cleared and rendered across the viewport immediately on load
        this.clear();
        this.render();

        // 4. Register event listeners for dynamic viewport changes
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler, { passive: true });
        window.addEventListener('orientationchange', this.resizeHandler, { passive: true });
        window.visualViewport?.addEventListener('resize', this.resizeHandler, { passive: true });

        // Ensure complete sync once window fully finishes loading (fonts, assets, layout)
        this.loadHandler = () => {
            this.resize();
        };
        if (document.readyState === 'complete') {
            this.resize();
        } else {
            window.addEventListener('load', this.loadHandler, { passive: true, once: true });
        }

        // 5. Hero Viewport Gating via IntersectionObserver
        const heroEl = document.getElementById('heroSection') || document.querySelector('.hero-section');
        if (heroEl) {
            if (heroEl.getAttribute('data-hero-offscreen') === 'true' || motionSuspension.isSuspended('particleSystem')) {
                const rect = heroEl.getBoundingClientRect();
                const vh = window.visualViewport?.height ?? window.innerHeight ?? 720;
                if (rect.bottom < -200 || rect.top > vh + 200) {
                    motionSuspension.suspend('particleSystem', 'hero-offscreen');
                    this.hibernateBackingStore();
                }
            }
            if (typeof IntersectionObserver !== 'undefined') {
                this.heroObserver = new IntersectionObserver(
                    (entries) => {
                        for (const entry of entries) {
                            if (entry.isIntersecting) {
                                this.restoreBackingStore();
                                motionSuspension.resume('particleSystem', 'hero-offscreen');
                                this.startAnimationLoop();
                            } else {
                                motionSuspension.suspend('particleSystem', 'hero-offscreen');
                                this.hibernateBackingStore();
                            }
                        }
                    },
                    { rootMargin: '200px 0px 200px 0px' }
                );
                this.heroObserver.observe(heroEl);
            }
        }

        // 6. Page visibility handling (resets lastTime to prevent delta jumps)
        this.visibilityHandler = () => {
            if (document.hidden) {
                motionSuspension.suspendAll('page-hidden');
            } else {
                motionSuspension.resumeAll('page-hidden');
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);

        // 7. Subscribe to global motion suspension
        this.unsubscribeSuspension = motionSuspension.subscribe('particleSystem', (suspended, reasons) => {
            if (reasons.includes('hero-offscreen')) {
                this.hibernateBackingStore();
            } else if (this.isHeroOffscreen) {
                this.restoreBackingStore();
            }

            if (suspended) {
                this.stopAnimationLoop();
            } else {
                this.startAnimationLoop();
            }
        });

        // 8. Setup scroll reaction
        this.setupScrollReaction();

        // 9. Start animation loop if motion is permitted and not suspended
        if (!this.prefersReducedMotion() && !motionSuspension.isSuspended('particleSystem')) {
            this.startAnimationLoop();
        }
    }

    /**
     * Cleans up animation loops, observers, and event listeners.
     */
    public destroy(): void {
        this.stopAnimationLoop();

        if (this.heroObserver) {
            this.heroObserver.disconnect();
            this.heroObserver = null;
        }

        if (this.unsubscribeSuspension) {
            this.unsubscribeSuspension();
            this.unsubscribeSuspension = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            window.removeEventListener('orientationchange', this.resizeHandler);
            window.visualViewport?.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
            this.scrollListenerAttached = false;
        }

        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }

        if (this.loadHandler) {
            window.removeEventListener('load', this.loadHandler);
            this.loadHandler = null;
        }

        this.clear();
        this.particles = [];
    }
}
