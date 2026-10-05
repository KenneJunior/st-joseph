/**
 * ============================================================================
 * SJCCC – Prospectus Page Bootstrap Orchestrator
 * Streamlined document-first controller for theme management, mobile navigation,
 * native print triggering, and offline status monitoring.
 * ============================================================================
 */

import { PROSPECTUS_SELECTORS } from '../../core/config/selectors.ts';
import { ThemeManager } from '../../core/theme/ThemeManager.ts';
import { MobileNavigation } from '../../ui/navigation/MobileNavigation.ts';
import { OfflineIndicator } from '../../features/offline/OfflineIndicator.ts';
import { LiquidGlassAdapter } from '../../ui/effects/LiquidGlassAdapter.ts';
import { CardSplitter } from '../../ui/utils/CardSplitter.ts';
import { COLLEGE_PROFILE } from '../../data/collegeProfile.ts';
import { TUITION_FEES } from '../../data/tuitionFees.ts';
import { TECHNICAL_DEPARTMENTS } from '../../data/academicPrograms.ts';
import { ADMISSION_REQUIREMENTS } from '../../data/admissionRequirements.ts';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../data/academicCalendar.ts';

// Re-export canonical datasets for document consumers and test validation
export {
    COLLEGE_PROFILE,
    TUITION_FEES,
    TECHNICAL_DEPARTMENTS,
    ADMISSION_REQUIREMENTS,
    ACADEMIC_MILESTONES_2026_2027,
};

/**
 * Handles PDF Export / Print triggering via standard browser print API.
 * The print stylesheet (@media print) automatically hides web chrome without DOM mutation.
 */
export class PdfExporter {
    constructor(buttonId: string) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        button.addEventListener('click', () => {
            window.print();
        });
    }
}

/**
 * Development console welcome logging
 */
export class InitLogger {
    constructor() {
        if (!this.isLocalEnvironment()) return;

        const theme = document.body.classList.contains('dark-mode') ? 'Dark' : 'Light';
        const message = `SJCCC Prospectus Initialized | Theme: ${theme} | ${new Date().toLocaleTimeString()}`;
        console.log(`%c${message}`, 'color: #C9A229; font-weight: bold;');
    }

    private isLocalEnvironment(): boolean {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }
}

export class ProspectusApp {
    constructor() {
        this.init();
    }

    private init(): void {
        // 1. Theme Manager in smooth fade mode
        new ThemeManager({
            toggleId: PROSPECTUS_SELECTORS.darkModeToggle,
            mode: 'fade',
        });

        // 2. Mobile Navigation for small viewports
        new MobileNavigation(
            PROSPECTUS_SELECTORS.menuToggle,
            PROSPECTUS_SELECTORS.navMenu,
            PROSPECTUS_SELECTORS.mainHeader,
            PROSPECTUS_SELECTORS.navLink
        );

        // 3. Native PDF / Print Export Handler
        new PdfExporter(PROSPECTUS_SELECTORS.downloadPdfBtn);

        // 4. Offline connectivity status indicator with Service Worker cache validation
        new OfflineIndicator();

        // 5. External LiquidGlass integration (Targeted focal surfaces: Floating PDF button & Motto Bar)
        const liquidGlass = new LiquidGlassAdapter();
        liquidGlass.initProspectusSurfaces();

        // 6. Interactive card splitters & visual feedback boundaries
        new CardSplitter();

        // 7. Development logger
        new InitLogger();
    }
}

export function initProspectusPage(): void {
    new ProspectusApp();
}
