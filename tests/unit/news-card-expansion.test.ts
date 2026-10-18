import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
    renderNewsStories,
    initNewsCardInteractions,
    collapseNewsCard,
    expandNewsCard
} from '../../src/features/news/NewsStoriesRenderer.ts';
import { NEWS_STORIES } from '../../src/data/newsStories.ts';
import fs from 'fs';
import path from 'path';

describe('SJCCC News Cards – Dynamic Full-Width Article Expansion', () => {
    let dom: JSDOM;
    let container: HTMLElement;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="newsEventsGrid" class="events-grid stagger-group"></div></body></html>', {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).Element = dom.window.Element;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLImageElement = dom.window.HTMLImageElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).HTMLAnchorElement = dom.window.HTMLAnchorElement;
        (globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
        (globalThis as any).Event = dom.window.Event;
        (globalThis as any).CustomEvent = dom.window.CustomEvent;

        // Mock scrollTo
        dom.window.scrollTo = vi.fn();
        (globalThis as any).scrollTo = dom.window.scrollTo;

        // Mock IntersectionObserver
        const MockIO = vi.fn(function() {
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        });
        (globalThis as any).IntersectionObserver = MockIO;
        (dom.window as any).IntersectionObserver = MockIO;

        container = dom.window.document.getElementById('newsEventsGrid') as HTMLElement;
    });

    afterEach(() => {
        delete (globalThis as any).document;
        delete (globalThis as any).window;
        delete (globalThis as any).Element;
        delete (globalThis as any).HTMLElement;
        delete (globalThis as any).HTMLImageElement;
        delete (globalThis as any).HTMLButtonElement;
        delete (globalThis as any).HTMLAnchorElement;
        delete (globalThis as any).KeyboardEvent;
        delete (globalThis as any).Event;
        delete (globalThis as any).CustomEvent;
        delete (globalThis as any).scrollTo;
        delete (globalThis as any).IntersectionObserver;
    });

    it('renders news cards with initial collapsed state and accessible attributes', () => {
        renderNewsStories(container, NEWS_STORIES);

        const cards = container.querySelectorAll<HTMLElement>('.news-card');
        expect(cards.length).toBe(NEWS_STORIES.length);

        cards.forEach((card) => {
            expect(card.classList.contains('is-expanded')).toBe(false);
            const btn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn');
            expect(btn?.getAttribute('aria-expanded')).toBe('false');
            expect(btn?.querySelector('.expand-btn-text')?.textContent).toBe('Read Full Story');
            const expandable = card.querySelector('.news-card__expandable');
            expect(expandable?.getAttribute('aria-hidden')).toBe('true');
        });

        expect(container.classList.contains('has-expanded-card')).toBe(false);
    });

    it('expands the clicked article across the entire news grid on "Full Story" click', () => {
        renderNewsStories(container, NEWS_STORIES);

        const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));
        const firstCard = cards[0];
        const expandBtn = firstCard.querySelector<HTMLButtonElement>('.news-card__expand-btn')!;

        expandBtn.click();

        expect(firstCard.classList.contains('is-expanded')).toBe(true);
        expect(expandBtn.getAttribute('aria-expanded')).toBe('true');
        expect(expandBtn.getAttribute('aria-label')).toContain('Collapse story details');
        expect(expandBtn.querySelector('.expand-btn-text')?.textContent).toBe('Show Less');
        expect(firstCard.querySelector('.news-card__expandable')?.getAttribute('aria-hidden')).toBe('false');
        expect(container.classList.contains('has-expanded-card')).toBe(true);

        // Verify other cards remain collapsed and at normal state
        cards.slice(1).forEach((card) => {
            expect(card.classList.contains('is-expanded')).toBe(false);
            const btn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn');
            expect(btn?.getAttribute('aria-expanded')).toBe('false');
            expect(btn?.querySelector('.expand-btn-text')?.textContent).toBe('Read Full Story');
        });
    });

    it('transfers the expanded state when clicking a different article without leaving multiple cards expanded', () => {
        renderNewsStories(container, NEWS_STORIES);

        const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));
        const firstCard = cards[0];
        const secondCard = cards[1];
        const thirdCard = cards[2];

        // 1. Expand first card
        firstCard.querySelector<HTMLButtonElement>('.news-card__expand-btn')!.click();
        expect(firstCard.classList.contains('is-expanded')).toBe(true);
        expect(secondCard.classList.contains('is-expanded')).toBe(false);

        // 2. Open second article
        secondCard.querySelector<HTMLButtonElement>('.news-card__expand-btn')!.click();

        // First card must return to collapsed / half-width state
        expect(firstCard.classList.contains('is-expanded')).toBe(false);
        expect(firstCard.querySelector('.news-card__expand-btn')?.getAttribute('aria-expanded')).toBe('false');
        expect(firstCard.querySelector('.expand-btn-text')?.textContent).toBe('Read Full Story');
        expect(firstCard.querySelector('.news-card__expandable')?.getAttribute('aria-hidden')).toBe('true');

        // Second card must now be the only expanded card
        expect(secondCard.classList.contains('is-expanded')).toBe(true);
        expect(secondCard.querySelector('.news-card__expand-btn')?.getAttribute('aria-expanded')).toBe('true');
        expect(secondCard.querySelector('.expand-btn-text')?.textContent).toBe('Show Less');
        expect(secondCard.querySelector('.news-card__expandable')?.getAttribute('aria-hidden')).toBe('false');

        // Count total expanded cards in container
        const expandedCards = container.querySelectorAll('.news-card.is-expanded');
        expect(expandedCards.length).toBe(1);

        // 3. Open third article
        thirdCard.querySelector<HTMLButtonElement>('.news-card__expand-btn')!.click();
        expect(secondCard.classList.contains('is-expanded')).toBe(false);
        expect(thirdCard.classList.contains('is-expanded')).toBe(true);
        expect(container.querySelectorAll('.news-card.is-expanded').length).toBe(1);
    });

    it('restores original grid layout when an expanded article is collapsed', () => {
        renderNewsStories(container, NEWS_STORIES);

        const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));
        const card = cards[1];
        const expandBtn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn')!;

        // Expand
        expandBtn.click();
        expect(card.classList.contains('is-expanded')).toBe(true);
        expect(container.classList.contains('has-expanded-card')).toBe(true);

        // Click again to collapse
        expandBtn.click();
        expect(card.classList.contains('is-expanded')).toBe(false);
        expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
        expect(expandBtn.querySelector('.expand-btn-text')?.textContent).toBe('Read Full Story');
        expect(container.classList.contains('has-expanded-card')).toBe(false);
        expect(container.querySelectorAll('.news-card.is-expanded').length).toBe(0);
    });

    it('supports keyboard Enter and Space interaction to toggle expansion', () => {
        renderNewsStories(container, NEWS_STORIES);

        const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));
        const card = cards[0];

        // Trigger Enter keydown on the card
        const enterEvent = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        Object.defineProperty(enterEvent, 'target', { value: card });
        card.dispatchEvent(enterEvent);

        expect(card.classList.contains('is-expanded')).toBe(true);
        expect(container.classList.contains('has-expanded-card')).toBe(true);

        // Trigger Space keydown on the card to collapse
        const spaceEvent = new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true });
        Object.defineProperty(spaceEvent, 'target', { value: card });
        card.dispatchEvent(spaceEvent);

        expect(card.classList.contains('is-expanded')).toBe(false);
        expect(container.classList.contains('has-expanded-card')).toBe(false);
    });

    it('does not toggle card when clicking internal navigation hyperlinks (<a> tags)', () => {
        renderNewsStories(container, NEWS_STORIES);

        const card = container.querySelector<HTMLElement>('.news-card')!;
        const ctaLink = card.querySelector<HTMLAnchorElement>('.news-card__cta')!;
        const titleLink = card.querySelector<HTMLAnchorElement>('.news-card__title-link')!;

        // Click on CTA link
        ctaLink.click();
        expect(card.classList.contains('is-expanded')).toBe(false);

        // Click on Title link
        titleLink.click();
        expect(card.classList.contains('is-expanded')).toBe(false);
    });

    it('exports standalone collapseNewsCard and expandNewsCard functions', () => {
        renderNewsStories(container, NEWS_STORIES);
        const card = container.querySelector<HTMLElement>('.news-card')!;

        expandNewsCard(card);
        expect(card.classList.contains('is-expanded')).toBe(true);
        expect(card.querySelector('.news-card__expand-btn')?.getAttribute('aria-expanded')).toBe('true');
        expect(card.querySelector('.expand-btn-text')?.textContent).toBe('Show Less');

        collapseNewsCard(card);
        expect(card.classList.contains('is-expanded')).toBe(false);
        expect(card.querySelector('.news-card__expand-btn')?.getAttribute('aria-expanded')).toBe('false');
        expect(card.querySelector('.expand-btn-text')?.textContent).toBe('Read Full Story');
    });

    it('verifies main.css and events.css contain cinematic cubic-bezier, box-shadow, and scale transform', () => {
        const mainCssPath = path.resolve(process.cwd(), 'src/css/main.css');
        const mainCssContent = fs.readFileSync(mainCssPath, 'utf-8');

        expect(mainCssContent).toContain('.news-card.is-expanded');
        expect(mainCssContent).toContain('scale(1.012)');
        expect(mainCssContent).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
        expect(mainCssContent).toContain('box-shadow: 0 20px 48px -8px');

        const eventsCssPath = path.resolve(process.cwd(), 'src/css/components/events.css');
        const eventsCssContent = fs.readFileSync(eventsCssPath, 'utf-8');

        // Full width expansion rule
        expect(eventsCssContent).toContain('grid-column: 1 / -1 !important');
        // Dense auto-flow to prevent gaps
        expect(eventsCssContent).toContain('grid-auto-flow: dense');
        // Other cards constrained to half-width (span 1)
        expect(eventsCssContent).toContain('grid-column: span 1 !important');
        // Visual distinction indicator (inset gold accent bar)
        expect(eventsCssContent).toContain('inset 0 3px 0 var(--gold, #C9A229)');
        // Scale transform
        expect(eventsCssContent).toContain('scale(1.012)');
        // Cinematic cubic-bezier easing curve
        expect(eventsCssContent).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
        // Spring physics rotation on expand icon
        expect(eventsCssContent).toContain('cubic-bezier(0.34, 1.56, 0.64, 1)');
    });

    it('verifies preScrollNewsCardToCenter in src/main.ts smoothly scrolls and centers the card', async () => {
        const { preScrollNewsCardToCenter, initNewsCardExpansionHandler } = await import('../../src/main.ts');

        renderNewsStories(container, NEWS_STORIES);
        const card = container.querySelector<HTMLElement>('.news-card')!;

        const scrollToMock = vi.fn();
        (dom.window as any).scrollTo = scrollToMock;
        (globalThis as any).scrollTo = scrollToMock;

        // Mock getBoundingClientRect
        vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
            top: 250,
            left: 50,
            bottom: 550,
            right: 450,
            width: 400,
            height: 300,
            x: 50,
            y: 250,
            toJSON: () => {},
        });

        initNewsCardExpansionHandler('#newsEventsGrid');

        // Call preScrollNewsCardToCenter directly
        preScrollNewsCardToCenter(card);

        expect(scrollToMock).toHaveBeenCalled();
        const callArgs = scrollToMock.mock.calls[0][0];
        expect(callArgs.behavior).toBe('smooth');
        expect(callArgs.top).toBeGreaterThanOrEqual(0);
    });
});
