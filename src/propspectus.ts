/* ==========================================================================
   SJCCC PROSPECTUS – ENHANCED TYPESCRIPT SYSTEM
   ========================================================================== */


    type ThemePreference = 'dark' | 'light';

    /** Single source of truth for every DOM hook this script depends on. */
    const SELECTORS = {
        darkModeToggle: 'darkModeToggle',
        menuToggle: 'menuToggle',
        navMenu: 'navMenu',
        downloadPdfBtn: 'downloadPdfBtn',
        downloadActionContainer: '.download-action-container',
        mainHeader: 'mainHeader',
        revealOnScroll: '.reveal-on-scroll',
        logoIcon: '.logo-icon',
        navLink: '.nav-link',
        anchorLink: 'a[href^="#"]',
        highlightableSection: 'section[id], header[id], footer[id]',
    } as const;

    /* ──────────────────────────────────────────────
       1. DARK MODE TOGGLE WITH PERSISTENCE & ANIMATION
       ────────────────────────────────────────────── */
    class ThemeManager {
        private static readonly STORAGE_KEY = 'sjccc-theme';
        private static readonly OVERLAY_CLASS = 'theme-transition-overlay';
        private static readonly TOGGLE_DELAY_MS = 120;
        private static readonly OVERLAY_SETTLE_MS = 150;
        private static readonly OVERLAY_CLEANUP_MS = 400;

        private readonly body: HTMLElement = document.body;

        constructor(toggleButtonId: string) {
            this.applyInitialTheme();

            const toggleButton = document.getElementById(toggleButtonId);
            toggleButton?.addEventListener('click', () => this.toggleTheme());

            this.watchSystemTheme();
        }

        /** Applies the saved theme, falling back to the OS preference when none is stored. */
        private applyInitialTheme(): void {
            const savedTheme = localStorage.getItem(ThemeManager.STORAGE_KEY);

            if (savedTheme === 'dark') {
                this.body.classList.add('dark-mode');
                return;
            }

            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (!savedTheme && systemPrefersDark) {
                this.body.classList.add('dark-mode');
            }
        }

        /** Flips the theme behind a short fade overlay and persists the choice. */
        private toggleTheme(): void {
            const overlay = document.createElement('div');
            overlay.className = ThemeManager.OVERLAY_CLASS;
            document.body.appendChild(overlay);

            requestAnimationFrame(() => overlay.classList.add('active'));

            window.setTimeout(() => {
                this.body.classList.toggle('dark-mode');
                const currentTheme: ThemePreference = this.body.classList.contains('dark-mode') ? 'dark' : 'light';
                localStorage.setItem(ThemeManager.STORAGE_KEY, currentTheme);

                window.setTimeout(() => {
                    overlay.classList.remove('active');
                    window.setTimeout(() => overlay.remove(), ThemeManager.OVERLAY_CLEANUP_MS);
                }, ThemeManager.OVERLAY_SETTLE_MS);
            }, ThemeManager.TOGGLE_DELAY_MS);
        }

        /** Follows the OS theme live, but only until the visitor picks one manually. */
        private watchSystemTheme(): void {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event: MediaQueryListEvent) => {
                const hasManualPreference = localStorage.getItem(ThemeManager.STORAGE_KEY);
                if (hasManualPreference) return;
                this.body.classList.toggle('dark-mode', event.matches);
            });
        }
    }

    /* ──────────────────────────────────────────────
       2. MOBILE NAVIGATION TOGGLE
       ────────────────────────────────────────────── */
    class MobileNavigation {
        constructor(toggleId: string, menuId: string, navLinkSelector: string) {
            const toggle = document.getElementById(toggleId);
            const menu = document.getElementById(menuId);

            if (!toggle || !menu) return;

            this.bindToggleClick(toggle, menu);
            this.bindOutsideClick(toggle, menu);
            this.bindEscapeKey(toggle, menu);
            this.bindLinkClicks(toggle, menu, navLinkSelector);
        }

        private bindToggleClick(toggle: HTMLElement, menu: HTMLElement): void {
            toggle.addEventListener('click', (event: MouseEvent) => {
                event.stopPropagation();
                this.setOpen(toggle, menu, !menu.classList.contains('active'));
            });
        }

        private bindOutsideClick(toggle: HTMLElement, menu: HTMLElement): void {
            document.addEventListener('click', (event: MouseEvent) => {
                const target = event.target as Node;
                if (!toggle.contains(target) && !menu.contains(target)) {
                    this.setOpen(toggle, menu, false);
                }
            });
        }

        private bindEscapeKey(toggle: HTMLElement, menu: HTMLElement): void {
            document.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Escape' && menu.classList.contains('active')) {
                    this.setOpen(toggle, menu, false);
                    toggle.focus();
                }
            });
        }

        private bindLinkClicks(toggle: HTMLElement, menu: HTMLElement, navLinkSelector: string): void {
            menu.querySelectorAll<HTMLAnchorElement>(navLinkSelector).forEach(link => {
                link.addEventListener('click', () => this.setOpen(toggle, menu, false));
            });
        }

        private setOpen(toggle: HTMLElement, menu: HTMLElement, isOpen: boolean): void {
            menu.classList.toggle('active', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        }
    }

    /* ──────────────────────────────────────────────
       3. SCROLL REVEAL ANIMATIONS
       ────────────────────────────────────────────── */
    class ScrollRevealController {
        private static readonly MOBILE_BREAKPOINT_PX = 768;
        private static readonly MOBILE_USER_AGENT_PATTERN =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

        constructor(selector: string) {
            const elements = document.querySelectorAll<HTMLElement>(selector);
            if (elements.length === 0) return;

            const isMobile = this.isMobileViewport();
            const observer = new IntersectionObserver(
                entries => this.onIntersect(entries, observer),
                {
                    root: null,
                    // More generous rootMargin on mobile so elements trigger earlier.
                    rootMargin: isMobile ? '0px 0px -10px 0px' : '0px 0px -50px 0px',
                    // Lower threshold on mobile so elements reveal with less visibility.
                    threshold: isMobile ? 0.05 : 0.1,
                }
            );

            const baseDelay = isMobile ? 30 : 60;
            elements.forEach((element, index) => {
                element.dataset.delay = String(index * baseDelay);
                observer.observe(element);
            });
        }

        private isMobileViewport(): boolean {
            return (
                ScrollRevealController.MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent) ||
                window.innerWidth <= ScrollRevealController.MOBILE_BREAKPOINT_PX
            );
        }

        private onIntersect(entries: IntersectionObserverEntry[], observer: IntersectionObserver): void {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const target = entry.target as HTMLElement;
                const delay = Number(target.dataset.delay) || 0;

                window.setTimeout(() => target.classList.add('active'), delay);
                observer.unobserve(target);
            });
        }
    }

    /* ──────────────────────────────────────────────
       4. PDF DOWNLOAD / PRINT HANDLER
       ────────────────────────────────────────────── */
    class PdfExporter {
        private static readonly FOCUS_RESTORE_FALLBACK_MS = 500;

        constructor(buttonId: string, containerSelector: string, headerId: string) {
            const button = document.getElementById(buttonId);
            const container = document.querySelector<HTMLElement>(containerSelector);

            if (!button || !container) return;

            button.addEventListener('click', () => this.exportToPdf(container, headerId));
        }

        /** Hides chrome that shouldn't appear in the printout, prints, then restores it. */
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

            // Belt-and-braces: browsers fire `focus` when the print dialog closes,
            // but a fallback timer covers the ones that don't.
            window.setTimeout(restore, PdfExporter.FOCUS_RESTORE_FALLBACK_MS);
            window.addEventListener('focus', restore);
        }
    }

    /* ──────────────────────────────────────────────
       5. SMOOTH SCROLL FOR ANCHOR LINKS
       ────────────────────────────────────────────── */
    class SmoothScroller {
        constructor(selector: string) {
            document.querySelectorAll<HTMLAnchorElement>(selector).forEach(anchor => {
                anchor.addEventListener('click', (event: MouseEvent) => this.handleClick(event, anchor));
            });
        }

        private handleClick(event: MouseEvent, anchor: HTMLAnchorElement): void {
            const targetId = anchor.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;

            event.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /* ──────────────────────────────────────────────
       6. ACTIVE NAV LINK HIGHLIGHT ON SCROLL
       ────────────────────────────────────────────── */
    class NavScrollHighlighter {
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

            this.sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionBottom = sectionTop + section.offsetHeight;
                const isActive = scrollPosition >= sectionTop && scrollPosition < sectionBottom;

                if (!isActive) return;

                const sectionId = section.getAttribute('id');
                this.navLinks.forEach(link => {
                    link.classList.toggle('active-link', link.getAttribute('href') === `#${sectionId}`);
                });
            });
        }
    }

    /* ──────────────────────────────────────────────
       7. LOGO → HOME LINK
       ────────────────────────────────────────────── */
    class LogoHomeLink {
        constructor(selector: string) {
            const logo = document.querySelector<HTMLElement>(selector);
            logo?.addEventListener('click', (event: MouseEvent) => {
                event.preventDefault();
                window.location.href = window.location.origin;
            });
        }
    }

    /* ──────────────────────────────────────────────
       8. INITIALIZATION LOG (local development only)
       ────────────────────────────────────────────── */
    class InitLogger {
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

    /* ──────────────────────────────────────────────
       APPLICATION ENTRY POINT
       ────────────────────────────────────────────── */
    class ProspectusApp {
        constructor() {
            new ThemeManager(SELECTORS.darkModeToggle);
            new MobileNavigation(SELECTORS.menuToggle, SELECTORS.navMenu, SELECTORS.navLink);
            new ScrollRevealController(SELECTORS.revealOnScroll);
            new PdfExporter(SELECTORS.downloadPdfBtn, SELECTORS.downloadActionContainer, SELECTORS.mainHeader);
            new SmoothScroller(SELECTORS.anchorLink);
            new NavScrollHighlighter(SELECTORS.highlightableSection, SELECTORS.navLink);
            new LogoHomeLink(SELECTORS.logoIcon);
            new InitLogger();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        new ProspectusApp();
    });