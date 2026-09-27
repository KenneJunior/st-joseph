/**
 * ============================================================================
 * SJCCC – Particle System (Dust Canvas)
 * Stokes drag relaxation + Ornstein-Uhlenbeck mean-reverting Brownian jitter
 * ============================================================================
 */

import { gaussianRandom } from '../../core/physics/spring.ts';

export interface Particle {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    speedX: number;
    speedY: number;
}

const STOKES_BASE_DRIFT = -8;      // px/s, terminal speed as r -> 0
const STOKES_TERMINAL_COEFF = -3;  // px/s, additional terminal speed at r = 1
const STOKES_RELAX_TIME = 0.1;     // s, relaxation time constant at r = 1

// Ornstein-Uhlenbeck jitter: dv = -λ(v - mean)dt + σ√dt · N(0,1)
const OU_LAMBDA = 0.6;
const OU_SIGMA = 3.5;

export class ParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private particles: Particle[] = [];
    private width = 0;
    private height = 0;
    private lastTime = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.init();
    }

    private updateParticlePhysics(p: Particle, dt: number): void {
        const vTerm = this.terminalVelocity(p.radius);
        const k = this.dragRate(p.radius);
        const decay = Math.exp(-k * dt);
        p.speedY = vTerm + (p.speedY - vTerm) * decay;

        const sqrtDt = Math.sqrt(dt);
        p.speedX += -OU_LAMBDA * p.speedX * dt + OU_SIGMA * sqrtDt * gaussianRandom();
        p.speedY += OU_SIGMA * 0.4 * sqrtDt * gaussianRandom();

        p.x += p.speedX * dt;
        p.y += p.speedY * dt;
    }

    private wrapParticlePosition(p: Particle): void {
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
    }

    private drawParticle(p: Particle): void {
        if (!this.ctx) return;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(212, 168, 83, ${p.alpha})`;
        this.ctx.fill();
    }

    private prefersReducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private readonly animate = (time: number): void => {
        if (!this.ctx || this.prefersReducedMotion()) return;
        if (this.lastTime === 0) this.lastTime = time;
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        dt = Math.min(dt, 0.1);

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach((p) => {
            this.updateParticlePhysics(p, dt);
            this.wrapParticlePosition(p);
            this.drawParticle(p);
        });

        requestAnimationFrame(this.animate);
    };

    private terminalVelocity(r: number): number {
        return STOKES_BASE_DRIFT + STOKES_TERMINAL_COEFF * r * r;
    }

    private dragRate(r: number): number {
        return 1 / (STOKES_RELAX_TIME * r * r);
    }

    private init(): void {
        if (!this.ctx) return;
        this.resize();
        window.addEventListener('resize', this.resize.bind(this), { passive: true });
        this.particles = Array.from({ length: 45 }, () => this.createParticle());
        if (this.prefersReducedMotion()) {
            this.particles.forEach((p) => this.drawParticle(p));
            return;
        }
        requestAnimationFrame(this.animate);
    }

    private createParticle(): Particle {
        const radius = Math.random() * 1.5 + 0.5;
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius,
            alpha: Math.random() * 0.4 + 0.1,
            speedX: 0,
            speedY: this.terminalVelocity(radius),
        };
    }

    private resize(): void {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight * 2;
    }
}
