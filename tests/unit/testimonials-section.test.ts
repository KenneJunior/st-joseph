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

