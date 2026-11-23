import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Mobile Full Performance Mode Backdrop-Filter Integrity', () => {
    const rootDir = process.cwd();
    const readCss = (relPath: string) => fs.readFileSync(path.join(rootDir, relPath), 'utf-8');

    it('removes Backdrop Root traps (isolation: isolate, resting will-change/transform) on #mainHeader, #mainHeader::before, and #navMenu', () => {
        const headerCss = readCss('src/css/layout/header.css');
        const navCss = readCss('src/css/layout/navigation.css');
        const navMobileCss = readCss('src/css/layout/navigation-mobile.css');

        expect(headerCss).not.toContain('isolation: isolate');
        expect(headerCss).not.toMatch(/#mainHeader\s*\{[^}]*will-change:\s*transform/);
        expect(headerCss).not.toMatch(/#mainHeader::before\s*\{[^}]*transform:\s*translate3d/);
        expect(headerCss).not.toMatch(/#mainHeader::before\s*\{[^}]*will-change:\s*backdrop-filter/);

        expect(navCss).not.toMatch(/#navMenu\s*\{[^}]*will-change:\s*transform/);
        expect(navMobileCss).not.toMatch(/#navMenu\s*\{[^}]*will-change:\s*transform/);
        expect(navMobileCss).toContain('-webkit-backdrop-filter:');
        // Drawer backgrounds must stay translucent so mobile blur shows through
        expect(navMobileCss).toContain('rgba(7, 24, 46, 0.68)');
        expect(navMobileCss).toContain('rgba(255, 255, 255, 0.72)');
    });

    it('ensures resting reveal/hero/button elements release transform Backdrop Roots and carry -webkit-backdrop-filter', () => {
        const scrollRevealCss = readCss('src/css/motion/scroll-reveal.css');
        const scrollEffectCss = readCss('src/css/scrollEffect.css');
        const buttonsCss = readCss('src/css/components/buttons.css');
        const statsCss = readCss('src/css/components/stats.css');

        expect(scrollRevealCss).toMatch(/\.reveal\.revealed,\s*[\r\n]+\.stagger-item\.revealed\s*\{[^}]*transform:\s*none/);
        expect(scrollRevealCss).toMatch(/\.stagger-card\.revealed\s*\{[^}]*transform:\s*none/);
        expect(scrollEffectCss).toMatch(/@keyframes heroFadeInUp\s*\{[\s\S]*?to\s*\{[^}]*transform:\s*none/);
        expect(buttonsCss).not.toMatch(/\.btn\s*\{[^}]*transform:\s*translate3d\(0,\s*0,\s*0\)/);
        expect(buttonsCss).not.toMatch(/\.btn\s*\{[^}]*backface-visibility:\s*hidden/);

        expect(statsCss).toMatch(/\.stat-card\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(10px\)/);
        // Base dark-mode .stat-card appears before mobile .stat-card @media (max-width: 768px) override
        const darkStatIndex = statsCss.indexOf('body.dark-mode .stat-card');
        const mobileStatIndex = statsCss.indexOf('.stats-section {\n    background-attachment: scroll;');
        expect(darkStatIndex).toBeGreaterThan(-1);
        expect(mobileStatIndex).toBeGreaterThan(darkStatIndex);
    });

    it('prevents filter + backdrop-filter hardware conflicts on .quick-actions-menu and .announcement-bar', () => {
        const quickActionsCss = readCss('src/css/features/quick-actions.css');
        const announcementCss = readCss('src/css/features/announcement.css');

        expect(quickActionsCss).not.toMatch(/(?<![-\w])filter:\s*blur\(/);
        expect(announcementCss).not.toMatch(/\.announcement-bar\.is-read\s*\{[^}]*filter:\s*saturate/);
        // Mobile announcement bar backgrounds must remain translucent
        expect(announcementCss).not.toMatch(/--announcement-bg-mobile:\s*linear-gradient\([^)]*#ffffff/);
        expect(announcementCss).toContain('rgba(255, 255, 255, 0.72)');
        expect(announcementCss).toContain('rgba(7, 24, 46, 0.68)');
    });

    it('flattens mobile 3D Backdrop Roots on carousel and dialog modals with -webkit-backdrop-filter', () => {
        const carouselCss = readCss('src/css/features/carousel.css');
        const dialogCss = readCss('src/css/components/dialog.css');
        const dialogTs = readCss('src/DialogBox.ts');

        expect(carouselCss).toMatch(/@media \(max-width:\s*768px\)[\s\S]*?\.carousel-container\s*\{[^}]*isolation:\s*auto !important/);
        expect(carouselCss).toMatch(/@media \(max-width:\s*768px\)[\s\S]*?\.carousel-track,[\s\S]*?transform-style:\s*flat !important/);
        expect(carouselCss).not.toContain('background: rgba(5, 12, 27, 0.94);');

        expect(dialogCss).toContain('-webkit-backdrop-filter: blur(15px) saturate(180%);');
        expect(dialogCss).toMatch(/\.cd-card\.cd-visible\s*\{[^}]*transform:\s*none;/);
        expect(dialogTs).toContain('-webkit-backdrop-filter: blur(15px) saturate(180%);');
        expect(dialogTs).toMatch(/\.cd-card\.cd-visible\s*\{[^}]*transform:\s*none;/);
    });

    it('protects all glassmorphic surfaces in full performance mode across performance-mode.css and glassmorphism-lite.css', () => {
        const perfModeCss = readCss('src/css/core/performance-mode.css');
        const glassLiteCss = readCss('src/css/core/glassmorphism-lite.css');

        const requiredSelectors = [
            '#navMenu',
            '.stat-card',
            '.carousel-caption',
            '.hero-badge',
            '.btn-outline',
            '#getInTouchBtn',
            '.announcement-bar',
            '.unified-action-dock',
            '.quick-actions-menu',
            '.mobile-bottom-bar',
        ];

        for (const selector of requiredSelectors) {
            expect(perfModeCss).toContain(`html[data-performance-mode="full"] ${selector}`);
        }
        expect(perfModeCss).toContain('html[data-performance-mode="full"]:not(.blur-throttled):not(.glassmorphism-lite):not([data-backdrop-blur="throttled"]) #mainHeader::before');
        expect(perfModeCss).toContain('html[data-performance-mode="full"] .cd-card');
        expect(perfModeCss).toContain('html[data-performance-mode="full"] .news-card__category-badge');
        expect(glassLiteCss).toContain('html[data-performance-mode="full"]:not(.perf-mode-lite):not(.lite-mode):not(.blur-throttled):not(.glassmorphism-lite):not([data-backdrop-blur="throttled"]) #mainHeader::before');
        expect(glassLiteCss).toContain('html[data-performance-mode="full"]:not(.perf-mode-lite):not(.lite-mode):not(.blur-throttled):not(.glassmorphism-lite):not([data-backdrop-blur="throttled"]) .stat-card');
    });
});
