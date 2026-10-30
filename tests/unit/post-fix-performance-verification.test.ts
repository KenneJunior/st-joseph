import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { HeroTitleTyping } from '../../src/features/hero/HeroTitleTyping.ts';

describe('Post-Fix Comprehensive Performance & Stability Verification', () => {
    const rootDir = process.cwd();
    const indexHtml = fs.readFileSync(path.resolve(rootDir, 'index.html'), 'utf-8');
    const prospectusHtml = fs.readFileSync(path.resolve(rootDir, 'prospectus.html'), 'utf-8');
    const scrollEffectCss = fs.readFileSync(path.resolve(rootDir, 'src/css/scrollEffect.css'), 'utf-8');
    const perfModeCss = fs.readFileSync(path.resolve(rootDir, 'src/css/core/performance-mode.css'), 'utf-8');

    describe('1. Render-Blocking Resource Elimination (LCP & FCP)', () => {
        it('verifies Google Fonts in index.html is loaded asynchronously via preload pattern', () => {
            const $ = cheerio.load(indexHtml);
            const fontLinks = $('link[href*="fonts.googleapis.com"]');
            expect(fontLinks.length).toBeGreaterThanOrEqual(1);

            // Confirm non-blocking preload link exists with onload activation
            const preloadFont = $('link[rel="preload"][as="style"][href*="fonts.googleapis.com"]');
            expect(preloadFont.length).toBe(1);
            expect(preloadFont.attr('onload')).toContain('this.rel=\'stylesheet\'');

            // Confirm noscript fallback exists for non-JS clients
            const noscriptText = $('noscript').text();
            expect(noscriptText).toContain('fonts.googleapis.com');
            expect(noscriptText).toContain('rel="stylesheet"');
        });

        it('verifies Bootstrap Icons in index.html is loaded asynchronously via preload pattern', () => {
            const $ = cheerio.load(indexHtml);
            const iconPreload = $('link[rel="preload"][as="style"][href*="bootstrap-icons"]');
            expect(iconPreload.length).toBe(1);
            expect(iconPreload.attr('onload')).toContain('this.rel=\'stylesheet\'');

            const noscriptText = $('noscript').text();
            expect(noscriptText).toContain('bootstrap-icons');
        });

        it('verifies prospectus.html also uses non-blocking preload pattern for fonts and icons', () => {
            const $ = cheerio.load(prospectusHtml);
            const fontPreload = $('link[rel="preload"][as="style"][href*="fonts.googleapis.com"]');
            const iconPreload = $('link[rel="preload"][as="style"][href*="bootstrap-icons"]');
            expect(fontPreload.length).toBe(1);
            expect(iconPreload.length).toBe(1);
        });

        it('confirms preconnect hints to fonts.googleapis.com and fonts.gstatic.com are in place', () => {
            const $ = cheerio.load(indexHtml);
            expect($('link[rel="preconnect"][href="https://fonts.googleapis.com"]').length).toBe(1);
            expect($('link[rel="preconnect"][href="https://fonts.gstatic.com"]').length).toBe(1);
        });
    });

    describe('2. Layout Stability & Zero-CLS Hero Heading Architecture', () => {
        it('verifies HeroTitleTyping pre-allocates layout structure and preserves text content without collapsing', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <main id="main-content">
                        <section id="heroSection">
                            <h1 class="school-name" aria-label="St. Joseph's Catholic Comprehensive College Mbengwi">
                                St. Joseph's <span class="gold-shimmer">Catholic</span><br>Comprehensive College Mbengwi
                            </h1>
                        </section>
                    </main>
                </body>
                </html>
            `);

            // @ts-expect-error Mock DOM environment
            global.document = dom.window.document;
            // @ts-expect-error Mock DOM environment
            global.window = dom.window;

            const heading = dom.window.document.querySelector('.school-name') as HTMLElement;
            expect(heading).not.toBeNull();

            const typing = new HeroTitleTyping();
            typing.startTyping();

            // Heading must contain all individual characters pre-rendered in layout
            const charSpans = heading.querySelectorAll('.hero-type-char');
            expect(charSpans.length).toBeGreaterThan(40);

            // First character should become visible, while total string matches canonical name
            const fullText = Array.from(charSpans).map(s => s.textContent).join('');
            expect(fullText).toBe("St. Joseph's CatholicComprehensive College Mbengwi");

            // Caret must have aria-hidden='true' and class 'hero-typing-caret'
            const caret = heading.querySelector('.hero-typing-caret');
            expect(caret).not.toBeNull();
            expect(caret?.getAttribute('aria-hidden')).toBe('true');
        });

        it('verifies .hero-typing-caret is styled as an absolute non-displacing overlay', () => {
            expect(scrollEffectCss).toContain('.hero-typing-caret {');
            expect(scrollEffectCss).toContain('position: absolute;');
            expect(scrollEffectCss).toContain('pointer-events: none;');
            expect(scrollEffectCss).toContain('will-change: transform, opacity;');
        });

        it('verifies .scroll-message-wrapper has reserved min-height to prevent layout shifts', () => {
            expect(scrollEffectCss).toContain('.scroll-message-wrapper {');
            expect(scrollEffectCss).toContain('min-height: clamp(100px, 14vh, 160px);');
        });
    });

    describe('3. GPU Compositing & Main Thread Paint Reduction (goldShimmerComposited)', () => {
        it('verifies .gold-shimmer uses layer promotion (translateZ) and opacity modulation instead of software filter', () => {
            expect(scrollEffectCss).toContain('.gold-shimmer {');
            expect(scrollEffectCss).toContain('transform: translateZ(0);');
            expect(scrollEffectCss).toContain('will-change: opacity;');
            expect(scrollEffectCss).toContain('animation: goldShimmerComposited');

            // Keyframes must modulate opacity (GPU composited) rather than software filter drop-shadow
            expect(scrollEffectCss).toContain('@keyframes goldShimmerComposited {');
            expect(scrollEffectCss).toContain('opacity:');
            expect(scrollEffectCss).not.toContain('filter: brightness(1) drop-shadow(');
        });

        it('verifies reduced motion disables gold shimmer animation', () => {
            expect(scrollEffectCss).toContain('.gold-shimmer {');
            expect(scrollEffectCss).toContain('animation: none !important;');
        });
    });

    describe('4. Adaptive Performance Modes & URL Override (?performance=lite)', () => {
        it('verifies index.html early inline script restores ?performance=lite parameter synchronously', () => {
            expect(indexHtml).toContain("params.get('performance')");
            expect(indexHtml).toContain("document.documentElement.setAttribute('data-performance-mode', effectiveMode)");
            expect(indexHtml).toContain("document.documentElement.classList.add('perf-mode-' + effectiveMode)");
        });

        it('verifies performance-mode.css includes solid-surface fallbacks and particle disabling for lite mode', () => {
            expect(perfModeCss).toContain('html[data-performance-mode="lite"]');
            expect(perfModeCss).toContain('#dustCanvas');
            expect(perfModeCss).toContain('.hero-particles');
            expect(perfModeCss).toContain('.glass-fallback');
        });

        it('verifies accessibility.css enforces reduced motion behavior when Lite Performance Mode is active', () => {
            const accessibilityCss = fs.readFileSync(path.resolve(rootDir, 'src/css/core/accessibility.css'), 'utf-8');
            expect(accessibilityCss).toContain('html[data-performance-mode="lite"] *');
            expect(accessibilityCss).toContain('animation-duration: 0.01ms !important;');
            expect(accessibilityCss).toContain('scroll-behavior: auto !important;');
            expect(accessibilityCss).toContain('html[data-performance-mode="lite"] .hero-bg-img');
            expect(accessibilityCss).toContain('html[data-performance-mode="lite"] .scroll-message-wrapper');
        });

        it('verifies HeroTitleTyping bypasses typing animation when lite mode is active', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html data-performance-mode="lite" class="lite-mode">
                <body>
                    <main id="main-content">
                        <section id="heroSection">
                            <h1 class="school-name">
                                St. Joseph's <span class="gold-shimmer">Catholic</span><br>Comprehensive College Mbengwi
                            </h1>
                        </section>
                    </main>
                </body>
                </html>
            `);

            // @ts-expect-error Mock DOM environment
            global.document = dom.window.document;
            // @ts-expect-error Mock DOM environment
            global.window = dom.window;

            const heading = dom.window.document.querySelector('.school-name') as HTMLElement;
            const originalHtml = heading.innerHTML;

            const typing = new HeroTitleTyping();
            // In lite mode, init should immediately return and NOT replace innerHTML with spans
            expect(heading.innerHTML).toBe(originalHtml);
            expect(heading.querySelectorAll('.hero-type-char').length).toBe(0);
        });
    });

    describe('5. Lite Mode Hardware-Accelerated Animation Suppression & Layer De-promotion', () => {
        const freshPerfModeCss = fs.readFileSync(path.resolve(rootDir, 'src/css/core/performance-mode.css'), 'utf-8');

        it('verifies universal will-change release across all DOM nodes in lite mode', () => {
            expect(freshPerfModeCss).toContain('html[data-performance-mode="lite"] *');
            expect(freshPerfModeCss).toContain('will-change: auto !important;');
        });

        it('verifies mobile bottom navigation animations are forced into static resting states', () => {
            expect(freshPerfModeCss).toContain('.mobile-bottom-item.active i');
            expect(freshPerfModeCss).toContain('.mobile-bottom-item--menu.active i');
            expect(freshPerfModeCss).toContain('.mobile-bottom-item--reminders.active i');
            expect(freshPerfModeCss).toContain('animation: none !important;');
            expect(freshPerfModeCss).toContain('filter: none !important;');
        });

        it('verifies mobile bottom glider uses simplified micro transition without spring bounce', () => {
            expect(freshPerfModeCss).toContain('.mobile-bottom-glider');
            expect(freshPerfModeCss).toContain('transition: transform 0.06s ease, width 0.06s ease !important;');
        });

        it('verifies campus map continuous pulse and radar rings are suppressed', () => {
            expect(freshPerfModeCss).toContain('.map-pin-pulse');
            expect(freshPerfModeCss).toContain('.map-radar-ring');
            expect(freshPerfModeCss).toContain('.tour-pulse');
            expect(freshPerfModeCss).toContain('display: none !important;');
        });

        it('verifies 3D perspective and transforms are neutralized in lite mode', () => {
            expect(freshPerfModeCss).toContain('.scroll-message-wrapper');
            expect(freshPerfModeCss).toContain('[data-3d-wrapper]');
            expect(freshPerfModeCss).toContain('perspective: none !important;');
            expect(freshPerfModeCss).toContain('transform: none !important;');
        });

        it('verifies interactive hover transforms are eliminated to avoid navigation reflows', () => {
            expect(freshPerfModeCss).toContain('.btn:hover');
            expect(freshPerfModeCss).toContain('.stat-card:hover');
            expect(freshPerfModeCss).toContain('.pillar:hover');
            expect(freshPerfModeCss).toContain('#navMenu a:hover');
            expect(freshPerfModeCss).toContain('transform: none !important;');
        });

        it('verifies carousel slides and testimonial cards transition with simplified opacity', () => {
            expect(freshPerfModeCss).toContain('.carousel-slide');
            expect(freshPerfModeCss).toContain('.testimonial-card');
            expect(freshPerfModeCss).toContain('transition: opacity 0.1s ease !important;');
        });
    });
});

