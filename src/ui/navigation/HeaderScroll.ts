/**
 * ============================================================================
 * SJCCC – Header Scroll Controller
 * Manages sticky header blur, dynamic blur intensity CSS variable,
 * document-level header height CSS variable, and back-to-top button visibility
 * ============================================================================
 */

export class HeaderScroll {
    private ticking: boolean = false;
    private lastScrollY: number = 0;

    constructor(
        private header: HTMLElement,
        private backToTopBtn: HTMLElement | null = null
    ) {
        this.init();
    }

    private init(): void {
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.onScroll();
        this.backToTopBtn?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    private onScroll = (): void => {
        this.lastScrollY = window.scrollY;

        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                // Progressive blur - add/remove scrolled class
                this.header.classList.toggle('scrolled', this.lastScrollY > 60);

                // Dynamic blur intensity based on scroll position
                const blurIntensity = Math.min(15, 5 + (this.lastScrollY / 500));
                this.header.style.setProperty('--blur-intensity', `${blurIntensity}px`);

                // Back to top button visibility
                this.backToTopBtn?.classList.toggle('visible', this.lastScrollY > 500);

                this.ticking = false;
            });
            this.ticking = true;
        }

        // Update header height CSS variable for layout calculations
        this.updateHeaderHeight();
    };

    private updateHeaderHeight(): void {
        const headerHeight = this.header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
}
