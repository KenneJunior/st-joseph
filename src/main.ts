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

// Initialize service worker lifecycle
initServiceWorker();

// Boot application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initHomePage();
    });
} else {
    initHomePage();
}
