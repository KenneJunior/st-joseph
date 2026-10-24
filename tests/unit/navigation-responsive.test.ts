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

        it('expands logo-container to 100% max-width on mobile to prevent calc(100% - 320px) truncation of school name', () => {
            expect(navMobileCss).toContain('/* Expand school brand container to full available width in .header-inner (prevents calc(100% - 320px) truncation) */');
            expect(navMobileCss).toContain('.logo-container {\n    max-width: 100%;\n    width: 100%;\n    flex: 1 1 auto;\n    min-width: 0;\n  }');
        });

        it('ensures school name in logo-text and small is properly sized and visible at <= 480px and <= 360px', () => {
            expect(navMobileCss).toContain('@media (max-width: 480px)');
            expect(navMobileCss).toContain('@media (max-width: 360px)');
            expect(navMobileCss).toContain('font-size: clamp(0.90rem, 0.80rem + 0.40vw, 1.02rem);');
            expect(navMobileCss).toContain('font-size: clamp(0.82rem, 0.74rem + 0.35vw, 0.90rem);');
        });
    });

    describe('Desktop Intermediate Range (1025px - 1200px)', () => {
        it('applies progressive spacing to header actions at <= 1200px', () => {
            expect(responsiveLegacyCss).toContain('.header-action-btn {\n    height: 38px;\n    padding: 0 10px;\n    font-size: 0.80rem;\n    gap: 5px;\n  }');
            expect(responsiveLegacyCss).toContain('.logo-motto {\n    display: none;\n  }');
        });
    });

    describe('Enhanced Desktop Navigation & Anti-Overflow Architecture', () => {
        const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
        const navCss = fs.readFileSync(path.join(rootDir, 'src/css/layout/navigation.css'), 'utf-8');

        it('anchors header-actions with margin-left: auto to prevent right-corner push-out', () => {
            expect(headerCss).toContain('.header-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex-shrink: 0;\n  margin-left: auto;');
        });

        it('defines desktop responsive action compaction for 1025px - 1360px to preserve Theme Toggle & Prospectus visibility', () => {
            expect(headerCss).toContain('@media (max-width: 1360px) and (min-width: 1025px)');
            expect(headerCss).toContain('.header-action-btn.header-install-btn {\n    width: 38px;\n    height: 38px;\n    min-width: 38px;');
            expect(headerCss).toContain('.header-action-btn.header-reminders-btn {\n    padding: 0 9px;\n    min-width: 42px;');
        });

        it('structures #navMenu with all 12 section links directly in desktop navigation', () => {
            expect(indexHtml).toContain('href="#heroSection"');
            expect(indexHtml).toContain('href="#about"');
            expect(indexHtml).toContain('href="#academics"');
            expect(indexHtml).toContain('href="#schoolDatesSection"');
            expect(indexHtml).toContain('href="#news-events"');
            expect(indexHtml).toContain('href="#results"');
            expect(indexHtml).toContain('href="#campus"');
            expect(indexHtml).toContain('href="#campusMapSection"');
            expect(indexHtml).toContain('href="#location"');
            expect(indexHtml).toContain('href="#testimonials"');
            expect(indexHtml).toContain('href="#faq"');
            expect(indexHtml).toContain('href="#contact"');
        });

        it('implements icon-first navigation with hover-to-reveal text so more icons fit without overflow', () => {
            // Text is collapsed by default (max-width: 0) so icon fits
            expect(navCss).toContain('#navMenu .nav-text {\n  display: inline-block;\n  max-width: 0;\n  opacity: 0;\n  overflow: hidden;');
            // Text reveals smoothly on hover, focus, or active
            expect(navCss).toContain('#navMenu a.nav-link:hover .nav-text,\n#navMenu a.nav-link:focus-visible .nav-text,\n#navMenu a.nav-link.active .nav-text {\n  max-width: 120px;\n  opacity: 1;');
        });
    });
});

