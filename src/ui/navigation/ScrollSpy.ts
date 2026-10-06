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

        // Also track transitional sections (e.g. #about, #news-events, #campus)
        const transitionalIds = ['about', 'news-events', 'campus', 'faq', 'contact', 'location'];
        transitionalIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) sectionMap.set(id, el);
        });

        // Convert to sorted array based on DOM position
        const sortedElements = Array.from(sectionMap.entries()).map(([id, section]) => ({ id, section }));
        sortedElements.sort((a, b) => {
            const pos = a.section.compareDocumentPosition(b.section);
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
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
     * Evaluates currently intersecting sections using deterministic selection:
     * 1. Top of page safeguard (scrollY <= 50) -> #heroSection
     * 2. Bottom of page safeguard -> bottom section
     * 3. Section spanning the active reading anchor line
     * 4. Section closest to active reading line
     * 5. Document order tie-breaker
     */
    private evaluateActiveSection(): void {
        // Guard 1: At top of page, Hero is always active
        if (window.scrollY <= 50) {
            this.setActiveTarget('heroSection');
            return;
        }

        // Guard 2: At bottom of page, last section is active
        const scrollBottom = window.innerHeight + window.scrollY;
        const totalHeight = document.documentElement.scrollHeight;
        if (scrollBottom >= totalHeight - 40) {
            const lastTracked = this.trackedSections[this.trackedSections.length - 1];
            if (lastTracked) {
                this.setActiveTarget(lastTracked.id);
                return;
            }
        }

        if (this.intersectingSections.size === 0) {
            return;
        }

        const headerHeight = this.getHeaderHeight();
        const activeAnchorY = headerHeight + 24;

        let bestSection: HTMLElement | null = null;
        let minDistance = Infinity;

        // Step 1: Check if any intersecting section directly spans across the active anchor line
        for (const [section] of this.intersectingSections) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= activeAnchorY && rect.bottom > activeAnchorY) {
                bestSection = section;
                break;
            }
        }

        // Step 2: If none directly spans the anchor line, find the section closest to it
        if (!bestSection) {
            for (const [section] of this.intersectingSections) {
                const rect = section.getBoundingClientRect();
                const distance = Math.abs(rect.top - activeAnchorY);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestSection = section;
                }
            }
        }

        if (bestSection && bestSection.id) {
            this.setActiveTarget(bestSection.id);
        }
    }

    /**
     * Sets the active section ID and updates both desktop nav and mobile bottom dock
     */
    public setActiveTarget(sectionId: string): void {
        const cleanId = sectionId.replace(/^#/, '');
        if (this.currentActiveSectionId === cleanId) return;
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
            const canonicalDockTarget = getCanonicalTargetForSection(cleanId);

            this.bottomLinks.forEach((bLink) => {
                const target = bLink.getAttribute('data-nav-target') || bLink.getAttribute('href')?.replace(/^#/, '');
                const isMatch = canonicalDockTarget !== null && target === canonicalDockTarget;

                bLink.classList.toggle('active', isMatch);
                if (isMatch) {
                    bLink.setAttribute('aria-current', 'location');
                    activeBottomLink = bLink;
                } else {
                    bLink.removeAttribute('aria-current');
                }
            });
        }

        // 3. Gliding Active Pill Transition for Mobile Bottom Dock
        if (activeBottomLink) {
            DockGlider.instance?.update(activeBottomLink);
        } else {
            DockGlider.instance?.update(null);
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
     * Cleanup and destroy observer
     */
    public destroy(): void {
        if (this.programmaticTimer !== null) {
            window.clearTimeout(this.programmaticTimer);
        }
        this.observer?.disconnect();
        this.intersectingSections.clear();
        ScrollSpy.instance = null;
    }
}
