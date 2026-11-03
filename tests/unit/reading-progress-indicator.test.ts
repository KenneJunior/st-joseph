import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { ReadingProgressIndicator } from '../../src/ui/navigation/ReadingProgressIndicator.ts';

describe('ReadingProgressIndicator Component', () => {
    let dom: JSDOM;
    let indicator: ReadingProgressIndicator | null = null;
    let aboutEl: HTMLElement;
    let academicsEl: HTMLElement;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <div id="heroSection" style="height: 800px;">Hero</div>
                <section id="about" style="height: 1200px;">About Section Content</section>
                <section id="academics" style="height: 1500px;">Academics Section Content</section>
                <section id="news" style="height: 800px;">News Section Content</section>
            </body>
            </html>
        `, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true
        });

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        };
        (globalThis as any).cancelAnimationFrame = vi.fn();

        aboutEl = dom.window.document.getElementById('about') as HTMLElement;
        academicsEl = dom.window.document.getElementById('academics') as HTMLElement;

        Object.defineProperty(aboutEl, 'offsetHeight', { value: 1200, configurable: true });
        Object.defineProperty(academicsEl, 'offsetHeight', { value: 1500, configurable: true });

        (dom.window as any).innerHeight = 800;
        (dom.window as any).scrollY = 0;
    });

    afterEach(() => {
        indicator?.destroy();
        indicator = null;
        dom.window.document.getElementById('readingProgressIndicator')?.remove();
    });

    it('renders reading progress indicator DOM at the top of the body', () => {
        indicator = new ReadingProgressIndicator();

        const container = dom.window.document.getElementById('readingProgressIndicator');
        expect(container).not.toBeNull();
        expect(container?.getAttribute('role')).toBe('progressbar');

        const bar = dom.window.document.getElementById('readingProgressBar');
        expect(bar).not.toBeNull();

        const badge = dom.window.document.getElementById('readingProgressBadge');
        expect(badge).not.toBeNull();
    });

    it('remains inactive while scrolling in hero section above tracked sections', () => {
        // Hero section - both sections are far down
        aboutEl.getBoundingClientRect = () => ({
            top: 600,
            bottom: 1800,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1200,
            x: 0,
            y: 600,
            toJSON: () => {}
        });

        academicsEl.getBoundingClientRect = () => ({
            top: 1800,
            bottom: 3300,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1500,
            x: 0,
            y: 1800,
            toJSON: () => {}
        });

        indicator = new ReadingProgressIndicator();
        indicator.update();

        expect(indicator.isVisible()).toBe(false);
        const container = dom.window.document.getElementById('readingProgressIndicator');
        expect(container?.classList.contains('is-active')).toBe(false);
    });

    it('activates and calculates reading progress when inside the About section', () => {
        // About section has scrolled into reading horizon
        aboutEl.getBoundingClientRect = () => ({
            top: 0,
            bottom: 1200,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1200,
            x: 0,
            y: 0,
            toJSON: () => {}
        });

        academicsEl.getBoundingClientRect = () => ({
            top: 1200,
            bottom: 2700,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1500,
            x: 0,
            y: 1200,
            toJSON: () => {}
        });

        indicator = new ReadingProgressIndicator();
        indicator.update();

        expect(indicator.isVisible()).toBe(true);
        expect(indicator.getActiveSection()?.id).toBe('about');
        expect(indicator.getActiveSection()?.label).toBe('About SJCCC');
        expect(indicator.getProgress()).toBeGreaterThan(0);
        expect(indicator.getProgress()).toBeLessThanOrEqual(1);

        const sectionName = dom.window.document.getElementById('readingSectionName');
        expect(sectionName?.textContent).toBe('About SJCCC');

        const percentEl = dom.window.document.getElementById('readingProgressPercent');
        expect(percentEl?.textContent).toMatch(/^\d+%/);

        const container = dom.window.document.getElementById('readingProgressIndicator');
        expect(container?.classList.contains('is-active')).toBe(true);
    });

    it('switches to Academic Pathways when scrolling into Academics section', () => {
        // About section has passed; Academics is in view
        aboutEl.getBoundingClientRect = () => ({
            top: -1200,
            bottom: 0,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1200,
            x: 0,
            y: -1200,
            toJSON: () => {}
        });

        academicsEl.getBoundingClientRect = () => ({
            top: 60,
            bottom: 1560,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1500,
            x: 0,
            y: 60,
            toJSON: () => {}
        });

        indicator = new ReadingProgressIndicator();
        indicator.update();

        expect(indicator.isVisible()).toBe(true);
        expect(indicator.getActiveSection()?.id).toBe('academics');
        expect(indicator.getActiveSection()?.label).toBe('Academic Pathways');

        const sectionName = dom.window.document.getElementById('readingSectionName');
        expect(sectionName?.textContent).toBe('Academic Pathways');
    });

    it('fades out when scrolling past Academics into News section', () => {
        // Both sections have scrolled completely off the top
        aboutEl.getBoundingClientRect = () => ({
            top: -2700,
            bottom: -1500,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1200,
            x: 0,
            y: -2700,
            toJSON: () => {}
        });

        academicsEl.getBoundingClientRect = () => ({
            top: -1500,
            bottom: 0,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1500,
            x: 0,
            y: -1500,
            toJSON: () => {}
        });

        indicator = new ReadingProgressIndicator();
        indicator.update();

        expect(indicator.isVisible()).toBe(false);
        expect(indicator.getActiveSection()).toBeNull();
    });

    it('cleans up elements and event listeners on destroy()', () => {
        indicator = new ReadingProgressIndicator();
        expect(dom.window.document.getElementById('readingProgressIndicator')).not.toBeNull();

        indicator.destroy();
        expect(dom.window.document.getElementById('readingProgressIndicator')).toBeNull();
    });

    it('supports custom multi-section configurations including dates, results, and testimonials', () => {
        const customSections = [
            { id: 'about', label: 'About SJCCC' },
            { id: 'academics', label: 'Academic Pathways' },
            { id: 'schoolDatesSection', label: 'Dates & Milestones' },
            { id: 'news-events', label: 'News & Announcements' },
            { id: 'results', label: 'GCE Academic Results' },
            { id: 'campus', label: 'Campus Life & Facilities' },
            { id: 'campusMapSection', label: 'Virtual Campus Map' },
            { id: 'testimonials', label: 'Voices of SJCCC' },
            { id: 'faq', label: 'Frequently Asked Questions' },
            { id: 'location', label: 'Campus Location & Contact' },
        ];

        indicator = new ReadingProgressIndicator({ sections: customSections });
        expect(indicator).toBeDefined();

        // Simulate reading in about section
        aboutEl.getBoundingClientRect = () => ({
            top: 50,
            bottom: 1250,
            left: 0,
            right: 1000,
            width: 1000,
            height: 1200,
            x: 0,
            y: 50,
            toJSON: () => {}
        });

        indicator.update();
        expect(indicator.isVisible()).toBe(true);
        expect(indicator.getActiveSection()?.id).toBe('about');
        expect(indicator.getActiveSection()?.label).toBe('About SJCCC');
    });
});
