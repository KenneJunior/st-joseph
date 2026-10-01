/**
 * ============================================================================
 * SJCCC – Carousel Slide Renderer
 * Generates the 22 carousel slides markup into #carouselTrack synchronously
 * prior to Carousel controller instantiation.
 * ============================================================================
 */

import { type CampusSlide, CAMPUS_SLIDES } from '../../data/campusSlides.ts';

export function renderCarouselSlides(
    trackEl: HTMLElement | null,
    slides: readonly CampusSlide[] = CAMPUS_SLIDES
): void {
    if (!trackEl) {
        console.warn('[CarouselRenderer] Target #carouselTrack element not found in DOM.');
        return;
    }

    const total = slides.length;
    const markup = slides.map((slide, index) => {
        const isActive = index === 0 ? ' active' : '';
        const slideNum = index + 1;

        return `
            <div class="carousel-slide${isActive}" role="group" aria-roledescription="slide" aria-label="${slideNum} of ${total}: ${slide.title}" data-short-caption="${slide.shortCaption}" id="${slide.id}">
              <img alt="${slide.altText}" class="carousel-image" loading="lazy" src="${slide.imageSrc}">
              <div class="carousel-overlay"></div>
              <div class="carousel-caption">
                <span class="carousel-kicker">${slide.kicker}</span>
                <h3 class="carousel-title">${slide.title}</h3>
                <p class="carousel-text">${slide.description}</p>
              </div>
            </div>`;
    }).join('');

    trackEl.innerHTML = markup;
}
