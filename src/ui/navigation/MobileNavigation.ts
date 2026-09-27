/**
 * ============================================================================
 * SJCCC – Mobile Navigation Controller
 * Handles hamburger toggling, ARIA state, outside dismissal, Escape dismissal,
 * and automatic link-click closure
 * ============================================================================
 */

export interface MobileNavigationOptions {
    menuToggleId?: string;
    navMenuId?: string;
    headerId?: string;
    linkSelector?: string;
}

export class MobileNavigation {
    private readonly menuToggle: HTMLElement | null;
    private readonly navMenu: HTMLElement | null;
    private readonly header: HTMLElement | null;
    private readonly linkSelector: string;

    constructor(
        menuToggleId: string = 'menuToggle',
        navMenuId: string = 'navMenu',
        headerId: string = 'mainHeader',
        linkSelector: string = 'a:not(#themeToggle):not(#darkModeToggle)'
    ) {
        this.menuToggle = document.getElementById(menuToggleId);
        this.navMenu = document.getElementById(navMenuId);
        this.header = document.getElementById(headerId);
        this.linkSelector = linkSelector;
        this.init();
    }

    private init(): void {
        if (!this.menuToggle || !this.navMenu) return;

        this.menuToggle.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        this.bindLinkClicks();
        this.bindOutsideClick();
        this.bindEscapeKey();

        // Update header height when menu toggles (for mobile layout changes)
        this.menuToggle.addEventListener('click', () => {
            setTimeout(() => this.updateHeaderHeight(), 350);
        });
    }

    public toggleMenu(): void {
        if (!this.navMenu || !this.menuToggle) return;
        const isActive = this.navMenu.classList.toggle('active');
        const icon = this.menuToggle.querySelector('i');
        if (icon) {
            if (icon.classList.contains('bi-list') || icon.classList.contains('bi-x-lg')) {
                icon.className = isActive ? 'bi bi-x-lg' : 'bi bi-list';
            }
        }
        this.menuToggle.setAttribute('aria-expanded', String(isActive));
    }

    public closeMenu(): void {
        this.navMenu?.classList.remove('active');
        if (this.menuToggle) {
            const icon = this.menuToggle.querySelector('i');
            if (icon) {
                if (icon.classList.contains('bi-list') || icon.classList.contains('bi-x-lg')) {
                    icon.className = 'bi bi-list';
                }
            }
            this.menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    private bindLinkClicks(): void {
        this.navMenu?.querySelectorAll<HTMLAnchorElement>(this.linkSelector)
            .forEach((link) => {
                link.addEventListener('click', () => this.closeMenu());
            });
    }

    private bindOutsideClick(): void {
        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                this.header &&
                !this.header.contains(target) &&
                this.navMenu?.classList.contains('active')
            ) {
                this.closeMenu();
            }
        });
    }

    private bindEscapeKey(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.navMenu?.classList.contains('active')) {
                this.closeMenu();
                this.menuToggle?.focus();
            }
        });
    }

    private updateHeaderHeight(): void {
        const headerHeight = this.header?.offsetHeight || 80;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
}
