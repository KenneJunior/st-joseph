/**
 * ============================================================================
 * SJCCC – Scroll Spy Controller
 * Tracks visible page sections using IntersectionObserver and marks
 * corresponding navigation links with an 'active' class
 * ============================================================================
 */

export class ScrollSpy {
    private navLinks: NodeListOf<HTMLAnchorElement>;
    private sections: Array<{
        link: HTMLAnchorElement;
        section: HTMLElement & { _navLink?: HTMLAnchorElement };
    }> = [];

    constructor(navLinkSelector: string = '#navMenu a.nav-link:not(#installApp)') {
        this.navLinks = document.querySelectorAll<HTMLAnchorElement>(navLinkSelector);
        this.init();
    }

    private init(): void {
        this.gatherSections();
        if (!this.sections.length) return;

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    const target = entry.target as HTMLElement & { _navLink?: HTMLAnchorElement };
                    if (entry.isIntersecting && target._navLink) {
                        this.navLinks.forEach((l) => l.classList.remove('active'));
                        target._navLink.classList.add('active');

                        // Also sync active state with mobile bottom bar
                        const href = target._navLink.getAttribute('href');
                        const bottomLinks = document.querySelectorAll<HTMLAnchorElement>('#mobileBottomBar a.mobile-bottom-item');
                        bottomLinks.forEach((bLink) => {
                            bLink.classList.toggle('active', bLink.getAttribute('href') === href);
                        });
                    }
                });
            },
            { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0 }
        );

        this.sections.forEach(({ section }) => observer.observe(section));
    }

    private gatherSections(): void {
        this.navLinks.forEach((link) => {
            const targetId = link.getAttribute('href');
            if (targetId?.startsWith('#')) {
                const section = document.querySelector(targetId) as
                    | (HTMLElement & { _navLink?: HTMLAnchorElement })
                    | null;
                if (section) {
                    section._navLink = link;
                    this.sections.push({ link, section });
                }
            }
        });
    }
}
