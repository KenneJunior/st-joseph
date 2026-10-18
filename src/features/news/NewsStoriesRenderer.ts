/**
 * ============================================================================
 * SJCCC – Institutional News Stories Renderer
 * Transforms canonical newsStories into semantic, accessible, crawlable
 * <article> elements with premium card styling and comprehensive ScrollReveal handling.
 * ============================================================================
 */

import { NEWS_STORIES, type NewsStory } from '../../data/newsStories.ts';
import { getBlurredPlaceholder } from '../../data/imagePlaceholders.ts';
import { initAllBlurredImages } from '../../ui/utils/BlurredImageLoader.ts';
import { initLazyImages } from '../../ui/utils/LazyImageLoader.ts';
import type { ScrollReveal } from '../../ui/utils/ScrollReveal.ts';

export interface RenderNewsOptions {
    scrollReveal?: ScrollReveal;
    forceRefresh?: boolean;
    onRendered?: (cards: HTMLElement[]) => void;
}

export const DEFAULT_FALLBACK_IMAGE = '/assets/Error-Image.jpeg';

/**
 * Transforms a NewsStory record into a semantic, accessible HTML string
 * with microdata date semantics, accessible button labeling, responsive media markup,
 * and robust default image fallback onError handling.
 */
export function createNewsCardHTML(story: NewsStory): string {
    const featuredClass = story.featured ? ' news-card--featured' : '';
    const datetimeStr = story.datetime || story.dateISO || '';

    const takeawayHTML = story.keyTakeaway ? `
        <div class="news-card__takeaway">
          <i class="bi bi-quote" aria-hidden="true"></i>
          <span>${story.keyTakeaway}</span>
        </div>` : '';

    const fullTextHTML = story.fullStory && story.fullStory.length > 0 ? `
        <div class="news-card__full-text">
          ${story.fullStory.map((paragraph) => `<p>${paragraph}</p>`).join('')}
        </div>` : '';

    const metadataHTML = story.metadata && story.metadata.length > 0 ? `
        <div class="news-card__metadata-grid">
          ${story.metadata.map((item) => `
            <div class="news-card__metadata-item">
              <i class="bi ${item.icon || 'bi-info-circle-fill'}" aria-hidden="true"></i>
              <div class="metadata-text">
                <span class="metadata-label">${item.label}</span>
                <strong class="metadata-value">${item.value}</strong>
              </div>
            </div>
          `).join('')}
        </div>` : '';

    const placeholder = getBlurredPlaceholder(story.imageSrc);

    return `
    <article class="event-card stagger-card news-card${featuredClass}" data-story-id="${story.id}" role="region" aria-label="${story.title}">
      <div class="news-card__media blurred-img-container">
        <img
          src="${placeholder}"
          alt=""
          aria-hidden="true"
          class="blurred-img-placeholder"
          loading="eager"
        />
        <img
          data-src="${story.imageSrc}"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 280'%3E%3C/svg%3E"
          alt="${story.imageAlt}"
          class="news-card__img blurred-img-full"
          loading="lazy"
          width="480"
          height="280"
          onload="this.classList.add('is-loaded'); this.parentElement?.classList.add('is-loaded');"
          onerror="this.onerror=null; this.src='${DEFAULT_FALLBACK_IMAGE}'; this.dataset.fallbackApplied='true'; this.classList.add('is-loaded'); this.parentElement?.classList.add('is-loaded');"
        />
        <span class="news-card__category-badge">${story.category}</span>
        ${story.featured ? '<span class="news-card__featured-badge"><i class="bi bi-star-fill" aria-hidden="true"></i> Featured Milestone</span>' : ''}
      </div>
      <div class="event-card__content news-card__content">
        <div class="news-card__meta">
          <time datetime="${datetimeStr}" class="news-card__date">
            <i class="bi bi-calendar3" aria-hidden="true"></i>
            <span>${story.date}</span>
          </time>
          <span class="news-card__divider" aria-hidden="true">·</span>
          <span class="news-card__read-time">
            <i class="bi bi-clock" aria-hidden="true"></i>
            <span>${story.readTime}</span>
          </span>
        </div>
        <h3 class="event-card__title news-card__title">
          <a href="${story.href}" class="news-card__title-link">${story.title}</a>
        </h3>
        <p class="event-card__desc news-card__desc">${story.summary}</p>

        <!-- Smooth Height Expandable Region (Reveals extended text & metadata without layout jumping) -->
        <div class="news-card__expandable" id="details-${story.id}" aria-hidden="true">
          <div class="news-card__expandable-inner">
            <div class="news-card__details">
              ${takeawayHTML}
              ${fullTextHTML}
              ${metadataHTML}
            </div>
          </div>
        </div>

        <div class="news-card__footer">
          <button
            type="button"
            class="news-card__expand-btn"
            aria-expanded="false"
            aria-controls="details-${story.id}"
            aria-label="Read full story details: ${story.title}"
          >
            <span class="expand-btn-text">Read Full Story</span>
            <i class="bi bi-chevron-down expand-btn-icon" aria-hidden="true"></i>
          </button>
          <a href="${story.href}" class="news-card__cta" aria-label="${story.ctaText}: ${story.title}">
            <span>${story.ctaText}</span>
            <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </article>`.trim();
}

/**
 * Creates a semantic HTMLElement representation of a NewsStory.
 */
export function createNewsCardElement(story: NewsStory): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = createNewsCardHTML(story);
    return template.content.firstElementChild as HTMLElement;
}

/**
 * Collapses a single news card, restoring its default aria attributes,
 * button text, and collapsed styling.
 */
export function collapseNewsCard(card: HTMLElement): void {
    card.classList.remove('is-expanded');

    const expandBtn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn');
    const expandable = card.querySelector<HTMLElement>('.news-card__expandable');
    const btnText = expandBtn?.querySelector<HTMLElement>('.expand-btn-text');
    const titleText = card.querySelector('.news-card__title')?.textContent?.trim() || 'story';

    if (expandBtn) {
        expandBtn.setAttribute('aria-expanded', 'false');
        expandBtn.setAttribute('aria-label', `Read full story details: ${titleText}`);
    }
    if (expandable) {
        expandable.setAttribute('aria-hidden', 'true');
    }
    if (btnText) {
        btnText.textContent = 'Read Full Story';
    }
}

/**
 * Expands a single news card to full width, updating its aria attributes,
 * button text, and expanded styling.
 */
export function expandNewsCard(card: HTMLElement): void {
    card.classList.add('is-expanded');

    const expandBtn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn');
    const expandable = card.querySelector<HTMLElement>('.news-card__expandable');
    const btnText = expandBtn?.querySelector<HTMLElement>('.expand-btn-text');
    const titleText = card.querySelector('.news-card__title')?.textContent?.trim() || 'story';

    if (expandBtn) {
        expandBtn.setAttribute('aria-expanded', 'true');
        expandBtn.setAttribute('aria-label', `Collapse story details: ${titleText}`);
    }
    if (expandable) {
        expandable.setAttribute('aria-hidden', 'false');
    }
    if (btnText) {
        btnText.textContent = 'Show Less';
    }
}

/**
 * Executes a smooth FLIP (First, Last, Invert, Play) transition
 * across all cards in the grid container so grid reorganization
 * glides seamlessly at 60fps without layout snapping.
 */
function animateGridFLIP(container: HTMLElement, updateDom: () => void): void {
    const prefersReducedMotion = typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));

    if (prefersReducedMotion || cards.length === 0 || typeof window === 'undefined') {
        updateDom();
        return;
    }

    // 1. First: Record starting positions
    const firstRects = new Map<HTMLElement, DOMRect>();
    cards.forEach((c) => {
        firstRects.set(c, c.getBoundingClientRect());
    });

    // 2. Perform DOM mutations
    updateDom();

    // 3. Last: Measure ending positions
    const lastRects = new Map<HTMLElement, DOMRect>();
    cards.forEach((c) => {
        lastRects.set(c, c.getBoundingClientRect());
    });

    // 4. Invert & Play
    cards.forEach((c) => {
        const first = firstRects.get(c);
        const last = lastRects.get(c);
        if (!first || !last) return;

        const dx = first.left - last.left;
        const dy = first.top - last.top;

        // Animate smoothly if there was a physical layout shift
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            c.style.transform = `translate(${dx}px, ${dy}px)`;
            c.style.transition = 'transform 0s';

            // Schedule frame to remove transform and animate smoothly
            requestAnimationFrame(() => {
                c.style.transition = 'transform 0.52s cubic-bezier(0.16, 1, 0.3, 1)';
                c.style.transform = '';

                const handleTransitionEnd = (evt: TransitionEvent) => {
                    if (evt.target === c && evt.propertyName === 'transform') {
                        c.style.transition = '';
                        c.removeEventListener('transitionend', handleTransitionEnd);
                    }
                };
                c.addEventListener('transitionend', handleTransitionEnd);
            });

            // Safeguard timeout to ensure inline styles are cleaned up
            window.setTimeout(() => {
                if (typeof window === 'undefined' || !window) return;
                if (c.style.transform === '') {
                    c.style.transition = '';
                }
            }, 600);
        }
    });
}

/**
 * Attaches smooth click toggle handlers to all news cards in the container.
 * When a user expands an article, it occupies the full width of the news grid
 * while returning all other articles to half-width. If an expanded article is
 * closed, the original grid layout is restored.
 */
export function initNewsCardInteractions(container: HTMLElement): void {
    const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));

    // Synchronize container class if any card is pre-expanded
    if (container.querySelector('.news-card.is-expanded')) {
        container.classList.add('has-expanded-card');
    }

    cards.forEach((card) => {
        if (card.dataset.interactionBound === 'true') return;
        card.dataset.interactionBound = 'true';

        const expandBtn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn');

        const toggleCard = (e?: Event) => {
            // Do not toggle if the user is clicking on an active hyperlink (<a> tag or inside one)
            if (e && e.target) {
                const target = e.target as HTMLElement;
                if (target.closest('a') && !target.closest('.news-card__expand-btn')) {
                    return;
                }
            }

            const isCurrentlyExpanded = card.classList.contains('is-expanded');

            animateGridFLIP(container, () => {
                if (isCurrentlyExpanded) {
                    // Collapse the selected article and restore original grid layout
                    collapseNewsCard(card);
                    container.classList.remove('has-expanded-card');
                } else {
                    // Transfer full-width state: collapse any other currently expanded article
                    cards.forEach((otherCard) => {
                        if (otherCard !== card && otherCard.classList.contains('is-expanded')) {
                            collapseNewsCard(otherCard);
                        }
                    });

                    // Expand the newly selected article across the full grid width
                    expandNewsCard(card);
                    container.classList.add('has-expanded-card');
                }
            });

            // When expanding, gently bring card into comfortable viewport alignment if off-screen
            if (!isCurrentlyExpanded && typeof window !== 'undefined') {
                const prefersReducedMotion = typeof window.matchMedia === 'function' &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                if (!prefersReducedMotion && typeof window.scrollTo === 'function') {
                    window.setTimeout(() => {
                        if (typeof window === 'undefined' || !window) return;
                        const rect = card.getBoundingClientRect();
                        // If card top is obscured under top nav (< 85px) or pushed too low (> 60% viewport)
                        if (rect.top < 85 || rect.top > (window.innerHeight || 800) * 0.6) {
                            const targetY = (window.scrollY || 0) + rect.top - 100;
                            window.scrollTo({
                                top: Math.max(0, targetY),
                                behavior: 'smooth',
                            });
                        }
                    }, 150);
                }
            }
        };

        // Click anywhere on the card header/content (except external links) toggles expansion
        card.addEventListener('click', toggleCard);

        // Click on the expand button explicitly toggles expansion
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCard(e);
            });
        }

        // Keyboard accessibility: trigger with Enter / Space when card or button is active
        card.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
                e.preventDefault();
                toggleCard(e);
            }
        });
    });
}

/**
 * Synchronously renders news stories into the target container and guarantees
 * seamless ScrollReveal animation handling across all viewports and state conditions.
 */
export function renderNewsStories(
    container: HTMLElement | null,
    stories: NewsStory[] = NEWS_STORIES,
    options: RenderNewsOptions = {}
): void {
    if (!container || !stories || stories.length === 0) return;

    // Check whether valid matching pre-rendered cards already exist in the container
    const existingCards = container.querySelectorAll('.news-card[data-story-id]');
    const shouldRefresh = options.forceRefresh || existingCards.length !== stories.length;

    if (shouldRefresh) {
        container.innerHTML = stories.map((story) => createNewsCardHTML(story)).join('\n');
        container.classList.remove('has-expanded-card');
    }

    const cards = Array.from(container.querySelectorAll<HTMLElement>('.event-card'));

    // Attach fallback onError handler to every news card image to safeguard against any broken URLs
    cards.forEach((card) => {
        const img = card.querySelector<HTMLImageElement>('.news-card__img');
        if (img) {
            img.addEventListener('error', () => {
                if (img.src !== DEFAULT_FALLBACK_IMAGE && !img.dataset.fallbackApplied) {
                    img.dataset.fallbackApplied = 'true';
                    img.src = DEFAULT_FALLBACK_IMAGE;
                }
            });
            // If image is already completed but failed before listener was attached
            if (img.complete && img.naturalWidth === 0 && !img.dataset.src && img.src && !img.src.startsWith('data:image/svg+xml')) {
                img.dataset.fallbackApplied = 'true';
                img.src = DEFAULT_FALLBACK_IMAGE;
            }
        }
    });

    // Wire up interactive smooth card height expansion handlers
    initNewsCardInteractions(container);

    // Wire up progressive blurred-image placeholders and Intersection Observer lazy loading
    initAllBlurredImages(container);
    initLazyImages(container);

    // Properly wire ScrollReveal animations
    if (options.scrollReveal) {
        options.scrollReveal.initStaggerGroup({
            container,
            itemSelector: '.event-card',
            baseDelay: 150,
            initialDelay: 60,
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px',
        });
    } else {
        // If container or section is already revealed (e.g. dynamic injection after page scroll),
        // reveal cards smoothly to prevent them staying at opacity: 0
        const isContainerRevealed = container.classList.contains('revealed') ||
            Boolean(container.closest('.section-padding')?.classList.contains('revealed'));
        const prefersReducedMotion = typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            cards.forEach((card) => card.classList.add('revealed'));
        } else if (isContainerRevealed) {
            cards.forEach((card, idx) => {
                if (!card.classList.contains('revealed')) {
                    window.setTimeout(() => {
                        card.classList.add('revealed');
                    }, idx * 100);
                }
            });
        }
    }

    if (options.onRendered) {
        options.onRendered(cards);
    }
}
