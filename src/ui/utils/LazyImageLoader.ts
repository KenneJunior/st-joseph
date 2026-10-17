/**
 * ============================================================================
 * SJCCC – Intersection Observer Lazy Image Loader
 * High-performance viewport-driven lazy loading for images in the Campus Life
 * carousel and News & Events section.
 *
 * Benefits:
 * - Drastically reduces initial page load time and payload weight
 * - Smoothly integrates with blurred-image placeholders (LQIP)
 * - Zero layout shift with pre-reserved aspect ratios
 * - Graceful fallback if IntersectionObserver is unavailable
 * ============================================================================
 */

export interface LazyImageOptions {
    root?: Element | Document | null;
    rootMargin?: string;
    threshold?: number | number[];
    onLoad?: (img: HTMLImageElement) => void;
}

export class LazyImageLoader {
    private observer: IntersectionObserver | null = null;
    private readonly options: Required<LazyImageOptions>;

    constructor(options: LazyImageOptions = {}) {
        this.options = {
            root: options.root ?? null,
            rootMargin: options.rootMargin ?? '250px 0px',
            threshold: options.threshold ?? 0.01,
            onLoad: options.onLoad ?? (() => {}),
        };

        this.initObserver();
    }

    private initObserver(): void {
        if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
            this.observer = null;
            return;
        }

        try {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting || entry.intersectionRatio > 0) {
                        const target = entry.target;
                        if (target instanceof HTMLImageElement) {
                            this.loadImage(target);
                            this.observer?.unobserve(target);
                        }
                    }
                });
            }, {
                root: this.options.root,
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold,
            });
        } catch {
            // Fallback for non-compliant browser or test mock failure
            this.observer = null;
        }
    }

    /**
     * Loads the target image immediately by swapping data-src to src.
     */
    public loadImage(img: HTMLImageElement): void {
        const dataSrc = img.getAttribute('data-src');
        const dataSrcset = img.getAttribute('data-srcset');

        if (!dataSrc && !dataSrcset) {
            // Already loaded or does not use data-src
            return;
        }

        if (dataSrcset) {
            img.srcset = dataSrcset;
            img.removeAttribute('data-srcset');
        }

        if (dataSrc) {
            img.removeAttribute('data-src');
            img.src = dataSrc;
        }

        const markLoaded = () => {
            img.classList.add('is-loaded');
            const parentContainer = img.closest('.blurred-img-container, .carousel-image-container, .carousel-thumb-img-wrap, .news-card__media');
            if (parentContainer) {
                parentContainer.classList.add('is-loaded');
            }
            this.options.onLoad(img);
        };

        if (img.complete && img.naturalWidth > 0) {
            markLoaded();
        } else {
            img.addEventListener('load', markLoaded, { once: true });
            img.addEventListener('error', markLoaded, { once: true });
        }
    }

    /**
     * Observes one or multiple image elements. If IntersectionObserver is not supported,
     * immediately loads them.
     */
    public observe(
        elements: Element | Element[] | NodeListOf<Element> | null | undefined
    ): void {
        if (!elements) return;

        if (!this.observer) {
            this.initObserver();
        }

        const elList: Element[] =
            elements instanceof Element
                ? [elements]
                : Array.from(elements);

        elList.forEach((el) => {
            const isImg = el.tagName === 'IMG' || (typeof HTMLImageElement !== 'undefined' && el instanceof HTMLImageElement);
            if (!isImg) {
                // If container passed, query child images with data-src
                const nestedImgs = el.querySelectorAll<HTMLImageElement>('img[data-src]');
                nestedImgs.forEach((nested) => this.observe(nested));
                return;
            }

            const imgEl = el as HTMLImageElement;
            if (!imgEl.hasAttribute('data-src') && !imgEl.hasAttribute('data-srcset')) {
                return;
            }

            if (this.observer) {
                this.observer.observe(imgEl);
            } else {
                // Fallback for environments lacking IntersectionObserver
                this.loadImage(imgEl);
            }
        });
    }

    /**
     * Unobserves an image element.
     */
    public unobserve(element: Element): void {
        if (this.observer && element instanceof Element) {
            this.observer.unobserve(element);
        }
    }

    /**
     * Disconnects the observer instance.
     */
    public disconnect(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

/**
 * Shared singleton instance configured with generous vertical rootMargin
 * for smooth anticipatory preloading.
 */
export const lazyImageLoader = new LazyImageLoader({
    rootMargin: '250px 50px',
    threshold: 0.01,
});

/**
 * Convenience helper to initialize all lazy images inside a root container.
 */
export function initLazyImages(
    root: ParentNode = document,
    selector = 'img[data-src]'
): void {
    if (!root) return;
    const images = root.querySelectorAll<HTMLImageElement>(selector);
    lazyImageLoader.observe(images);
}

/**
 * Convenience helper to immediately load a single lazy image (e.g. active carousel slide).
 */
export function loadLazyImage(img: HTMLImageElement): void {
    lazyImageLoader.loadImage(img);
}
