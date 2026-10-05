/**
 * ============================================================================
 * SJCCC – Institutional News Stories Renderer
 * Transforms canonical newsStories into semantic, accessible, crawlable
 * <article> elements with premium card styling and comprehensive ScrollReveal handling.
 * ============================================================================
 */

import { NEWS_STORIES, type NewsStory } from '../../data/newsStories.ts';
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

    return `
    <article class="event-card stagger-card news-card${featuredClass}" data-story-id="${story.id}" role="region" aria-label="${story.title}">
      <div class="news-card__media">
        <img
          src="${story.imageSrc}"
          alt="${story.imageAlt}"
          class="news-card__img"
          loading="lazy"
          width="480"
          height="280"
          onerror="this.onerror=null; this.src='${DEFAULT_FALLBACK_IMAGE}'; this.dataset.fallbackApplied='true';"
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
 * Attaches smooth click toggle handlers to all news cards in the container.
 * Clicking either the card body or the dedicated expand button toggles
 * the smooth CSS Grid height transition without layout jumping.
 */
export function initNewsCardInteractions(container: HTMLElement): void {
    const cards = Array.from(container.querySelectorAll<HTMLElement>('.news-card'));

    cards.forEach((card) => {
        if (card.dataset.interactionBound === 'true') return;
        card.dataset.interactionBound = 'true';

        const expandBtn = card.querySelector<HTMLButtonElement>('.news-card__expand-btn');
        const expandable = card.querySelector<HTMLElement>('.news-card__expandable');
        const btnText = expandBtn?.querySelector<HTMLElement>('.expand-btn-text');
        const titleText = card.querySelector('.news-card__title')?.textContent?.trim() || 'story';

        const toggleCard = (e?: Event) => {
            // Do not toggle if the user is clicking on an active hyperlink (<a> tag or inside one)
            if (e && e.target) {
                const target = e.target as HTMLElement;
                if (target.closest('a') && !target.closest('.news-card__expand-btn')) {
                    return;
                }
            }

            const isExpanded = card.classList.contains('is-expanded');
            const nextState = !isExpanded;

            if (nextState) {
                card.classList.add('is-expanded');
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
            } else {
                card.classList.remove('is-expanded');
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
        };

        // Click anywhere on the card header/content (except external links) toggles expansion
        card.addEventListener('click', toggleCard);

        // Click on the expand button explicitly toggles expansion
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCard();
            });
        }

        // Keyboard accessibility: trigger with Enter / Space when card or button is active
        card.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
                e.preventDefault();
                toggleCard();
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
            if (img.complete && img.naturalWidth === 0) {
                img.dataset.fallbackApplied = 'true';
                img.src = DEFAULT_FALLBACK_IMAGE;
            }
        }
    });

    // Wire up interactive smooth card height expansion handlers
    initNewsCardInteractions(container);

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
