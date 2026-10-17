import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { LazyImageLoader, lazyImageLoader, initLazyImages, loadLazyImage } from '../../src/ui/utils/LazyImageLoader.ts';
import { renderCarouselSlides } from '../../src/features/carousel/CarouselRenderer.ts';
import { createNewsCardHTML, renderNewsStories } from '../../src/features/news/NewsStoriesRenderer.ts';
import { CAMPUS_SLIDES } from '../../src/data/campusSlides.ts';
import { NEWS_STORIES } from '../../src/data/newsStories.ts';

describe('Intersection Observer Lazy Image Loader', () => {
    let mockObserverInstance: {
        observe: ReturnType<typeof vi.fn>;
        unobserve: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        callback: (entries: Partial<IntersectionObserverEntry>[]) => void;
    };
    let dom: JSDOM;

    beforeEach(() => {
        dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).Element = dom.window.Element;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLImageElement = dom.window.HTMLImageElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;

        mockObserverInstance = {
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
            callback: () => {},
        };

        // Mock IntersectionObserver
        const MockIO = vi.fn(function(cb: any) {
            mockObserverInstance.callback = cb;
            return mockObserverInstance;
        });
        (globalThis as any).IntersectionObserver = MockIO;
        (dom.window as any).IntersectionObserver = MockIO;

        lazyImageLoader.disconnect();
    });

    afterEach(() => {
        lazyImageLoader.disconnect();
        delete (globalThis as any).IntersectionObserver;
        delete (globalThis as any).document;
        delete (globalThis as any).window;
        delete (globalThis as any).Element;
        delete (globalThis as any).HTMLElement;
        delete (globalThis as any).HTMLImageElement;
        delete (globalThis as any).HTMLButtonElement;
        vi.restoreAllMocks();
    });

    it('creates an IntersectionObserver with expected options', () => {
        const loader = new LazyImageLoader({
            rootMargin: '300px 50px',
            threshold: 0.05,
        });

        expect(loader).toBeDefined();
        expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                rootMargin: '300px 50px',
                threshold: 0.05,
            })
        );
    });

    it('observes images with data-src and loads them when intersecting', () => {
        const loader = new LazyImageLoader();
        const container = document.createElement('div');
        container.className = 'blurred-img-container';

        const img = document.createElement('img');
        img.className = 'blurred-img-full';
        img.setAttribute('data-src', '/assets/campus/dorm.jpg');
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
        container.appendChild(img);
        document.body.appendChild(container);

        loader.observe(img);
        expect(mockObserverInstance.observe).toHaveBeenCalledWith(img);

        // Simulate intersection event
        mockObserverInstance.callback([
            {
                target: img,
                isIntersecting: true,
                intersectionRatio: 1,
            } as unknown as IntersectionObserverEntry,
        ]);

        expect(img.getAttribute('src')).toBe('/assets/campus/dorm.jpg');
        expect(img.hasAttribute('data-src')).toBe(false);
        expect(mockObserverInstance.unobserve).toHaveBeenCalledWith(img);

        // Simulate load event
        img.dispatchEvent(new dom.window.Event('load'));
        expect(img.classList.contains('is-loaded')).toBe(true);
        expect(container.classList.contains('is-loaded')).toBe(true);
    });

    it('immediately loads images if IntersectionObserver is unsupported', () => {
        delete (globalThis as any).IntersectionObserver;
        delete (dom.window as any).IntersectionObserver;

        const loader = new LazyImageLoader();
        const container = document.createElement('div');
        container.className = 'blurred-img-container';

        const img = document.createElement('img');
        img.setAttribute('data-src', '/assets/campus/library.jpg');
        img.src = '';
        container.appendChild(img);

        loader.observe(img);

        expect(img.getAttribute('src')).toBe('/assets/campus/library.jpg');
        expect(img.hasAttribute('data-src')).toBe(false);
    });

    it('loadLazyImage forces immediate resolution of data-src', () => {
        const container = document.createElement('div');
        container.className = 'blurred-img-container';

        const img = document.createElement('img');
        img.setAttribute('data-src', '/assets/campus/chapel.jpg');
        container.appendChild(img);

        loadLazyImage(img);

        expect(img.getAttribute('src')).toBe('/assets/campus/chapel.jpg');
        expect(img.hasAttribute('data-src')).toBe(false);
    });

    it('renders Campus Life carousel slides with data-src for lazy loading', () => {
        const track = document.createElement('div');
        track.id = 'carouselTrack';
        document.body.appendChild(track);

        renderCarouselSlides(track, CAMPUS_SLIDES);

        const slideImages = track.querySelectorAll<HTMLImageElement>('.carousel-image');
        expect(slideImages.length).toBe(CAMPUS_SLIDES.length);

        slideImages.forEach((img, idx) => {
            expect(img.getAttribute('data-src')).toBe(CAMPUS_SLIDES[idx].imageSrc);
            expect(img.getAttribute('loading')).toBe('lazy');
        });
    });

    it('renders News stories with data-src and initializes lazy observing', () => {
        const grid = document.createElement('div');
        grid.id = 'newsEventsGrid';
        document.body.appendChild(grid);

        renderNewsStories(grid, NEWS_STORIES);

        const newsImages = grid.querySelectorAll<HTMLImageElement>('.news-card__img');
        expect(newsImages.length).toBe(NEWS_STORIES.length);

        newsImages.forEach((img, idx) => {
            expect(img.getAttribute('data-src')).toBe(NEWS_STORIES[idx].imageSrc);
            expect(img.getAttribute('loading')).toBe('lazy');
            expect(mockObserverInstance.observe).toHaveBeenCalledWith(img);
        });
    });

    it('createNewsCardHTML includes data-src and transparent SVG placeholder', () => {
        const html = createNewsCardHTML(NEWS_STORIES[0]);
        expect(html).toContain(`data-src="${NEWS_STORIES[0].imageSrc}"`);
        expect(html).toContain('viewBox=\'0 0 480 280\'');
    });

    it('initLazyImages scans container and observes all matching images', () => {
        const wrapper = document.createElement('div');
        for (let i = 0; i < 3; i++) {
            const img = document.createElement('img');
            img.setAttribute('data-src', `/assets/img-${i}.jpg`);
            wrapper.appendChild(img);
        }
        document.body.appendChild(wrapper);

        initLazyImages(wrapper);

        const imgs = wrapper.querySelectorAll('img');
        imgs.forEach((img) => {
            expect(mockObserverInstance.observe).toHaveBeenCalledWith(img);
        });
    });
});
