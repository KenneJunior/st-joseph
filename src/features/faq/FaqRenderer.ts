/**
 * ============================================================================
 * SJCCC – Frequently Asked Questions (FAQ) Renderer
 * Generates the 15 FAQ accordion items into #faqAccordion synchronously
 * prior to FaqSection controller instantiation.
 * ============================================================================
 */

import { type FaqItem, FAQ_ITEMS } from '../../data/faqData.ts';

export function renderFaqItems(
    accordionEl: HTMLElement | null,
    items: readonly FaqItem[] = FAQ_ITEMS
): void {
    if (!accordionEl) {
        console.warn('[FaqRenderer] Target #faqAccordion element not found in DOM.');
        return;
    }

    const markup = items.map((faq) => {
        return `
          <article class="faq-item" id="${faq.id}" data-category="${faq.category}">
            <button type="button" class="faq-question-btn" aria-expanded="false" aria-controls="${faq.id}-answer" id="${faq.id}-btn">
              <div class="faq-question-meta">
                <span class="faq-category-tag"><i class="bi ${faq.categoryIcon}"></i> ${faq.categoryTag}</span>
                <h3 class="faq-question-title">${faq.question}</h3>
              </div>
              <span class="faq-toggle-icon" aria-hidden="true"><i class="bi bi-plus-lg"></i></span>
            </button>
            <div class="faq-answer-content" id="${faq.id}-answer" role="region" aria-labelledby="${faq.id}-btn" hidden>
              <div class="faq-answer-inner">
                ${faq.answerHtml}
              </div>
            </div>
          </article>`;
    }).join('');

    accordionEl.innerHTML = markup;
}
