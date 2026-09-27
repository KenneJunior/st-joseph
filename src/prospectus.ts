/**
 * ============================================================================
 * SJCCC – Prospectus Page Entry Point
 * ============================================================================
 */

import { initProspectusPage } from './pages/prospectus/prospectus.ts';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initProspectusPage();
    });
} else {
    initProspectusPage();
}

export * from './pages/prospectus/prospectus.ts';
