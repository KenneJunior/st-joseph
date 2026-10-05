/**
 * ============================================================================
 * SJCCC – Prospectus Page Entry Point
 * ============================================================================
 */

import { initProspectusPage } from './pages/prospectus/prospectus.ts';
import { initServiceWorker } from './services/serviceWorker.ts';

// Initialize service worker lifecycle for direct visitors to prospectus
initServiceWorker();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initProspectusPage();
    });
} else {
    initProspectusPage();
}

export * from './pages/prospectus/prospectus.ts';
