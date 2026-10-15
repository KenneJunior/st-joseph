import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Timeline Track Container Progressive Blur System', () => {
    const cssPath = path.resolve(__dirname, '../../src/css/features/calendar-timeline.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('defines progressive blur height and padding variables on .timeline-track-container', () => {
        expect(cssContent).toMatch(/\.timeline-track-container\s*\{[^}]*--timeline-blur-height:\s*54px/);
        expect(cssContent).toMatch(/\.timeline-track-container\s*\{[^}]*--timeline-pad-top:\s*16px/);
        expect(cssContent).toMatch(/\.timeline-track-container\s*\{[^}]*--timeline-pad-bottom:\s*28px/);
    });

    it('configures progressive blur with multi-stop mask-image and backdrop-filter on ::before', () => {
        // Must contain backdrop-filter with blur and saturation
        expect(cssContent).toMatch(/backdrop-filter:\s*blur\(14px\)\s*saturate\(135%\)/);
        expect(cssContent).toMatch(/-webkit-backdrop-filter:\s*blur\(14px\)\s*saturate\(135%\)/);

        // ::before must have mask-image with smooth multi-stop gradient to bottom
        expect(cssContent).toMatch(/\.timeline-track-container::before\s*\{[^}]*mask-image:\s*linear-gradient\(\s*to bottom/);
        expect(cssContent).toMatch(/\.timeline-track-container::before\s*\{[^}]*-webkit-mask-image:\s*linear-gradient\(\s*to bottom/);

        // ::before must have top sticky offset and negative margin
        expect(cssContent).toMatch(/\.timeline-track-container::before\s*\{[^}]*top:\s*calc\(-1\s*\*\s*var\(--timeline-pad-top/);
        expect(cssContent).toMatch(/\.timeline-track-container::before\s*\{[^}]*margin-bottom:\s*calc\(-1\s*\*\s*var\(--timeline-blur-height/);

        // ::before must inherit top border radius
        expect(cssContent).toMatch(/\.timeline-track-container::before\s*\{[^}]*border-top-left-radius:\s*inherit/);
        expect(cssContent).toMatch(/\.timeline-track-container::before\s*\{[^}]*border-top-right-radius:\s*inherit/);
    });

    it('configures progressive blur with multi-stop mask-image and backdrop-filter on ::after', () => {
        // ::after must have mask-image with smooth multi-stop gradient to top
        expect(cssContent).toMatch(/\.timeline-track-container::after\s*\{[^}]*mask-image:\s*linear-gradient\(\s*to top/);
        expect(cssContent).toMatch(/\.timeline-track-container::after\s*\{[^}]*-webkit-mask-image:\s*linear-gradient\(\s*to top/);

        // ::after must have bottom sticky offset and negative margin
        expect(cssContent).toMatch(/\.timeline-track-container::after\s*\{[^}]*bottom:\s*calc\(-1\s*\*\s*var\(--timeline-pad-bottom/);
        expect(cssContent).toMatch(/\.timeline-track-container::after\s*\{[^}]*margin-top:\s*calc\(-1\s*\*\s*var\(--timeline-blur-height/);

        // ::after must inherit bottom border radius
        expect(cssContent).toMatch(/\.timeline-track-container::after\s*\{[^}]*border-bottom-left-radius:\s*inherit/);
        expect(cssContent).toMatch(/\.timeline-track-container::after\s*\{[^}]*border-bottom-right-radius:\s*inherit/);
    });

    it('defines progressive blur dark-mode variants for both ::before and ::after', () => {
        expect(cssContent).toMatch(/body\.dark-mode\s+\.timeline-track-container::before\s*\{[^}]*background:\s*linear-gradient\(\s*180deg/);
        expect(cssContent).toMatch(/body\.dark-mode\s+\.timeline-track-container::after\s*\{[^}]*background:\s*linear-gradient\(\s*0deg/);
    });

    it('triggers smooth reveal on .can-scroll-up::before and .can-scroll-down::after', () => {
        expect(cssContent).toMatch(/\.timeline-track-container\.can-scroll-up::before\s*\{[^}]*opacity:\s*1;\s*transform:\s*translateY\(0\);/);
        expect(cssContent).toMatch(/\.timeline-track-container\.can-scroll-down::after\s*\{[^}]*opacity:\s*1;\s*transform:\s*translateY\(0\);/);
    });

    it('includes responsive scaling for blur height across breakpoints', () => {
        expect(cssContent).toMatch(/--timeline-blur-height:\s*48px/);
        expect(cssContent).toMatch(/--timeline-blur-height:\s*44px/);
        expect(cssContent).toMatch(/--timeline-blur-height:\s*40px/);
    });

    it('respects prefers-reduced-motion for ::before and ::after', () => {
        expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.timeline-track-container::before/);
        expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.timeline-track-container::after/);
    });
});
