/**
 * ============================================================================
 * SJCCC – Scroll Spy & Active Navigation Controller
 * Tracks visible page sections using IntersectionObserver and synchronizes
 * active state (visual classes and aria-current="location") across both
 * the Desktop Navigation Menu (#navMenu) and Mobile Bottom Dock (#mobileBottomBar).
 *
 * Employs a deterministic active-zone selection rule, accounts for sticky header
 * height offsets, eliminates fast-scroll race conditions, and guards against
 * programmatic scroll highlight flicker.
 * ============================================================================
 */

import {
    getCanonicalTargetForSection,
    enforceDockOrder,
} from '../../core/config/navigation.ts';
import { DockGlider } from './DockGlider.ts';

interface TrackedSection {
    section: HTMLElement;
    id: string;
    navLink?: HTMLAnchorElement;
}

export class ScrollSpy {
    public static instance: ScrollSpy | null = null;

    private navLinks: NodeListOf<HTMLAnchorElement>;
    private bottomLinks: NodeListOf<HTMLAnchorElement> | null = null;
    private bottomBar: HTMLElement | null = null;
    private header: HTMLElement | null = null;
    private observer: IntersectionObserver | null = null;

    private trackedSections: TrackedSection[] = [];
    private intersectingSections: Map<HTMLElement, IntersectionObserverEntry> = new Map();

    private currentActiveSectionId: string | null = null;
    private isProgrammaticScroll: boolean = false;
    private programmaticTimer: number | null = null;

    private progressFill: HTMLElement | null = null;
    private scrollRafId: number | null = null;
    private onScrollBound: (() => void) | null = null;

    constructor(navLinkSelector: string = '#navMenu a.nav-link:not(#installApp)') {
        ScrollSpy.instance = this;
        this.navLinks = document.querySelectorAll<HTMLAnchorElement>(navLinkSelector);
        this.bottomBar = document.getElementById('mobileBottomBar');
        this.header = document.getElementById('mainHeader');

        this.init();
    }

    private init(): void {
        // Enforce canonical order in the mobile bottom bar
        if (this.bottomBar) {
            enforceDockOrder(this.bottomBar);
            this.bottomLinks = this.bottomBar.querySelectorAll<HTMLAnchorElement>('a.mobile-bottom-item');
        }

        this.gatherTrackedSections();
        if (this.trackedSections.length === 0) return;

        this.setupObserver();
        this.bindClickGuards();
        this.bindScrollTracking();
        this.handleInitialState();

        // Listen to browser Back/Forward hash changes
        window.addEventListener('hashchange', () => this.handleHashChange(), { passive: true });
    }

    /**
     * Gathers all page sections linked from desktop nav and mobile bottom dock
     */
    private gatherTrackedSections(): void {
        const sectionMap = new Map<string, HTMLElement>();

        // Collect sections from desktop nav
        this.navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href?.startsWith('#') && href.length > 1) {
                const id = href.slice(1);
                const el = document.getElementById(id);
                if (el) sectionMap.set(id, el);
            }
        });

        // Collect sections from mobile bottom dock
        this.bottomLinks?.forEach((link) => {
            const target = link.getAttribute('data-nav-target') || link.getAttribute('href')?.replace(/^#/, '');
            if (target) {
                const el = document.getElementById(target);
                if (el) sectionMap.set(target, el);
            }
        });

        // Also track transitional sections (e.g. #about, #news-events, #campus, #testimonials)
        const transitionalIds = ['about', 'news-events', 'campus', 'testimonials', 'faq', 'contact', 'location'];
        transitionalIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) sectionMap.set(id, el);
        });

        // Convert to sorted array based on DOM position
        const sortedElements = Array.from(sectionMap.entries()).map(([id, section]) => ({ id, section }));
        const followingMask = typeof Node !== 'undefined' ? Node.DOCUMENT_POSITION_FOLLOWING : 4;
        const precedingMask = typeof Node !== 'undefined' ? Node.DOCUMENT_POSITION_PRECEDING : 2;

        sortedElements.sort((a, b) => {
            const pos = a.section.compareDocumentPosition(b.section);
            if (pos & followingMask) return -1;
            if (pos & precedingMask) return 1;
            return 0;
        });

        this.trackedSections = sortedElements.map(({ id, section }) => {
            const navLink = Array.from(this.navLinks).find((l) => l.getAttribute('href') === `#${id}`);
            return { section, id, navLink };
        });
    }

    /**
     * Calculates header height for offset calculations
     */
    private getHeaderHeight(): number {
        if (this.header) {
            return this.header.offsetHeight || 72;
        }
        const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
        return parseInt(cssVar, 10) || 72;
    }

    /**
     * Sets up IntersectionObserver with an active reading band below the sticky header
     */
    private setupObserver(): void {
        if (typeof IntersectionObserver === 'undefined') return;

        const headerHeight = this.getHeaderHeight();
        // Active zone: from just below header (-headerHeight px) down to upper 45% of viewport (-50%)
        const rootMargin = `-${Math.max(60, headerHeight)}px 0px -50% 0px`;

        this.observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement;
                    if (entry.isIntersecting) {
                        this.intersectingSections.set(el, entry);
                    } else {
                        this.intersectingSections.delete(el);
                    }
                });

                if (!this.isProgrammaticScroll) {
                    this.evaluateActiveSection();
                }
            },
            {
                root: null,
                rootMargin,
                threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
            }
        );

        this.trackedSections.forEach(({ section }) => {
            this.observer?.observe(section);
        });
    }

    /**
     * Binds real-time scroll tracking with requestAnimationFrame throttling
     * to update scroll progress and active section indicators as the user moves through content.
     */
    private bindScrollTracking(): void {
        this.progressFill = document.getElementById('mobileBottomProgressFill');

        this.onScrollBound = () => this.onScroll();
        window.addEventListener('scroll', this.onScrollBound, { passive: true });

        // Initial progress calculation
        this.updateScrollProgressAndActiveSection();
    }

    private onScroll(): void {
        if (this.scrollRafId !== null) return;
        this.scrollRafId = requestAnimationFrame(() => {
            this.scrollRafId = null;
            this.updateScrollProgressAndActiveSection();
        });
    }

    /**
     * Calculates the overall scroll progress through page content as a ratio between 0.0 and 1.0.
     */
    public getScrollProgress(): number {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollTop = window.scrollY || docEl.scrollTop || body?.scrollTop || 0;
        const scrollHeight = Math.max(
            docEl.scrollHeight || 0,
            body?.scrollHeight || 0,
            docEl.offsetHeight || 0,
            body?.offsetHeight || 0
        );
        const clientHeight = window.innerHeight || docEl.clientHeight || 1;
        const maxScroll = Math.max(1, scrollHeight - clientHeight);
        return Math.min(1, Math.max(0, scrollTop / maxScroll));
    }

    /**
     * Updates the continuous reading progress track on the bottom pill using GPU-accelerated scaleX transform.
     */
    public updateProgressIndicator(progress: number): void {
        if (this.progressFill) {
            this.progressFill.style.transform = `scaleX(${progress})`;
        }
        if (this.bottomBar) {
            const pct = Math.round(progress * 100);
            this.bottomBar.style.setProperty('--scroll-progress', `${(progress * 100).toFixed(1)}%`);
            this.bottomBar.setAttribute('data-scroll-progress', pct.toString());
        }
    }

    /**
     * Computes relative viewport bounds for a section, supporting getBoundingClientRect
     * as well as offsetTop/offsetHeight fallback for test environments.
     */
    private getSectionRect(section: HTMLElement, scrollY: number): { top: number; bottom: number } {
        if (typeof section.getBoundingClientRect === 'function') {
            const clientRect = section.getBoundingClientRect();
            if (clientRect && (clientRect.top !== 0 || clientRect.bottom !== 0 || clientRect.height !== 0)) {
                return { top: clientRect.top, bottom: clientRect.bottom };
            }
        }

        const offsetTop = section.offsetTop ?? 0;
        const offsetHeight = section.offsetHeight || 500;
        const top = offsetTop - scrollY;
        return { top, bottom: top + offsetHeight };
    }

    /**
     * Evaluates active section based on current scroll position and section boundaries.
     */
    public evaluateActiveSectionFromScroll(): string | null {
        if (this.trackedSections.length === 0) return null;

        const docEl = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY || docEl.scrollTop || body?.scrollTop || 0;
        const scrollHeight = Math.max(
            docEl.scrollHeight || 0,
            body?.scrollHeight || 0,
            docEl.offsetHeight || 0,
            body?.offsetHeight || 0
        );
        const clientHeight = window.innerHeight || docEl.clientHeight || 1;

        // Guard 1: At top of page (scrollY <= 50) -> always heroSection
        if (scrollY <= 50) {
            return 'heroSection';
        }

        // Guard 2: Near bottom of page (within 60px of the bottom) -> last section
        if (clientHeight + scrollY >= scrollHeight - 60) {
            const last = this.trackedSections[this.trackedSections.length - 1];
            return last ? last.id : null;
        }

        // Reading line: just below sticky header
        const headerHeight = this.getHeaderHeight();
        const readingLine = headerHeight + 30;

        let candidateAboveReadingLine: string | null = null;
        let smallestDistanceAbove = Infinity;

        for (let i = 0; i < this.trackedSections.length; i++) {
            const { section, id } = this.trackedSections[i];
            const rect = this.getSectionRect(section, scrollY);

            // Direct span match: section contains the reading line
            if (rect.top <= readingLine && rect.bottom > readingLine) {
                return id;
            }

            // Track candidate whose top is closest above reading line
            if (rect.top <= readingLine) {
                const dist = readingLine - rect.top;
                if (dist < smallestDistanceAbove) {
                    smallestDistanceAbove = dist;
                    candidateAboveReadingLine = id;
                }
            }
        }

        return candidateAboveReadingLine || this.trackedSections[0]?.id || 'heroSection';
    }

    /**
     * Updates both the progress bar fill and the active section based on real-time scroll position.
     */
    public updateScrollProgressAndActiveSection(): void {
        const progress = this.getScrollProgress();
        this.updateProgressIndicator(progress);

        if (!this.isProgrammaticScroll) {
            const newActiveId = this.evaluateActiveSectionFromScroll();
            if (newActiveId) {
                this.setActiveTarget(newActiveId);
            }
        }
    }

    /**
     * Evaluates currently intersecting sections using deterministic selection.
     */
    private evaluateActiveSection(): void {
        this.updateScrollProgressAndActiveSection();
    }

    /**
     * Returns the currently active section ID tracked by ScrollSpy
     */
    public getActiveSectionId(): string | null {
        return this.currentActiveSectionId;
    }

    /**
     * Re-synchronizes current active section target and bottom glider
     */
    public syncCurrentTarget(): void {
        const target = this.currentActiveSectionId || 'heroSection';
        this.currentActiveSectionId = null;
        this.setActiveTarget(target);
    }

    /**
     * Resolves canonical dock target to a currently visible tab in the bottom bar,
     * gracefully falling back through adjacent page sections when lower-priority
     * icons are scaled down in compact pill tiers.
     */
    private resolveVisibleBottomTarget(targetId: string | null): string | null {
        if (!targetId || !this.bottomBar) return targetId;

        const isVisible = (el: HTMLElement | null): boolean => {
            if (!el) return false;
            if (el.style.display === 'none') return false;
            if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
                return window.getComputedStyle(el).display !== 'none';
            }
            return true;
        };

        const directLink = this.bottomBar.querySelector<HTMLElement>(
            `a.mobile-bottom-item[data-nav-target="${targetId}"], a.mobile-bottom-item[href="#${targetId}"]`
        );
        if (directLink && isVisible(directLink)) {
            return targetId;
        }

        const fallbackChain: Record<string, string[]> = {
            'schoolDatesSection': ['academics', 'heroSection'],
            'news-events': ['schoolDatesSection', 'academics', 'campusMapSection'],
            'results': ['campusMapSection', 'location', 'news-events'],
            'faq': ['location', 'campusMapSection'],
            'testimonials': ['campusMapSection', 'location'],
            'about': ['heroSection'],
            'campus': ['campusMapSection'],
            'contact': ['location'],
        };

        const candidates = fallbackChain[targetId] || [];
        for (const cand of candidates) {
            const candLink = this.bottomBar.querySelector<HTMLElement>(
                `a.mobile-bottom-item[data-nav-target="${cand}"], a.mobile-bottom-item[href="#${cand}"]`
            );
            if (candLink && isVisible(candLink)) {
                return cand;
            }
        }

        return 'heroSection';
    }

    /**
     * Sets the active section ID and updates both desktop nav and mobile bottom dock
     */
    public setActiveTarget(sectionId: string, force: boolean = false): void {
        const cleanId = sectionId.replace(/^#/, '');
        if (!force && this.currentActiveSectionId === cleanId) return;
        this.currentActiveSectionId = cleanId;

        // 1. Update Desktop Navigation (#navMenu)
        this.navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            const isMatch = href === `#${cleanId}`;
            link.classList.toggle('active', isMatch);
            if (isMatch) {
                link.setAttribute('aria-current', 'location');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        // 2. Update Mobile Bottom Dock (#mobileBottomBar)
        let activeBottomLink: HTMLElement | null = null;
        if (this.bottomLinks) {
            // Guard: If Menu or Reminders modal is currently open, don't steal active state
            const menuToggle = document.getElementById('bottomNavMenuToggle');
            const remindersBtn = document.getElementById('bottomMyRemindersBtn');
            const isMenuOpen = menuToggle?.classList.contains('active');
            const isRemindersOpen = remindersBtn?.classList.contains('active');

            if (!isMenuOpen && !isRemindersOpen) {
                const canonicalDockTarget = this.resolveVisibleBottomTarget(getCanonicalTargetForSection(cleanId));

                let hasReachedActive = false;
                this.bottomLinks.forEach((bLink) => {
                    const target = bLink.getAttribute('data-nav-target') || bLink.getAttribute('href')?.replace(/^#/, '');
                    const isMatch = canonicalDockTarget !== null && target === canonicalDockTarget;

                    bLink.classList.toggle('active', isMatch);
                    if (isMatch) {
                        hasReachedActive = true;
                        bLink.setAttribute('aria-current', 'location');
                        bLink.classList.remove('is-passed');
                        activeBottomLink = bLink;
                    } else {
                        bLink.removeAttribute('aria-current');
                        if (!hasReachedActive && canonicalDockTarget !== null) {
                            bLink.classList.add('is-passed');
                        } else {
                            bLink.classList.remove('is-passed');
                        }
                    }
                });

                // 3. Gliding Active Pill Transition for Mobile Bottom Dock
                if (activeBottomLink) {
                    DockGlider.instance?.update(activeBottomLink);
                } else {
                    DockGlider.instance?.update(null);
                }
            }
        }
    }

    /**
     * Locks the active target during programmatic smooth scroll to prevent highlight flicker
     */
    public lockActiveTarget(targetId: string, durationMs: number = 850): void {
        const cleanId = targetId.replace(/^#/, '');
        this.isProgrammaticScroll = true;

        if (this.programmaticTimer !== null) {
            window.clearTimeout(this.programmaticTimer);
        }

        this.setActiveTarget(cleanId);

        this.programmaticTimer = window.setTimeout(() => {
            this.isProgrammaticScroll = false;
            this.evaluateActiveSection();
        }, durationMs);
    }

    /**
     * Binds click listeners to desktop and bottom nav links to prevent scroll flicker
     */
    private bindClickGuards(): void {
        const allAnchors = [
            ...Array.from(this.navLinks),
            ...(this.bottomLinks ? Array.from(this.bottomLinks) : []),
        ];

        allAnchors.forEach((anchor) => {
            anchor.addEventListener('click', () => {
                const target = anchor.getAttribute('data-nav-target') || anchor.getAttribute('href')?.replace(/^#/, '');
                if (target && target !== 'installApp') {
                    this.lockActiveTarget(target);
                }
            });
        });
    }

    /**
     * Handles deep-link URLs on initial page load (e.g. #schoolDatesSection)
     */
    private handleInitialState(): void {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const targetId = hash.slice(1);
            if (document.getElementById(targetId)) {
                this.lockActiveTarget(targetId, 1200);
                return;
            }
        }

        // Default to heroSection at top of page
        this.setActiveTarget('heroSection');
    }

    /**
     * Handles browser Back/Forward hash changes
     */
    private handleHashChange(): void {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const targetId = hash.slice(1);
            if (document.getElementById(targetId)) {
                this.setActiveTarget(targetId);
            }
        }
    }

    /**
     * Cleanup and destroy observer and scroll listeners
     */
    public destroy(): void {
        if (this.programmaticTimer !== null) {
            window.clearTimeout(this.programmaticTimer);
            this.programmaticTimer = null;
        }
        if (this.scrollRafId !== null) {
            cancelAnimationFrame(this.scrollRafId);
            this.scrollRafId = null;
        }
        if (this.onScrollBound) {
            window.removeEventListener('scroll', this.onScrollBound);
            this.onScrollBound = null;
        }
        this.observer?.disconnect();
        this.intersectingSections.clear();
        ScrollSpy.instance = null;
    }
}
