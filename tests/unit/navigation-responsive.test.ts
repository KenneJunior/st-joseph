import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MobileNavigation } from '../../src/ui/navigation/MobileNavigation.ts';

describe('SJCCC Top Navigation — Responsive Spacing, Adaptive Layout & Transitions', () => {
    const rootDir = process.cwd();
    const navMobileCss = fs.readFileSync(path.join(rootDir, 'src/css/layout/navigation-mobile.css'), 'utf-8');
    const headerCss = fs.readFileSync(path.join(rootDir, 'src/css/layout/header.css'), 'utf-8');
    const responsiveLegacyCss = fs.readFileSync(path.join(rootDir, 'src/css/layout/responsive-legacy.css'), 'utf-8');

    describe('Transition A: Desktop to Tablet Transition (max-width: 1024px)', () => {
        it('hides desktop motto and enforces proportional logo clamping without inverted bounds', () => {
            // Verify motto is hidden on tablet to prevent crowding
            expect(navMobileCss).toContain('.logo-motto {\n    display: none !important;\n  }');

            // Verify logo clamp has min < max (1.02rem < 1.18rem)
            expect(navMobileCss).toContain('font-size: clamp(1.02rem, 0.92rem + 0.35vw, 1.18rem);');
            expect(navMobileCss).not.toContain('clamp(1.58rem');
        });

        it('establishes a balanced context-appropriate grouping in .header-actions', () => {
            // Action pills styling
            expect(navMobileCss).toContain('/* Primary Action Pills: Reminders, Prospectus, Install */');
            expect(navMobileCss).toContain('.header-action-btn {\n    height: 38px;\n    padding: 0 11px;\n    font-size: 0.78rem;');

            // Hairline divider separating Action pills from System utilities
            expect(navMobileCss).toContain('.header-action-btn.header-install-btn::after');
            expect(navMobileCss).toContain('width: 1px;\n    height: 18px;');
        });

        it('harmonizes theme toggle and menu toggle with matching 38px circular geometry', () => {
            expect(navMobileCss).toContain('.header-theme-toggle {\n    width: 38px;\n    height: 38px;\n    min-width: 38px;\n    min-height: 38px;\n    border-radius: 50%;');
            expect(navMobileCss).toContain('.menu-toggle {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    width: 38px;\n    height: 38px;\n    min-width: 38px;\n    min-height: 38px;');

            // Verifies the previous 44px override was eliminated
            expect(navMobileCss).not.toContain('.header-actions #themeToggle {\n    width: 44px;');
        });
    });

    describe('Transition B: Adaptive Compact Header (769px - 880px)', () => {
        it('gracefully compacts Install button into a circular icon button at <= 880px', () => {
            expect(navMobileCss).toContain('@media (max-width: 880px) and (min-width: 769px)');
            expect(navMobileCss).toContain('.header-action-btn.header-install-btn {\n    width: 38px;\n    height: 38px;\n    min-width: 38px;\n    padding: 0;\n    border-radius: 50%;');
            expect(navMobileCss).toContain('.header-action-btn.header-install-btn .header-btn-text {\n    display: none;\n  }');
        });

        it('shifts hairline divider to follow Prospectus at <= 880px to preserve visual grouping', () => {
            expect(navMobileCss).toContain('.header-action-btn.header-prospectus-btn::after');
            expect(navMobileCss).toContain('.header-action-btn.header-install-btn::after {\n    display: none;\n  }');
        });

        it('compacts Reminders button text at <= 810px while preserving notification badge', () => {
            expect(navMobileCss).toContain('@media (max-width: 810px) and (min-width: 769px)');
            expect(navMobileCss).toContain('.header-action-btn.header-reminders-btn {\n    padding: 0 9px;\n    min-width: 44px;\n    gap: 4px;\n  }');
            expect(navMobileCss).toContain('.header-action-btn.header-reminders-btn .header-btn-text {\n    display: none;\n  }');
        });

        it('preserves Prospectus label throughout the pre-pill transition for institutional CTA prominence', () => {
            expect(navMobileCss).toContain('.header-action-btn.header-prospectus-btn {\n    padding: 0 10px;\n    font-size: 0.76rem;');
            // Prospectus text label is not hidden
            expect(navMobileCss).not.toContain('.header-action-btn.header-prospectus-btn .header-btn-text {\n    display: none;');
        });
    });

    describe('Compact Navigation Pill Synchronization (<= 768px)', () => {
        it('synchronizes MobileNavigation.BOTTOM_BAR_BREAKPOINT_PX with max-width: 768px in CSS', () => {
            expect(MobileNavigation.BOTTOM_BAR_BREAKPOINT_PX).toBe(768);
            expect(navMobileCss).toContain('@media (max-width: 768px) {\n  /* Hide top header actions and menu toggle when bottom bar is active */');
            expect(navMobileCss).not.toContain('@media (max-width: 767px)');
        });

        it('aligns header height reduction to 768px in header.css', () => {
            expect(headerCss).toContain('@media (max-width: 768px) {\n  :root {\n    --header-height: 56px;');
        });
    });

    describe('Desktop Intermediate Range (1025px - 1200px)', () => {
        it('applies progressive spacing to header actions at <= 1200px', () => {
            expect(responsiveLegacyCss).toContain('.header-action-btn {\n    height: 38px;\n    padding: 0 10px;\n    font-size: 0.80rem;\n    gap: 5px;\n  }');
            expect(responsiveLegacyCss).toContain('.logo-motto {\n    display: none;\n  }');
        });
    });
});
