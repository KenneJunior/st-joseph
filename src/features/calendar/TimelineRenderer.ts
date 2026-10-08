/**
 * ============================================================================
 * SJCCC – Academic Calendar Timeline Renderer
 * Generates the 14 academic milestone cards into #timelineMilestonesList synchronously
 * prior to SchoolDatesTimeline controller instantiation.
 * ============================================================================
 */

import { type AcademicMilestone, ACADEMIC_MILESTONES_2026_2027 } from '../../data/academicCalendar.ts';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

export function renderTimelineMilestones(
    containerEl: HTMLElement | null,
    milestones: readonly AcademicMilestone[] = ACADEMIC_MILESTONES_2026_2027
): void {
    if (!containerEl) {
        console.warn('[TimelineRenderer] Target timeline milestones container not found in DOM.');
        return;
    }

    const markup = milestones.map((m) => {
        const day = String(m.startDate.getUTCDate()).padStart(2, '0');
        const month = MONTH_NAMES[m.startDate.getUTCMonth()];
        const year = String(m.startDate.getUTCFullYear());

        const markerIcon = m.markerIcon || (
            m.category === 'resumption' ? 'bi-door-open-fill' :
            m.category === 'exam' ? 'bi-pencil-square' :
            m.category === 'break' ? 'bi-pause-circle-fill' : 'bi-mortarboard-fill'
        );

        const markerTitle = m.markerTitle || m.title;

        const timeIcon = (m.timeOrDuration && (
            m.timeOrDuration.includes('Duration') ||
            m.timeOrDuration.includes('Weeks') ||
            m.timeOrDuration.includes('Days')
        )) ? 'bi-calendar-range' : 'bi-clock';

        const statusKickerHtml = m.statusKicker
            ? `<span class="timeline-status-kicker">${m.statusKicker}</span>`
            : '';

        const highlightsHtml = m.highlights && m.highlights.length > 0
            ? `<ul class="timeline-highlights-list">
                ${m.highlights.map(h => `<li><i class="bi bi-check-circle-fill"></i> ${h}</li>`).join('')}
              </ul>`
            : '';

        const noticeHtml = m.cardNotice
            ? `<span class="timeline-card-notice">${m.cardNotice}</span>`
            : '';

        return `
            <article class="timeline-milestone reveal" data-milestone-id="${m.id}" data-term="${m.term}" data-category="${m.category}" id="${m.id}">
              <div class="timeline-date-column">
                <div class="timeline-date-badge">
                  <span class="timeline-day-num">${day}</span>
                  <span class="timeline-month-txt">${month}</span>
                  <span class="timeline-year-txt">${year}</span>
                </div>
                <div class="timeline-node-marker" title="${markerTitle}">
                  <i class="bi ${markerIcon}"></i>
                </div>
              </div>
              <div class="timeline-card">
                <div class="timeline-card-header">
                  <div class="timeline-meta-breadcrumbs">
                    <span class="timeline-term-tag">${m.termLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span class="timeline-category-tag">${m.categoryLabel}</span>
                  </div>
                  ${statusKickerHtml}
                </div>
                <h3 class="timeline-card-title">${m.title}</h3>
                <div class="timeline-card-date-location">
                  <span class="timeline-mobile-date-text"><i class="bi bi-calendar3"></i> ${m.dateText}</span>
                  ${m.timeOrDuration ? `<span><i class="bi ${timeIcon}"></i> ${m.timeOrDuration}</span>` : ''}
                  <span><i class="bi bi-geo-alt-fill"></i> ${m.location}</span>
                </div>
                <p class="timeline-card-desc">
                  ${m.description}
                </p>
                ${highlightsHtml}
                <div class="timeline-card-footer">
                  <button type="button" class="btn btn-outline btn-calendar-action" data-milestone-id="${m.id}"
                    aria-haspopup="dialog"
                    aria-expanded="false"
                    title="Add ${m.title} to Calendar"
                    toolDescription="Choose Google Calendar, Outlook, or download calendar file (.ics).">
                    <i class="bi bi-calendar-plus" aria-hidden="true"></i>
                    <span>Add to Calendar</span>
                  </button>
                  ${noticeHtml}
                </div>
              </div>
            </article>`;
    }).join('');

    containerEl.innerHTML = markup;
}
