/**
 * ============================================================================
 * Unit & Integration Tests: SJCCC Testimonials Section & Navigation
 * Verifies data integrity, DOM markup, top nav icon, and interactive controller
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import {
    TESTIMONIALS_DATA,
    TESTIMONIAL_FILTER_CATEGORIES,
} from '../../src/data/testimonialsData.ts';

describe('SJCCC Testimonials — Canonical Data Integrity', () => {
    it('contains all 6 canonical community voices spanning all key roles', () => {
        expect(TESTIMONIALS_DATA.length).toBe(6);

        const categories = TESTIMONIALS_DATA.map((t) => t.category);
        expect(categories).toContain('faculty');
        expect(categories).toContain('students');
        expect(categories).toContain('parents');
        expect(categories).toContain('alumni');
    });

    it('ensures each testimonial item satisfies the complete schema contract', () => {
        for (const item of TESTIMONIALS_DATA) {
            expect(item.id).toBeTruthy();
            expect(item.name.length).toBeGreaterThan(4);
            expect(item.role.length).toBeGreaterThan(4);
            expect(item.categoryLabel.length).toBeGreaterThan(3);
            expect(item.avatarUrl).toMatch(/^\/assets\//);
            expect(item.avatarAlt.length).toBeGreaterThan(5);
            expect(item.quote.length).toBeGreaterThan(20);
            expect(item.highlight.length).toBeGreaterThan(5);
            expect(item.virtue.length).toBeGreaterThan(3);
            expect(item.rating).toBe(5);
            expect(item.fullStory.length).toBeGreaterThan(30);
            expect(item.yearOrClass.length).toBeGreaterThan(3);
        }
    });

    it('defines the 5 standard filter tabs with Bootstrap icons', () => {
        expect(TESTIMONIAL_FILTER_CATEGORIES.length).toBe(5);
        const ids = TESTIMONIAL_FILTER_CATEGORIES.map((c) => c.id);
        expect(ids).toEqual(['all', 'students', 'faculty', 'parents', 'alumni']);
    });
});

describe('SJCCC Navigation — Testimonial Icon in Top Nav & Toggle Menu', () => {
    const rootDir = process.cwd();
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const $ = cheerio.load(indexHtml);

    it('includes Testimonials link with bi-chat-quote icon inside #navMenu', () => {
        const testimonialNavLink = $('#navMenu a[href="#testimonials"]');
        expect(testimonialNavLink.length).toBe(1);

        const icon = testimonialNavLink.find('i');
        expect(icon.length).toBe(1);
        expect(icon.attr('class')).toContain('bi-chat-quote');

        const navText = testimonialNavLink.find('.nav-text');
        expect(navText.length).toBe(1);
        expect(navText.text().trim()).toBe('Testimonials');
    });

    it('ensures #navMenu is shared between desktop top bar and mobile drawer', () => {
        // #navMenu is the single canonical element controlling top nav and mobile drawer
        expect($('#navMenu').length).toBe(1);
        expect($('#menuToggle').length).toBe(1);
        expect($('#menuToggle').attr('aria-controls')).toBe('navMenu');
    });

    it('contains visible Testimonials link in footer quick links', () => {
        const footerLink = $('footer a[href="#testimonials"]');
        expect(footerLink.length).toBe(1);
        // Ensure not hidden with d-none
        expect(footerLink.parent().hasClass('d-none')).toBe(false);
    });
});

describe('SJCCC Testimonials — Premium Section DOM Architecture', () => {
    const rootDir = process.cwd();
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const $ = cheerio.load(indexHtml);

    it('contains the #testimonials section with semantic title and subtitle', () => {
        const section = $('section#testimonials');
        expect(section.length).toBe(1);
        expect(section.find('.section-title').text()).toContain('What Our Family Says');
        expect(section.find('.section-subtitle').length).toBe(1);
    });

    it('renders the interactive filter tablist with glider and category counts', () => {
        const filterBar = $('#testimonials .testimonials-filter-bar');
        expect(filterBar.length).toBe(1);
        expect(filterBar.attr('role')).toBe('tablist');

        const tabs = filterBar.find('.testimonial-filter-btn');
        expect(tabs.length).toBe(5);

        const glider = $('#testimonialsFilterGlider');
        expect(glider.length).toBe(1);
    });

    it('renders 6 testimonial cards with verified badges and spotlight surfaces', () => {
        const cards = $('#testimonials .testimonial-card');
        expect(cards.length).toBe(6);

        cards.each((_, el) => {
            const card = $(el);
            expect(card.find('.testimonial-spotlight').length).toBe(1);
            expect(card.find('.testimonial-avatar').length).toBe(1);
            expect(card.find('.testimonial-verified-badge').length).toBe(1);
            expect(card.find('.testimonial-rating .bi-star-fill').length).toBe(5);
            expect(card.find('.testimonial-highlight-chip').length).toBe(1);
            expect(card.find('.testimonial-quote-body').length).toBe(1);
            expect(card.find('.testimonial-expand-btn').length).toBe(1);
            expect(card.find('.testimonial-copy-btn').length).toBe(1);
            expect(card.find('.testimonial-expansion').length).toBe(1);
        });
    });

    it('renders the trust and verification proof strip at the bottom of testimonials', () => {
        const trustStrip = $('#testimonials .testimonials-trust-strip');
        expect(trustStrip.length).toBe(1);
        expect(trustStrip.text()).toContain('100% Authentic Community Voices');
        expect(trustStrip.text()).toContain('Cameroon GCE Board');
        expect(trustStrip.text()).toContain('BEPHA Mutual Healthcare');
    });

    it('enforces slim, low-profile active filter pill geometry in testimonials.css', () => {
        const testimonialsCss = fs.readFileSync(path.join(rootDir, 'src/css/components/testimonials.css'), 'utf-8');
        // Glider height is slim (calc(100% - 6px) with top/bottom: 3px, instead of bulky -12px/top 6px)
        expect(testimonialsCss).toContain('height: calc(100% - 6px);');
        expect(testimonialsCss).toContain('top: 3px;');
        expect(testimonialsCss).toContain('bottom: 3px;');

        // Filter button height is sleek 28px
        expect(testimonialsCss).toContain('height: 28px;');
        expect(testimonialsCss).toContain('min-height: 28px;');
    });

    it('renders the mobile-first carousel showcase structure with stage, controls and counter', () => {
        const carousel = $('#testimonials .testimonials-carousel');
        expect(carousel.length).toBe(1);
        expect(carousel.attr('role')).toBe('region');
        expect(carousel.attr('aria-roledescription')).toBe('carousel');

        const stage = carousel.find('#testimonialsStage');
        expect(stage.length).toBe(1);

        const track = stage.find('#testimonialsGrid');
        expect(track.length).toBe(1);
        expect(track.attr('class')).toContain('testimonials-track');

        const prevBtn = carousel.find('#testimonialsPrevBtn');
        const nextBtn = carousel.find('#testimonialsNextBtn');
        expect(prevBtn.length).toBe(1);
        expect(nextBtn.length).toBe(1);
        expect(prevBtn.attr('aria-label')).toBe('Previous testimonial');
        expect(nextBtn.attr('aria-label')).toBe('Next testimonial');

        const counter = carousel.find('#testimonialsCounter');
        expect(counter.length).toBe(1);
        expect(counter.find('#testimonialsCurrentIndex').text().trim()).toBe('1');
        expect(counter.find('#testimonialsTotalCount').text().trim()).toBe('6');

        const pagination = carousel.find('#testimonialsPagination');
        expect(pagination.length).toBe(1);
        expect(pagination.attr('role')).toBe('tablist');
        expect(pagination.find('.testimonial-dot').length).toBe(6);
        expect(pagination.find('.testimonial-dot.is-active').length).toBe(1);
        expect(pagination.find('#testimonialPaginationGlider').length).toBe(1);
    });

    it('enforces mobile-first CSS architecture for single featured card display in testimonials.css', () => {
        const testimonialsCss = fs.readFileSync(path.join(rootDir, 'src/css/components/testimonials.css'), 'utf-8');
        expect(testimonialsCss).toContain('.testimonials-carousel');
        expect(testimonialsCss).toContain('.testimonials-stage');
        expect(testimonialsCss).toContain('.testimonials-track');
        expect(testimonialsCss).toContain('.testimonial-nav-btn');
        expect(testimonialsCss).toContain('.testimonials-counter');
        expect(testimonialsCss).toContain('.testimonials-pagination-dots');
        expect(testimonialsCss).toContain('.testimonial-dot');
        expect(testimonialsCss).toContain('.testimonial-pagination-glider');
        expect(testimonialsCss).toContain('background: var(--accent, #c9a229);');
        expect(testimonialsCss).toContain('background: var(--accent-glow, #f3d779);');
        // Mobile media query geometry
        expect(testimonialsCss).toContain('@media (max-width: 768px)');
        expect(testimonialsCss).toContain('min-height: 420px;');
        expect(testimonialsCss).toContain('.testimonial-card.is-active');
        // Desktop flanking presentation
        expect(testimonialsCss).toContain('@media (min-width: 769px)');
    });
});

describe('SJCCC Testimonials — Interactive Carousel Controller & Navigation', () => {
    let sectionController: any;
    let dom: any;

    beforeEach(async () => {
        const { JSDOM } = await import('jsdom');
        const rootDir = process.cwd();
        const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

        dom = new JSDOM(indexHtml, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
        (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

        const { TestimonialsSection } = await import('../../src/features/testimonials/TestimonialsSection.ts');
        sectionController = new TestimonialsSection('#testimonials');
    });

    it('initializes at index 0 with 6 total visible testimonials', () => {
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(sectionController.getVisibleCount()).toBe(6);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('1');
        expect(document.getElementById('testimonialsTotalCount')?.textContent).toBe('6');
    });

    it('advances to next slide on next() and wraps around on bounds', () => {
        sectionController.next();
        expect(sectionController.getCurrentIndex()).toBe(1);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('2');

        const activeCard = document.querySelector('.testimonial-card.is-active');
        expect(activeCard?.getAttribute('data-id')).toBe('sunjoh-prefect');

        // Go to last slide
        sectionController.goToSlide(5);
        expect(sectionController.getCurrentIndex()).toBe(5);

        // Next wraps around to 0
        sectionController.next();
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('1');
    });

    it('regresses to previous slide on prev() and wraps to end on slide 0', () => {
        expect(sectionController.getCurrentIndex()).toBe(0);
        sectionController.prev();
        expect(sectionController.getCurrentIndex()).toBe(5);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('6');

        sectionController.prev();
        expect(sectionController.getCurrentIndex()).toBe(4);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('5');
    });

    it('filters correctly to Student Leaders category and updates carousel bounds', () => {
        sectionController.setActiveFilter('students');
        expect(sectionController.getActiveFilter()).toBe('students');
        expect(sectionController.getVisibleCount()).toBe(2);
        expect(sectionController.getCurrentIndex()).toBe(0);

        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('1');
        expect(document.getElementById('testimonialsTotalCount')?.textContent).toBe('2');

        const dots = document.querySelectorAll('#testimonialsPagination .testimonial-dot');
        expect(dots.length).toBe(2);

        // Navigating stays within the 2 student testimonials
        sectionController.next();
        expect(sectionController.getCurrentIndex()).toBe(1);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('2');

        sectionController.next();
        expect(sectionController.getCurrentIndex()).toBe(0);
    });

    it('disables prev and next buttons when category contains only 1 testimonial', () => {
        sectionController.setActiveFilter('parents');
        expect(sectionController.getVisibleCount()).toBe(1);
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(document.getElementById('testimonialsTotalCount')?.textContent).toBe('1');

        const prevBtn = document.getElementById('testimonialsPrevBtn') as HTMLButtonElement;
        const nextBtn = document.getElementById('testimonialsNextBtn') as HTMLButtonElement;
        expect(prevBtn.disabled).toBe(true);
        expect(nextBtn.disabled).toBe(true);
    });

    it('restores all 6 testimonials when switching back to all filter', () => {
        sectionController.setActiveFilter('alumni');
        expect(sectionController.getVisibleCount()).toBe(1);

        sectionController.setActiveFilter('all');
        expect(sectionController.getVisibleCount()).toBe(6);
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(document.getElementById('testimonialsTotalCount')?.textContent).toBe('6');

        const prevBtn = document.getElementById('testimonialsPrevBtn') as HTMLButtonElement;
        const nextBtn = document.getElementById('testimonialsNextBtn') as HTMLButtonElement;
        expect(prevBtn.disabled).toBe(false);
        expect(nextBtn.disabled).toBe(false);
    });

    it('synchronizes animated gold pagination glider with active index and dot position', () => {
        const glider = sectionController.getPaginationGlider();
        expect(glider).not.toBeNull();
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(0);

        // Advance to slide 1
        sectionController.next();
        expect(sectionController.getCurrentIndex()).toBe(1);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(1);

        // Advance to slide 3 via goToSlide
        sectionController.goToSlide(3);
        expect(sectionController.getCurrentIndex()).toBe(3);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(3);

        // Regress
        sectionController.prev();
        expect(sectionController.getCurrentIndex()).toBe(2);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(2);
    });

    it('advances testimonial on horizontal swipe left gesture with deliberate threshold', () => {
        expect(sectionController.getCurrentIndex()).toBe(0);

        // Swipe left (negative deltaX exceeding 50px threshold)
        const handled = sectionController.triggerSwipeGesture(-60);
        expect(handled).toBe(true);
        expect(sectionController.getCurrentIndex()).toBe(1);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('2');
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(1);

        // Swipe left again
        sectionController.triggerSwipeGesture(-75);
        expect(sectionController.getCurrentIndex()).toBe(2);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(2);
    });

    it('regresses testimonial on horizontal swipe right gesture with boundary wrap', () => {
        expect(sectionController.getCurrentIndex()).toBe(0);

        // Swiping right from slide 0 wraps to slide 5
        const handled = sectionController.triggerSwipeGesture(60);
        expect(handled).toBe(true);
        expect(sectionController.getCurrentIndex()).toBe(5);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('6');
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(5);

        // Swiping right from slide 5 moves back to slide 4
        sectionController.triggerSwipeGesture(55);
        expect(sectionController.getCurrentIndex()).toBe(4);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(4);
    });

    it('ignores minor horizontal movements below deliberate 50px threshold without flick velocity', () => {
        expect(sectionController.getCurrentIndex()).toBe(0);

        // Drag 25px slowly (velocity 0.1 px/ms < 0.3 px/ms threshold)
        const handled = sectionController.triggerSwipeGesture(-25, 0.1);
        expect(handled).toBe(false);
        // Stays on slide 0
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(0);
    });

    it('advances on high velocity horizontal flick gesture above 25px', () => {
        expect(sectionController.getCurrentIndex()).toBe(0);

        // Quick flick of 30px with high velocity (0.45 px/ms > 0.3 px/ms)
        const handled = sectionController.triggerSwipeGesture(-30, 0.45);
        expect(handled).toBe(true);
        expect(sectionController.getCurrentIndex()).toBe(1);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(1);
    });

    it('keeps pagination glider synchronized when clicking pagination dots directly', () => {
        const dots = document.querySelectorAll<HTMLButtonElement>('#testimonialsPagination .testimonial-dot');
        expect(dots.length).toBe(6);

        // Click dot at index 4
        dots[4].click();
        expect(sectionController.getCurrentIndex()).toBe(4);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(4);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('5');

        // Click dot at index 0
        dots[0].click();
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(0);
        expect(document.getElementById('testimonialsCurrentIndex')?.textContent).toBe('1');
    });

    it('re-renders glider and synchronizes when category filter is changed', () => {
        sectionController.setActiveFilter('students');
        expect(sectionController.getVisibleCount()).toBe(2);
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(0);

        sectionController.next();
        expect(sectionController.getCurrentIndex()).toBe(1);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(1);

        // Restore 'all'
        sectionController.setActiveFilter('all');
        expect(sectionController.getVisibleCount()).toBe(6);
        expect(sectionController.getCurrentIndex()).toBe(0);
        expect(sectionController.getPaginationGliderTargetIndex()).toBe(0);
    });
});

describe('SJCCC Calendar — Next Milestone Auto-Add Reminders Button Visibility', () => {
    const rootDir = process.cwd();
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const buttonsCss = fs.readFileSync(path.join(rootDir, 'src/css/components/buttons.css'), 'utf-8');
    const timelineCss = fs.readFileSync(path.join(rootDir, 'src/css/features/calendar-timeline.css'), 'utf-8');
    const $ = cheerio.load(indexHtml);

    it('verifies #bannerAutoAddRemindersBtn is removed from DOM per user request', () => {
        const btn = $('.next-milestone-banner #bannerAutoAddRemindersBtn');
        expect(btn.length).toBe(0);
    });

    it('excludes #bannerAutoAddRemindersBtn from light mode dark-blue text override in buttons.css', () => {
        expect(buttonsCss).toContain(':not(#bannerAutoAddRemindersBtn)');
        expect(buttonsCss).toContain(':not(.next-milestone-banner .btn-outline)');
    });

    it('enforces high-contrast white text and gold accent icon on dark milestone banner canvas', () => {
        expect(timelineCss).toContain('.next-milestone-banner #bannerAutoAddRemindersBtn');
        expect(timelineCss).toContain('color: #ffffff !important;');
        expect(timelineCss).toContain('color: var(--accent-glow, #f3d779) !important;');
    });
});

