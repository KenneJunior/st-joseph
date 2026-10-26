/**
 * ============================================================================
 * SJCCC – Prospectus Page Entry Point
 * ============================================================================
 */

import { initProspectusPage } from './pages/prospectus/prospectus.ts';
import { initServiceWorker } from './services/serviceWorker.ts';
import { performanceManager } from './core/performance/PerformanceManager.ts';
import { logger } from './core/logger/index.ts';
import './core/diagnostics/index.ts';

const log = logger.child('Prospectus');

// Initialize service worker lifecycle for direct visitors to prospectus
initServiceWorker();

const boot = () => {
    // Synchronize performance profile on prospectus page
    performanceManager.recalculate();

    initProspectusPage();
    log.info(`SJCCC Prospectus document initialized [Perf: ${performanceManager.getProfile().toUpperCase()}]`);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

export * from './pages/prospectus/prospectus.ts';
