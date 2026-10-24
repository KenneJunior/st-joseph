/**
 * ============================================================================
 * SJCCC – Mobile Navigation Controller
 * Handles compact mobile navigation on devices < 768px:
 * - Hamburger toggling and slide-out drawer management
 * - Mobile bottom tab bar synchronization and menu toggle integration
 * - ARIA state accessibility, outside dismissal, Escape dismissal with
 *   breakpoint-aware focus restoration to the bottom navigation toggle,
 *   and automatic link-click closure with touch-friendly hit areas
 * ============================================================================
 */

import { ScrollSpy } from './ScrollSpy.ts';
import { DockGlider } from './DockGlider.ts';
import { BottomBarSwipeNavigator } from './BottomBarSwipeNavigator.ts';

export interface MobileNavigationOptions {
    menuToggleId?: string;
    bottomMenuToggleId?: string;
    navMenuId?: string;
    headerId?: string;
    bottomBarId?: string;
    linkSelector?: string;
}

export class MobileNavigation {
    public static readonly BOTTOM_BAR_BREAKPOINT_PX: number = 768;

    private readonly menuToggle: HTMLElement | null;
    private readonly bottomMenuToggle: HTMLElement | null;
    private readonly navMenu: HTMLElement | null;
    private readonly header: HTMLElement | null;
    private readonly bottomBar: HTMLElement | null;
    private readonly linkSelector: string;
    private dockGlider: DockGlider | null = null;
    private swipeNavigator: BottomBarSwipeNavigator | null = null;

    constructor(
        menuToggleId: string = 'menuToggle',
        navMenuId: string = 'navMenu',
        headerId: string = 'mainHeader',
        linkSelector: string = 'a:not(#themeToggle):not(#darkModeToggle)'
    ) {
        this.menuToggle = document.getElementById(menuToggleId);
        this.bottomMenuToggle = document.getElementById('bottomNavMenuToggle');
        this.navMenu = document.getElementById(navMenuId);
        this.header = document.getElementById(headerId);
        this.bottomBar = document.getElementById('mobileBottomBar');
        this.linkSelector = linkSelector;
        this.init();
    }

    private init(): void {
        if (!this.navMenu) return;

        // Initialize gliding active pill and swipe-to-navigate for floating bottom dock
        if (this.bottomBar) {
            this.dockGlider = new DockGlider(this.bottomBar.id || 'mobileBottomBar');
            this.swipeNavigator = new BottomBarSwipeNavigator(this.bottomBar);
        }

        // Establish initial accessibility state for mobile drawer/dropdown
        this.navMenu.setAttribute('aria-hidden', 'true');
        if (this.menuToggle) {
            this.menuToggle.setAttribute('aria-expanded', 'false');
            this.menuToggle.setAttribute('aria-controls', this.navMenu.id || 'navMenu');
        }
        if (this.bottomMenuToggle) {
            this.bottomMenuToggle.setAttribute('aria-expanded', 'false');
            this.bottomMenuToggle.setAttribute('aria-controls', this.navMenu.id || 'navMenu');
        }

        // 1. Header menu toggle click (consolidated single listener)
        this.menuToggle?.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            this.toggleMenu();
            setTimeout(() => this.updateHeaderHeight(), 350);
        });

        // 2. Mobile bottom bar 'Menu' toggle click
        this.bottomMenuToggle?.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // 3. Bottom bar tab clicks
        this.bindBottomBarLinks();

        // 4. Link clicks in drawer/dropdown (clean event delegation only)
        this.bindLinkClicks();

        // 5. Dismiss handlers & Focus Trapping
        this.bindOutsideClick();
        this.bindEscapeKey();
        this.bindFocusTrap();

        // 6. Progressive bottom pill scaling according to pill length
        this.updatePillScale();
        window.addEventListener('resize', () => this.updatePillScale(), { passive: true });
        window.addEventListener('orientationchange', () => this.updatePillScale(), { passive: true });
        if (typeof ResizeObserver !== 'undefined' && this.bottomBar) {
            const ro = new ResizeObserver(() => this.updatePillScale());
            ro.observe(this.bottomBar);
        }
    }

    /**
     * Scales the number of section icons rendered in the floating bottom dock pill
     * based on the length/width of the pill, ensuring comfortable touch targets
     * and preventing icon overcrowding.
     * Minimum 4 sections (Home, Academics, Map, Location), scaling to 5, 6, or 7.
     */
    public updatePillScale(): void {
        if (!this.bottomBar) return;
        const width = this.bottomBar.getBoundingClientRect().width || this.bottomBar.offsetWidth;
        if (width <= 0) return;

        let tier: '4' | '5' | '6' | '7' = '4';
        if (width >= 580) {
            tier = '7';
        } else if (width >= 500) {
            tier = '6';
        } else if (width >= 410) {
            tier = '5';
        } else {
            tier = '4';
        }

        if (this.bottomBar.getAttribute('data-pill-tier') !== tier) {
            this.bottomBar.setAttribute('data-pill-tier', tier);
            this.dockGlider?.scheduleUpdate(true);
            if (ScrollSpy.instance) {
                ScrollSpy.instance.syncCurrentTarget();
            }
        }
    }

    /**
     * Determines whether the mobile bottom-bar breakpoint is currently active.
     */
    public isBottomBarActive(): boolean {
        if (!this.bottomBar) return false;
        return typeof window !== 'undefined' &&
            window.matchMedia(`(max-width: ${MobileNavigation.BOTTOM_BAR_BREAKPOINT_PX}px)`).matches;
    }

    /**
     * Revokes active status from utility controls (bottom menu toggle and my reminders button)
     * and restores active navigation status to the visible section tab corresponding to current scroll.
     */
    public static restoreActiveSectionTab(): void {
        const bottomBar = document.getElementById('mobileBottomBar');
        if (!bottomBar) return;

        // 1. Explicitly revoke active class from utility modals & drawer buttons
        const bottomMenuToggle = document.getElementById('bottomNavMenuToggle');
        const bottomMyRemindersBtn = document.getElementById('bottomMyRemindersBtn');
        bottomMenuToggle?.classList.remove('active');
        bottomMenuToggle?.setAttribute('aria-expanded', 'false');
        bottomMyRemindersBtn?.classList.remove('active');
        bottomMyRemindersBtn?.setAttribute('aria-expanded', 'false');

        // 2. Identify the active section according to ScrollSpy (or fallback to heroSection)
        if (ScrollSpy.instance) {
            ScrollSpy.instance.syncCurrentTarget();
        } else {
            const currentTarget = 'heroSection';
            const bottomLinks = bottomBar.querySelectorAll<HTMLAnchorElement>('a.mobile-bottom-item');
            let matchedLink: HTMLElement | null = null;
            bottomLinks.forEach((link) => {
                const target = link.getAttribute('data-nav-target') || link.getAttribute('href')?.replace(/^#/, '');
                const isMatch = target === currentTarget;
                link.classList.toggle('active', isMatch);
                if (isMatch) {
                    link.setAttribute('aria-current', 'location');
                    matchedLink = link;
                } else {
                    link.removeAttribute('aria-current');
                }
            });
            if (!matchedLink) {
                const homeLink = bottomBar.querySelector<HTMLElement>('a.mobile-bottom-item--home, a.mobile-bottom-item');
                if (homeLink) {
                    homeLink.classList.add('active');
                    homeLink.setAttribute('aria-current', 'location');
                    matchedLink = homeLink;
                }
            }
            DockGlider.instance?.update(matchedLink);
        }
    }

    public toggleMenu(): void {
        if (!this.navMenu) return;
        const isActive = this.navMenu.classList.toggle('active');
        document.body.classList.toggle('drawer-open', isActive);

        // Synchronize ARIA state
        this.navMenu.setAttribute('aria-hidden', String(!isActive));

        // Update header toggle icon and aria
        if (this.menuToggle) {
            const icon = this.menuToggle.querySelector('i');
            if (icon) {
                icon.className = isActive ? 'bi bi-x-lg' : 'bi bi-list';
            }
            this.menuToggle.setAttribute('aria-expanded', String(isActive));
        }

        // Update bottom tab toggle icon, class, and aria
        if (this.bottomMenuToggle) {
            this.bottomMenuToggle.classList.toggle('active', isActive);
            this.bottomMenuToggle.setAttribute('aria-expanded', String(isActive));
            const bottomIcon = this.bottomMenuToggle.querySelector('i');
            if (bottomIcon) {
                bottomIcon.className = isActive ? 'bi bi-x-circle-fill' : 'bi bi-grid-fill';
            }
            if (isActive) {
                // Deactivate other tabs in bottom bar so Menu is highlighted while open
                if (this.bottomBar) {
                    this.bottomBar.querySelectorAll<HTMLElement>('.mobile-bottom-item').forEach((item) => {
                        if (item !== this.bottomMenuToggle) {
                            item.classList.remove('active');
                            item.removeAttribute('aria-current');
                        }
                    });
                }
                this.dockGlider?.update(this.bottomMenuToggle);
            } else {
                MobileNavigation.restoreActiveSectionTab();
            }
        }

        // Focus first link on open for immediate keyboard interaction
        if (isActive) {
            requestAnimationFrame(() => {
                const firstLink = this.navMenu?.querySelector<HTMLElement>(this.linkSelector);
                firstLink?.focus();
            });
        }
    }

    public closeMenu(): void {
        if (!this.navMenu?.classList.contains('active')) return;
        this.navMenu.classList.remove('active');
        this.navMenu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('drawer-open');

        if (this.menuToggle) {
            const icon = this.menuToggle.querySelector('i');
            if (icon) icon.className = 'bi bi-list';
            this.menuToggle.setAttribute('aria-expanded', 'false');
        }

        if (this.bottomMenuToggle) {
            this.bottomMenuToggle.classList.remove('active');
            this.bottomMenuToggle.setAttribute('aria-expanded', 'false');
            const bottomIcon = this.bottomMenuToggle.querySelector('i');
            if (bottomIcon) bottomIcon.className = 'bi bi-grid-fill';
            MobileNavigation.restoreActiveSectionTab();
        }
    }

    private bindLinkClicks(): void {
        // Event delegation on navMenu cleanly handles all link taps without listener multiplication
        this.navMenu?.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const anchor = target.closest('a');
            if (anchor && this.navMenu?.contains(anchor)) {
                if (anchor.id !== 'themeToggle' && anchor.id !== 'darkModeToggle') {
                    this.closeMenu();
                    this.syncActiveBottomTab(anchor.getAttribute('href'));
                }
            }
        });
    }

    private bindBottomBarLinks(): void {
        if (!this.bottomBar) return;
        const bottomLinks = this.bottomBar.querySelectorAll<HTMLAnchorElement>('a.mobile-bottom-item');
        bottomLinks.forEach((link) => {
            link.addEventListener('click', () => {
                this.closeMenu();
                // Revoke active from menu and reminders
                this.bottomMenuToggle?.classList.remove('active');
                const remindersBtn = document.getElementById('bottomMyRemindersBtn');
                remindersBtn?.classList.remove('active');

                const target = link.getAttribute('data-nav-target') || link.getAttribute('href')?.replace(/^#/, '');
                if (target) {
                    bottomLinks.forEach((l) => {
                        l.classList.remove('active');
                        l.removeAttribute('aria-current');
                    });
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'location');
                    this.dockGlider?.update(link);

                    if (ScrollSpy.instance) {
                        ScrollSpy.instance.lockActiveTarget(target);
                    }
                }
            });
        });
    }

    public syncActiveBottomTab(targetHref: string | null): void {
        if (!this.bottomBar || !targetHref) return;
        const cleanTarget = targetHref.replace(/^#/, '');
        if (ScrollSpy.instance) {
            ScrollSpy.instance.lockActiveTarget(cleanTarget);
            return;
        }

        const bottomLinks = this.bottomBar.querySelectorAll<HTMLAnchorElement>('a.mobile-bottom-item');
        let matchedLink: HTMLElement | null = null;
        bottomLinks.forEach((link) => {
            const isMatch = link.getAttribute('href') === targetHref || link.getAttribute('data-nav-target') === cleanTarget;
            if (isMatch) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'location');
                matchedLink = link;
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
        this.dockGlider?.update(matchedLink);
    }

    private bindOutsideClick(): void {
        document.addEventListener('click', (e: MouseEvent) => {
            if (!this.navMenu?.classList.contains('active')) return;

            const target = e.target as Node;
            const clickedMenuToggle = this.menuToggle?.contains(target);
            const clickedBottomToggle = this.bottomMenuToggle?.contains(target);

            // Don't interfere if the user clicked the toggle button itself (handled by toggleMenu)
            if (clickedMenuToggle || clickedBottomToggle) {
                return;
            }

            const clickedInsideDrawer = this.navMenu.contains(target);

            // If clicked completely outside the menu, or clicked directly on navMenu container/backdrop overlay
            if (!clickedInsideDrawer || target === this.navMenu) {
                this.closeMenu();
            }
        });
    }

    private bindEscapeKey(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.navMenu?.classList.contains('active')) {
                this.closeMenu();
                // When mobile bottom-bar breakpoint is active (<= 768px), restore focus to bottomMenuToggle
                if (this.isBottomBarActive() && this.bottomMenuToggle) {
                    this.bottomMenuToggle.focus();
                } else if (this.menuToggle) {
                    this.menuToggle.focus();
                }
            }
        });
    }

    private bindFocusTrap(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !this.navMenu?.classList.contains('active')) return;

            const focusable = this.navMenu.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable.length) return;

            const firstElement = focusable[0];
            const lastElement = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    private updateHeaderHeight(): void {
        const headerHeight = this.header?.offsetHeight || 80;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }

    public getSwipeNavigator(): BottomBarSwipeNavigator | null {
        return this.swipeNavigator;
    }

    public getDockGlider(): DockGlider | null {
        return this.dockGlider;
    }
}
