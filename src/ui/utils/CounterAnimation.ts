/**
 * ============================================================================
 * SJCCC – Counter Animation Utility
 * Smooth cubic-eased numerical incrementing for statistics and examination numbers
 * Supports integers, decimals, prefixes, and suffixes.
 * ============================================================================
 */

export class CounterAnimation {
    private elements: NodeListOf<HTMLElement>;
    private observer: IntersectionObserver | null = null;

    constructor(selector: string = '.stat-number[data-target], [data-counter][data-target]') {
        this.elements = document.querySelectorAll<HTMLElement>(selector);
        this.init();
    }

    private init(): void {
        if (!this.elements.length) return;

        const prefersReduced = typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            this.elements.forEach((el) => {
                const target = el.getAttribute('data-target') ?? '0';
                const suffix = el.getAttribute('data-suffix') ?? '';
                const prefix = el.getAttribute('data-prefix') ?? '';
                el.textContent = `${prefix}${target}${suffix}`;
            });
            return;
        }

        if (typeof IntersectionObserver !== 'undefined') {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const el = entry.target as HTMLElement;
                        this.observer?.unobserve(el);
                        this.runCounter(el);
                    }
                });
            }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

            this.elements.forEach((el) => this.observer?.observe(el));
        } else {
            this.elements.forEach((el) => this.runCounter(el));
        }
    }

    private runCounter(el: HTMLElement): void {
        const rawTarget = el.getAttribute('data-target') ?? '0';
        const isFloat = rawTarget.includes('.');
        const target = isFloat ? parseFloat(rawTarget) : parseInt(rawTarget, 10);
        const suffix = el.getAttribute('data-suffix') ?? '';
        const prefix = el.getAttribute('data-prefix') ?? '';
        const duration = 1600;
        const start = performance.now();

        const update = (now: number): void => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentVal = eased * target;
            
            el.textContent = `${prefix}${isFloat ? currentVal.toFixed(1) : Math.floor(currentVal)}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = `${prefix}${isFloat ? target.toFixed(1) : target}${suffix}`;
            }
        };

        requestAnimationFrame(update);
    }

    public destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
