/**
 * ============================================================================
 * SJCCC – Counter Animation Utility
 * Smooth cubic-eased numerical incrementing for statistics numbers
 * ============================================================================
 */

export class CounterAnimation {
    private elements: NodeListOf<HTMLElement>;
    private animated = false;
    private boundAnimate = (): void => this.animate();

    constructor(selector: string = '.stat-number[data-target]') {
        this.elements = document.querySelectorAll<HTMLElement>(selector);
        this.init();
    }

    private init(): void {
        window.addEventListener('scroll', this.boundAnimate, { passive: true });
        this.animate();
    }

    private animate(): void {
        if (this.animated || !this.elements.length) return;
        const first = this.elements[0];
        if (first.getBoundingClientRect().top < window.innerHeight - 80) {
            this.animated = true;
            window.removeEventListener('scroll', this.boundAnimate);

            const prefersReduced = typeof window !== 'undefined' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (prefersReduced) {
                this.elements.forEach((el) => {
                    const target = el.getAttribute('data-target') ?? '0';
                    el.textContent = target;
                });
                return;
            }

            this.elements.forEach((el) => this.runCounter(el));
        }
    }

    private runCounter(el: HTMLElement): void {
        const target = parseInt(el.getAttribute('data-target') ?? '0', 10);
        const duration = 1800;
        const start = performance.now();

        const update = (now: number): void => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = String(Math.floor(eased * target));
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = String(target);
            }
        };
        requestAnimationFrame(update);
    }
}
