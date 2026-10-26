/**
 * ============================================================================
 * SJCCC Mbengwi – Main Application Entry Point
 * Bootstraps service worker registration and initializes the Home page application
 * ============================================================================
 */

// Core Stylesheets (processed and injected via Vite)
import './css/main.css';
import './css/scrollEffect.css';

import { initServiceWorker } from './services/serviceWorker.ts';
import { initHomePage } from './pages/home/home.ts';
import { motionSuspension } from './core/physics/MotionSuspension.ts';
import { performanceManager } from './core/performance/PerformanceManager.ts';
import { AiAssistantWidget } from './features/ai-assistant/AiAssistantWidget.ts';
import { logger } from './core/logger/index.ts';
import './core/diagnostics/index.ts';

const log = logger.child('Main');

/**
 * Observes #heroSection in the main entry script to toggle a low-resource state
 * (.is-offscreen / data-hero-offscreen="true") when scrolled out of the viewport,
 * pausing decorative CSS animations and hibernating #dustCanvas.
 */
function initHeroViewportObserver(): void {
    const heroEl = document.getElementById('heroSection');
    const dustCanvas = document.getElementById('dustCanvas') as (HTMLCanvasElement & {
        __particleSystem?: {
            stopAnimationLoop?: () => void;
            startAnimationLoop?: () => void;
            resize?: () => void;
        };
    }) | null;

    if (!heroEl || typeof IntersectionObserver === 'undefined') return;

    const applyHeroLowResourceState = (isOffscreen: boolean): void => {
        heroEl.classList.toggle('is-offscreen', isOffscreen);
        document.body.classList.toggle('hero-is-offscreen', isOffscreen);

        if (isOffscreen) {
            heroEl.setAttribute('data-hero-offscreen', 'true');
            motionSuspension.suspend('scrollEngine', 'hero-offscreen');
            motionSuspension.suspend('particleSystem', 'hero-offscreen');
            motionSuspension.suspend('heroParticles', 'hero-offscreen');

            if (dustCanvas) {
                dustCanvas.classList.add('is-low-resource');
                dustCanvas.setAttribute('data-low-resource', 'true');
                dustCanvas.__particleSystem?.stopAnimationLoop?.();
                dustCanvas.width = 1;
                dustCanvas.height = 1;
                dustCanvas.style.visibility = 'hidden';
            }
        } else {
            heroEl.removeAttribute('data-hero-offscreen');
            motionSuspension.resume('scrollEngine', 'hero-offscreen');
            motionSuspension.resume('particleSystem', 'hero-offscreen');
            motionSuspension.resume('heroParticles', 'hero-offscreen');

            if (dustCanvas) {
                dustCanvas.classList.remove('is-low-resource');
                dustCanvas.removeAttribute('data-low-resource');
                dustCanvas.style.visibility = 'visible';
                dustCanvas.__particleSystem?.resize?.();
                dustCanvas.__particleSystem?.startAnimationLoop?.();
            }
        }
    };

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                applyHeroLowResourceState(!entry.isIntersecting);
            }
        },
        { rootMargin: '200px 0px 200px 0px' }
    );

    observer.observe(heroEl);
}

/**
 * Smoothly pre-scrolls and centers a news card within the viewport when expanded,
 * ensuring the user's visual focus remains anchored on the story content.
 */
export function preScrollNewsCardToCenter(card: HTMLElement): void {
    if (typeof window === 'undefined' || !card) return;

    const prefersReducedMotion = typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof window.scrollTo !== 'function') return;

    const rect = card.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 800;
    const navBarHeight = 80;

    // Calculate vertical offset to center the card in viewport, respecting sticky navigation header
    const cardVisualHeight = Math.min(rect.height || 360, 480);
    const targetY = (window.scrollY || window.pageYOffset || 0) + rect.top - Math.max(navBarHeight, (viewportHeight - cardVisualHeight) / 2);

    window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth',
    });
}

/**
 * Initializes the news card expansion pre-scroll handler to ensure that clicking
 * 'Full Story' centers the selected article in the viewport.
 */
export function initNewsCardExpansionHandler(containerSelector: string = '#newsEventsGrid'): void {
    const container = document.querySelector<HTMLElement>(containerSelector);
    if (!container) return;

    container.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const expandBtn = target.closest<HTMLButtonElement>('.news-card__expand-btn');
        const card = target.closest<HTMLElement>('.news-card');

        if (!card) return;

        // Skip if clicking an internal hyperlink that is not the expand button
        if (target.closest('a') && !expandBtn) return;

        // Pre-scroll if the card is about to expand
        const isExpanding = !card.classList.contains('is-expanded');
        if (isExpanding) {
            preScrollNewsCardToCenter(card);
        }
    }, true);
}

// Initialize service worker lifecycle
initServiceWorker();

// Boot application when DOM is ready
const boot = () => {
    // 0. Intelligent Adaptive Performance assessment & profile synchronization
    performanceManager.recalculate();

    initHomePage();
    initHeroViewportObserver();
    initNewsCardExpansionHandler();
    new AiAssistantWidget().init();
    log.info(`SJCCC Digital Campus initialized [Perf: ${performanceManager.getProfile().toUpperCase()}]`);
};

// Boot application when DOM is ready (guarded against test imports)
const isTestEnv = (typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test')) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

if (!isTestEnv && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}
