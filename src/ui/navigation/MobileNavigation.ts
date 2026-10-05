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

        // 1. Header menu toggle click
        this.menuToggle?.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // 2. Mobile bottom bar 'Menu' toggle click
        this.bottomMenuToggle?.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // 3. Bottom bar tab clicks
        this.bindBottomBarLinks();

        // 4. Link clicks in drawer
        this.bindLinkClicks();

        // 5. Dismiss handlers
        this.bindOutsideClick();
        this.bindEscapeKey();

        // 6. Header height dynamic adjustment
        this.menuToggle?.addEventListener('click', () => {
            setTimeout(() => this.updateHeaderHeight(), 350);
        });
    }

    /**
     * Determines whether the mobile bottom-bar breakpoint is currently active.
     */
    public isBottomBarActive(): boolean {
        if (!this.bottomBar) return false;
        return typeof window !== 'undefined' &&
            window.matchMedia(`(max-width: ${MobileNavigation.BOTTOM_BAR_BREAKPOINT_PX}px)`).matches;
    }

    public toggleMenu(): void {
        if (!this.navMenu) return;
        const isActive = this.navMenu.classList.toggle('active');
        document.body.classList.toggle('drawer-open', isActive);

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
        }
    }

    public closeMenu(): void {
        if (!this.navMenu?.classList.contains('active')) return;
        this.navMenu.classList.remove('active');
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
        }
    }

    private bindLinkClicks(): void {
        // Event delegation on navMenu ensures any link click (including nested spans/icons) immediately dismisses the menu
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

        this.navMenu?.querySelectorAll<HTMLAnchorElement>(this.linkSelector)
            .forEach((link) => {
                link.addEventListener('click', () => {
                    this.closeMenu();
                    this.syncActiveBottomTab(link.getAttribute('href'));
                });
            });
    }

    private bindBottomBarLinks(): void {
        if (!this.bottomBar) return;
        const bottomLinks = this.bottomBar.querySelectorAll<HTMLAnchorElement>('a.mobile-bottom-item');
        bottomLinks.forEach((link) => {
            link.addEventListener('click', () => {
                this.closeMenu();
                const target = link.getAttribute('data-nav-target') || link.getAttribute('href')?.replace(/^#/, '');
                if (target) {
                    if (ScrollSpy.instance) {
                        ScrollSpy.instance.lockActiveTarget(target);
                    } else {
                        bottomLinks.forEach((l) => {
                            l.classList.remove('active');
                            l.removeAttribute('aria-current');
                        });
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'location');
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
        bottomLinks.forEach((link) => {
            const isMatch = link.getAttribute('href') === targetHref || link.getAttribute('data-nav-target') === cleanTarget;
            if (isMatch) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'location');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
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

    private updateHeaderHeight(): void {
        const headerHeight = this.header?.offsetHeight || 80;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
}
