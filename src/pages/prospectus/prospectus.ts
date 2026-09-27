/**
 * ============================================================================
 * SJCCC – Prospectus Page Bootstrap Orchestrator
 * Coordinates navigation, smooth scrolling, PDF export, theme, and animations
 * for the official prospectus page
 * ============================================================================
 */

import { PROSPECTUS_SELECTORS } from '../../core/config/selectors.ts';
import { ThemeManager } from '../../core/theme/ThemeManager.ts';
import { MobileNavigation } from '../../ui/navigation/MobileNavigation.ts';
import { ScrollReveal } from '../../ui/utils/ScrollReveal.ts';
import { SmoothScroll } from '../../ui/utils/SmoothScroll.ts';

/**
 * Handles PDF Export / Print triggering while temporarily hiding web chrome
 */
export class PdfExporter {
    private static readonly FOCUS_RESTORE_FALLBACK_MS = 500;

    constructor(buttonId: string, containerSelector: string, headerId: string) {
        const button = document.getElementById(buttonId);
        const container = document.querySelector<HTMLElement>(containerSelector);

        if (!button || !container) return;

        button.addEventListener('click', () => this.exportToPdf(container, headerId));
    }

    private exportToPdf(container: HTMLElement, headerId: string): void {
        const header = document.getElementById(headerId);
        const originalContainerDisplay = container.style.display;
        const originalHeaderDisplay = header?.style.display ?? '';

        container.style.display = 'none';
        if (header) header.style.display = 'none';

        window.print();

        const restore = (): void => {
            container.style.display = originalContainerDisplay;
            if (header) header.style.display = originalHeaderDisplay;
            window.removeEventListener('focus', restore);
        };

        window.setTimeout(restore, PdfExporter.FOCUS_RESTORE_FALLBACK_MS);
        window.addEventListener('focus', restore);
    }
}

/**
 * Highlights active navigation link based on scroll position
 */
export class NavScrollHighlighter {
    private static readonly SCROLL_OFFSET_PX = 100;

    private readonly sections: NodeListOf<HTMLElement>;
    private readonly navLinks: NodeListOf<HTMLAnchorElement>;

    constructor(sectionSelector: string, navLinkSelector: string) {
        this.sections = document.querySelectorAll<HTMLElement>(sectionSelector);
        this.navLinks = document.querySelectorAll<HTMLAnchorElement>(navLinkSelector);

        if (this.sections.length === 0 || this.navLinks.length === 0) return;

        window.addEventListener('scroll', () => this.highlightActiveSection(), { passive: true });
    }

    private highlightActiveSection(): void {
        const scrollPosition = window.scrollY + NavScrollHighlighter.SCROLL_OFFSET_PX;

        this.sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            const isActive = scrollPosition >= sectionTop && scrollPosition < sectionBottom;

            if (!isActive) return;

            const sectionId = section.getAttribute('id');
            this.navLinks.forEach((link) => {
                link.classList.toggle('active-link', link.getAttribute('href') === `#${sectionId}`);
            });
        });
    }
}

/**
 * Click handler on college logo to navigate back to site root
 */
export class LogoHomeLink {
    constructor(selector: string) {
        const logo = document.querySelector<HTMLElement>(selector);
        logo?.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            window.location.href = window.location.origin;
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

        // 2. Mobile Navigation
        new MobileNavigation(
            PROSPECTUS_SELECTORS.menuToggle,
            PROSPECTUS_SELECTORS.navMenu,
            PROSPECTUS_SELECTORS.mainHeader,
            PROSPECTUS_SELECTORS.navLink
        );

        // 3. Staggered Scroll Reveal
        new ScrollReveal(PROSPECTUS_SELECTORS.revealOnScroll, {
            activeClass: 'active',
            stagger: true,
        });

        // 4. PDF Exporter
        new PdfExporter(
            PROSPECTUS_SELECTORS.downloadPdfBtn,
            PROSPECTUS_SELECTORS.downloadActionContainer,
            PROSPECTUS_SELECTORS.mainHeader
        );

        // 5. Smooth Scroll
        new SmoothScroll(PROSPECTUS_SELECTORS.mainHeader, PROSPECTUS_SELECTORS.anchorLink);

        // 6. Navigation Scroll Highlighter
        new NavScrollHighlighter(
            PROSPECTUS_SELECTORS.highlightableSection,
            PROSPECTUS_SELECTORS.navLink
        );

        // 7. Logo Home Link
        new LogoHomeLink(PROSPECTUS_SELECTORS.logoIcon);

        // 8. Logger
        new InitLogger();
    }
}

export function initProspectusPage(): void {
    new ProspectusApp();
}
