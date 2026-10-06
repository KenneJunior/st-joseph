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

// Initialize service worker lifecycle
initServiceWorker();

// Boot application when DOM is ready
const boot = () => {
    initHomePage();
    initHeroViewportObserver();
    log.info('SJCCC Digital Campus initialized');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
