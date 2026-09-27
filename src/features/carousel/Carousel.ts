/**
 * ============================================================================
 * SJCCC – Campus Image & Story Carousel
 * Auto-playing carousel with dynamic dot indicators, touch swipe support,
 * and mouse hover pause
 * ============================================================================
 */

export class Carousel {
    private slides: NodeListOf<HTMLElement>;
    private dotsContainer: HTMLElement | null;
    private prevBtn: HTMLButtonElement | null;
    private nextBtn: HTMLButtonElement | null;
    private container: HTMLElement | null;
    private dots: NodeListOf<HTMLElement> = document.querySelectorAll('.carousel-dot');
    private currentSlide = 0;
    private autoPlay!: ReturnType<typeof setInterval>;
    private readonly DELAY = 5000;

    constructor(
        slidesSelector: string = '.carousel-slide',
        dotsContainerId: string = 'carouselDots',
        prevBtnId: string = 'prevBtn',
        nextBtnId: string = 'nextBtn',
        containerSelector: string = '.carousel-container'
    ) {
        this.slides = document.querySelectorAll<HTMLElement>(slidesSelector);
        this.dotsContainer = document.getElementById(dotsContainerId) as HTMLElement | null;
        this.prevBtn = document.getElementById(prevBtnId) as HTMLButtonElement | null;
        this.nextBtn = document.getElementById(nextBtnId) as HTMLButtonElement | null;
        this.container = document.querySelector<HTMLElement>(containerSelector);
        this.init();
    }

    private init(): void {
        if (!this.slides.length || !this.dotsContainer) return;

        this.generateDots();
        this.dots = document.querySelectorAll<HTMLElement>('.carousel-dot');
        this.prevBtn?.addEventListener('click', () => this.prevSlide());
        this.nextBtn?.addEventListener('click', () => this.nextSlide());
        this.resetAutoPlay();
        this.bindHover();
        this.bindTouch();
    }

    private generateDots(): void {
        this.slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            if (i === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => this.goToSlide(i));
            this.dotsContainer?.appendChild(dot);
        });
    }

    private goToSlide(index: number): void {
        this.slides[this.currentSlide].classList.remove('active');
        this.dots[this.currentSlide]?.classList.remove('active');
        this.currentSlide = (index + this.slides.length) % this.slides.length;
        this.slides[this.currentSlide].classList.add('active');
        this.dots[this.currentSlide]?.classList.add('active');
        this.resetAutoPlay();
    }

    private nextSlide = (): void => this.goToSlide(this.currentSlide + 1);
    private prevSlide = (): void => this.goToSlide(this.currentSlide - 1);

    private isReducedMotion(): boolean {
        return typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private resetAutoPlay(): void {
        clearInterval(this.autoPlay);
        if (this.isReducedMotion()) return;
        this.autoPlay = setInterval(() => this.nextSlide(), this.DELAY);
    }

    private bindHover(): void {
        this.container?.addEventListener('mouseenter', () => clearInterval(this.autoPlay));
        this.container?.addEventListener('mouseleave', () => {
            if (!this.isReducedMotion()) this.resetAutoPlay();
        });
    }

    private bindTouch(): void {
        let touchStartX = 0;
        this.container?.addEventListener('touchstart', (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.container?.addEventListener('touchend', (e: TouchEvent) => {
            const diff = touchStartX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) {
                diff > 0 ? this.nextSlide() : this.prevSlide();
            }
        });
    }
}
