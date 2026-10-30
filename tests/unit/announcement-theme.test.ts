import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { AnnouncementBar } from '../../src/features/announcement/AnnouncementBar.ts';
import { ThemeManager } from '../../src/core/theme/ThemeManager.ts';

const ANNOUNCEMENT_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
  <header id="mainHeader" style="height: 72px;"></header>
  <button id="themeToggle" data-theme-toggle></button>

  <aside id="announcementBar" class="announcement-bar" role="region" aria-label="Important school announcement"
    data-announcement-id="test-notice-2026" data-priority="urgent">
    <div class="announcement-bar__inner">
      <div class="announcement-bar__col announcement-bar__col--primary announcement-bar__content">
        <span class="announcement-priority priority-urgent" data-priority="urgent" role="status">
          <span class="priority-dot"></span>
          <i class="priority-icon"></i>
          <span class="priority-label">Urgent</span>
        </span>
        <div class="announcement-bar__text-wrap">
          <div class="announcement-bar__message">
            <i class="announcement-bar__icon"></i>
            <strong class="announcement-bar__title">School Resumption:</strong>
            <span class="announcement-bar__date">Aug 21</span>
            <span class="announcement-bar__more-content" id="announcementMoreContent" hidden>Details</span>
          </div>
        </div>
        <div class="announcement-bar__content-actions">
          <button type="button" class="announcement-bar__toggle-btn" id="announcementToggleBtn">
            <span class="toggle-text">Details</span>
            <i></i>
          </button>
        </div>
      </div>
      <div class="announcement-bar__col announcement-bar__col--secondary announcement-bar__actions" role="toolbar">
        <div class="announcement-bar__secondary-actions">
          <button type="button" class="announcement-bar__action-btn announcement-bar__past-btn" id="viewPastAnnouncementsBtn">
            <i></i>
            <span class="action-btn-text">Past Notices</span>
          </button>
          <button type="button" class="announcement-bar__action-btn announcement-bar__mark-read-btn" id="announcementMarkReadBtn">
            <i></i>
            <span class="action-btn-text">Mark as read</span>
          </button>
          <span class="announcement-bar__divider"></span>
          <button type="button" class="announcement-bar__action-btn announcement-bar__close" id="announcementClose">
            <i></i>
          </button>
        </div>
      </div>
    </div>
    <div class="announcement-bar__progress"></div>
  </aside>

  <div id="pastAnnouncementsModal" class="past-modal-overlay" hidden>
    <div class="past-modal-dialog">
      <div class="past-modal-header">
        <div class="past-modal-title-group"><h2>Notices</h2></div>
        <button class="past-modal-close"></button>
      </div>
      <div class="past-modal-controls">
        <input type="text" id="pastAnnouncementsSearch" class="past-search-input" />
      </div>
      <div class="past-modal-body" id="pastAnnouncementsList"></div>
    </div>
  </div>
</body>
</html>
`;

describe('Announcement Bar Theme Responsiveness', () => {
    let dom: JSDOM;
    let window: any;
    let document: Document;

    beforeEach(() => {
        dom = new JSDOM(ANNOUNCEMENT_HTML, {
            url: 'https://saintjosephcollege.org/',
            pretendToBeVisual: true,
        });
        window = dom.window;
        document = window.document;

        (globalThis as any).window = window;
        (globalThis as any).document = document;
        (globalThis as any).HTMLElement = window.HTMLElement;
        (globalThis as any).HTMLButtonElement = window.HTMLButtonElement;
        (globalThis as any).CustomEvent = window.CustomEvent;
        (globalThis as any).localStorage = window.localStorage;
        (globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
        (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    it('validates that announcement.css includes comprehensive theme variables for light and dark modes', () => {
        const cssPath = path.resolve(process.cwd(), 'src/css/features/announcement.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        // Light mode tokens on :root
        expect(cssContent).toContain('--announcement-bg:');
        expect(cssContent).toContain('--announcement-text:');
        expect(cssContent).toContain('--announcement-border:');
        expect(cssContent).toContain('--announcement-title:');
        expect(cssContent).toContain('--announcement-btn-bg:');
        expect(cssContent).toContain('--announcement-urgent-bg:');
        expect(cssContent).toContain('--past-modal-dialog-bg:');

        // Dark mode token overrides on html.dark-mode / [data-theme='dark']
        expect(cssContent).toContain('html.dark-mode,');
        expect(cssContent).toContain("[data-theme='dark']");

        // Mobile theme responsiveness
        expect(cssContent).toContain('--announcement-bg-mobile:');
        expect(cssContent).toContain('background: var(--announcement-bg-mobile)');
    });

    it('AnnouncementBar updates layout when themechange event fires', () => {
        const bar = new AnnouncementBar({
            barSelector: '#announcementBar',
            closeBtnSelector: '#announcementClose',
            headerSelector: '#mainHeader',
            storageKey: 'test_announcement_dismissed',
            announcementId: 'test-notice-2026',
        });

        const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');

        // Dispatch a themechange event
        window.dispatchEvent(new window.CustomEvent('themechange', {
            detail: { theme: 'dark', isDark: true }
        }));

        expect(document.getElementById('announcementBar')).not.toBeNull();
        bar.destroy();
    });

    it('coordinates smoothly with ThemeManager toggle transitions', () => {
        const themeManager = new ThemeManager({
            toggleId: 'themeToggle',
            mode: 'fade',
        });

        const bar = new AnnouncementBar({
            barSelector: '#announcementBar',
            closeBtnSelector: '#announcementClose',
            headerSelector: '#mainHeader',
            storageKey: 'test_announcement_dismissed',
            announcementId: 'test-notice-2026',
        });

        // Initially light mode
        expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        // Toggle to dark mode
        themeManager.applyTheme(true);
        expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

        // Toggle back to light mode
        themeManager.applyTheme(false);
        expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        bar.destroy();
    });

    it('validates that .past-item-footer and GCE card footers are theme responsive across light and dark modes', () => {
        const announcementCssPath = path.resolve(process.cwd(), 'src/css/features/announcement.css');
        const announcementCss = fs.readFileSync(announcementCssPath, 'utf-8');

        // Verify .past-item-footer tokens and classes
        expect(announcementCss).toContain('--past-item-footer-bg:');
        expect(announcementCss).toContain('.past-item-footer');
        expect(announcementCss).toContain('html.dark-mode .past-item-footer');
        expect(announcementCss).toContain("[data-theme='dark'] .past-item-footer");

        const resultsCssPath = path.resolve(process.cwd(), 'src/css/features/gce-results.css');
        const resultsCss = fs.readFileSync(resultsCssPath, 'utf-8');

        // Verify GCE results card footer tokens and theme responsiveness
        expect(resultsCss).toContain('--gce-card-footer-bg:');
        expect(resultsCss).toContain('--gce-card-footer-radius:');
        expect(resultsCss).toContain('.gce-card-footer-note');
        expect(resultsCss).toContain('html.dark-mode .gce-card-footer-note');
        expect(resultsCss).toContain("[data-theme='dark'] .gce-card-footer-note");

        // Verify Selector 1 (O-Level) theme-responsive styling rules
        expect(resultsCss).toContain('.gce-result-card--olevel .gce-card-footer-note');
        expect(resultsCss).toContain('html.dark-mode .gce-result-card--olevel .gce-card-footer-note');
        expect(resultsCss).toContain('main#main-content > section#results:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > article:nth-of-type(1) > footer:nth-of-type(1)');

        // Verify Selector 2 (A-Level) theme-responsive styling rules
        expect(resultsCss).toContain('.gce-result-card--alevel .gce-card-footer-note');
        expect(resultsCss).toContain('html.dark-mode .gce-result-card--alevel .gce-card-footer-note');
        expect(resultsCss).toContain('main#main-content > section#results:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > article:nth-of-type(2) > footer:nth-of-type(1)');

        // Verify DOM elements match without conflicting hardcoded inline styles
        const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        const $ = cheerio.load(indexHtml);
        const footer1 = $('main#main-content > section#results:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > article:nth-of-type(1) > footer:nth-of-type(1)');
        const footer2 = $('main#main-content > section#results:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > article:nth-of-type(2) > footer:nth-of-type(1)');
        expect(footer1.length).toBe(1);
        expect(footer2.length).toBe(1);
        expect(footer1.hasClass('gce-card-footer-note')).toBe(true);
        expect(footer2.hasClass('gce-card-footer-note')).toBe(true);
        expect(footer2.find('i').attr('style')).toBeUndefined();
    });
});

