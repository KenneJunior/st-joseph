/**
 * ============================================================================
 * SJCCC – Testimonials HTML Component Renderer
 * Dynamically renders the mobile-first carousel showcase with interactive filter
 * tabs, touch-navigable card stage, position counter, and pagination dots.
 * ============================================================================
 */

import {
    TESTIMONIALS_DATA,
    TESTIMONIAL_FILTER_CATEGORIES,
    type TestimonialItem,
} from '../../data/testimonialsData.ts';

export function renderTestimonialsSection(container: HTMLElement | null): void {
    if (!container) return;

    // Calculate category counts
    const counts: Record<string, number> = {
        all: TESTIMONIALS_DATA.length,
        students: TESTIMONIALS_DATA.filter((t) => t.category === 'students').length,
        faculty: TESTIMONIALS_DATA.filter((t) => t.category === 'faculty').length,
        parents: TESTIMONIALS_DATA.filter((t) => t.category === 'parents').length,
        alumni: TESTIMONIALS_DATA.filter((t) => t.category === 'alumni').length,
    };

    container.innerHTML = `
        <div class="testimonials-header text-center">
            <span class="section-label">
                <i class="bi bi-chat-quote-fill me-1" aria-hidden="true"></i> Community Voices
            </span>
            <h2 class="section-title">What Our Family Says</h2>
            <p class="section-subtitle">
                Authentic reflections and lived experiences from the students, educators, and parents who make St. Joseph's
                Catholic Comprehensive College a sanctuary of moral discipline, academic excellence, and Christian virtue.
            </p>
            <div class="section-divider"></div>
        </div>

        <!-- Interactive Role Filter Tabs -->
        <div class="testimonials-filter-bar" role="tablist" aria-label="Filter testimonials by community role">
            <div class="testimonials-filter-glider" id="testimonialsFilterGlider" aria-hidden="true"></div>
            ${TESTIMONIAL_FILTER_CATEGORIES.map(
                (cat, idx) => `
                <button type="button"
                    class="testimonial-filter-btn ${idx === 0 ? 'active' : ''}"
                    role="tab"
                    id="tab-${cat.id}"
                    data-filter="${cat.id}"
                    aria-selected="${idx === 0 ? 'true' : 'false'}"
                    aria-controls="testimonialsGrid"
                    tabindex="${idx === 0 ? '0' : '-1'}">
                    <i class="bi ${cat.iconClass}" aria-hidden="true"></i>
                    <span class="filter-label">${cat.label}</span>
                    <span class="filter-count" aria-label="${counts[cat.id]} stories">${counts[cat.id]}</span>
                </button>
            `
            ).join('')}
        </div>

        <!-- Testimonials Carousel Showcase -->
        <div class="testimonials-carousel" role="region" aria-roledescription="carousel" aria-label="Community Testimonials">
            
            <!-- Viewport Stage with Hardware Accelerated Track -->
            <div class="testimonials-stage" id="testimonialsStage" aria-live="polite">
                <div class="testimonials-grid testimonials-track" id="testimonialsGrid" role="group">
                    ${TESTIMONIALS_DATA.map((item, idx) => renderCardHtml(item, idx)).join('')}
                </div>
            </div>

            <!-- Carousel Navigation Controls & Indicator -->
            <div class="testimonials-carousel-controls">
                <button type="button"
                    class="testimonial-nav-btn testimonial-prev-btn"
                    id="testimonialsPrevBtn"
                    aria-label="Previous testimonial"
                    title="Previous testimonial">
                    <i class="bi bi-chevron-left" aria-hidden="true"></i>
                </button>

                <div class="testimonials-counter" id="testimonialsCounter" aria-live="polite" aria-atomic="true">
                    <span class="counter-current" id="testimonialsCurrentIndex">1</span>
                    <span class="counter-divider">of</span>
                    <span class="counter-total" id="testimonialsTotalCount">${TESTIMONIALS_DATA.length}</span>
                </div>

                <div class="testimonials-pagination-dots" id="testimonialsPagination" role="tablist" aria-label="Select testimonial">
                    <span class="testimonial-pagination-glider" id="testimonialPaginationGlider" aria-hidden="true" data-target-index="0"></span>
                    ${TESTIMONIALS_DATA.map((item, idx) => `
                        <button type="button"
                            class="testimonial-dot ${idx === 0 ? 'is-active' : ''}"
                            role="tab"
                            aria-selected="${idx === 0 ? 'true' : 'false'}"
                            aria-label="Testimonial ${idx + 1}: ${item.name}"
                            data-index="${idx}"
                            tabindex="${idx === 0 ? '0' : '-1'}">
                        </button>
                    `).join('')}
                </div>

                <button type="button"
                    class="testimonial-nav-btn testimonial-next-btn"
                    id="testimonialsNextBtn"
                    aria-label="Next testimonial"
                    title="Next testimonial">
                    <i class="bi bi-chevron-right" aria-hidden="true"></i>
                </button>
            </div>
        </div>

        <!-- Trust & Verification Footer Strip -->
        <div class="testimonials-trust-strip">
            <div class="trust-pill">
                <i class="bi bi-shield-check" aria-hidden="true"></i>
                <span>100% Authentic Community Voices</span>
            </div>
            <div class="trust-divider" aria-hidden="true">·</div>
            <div class="trust-pill">
                <i class="bi bi-mortarboard" aria-hidden="true"></i>
                <span>Registered with Cameroon GCE Board</span>
            </div>
            <div class="trust-divider" aria-hidden="true">·</div>
            <div class="trust-pill">
                <i class="bi bi-heart-pulse" aria-hidden="true"></i>
                <span>BEPHA Mutual Healthcare Protected</span>
            </div>
        </div>
    `;
}

function renderCardHtml(item: TestimonialItem, index: number): string {
    const delayClass = index === 0 ? '' : `reveal-delay-${Math.min(index, 3)}`;
    const activeClass = index === 0 ? 'is-active' : '';

    return `
        <article class="testimonial-card ${activeClass} reveal ${delayClass}"
            data-category="${item.category}"
            data-id="${item.id}"
            data-index="${index}"
            tabindex="${index === 0 ? '0' : '-1'}"
            aria-hidden="${index === 0 ? 'false' : 'true'}"
            aria-label="Testimonial by ${item.name}, ${item.role}">
            
            <!-- Interactive Cursor Dynamic Spotlight -->
            <div class="testimonial-spotlight" aria-hidden="true"></div>

            <!-- Card Header: Category & Ratings -->
            <div class="testimonial-card__header">
                <span class="testimonial-badge" data-category="${item.category}">
                    <i class="bi bi-award-fill me-1" aria-hidden="true"></i>
                    ${item.categoryLabel}
                </span>
                <div class="testimonial-rating" aria-label="5 out of 5 stars rating">
                    <i class="bi bi-star-fill" aria-hidden="true"></i>
                    <i class="bi bi-star-fill" aria-hidden="true"></i>
                    <i class="bi bi-star-fill" aria-hidden="true"></i>
                    <i class="bi bi-star-fill" aria-hidden="true"></i>
                    <i class="bi bi-star-fill" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Stylized Quote Mark Watermark -->
            <div class="testimonial-watermark" aria-hidden="true">
                <i class="bi bi-quote"></i>
            </div>

            <!-- Highlight Kicker -->
            <div class="testimonial-highlight-chip">
                <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>
                <span>${item.highlight}</span>
            </div>

            <!-- Main Quote -->
            <blockquote class="testimonial-quote-body">
                <p>“${item.quote}”</p>
            </blockquote>

            <!-- Expandable Perspective Drawer -->
            <div class="testimonial-expansion" id="expansion-${item.id}" hidden>
                <div class="testimonial-expansion__inner">
                    <div class="expansion-accent-line"></div>
                    <p class="expansion-story">${item.fullStory}</p>
                    <div class="expansion-meta">
                        <span class="expansion-affiliation">
                            <i class="bi bi-geo-alt-fill me-1" aria-hidden="true"></i> SJCCC Mbengwi Campus
                        </span>
                        <span class="expansion-session">2026/2027 Academic Year</span>
                    </div>
                </div>
            </div>

            <!-- Card Footer: Author Profile & Interactive Actions -->
            <div class="testimonial-card__footer">
                <div class="testimonial-profile">
                    <div class="testimonial-avatar-wrapper">
                        <img class="testimonial-avatar"
                            src="${item.avatarUrl}"
                            alt="${item.avatarAlt}"
                            width="64"
                            height="64"
                            loading="lazy"
                            onerror="this.onerror=null; this.src='/assets/icons/icon.svg'; this.dataset.fallbackApplied='true';">
                        <span class="testimonial-verified-badge" title="Verified College Member" aria-label="Verified">
                            <i class="bi bi-check-lg" aria-hidden="true"></i>
                        </span>
                    </div>
                    <div class="testimonial-meta">
                        <h3 class="testimonial-author">${item.name}</h3>
                        <div class="testimonial-role">${item.role}</div>
                        <div class="testimonial-virtue">
                            <i class="bi bi-shield-fill-check me-1" aria-hidden="true"></i>
                            <span>${item.virtue}</span>
                        </div>
                    </div>
                </div>

                <!-- Interactive Story & Share Action Buttons -->
                <div class="testimonial-actions">
                    <button type="button"
                        class="testimonial-expand-btn"
                        data-target="expansion-${item.id}"
                        aria-expanded="false"
                        aria-controls="expansion-${item.id}"
                        aria-label="Read full context for ${item.name}">
                        <span class="btn-text">Full Perspective</span>
                        <i class="bi bi-chevron-down toggle-icon" aria-hidden="true"></i>
                    </button>
                    <button type="button"
                        class="testimonial-copy-btn"
                        data-quote="“${item.quote}” — ${item.name}, ${item.role} (SJCCC Mbengwi)"
                        title="Copy Quote"
                        aria-label="Copy quote to clipboard">
                        <i class="bi bi-link-45deg" aria-hidden="true"></i>
                        <span class="copy-feedback" aria-hidden="true">Copied!</span>
                    </button>
                </div>
            </div>
        </article>
    `;
}
