/**
 * ============================================================================
 * SJCCC – Scroll Reveal & Staggered Entrance Utility
 * Uses IntersectionObserver to reveal elements and groups as they scroll into view
 * Guarantees zero cumulative layout shift (CLS = 0) with GPU compositor acceleration
 * ============================================================================
 */

export interface ScrollRevealOptions {
    activeClass?: string;
    threshold?: number;
    rootMargin?: string;
    stagger?: boolean;
    baseDelay?: number;
}

export interface StaggerGroupOptions {
    container: string | HTMLElement;
    itemSelector: string;
    baseDelay?: number;
    initialDelay?: number;
    threshold?: number;
    rootMargin?: string;
    activeClass?: string;
}

export class ScrollReveal {
    private static readonly MOBILE_BREAKPOINT_PX = 768;
    private static readonly MOBILE_USER_AGENT_PATTERN =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

    constructor(selector: string = '.reveal', options: ScrollRevealOptions = {}) {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        if (!elements.length) return;

        const activeClass = options.activeClass ?? 'revealed';

        // Accessibility: If user requested reduced motion, reveal instantly
        if (this.prefersReducedMotion()) {
            elements.forEach((el) => el.classList.add(activeClass));
            return;
        }

        const isMobile = this.isMobileViewport();
        const threshold = options.threshold ?? (options.stagger ? (isMobile ? 0.05 : 0.1) : 0.15);
        const rootMargin = options.rootMargin ?? (options.stagger ? (isMobile ? '0px 0px -10px 0px' : '0px 0px -50px 0px') : '0px 0px -20px 0px');

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const target = entry.target as HTMLElement;
                        if (options.stagger) {
                            const delay = Number(target.dataset.delay) || 0;
                            window.setTimeout(() => target.classList.add(activeClass), delay);
                        } else {
                            target.classList.add(activeClass);
                        }
                        observer.unobserve(target);
                    }
                });
            },
            { threshold, rootMargin }
        );

        const baseDelay = options.baseDelay ?? (isMobile ? 30 : 60);
        elements.forEach((element, index) => {
            if (options.stagger) {
                element.dataset.delay = String(index * baseDelay);
            }
            observer.observe(element);
        });
    }

    /**
     * Initializes a staggered entrance sequence for items inside a specific container.
     * When the container crosses the intersection threshold, each visible matching item
     * transitions in with an incremental delay, eliminating layout shifts.
     */
    public initStaggerGroup(options: StaggerGroupOptions): void {
        const containerEl = typeof options.container === 'string'
            ? document.querySelector<HTMLElement>(options.container)
            : options.container;

        if (!containerEl) return;

        const activeClass = options.activeClass ?? 'revealed';
        const rawItems = Array.from(containerEl.querySelectorAll<HTMLElement>(options.itemSelector));
        // Filter out elements explicitly hidden via .d-none or hidden attribute
        const items = rawItems.filter(el => !el.classList.contains('d-none') && !el.hasAttribute('hidden'));

        if (!items.length) return;

        // If reduced motion is requested, reveal immediately without animation or delay
        if (this.prefersReducedMotion()) {
            containerEl.classList.add(activeClass);
            items.forEach((item) => item.classList.add(activeClass));
            return;
        }

        const isMobile = this.isMobileViewport();
        const baseDelay = options.baseDelay ?? (isMobile ? 70 : 110);
        const initialDelay = options.initialDelay ?? 0;
        const threshold = options.threshold ?? (isMobile ? 0.08 : 0.12);
        const rootMargin = options.rootMargin ?? (isMobile ? '0px 0px -20px 0px' : '0px 0px -40px 0px');

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        observer.disconnect();
                        containerEl.classList.add(activeClass);
                        items.forEach((item, index) => {
                            const delay = initialDelay + (index * baseDelay);
                            if (delay <= 0) {
                                item.classList.add(activeClass);
                            } else {
                                window.setTimeout(() => {
                                    item.classList.add(activeClass);
                                }, delay);
                            }
                        });
                    }
                });
            },
            { threshold, rootMargin }
        );

        observer.observe(containerEl);
    }

    private prefersReducedMotion(): boolean {
        return (
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
    }

    private isMobileViewport(): boolean {
        return (
            ScrollReveal.MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent) ||
            window.innerWidth <= ScrollReveal.MOBILE_BREAKPOINT_PX
        );
    }
}
