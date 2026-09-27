/**
 * ============================================================================
 * SJCCC – Scroll Reveal Utility
 * Uses IntersectionObserver to reveal elements as they scroll into view
 * ============================================================================
 */

export interface ScrollRevealOptions {
    activeClass?: string;
    threshold?: number;
    rootMargin?: string;
    stagger?: boolean;
    baseDelay?: number;
}

export class ScrollReveal {
    private static readonly MOBILE_BREAKPOINT_PX = 768;
    private static readonly MOBILE_USER_AGENT_PATTERN =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

    constructor(selector: string = '.reveal', options: ScrollRevealOptions = {}) {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        if (!elements.length) return;

        const isMobile = this.isMobileViewport();
        const activeClass = options.activeClass ?? 'revealed';
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

    private isMobileViewport(): boolean {
        return (
            ScrollReveal.MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent) ||
            window.innerWidth <= ScrollReveal.MOBILE_BREAKPOINT_PX
        );
    }
}
