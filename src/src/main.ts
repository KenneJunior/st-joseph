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
import { logger } from './core/logger/index.ts';
import './core/diagnostics/index.ts';

const log = logger.child('Main');

// Initialize service worker lifecycle
initServiceWorker();

// Boot application when DOM is ready
const boot = () => {
    initHomePage();
    log.info('SJCCC Digital Campus initialized');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
