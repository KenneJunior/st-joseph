/**
 * ============================================================================
 * SJCCC – Preloader Controller
 * Controls loading simulation, pillar layout creation, particles, and dismissal
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
    private animatedCount: number = 0;
    private totalPillars: number = 0;
    private isAnimating: boolean = false;

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
        this.adjustPillarCount();
        this.createPillars();
        this.createParticles();
        this.startLoading();

        window.addEventListener('resize', () => {
            if (!this.isAnimating && !this.preloader.classList.contains('fade-out')) {
                this.adjustPillarCount();
                this.recreatePillars();
            }
        });
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
        this.animatedCount = 0;
        this.createPillars();
    }

    private createPillars(): void {
        if (!this.topHalf || !this.bottomHalf) return;
        this.totalPillars = this.pillarCount * 2;

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

    private startLoading(): void {
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            this.updateProgress(100);
            this.preloader.style.display = 'none';
            return;
        }

        const isRepeatVisit = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sjccc_preloader_seen') === 'true';
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('sjccc_preloader_seen', 'true');
        }

        if (isRepeatVisit) {
            const fastDismiss = () => {
                this.updateProgress(100);
                setTimeout(() => this.onComplete(), 200);
            };

            if (document.readyState === 'complete') {
                fastDismiss();
            } else {
                window.addEventListener('load', fastDismiss, { once: true });
            }
            return;
        }

        let progress = 0;
        const startTime = performance.now();
        const minDuration = 2000;

        const updateLoading = (): void => {
            const elapsed = performance.now() - startTime;
            if (progress < 90) {
                progress += (Math.random() * 8 + 3) * (1 - progress / 100);
            } else if (progress < 100) {
                progress += 0.3;
            }
            progress = Math.min(progress, 100);
            this.updateProgress(progress);

            if (progress < 100) {
                requestAnimationFrame(updateLoading);
            } else {
                const remainingTime = Math.max(0, minDuration - elapsed);
                setTimeout(() => this.startPillarAnimation(), remainingTime + 200);
            }
        };

        requestAnimationFrame(updateLoading);

        window.addEventListener('load', () => {
            if (progress < 100) {
                progress = 100;
                this.updateProgress(100);
                setTimeout(() => {
                    if (!this.isAnimating) this.startPillarAnimation();
                }, 300);
            }
        });
    }

    private updateProgress(progress: number): void {
        const rounded = Math.round(progress);
        if (this.progressBar) this.progressBar.style.width = `${rounded}%`;
        if (this.percentageText) this.percentageText.textContent = `${rounded}%`;
    }

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

    private executeAnimation(timings: PillarTiming[]): void {
        if (this.isAnimating) return;
        this.isAnimating = true;

        if (this.content) {
            this.content.classList.add('fade-out');
        }

        timings.forEach(({ index, delay }) => {
            setTimeout(() => {
                if (this.topPillars[index]) {
                    this.topPillars[index].classList.add('animate-out');
                }
                if (this.bottomPillars[index]) {
                    this.bottomPillars[index].classList.add('animate-out');
                }

                this.animatedCount += 2;

                if (this.animatedCount >= this.totalPillars) {
                    setTimeout(() => this.onComplete(), 600);
                }
            }, delay);
        });
    }

    private startPillarAnimation(): void {
        this.animatePillar();
    }

    private onComplete(): void {
        this.preloader.classList.add('fade-out');
        setTimeout(() => {
            this.preloader.style.display = 'none';
        }, 1000);
    }
}
