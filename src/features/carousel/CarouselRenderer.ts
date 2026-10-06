/**
 * ============================================================================
 * SJCCC – Carousel Slide Renderer
 * Generates the 22 carousel slides markup into #carouselTrack synchronously
 * prior to Carousel controller instantiation.
 * ============================================================================
 */

import { type CampusSlide, CAMPUS_SLIDES } from '../../data/campusSlides.ts';
import { getBlurredPlaceholder } from '../../data/imagePlaceholders.ts';

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
        const placeholderSrc = getBlurredPlaceholder(slide.imageSrc);

        return `
            <div class="carousel-slide${isActive}" role="group" aria-roledescription="slide" aria-label="${slideNum} of ${total}: ${slide.title}" data-short-caption="${slide.shortCaption}" id="${slide.id}">
              <div class="carousel-image-container blurred-img-container">
                <img alt="" aria-hidden="true" class="carousel-image-placeholder blurred-img-placeholder" src="${placeholderSrc}" loading="eager">
                <img alt="${slide.altText}" class="carousel-image blurred-img-full" loading="lazy" src="${slide.imageSrc}" onload="this.classList.add('is-loaded'); this.parentElement?.classList.add('is-loaded');" onerror="this.onerror=null; this.src='/assets/Error-Image.jpeg'; this.dataset.fallbackApplied='true'; this.classList.add('is-loaded'); this.parentElement?.classList.add('is-loaded');">
              </div>
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
