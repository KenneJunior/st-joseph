import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { FaqSection } from '../../src/features/faq/FaqSection.ts';
import { renderFaqItems } from '../../src/features/faq/FaqRenderer.ts';
import { FAQ_ITEMS } from '../../src/data/faqData.ts';

const FAQ_HTML_FIXTURE = `
<!DOCTYPE html>
<html>
<body>
    <section id="faq">
        <div class="faq-controls-panel">
            <div class="faq-filters-bar" id="faqCategoryTabs">
                <button type="button" class="faq-filter-btn is-active" data-faq-filter="all">
                    All Questions <span class="faq-filter-count">15</span>
                </button>
                <button type="button" class="faq-filter-btn" data-faq-filter="admissions">
                    Admissions <span class="faq-filter-count">5</span>
                </button>
            </div>
            <div class="faq-meta-tools">
                <span id="faqResultCount" class="faq-result-count">All 15 questions</span>
                <button type="button" id="faqExpandAllBtn" class="faq-action-link">Expand All</button>
                <span id="faqToolsSeparator" class="faq-tools-sep" hidden>|</span>
                <button type="button" id="faqCollapseAllBtn" class="faq-action-link" hidden disabled>Collapse All</button>
            </div>
        </div>
        <div class="faq-list" id="faqAccordion"></div>
        <div class="faq-empty-state" id="faqEmptyState" hidden>
            <span class="faq-empty-query"></span>
            <button type="button" id="faqEmptyResetBtn">Reset</button>
        </div>
    </section>
</body>
</html>
`;

describe('FAQ Accordion Component - Smooth Cinematic Transitions & Multi-Open Support', () => {
    let accordionEl: HTMLElement;

    beforeEach(() => {
        const dom = new JSDOM(FAQ_HTML_FIXTURE, {
            url: 'https://saintjosephcollege.org/',
            pretendToBeVisual: true,
        });

        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).NodeFilter = dom.window.NodeFilter;

        accordionEl = dom.window.document.getElementById('faqAccordion')!;

        // Mock matchMedia for normal motion
        dom.window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        // Render first 3 items for predictable tests
        renderFaqItems(accordionEl, FAQ_ITEMS.slice(0, 3));
    });

    afterEach(() => {
        if (typeof document !== 'undefined') {
            document.body.innerHTML = '';
        }
    });

    it('initializes with all FAQ items closed and accessible attributes configured', () => {
        new FaqSection();
        const items = accordionEl.querySelectorAll<HTMLElement>('.faq-item');
        expect(items.length).toBe(3);

        items.forEach((item) => {
            const trigger = item.querySelector<HTMLButtonElement>('.faq-question-btn')!;
            const content = item.querySelector<HTMLElement>('.faq-answer-content')!;

            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            expect(item.classList.contains('is-open')).toBe(false);
            expect(content.hidden).toBe(true);
        });
    });

    it('smoothly expands an item with positive max-height and opacity 1', () => {
        new FaqSection();
        const item1 = accordionEl.querySelectorAll<HTMLElement>('.faq-item')[0];
        const trigger1 = item1.querySelector<HTMLButtonElement>('.faq-question-btn')!;
        const content1 = item1.querySelector<HTMLElement>('.faq-answer-content')!;

        // Mock scrollHeight in jsdom
        Object.defineProperty(content1, 'scrollHeight', { configurable: true, value: 240 });

        trigger1.click();

        expect(trigger1.getAttribute('aria-expanded')).toBe('true');
        expect(item1.classList.contains('is-open')).toBe(true);
        expect(content1.hidden).toBe(false);
        expect(content1.style.maxHeight).toBe('240px');
        expect(content1.style.opacity).toBe('1');

        // Simulate transitionend on max-height
        const transitionEndEvent = new (window as any).Event('transitionend');
        Object.defineProperty(transitionEndEvent, 'propertyName', { value: 'max-height' });
        content1.dispatchEvent(transitionEndEvent);

        // After completion, max-height becomes 'none' so dynamic resizing never clips
        expect(content1.style.maxHeight).toBe('none');
    });

    it('allows multiple FAQ items to stay open simultaneously without auto-collapsing others', () => {
        new FaqSection();
        const items = accordionEl.querySelectorAll<HTMLElement>('.faq-item');
        const trigger1 = items[0].querySelector<HTMLButtonElement>('.faq-question-btn')!;
        const content1 = items[0].querySelector<HTMLElement>('.faq-answer-content')!;
        const trigger2 = items[1].querySelector<HTMLButtonElement>('.faq-question-btn')!;
        const content2 = items[1].querySelector<HTMLElement>('.faq-answer-content')!;

        Object.defineProperty(content1, 'scrollHeight', { configurable: true, value: 200 });
        Object.defineProperty(content2, 'scrollHeight', { configurable: true, value: 280 });

        // Click item 1
        trigger1.click();
        expect(trigger1.getAttribute('aria-expanded')).toBe('true');
        expect(items[0].classList.contains('is-open')).toBe(true);

        // Click item 2
        trigger2.click();

        // Crucial verification: Item 1 must REMAIN OPEN while item 2 is also open
        expect(trigger1.getAttribute('aria-expanded')).toBe('true');
        expect(items[0].classList.contains('is-open')).toBe(true);
        expect(content1.hidden).toBe(false);

        expect(trigger2.getAttribute('aria-expanded')).toBe('true');
        expect(items[1].classList.contains('is-open')).toBe(true);
        expect(content2.hidden).toBe(false);
    });

    it('smoothly collapses an open item down to 0px height and opacity 0', () => {
        new FaqSection();
        const item1 = accordionEl.querySelectorAll<HTMLElement>('.faq-item')[0];
        const trigger1 = item1.querySelector<HTMLButtonElement>('.faq-question-btn')!;
        const content1 = item1.querySelector<HTMLElement>('.faq-answer-content')!;

        Object.defineProperty(content1, 'scrollHeight', { configurable: true, value: 180 });

        // Expand
        trigger1.click();
        const transitionEndExpand = new (window as any).Event('transitionend');
        Object.defineProperty(transitionEndExpand, 'propertyName', { value: 'max-height' });
        content1.dispatchEvent(transitionEndExpand);
        expect(content1.style.maxHeight).toBe('none');

        // Collapse
        trigger1.click();
        expect(trigger1.getAttribute('aria-expanded')).toBe('false');
        expect(item1.classList.contains('is-open')).toBe(false);
        expect(content1.style.maxHeight).toBe('0px');
        expect(content1.style.opacity).toBe('0');

        // Before transitionend, content remains in DOM layout to perform transition
        expect(content1.hidden).toBe(false);

        // Dispatch transitionend
        const transitionEndCollapse = new (window as any).Event('transitionend');
        Object.defineProperty(transitionEndCollapse, 'propertyName', { value: 'max-height' });
        content1.dispatchEvent(transitionEndCollapse);

        // After transition completes, content is marked hidden
        expect(content1.hidden).toBe(true);
    });

    it('expands all and collapses all items using bulk control buttons', () => {
        new FaqSection();
        const expandAllBtn = document.getElementById('faqExpandAllBtn') as HTMLButtonElement;
        const collapseAllBtn = document.getElementById('faqCollapseAllBtn') as HTMLButtonElement;
        const items = accordionEl.querySelectorAll<HTMLElement>('.faq-item');

        items.forEach((item, idx) => {
            const content = item.querySelector<HTMLElement>('.faq-answer-content')!;
            Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 150 + idx * 30 });
        });

        // Click Expand All
        expandAllBtn.click();
        items.forEach((item) => {
            const trigger = item.querySelector<HTMLButtonElement>('.faq-question-btn')!;
            const content = item.querySelector<HTMLElement>('.faq-answer-content')!;
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            expect(item.classList.contains('is-open')).toBe(true);
            expect(content.hidden).toBe(false);
        });

        // Click Collapse All
        collapseAllBtn.click();
        items.forEach((item) => {
            const trigger = item.querySelector<HTMLButtonElement>('.faq-question-btn')!;
            const content = item.querySelector<HTMLElement>('.faq-answer-content')!;
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            expect(item.classList.contains('is-open')).toBe(false);
            expect(content.style.maxHeight).toBe('0px');
            expect(content.style.opacity).toBe('0');
        });
    });

    it('respects prefers-reduced-motion by expanding immediately without animation delay', () => {
        // Mock reduced motion
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        new FaqSection();
        const item1 = accordionEl.querySelectorAll<HTMLElement>('.faq-item')[0];
        const trigger1 = item1.querySelector<HTMLButtonElement>('.faq-question-btn')!;
        const content1 = item1.querySelector<HTMLElement>('.faq-answer-content')!;

        trigger1.click();

        // Under reduced motion, content immediately has max-height 'none' and opacity '1'
        expect(trigger1.getAttribute('aria-expanded')).toBe('true');
        expect(item1.classList.contains('is-open')).toBe(true);
        expect(content1.hidden).toBe(false);
        expect(content1.style.maxHeight).toBe('none');
        expect(content1.style.opacity).toBe('1');
    });
});
