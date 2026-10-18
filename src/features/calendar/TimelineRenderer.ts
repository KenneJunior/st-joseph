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

    const now = new Date();
    const nowMs = now.getTime();

    // Defensive chronological sort on a cloned array using canonical local dates
    const sortedMilestones = [...milestones].sort((a, b) => {
        const cmp = a.localStartDate.localeCompare(b.localStartDate);
        if (cmp !== 0) return cmp;
        const endCmp = a.localEndDate.localeCompare(b.localEndDate);
        if (endCmp !== 0) return endCmp;
        return a.id.localeCompare(b.id);
    });

    const markup = sortedMilestones.map((m) => {
        const [yearStr, monthStr, dayStr] = m.localStartDate.split('-');
        const day = dayStr;
        const monthIndex = parseInt(monthStr, 10) - 1;
        const month = MONTH_NAMES[monthIndex] || 'JAN';
        const year = yearStr;

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

        // Dynamic academic countdown initial calculation
        const startMs = m.startDate.getTime();
        const endMs = m.endDate.getTime();
        let countdownStatus: 'upcoming' | 'active' | 'concluded' = 'upcoming';
        let countdownCompactText = '';
        let countdownStatusBadge = '';
        let diffMs = 0;
        let progressPct = 0;

        if (nowMs < startMs) {
            countdownStatus = 'upcoming';
            diffMs = startMs - nowMs;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            countdownCompactText = diffDays > 0 ? `Starts in ${diffDays} day${diffDays === 1 ? '' : 's'}` : 'Starts today';
            countdownStatusBadge = 'Upcoming Date';
            progressPct = Math.min(95, Math.max(10, 100 - Math.min(100, Math.round((diffDays / 90) * 100))));
        } else if (nowMs >= startMs && nowMs <= endMs) {
            countdownStatus = 'active';
            diffMs = endMs - nowMs;
            countdownCompactText = 'Happening Now';
            countdownStatusBadge = 'Active Session';
            const totalSpan = Math.max(1, endMs - startMs);
            progressPct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / totalSpan) * 100)));
        } else {
            countdownStatus = 'concluded';
            diffMs = 0;
            countdownCompactText = 'Concluded';
            countdownStatusBadge = 'Academic Record';
            progressPct = 100;
        }

        const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const hours = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
        const mins = Math.max(0, Math.floor((diffMs / (1000 * 60)) % 60));
        const secs = Math.max(0, Math.floor((diffMs / 1000) % 60));

        const upcomingCardClass = countdownStatus === 'upcoming' ? ' is-upcoming-date' : countdownStatus === 'active' ? ' is-active-date' : ' is-past-date';

        const countdownVisualHtml = `
            <div class="timeline-countdown-visual${upcomingCardClass}" data-milestone-id="${m.id}" data-status="${countdownStatus}">
              <!-- Resting Compact Pill Indicator -->
              <div class="countdown-resting-badge" tabindex="0" role="button" aria-expanded="false" aria-label="Toggle live academic countdown for ${m.title}">
                <span class="countdown-pulse-beacon" aria-hidden="true"></span>
                <span class="countdown-resting-label">
                  <i class="bi ${countdownStatus === 'active' ? 'bi-broadcast-pin text-success' : countdownStatus === 'upcoming' ? 'bi-stopwatch text-accent' : 'bi-check-circle'} me-1" aria-hidden="true"></i>
                  <span class="countdown-live-label">${countdownCompactText}</span>
                </span>
                <span class="countdown-hover-cue" aria-hidden="true">
                  <span class="cue-text">Live Countdown</span>
                  <i class="bi bi-chevron-right ms-1"></i>
                </span>
              </div>

              <!-- Interactive Card-Based Format (reveals smoothly on hover, focus, or tap) -->
              <div class="countdown-interactive-card" role="region" aria-label="Academic countdown card for ${m.title}">
                <div class="countdown-card-header">
                  <div class="countdown-card-title-group">
                    <i class="bi bi-clock-history text-accent me-1" aria-hidden="true"></i>
                    <strong class="countdown-card-heading">Academic Countdown</strong>
                  </div>
                  <span class="countdown-card-status-badge status-${countdownStatus}">${countdownStatusBadge}</span>
                </div>

                <div class="countdown-digits-grid">
                  <div class="countdown-digit-box">
                    <span class="countdown-digit countdown-digit--days">${String(days).padStart(2, '0')}</span>
                    <span class="countdown-digit-sub">DAYS</span>
                  </div>
                  <span class="countdown-sep" aria-hidden="true">:</span>
                  <div class="countdown-digit-box">
                    <span class="countdown-digit countdown-digit--hours">${String(hours).padStart(2, '0')}</span>
                    <span class="countdown-digit-sub">HRS</span>
                  </div>
                  <span class="countdown-sep" aria-hidden="true">:</span>
                  <div class="countdown-digit-box">
                    <span class="countdown-digit countdown-digit--mins">${String(mins).padStart(2, '0')}</span>
                    <span class="countdown-digit-sub">MIN</span>
                  </div>
                  <span class="countdown-sep" aria-hidden="true">:</span>
                  <div class="countdown-digit-box">
                    <span class="countdown-digit countdown-digit--secs">${String(secs).padStart(2, '0')}</span>
                    <span class="countdown-digit-sub">SEC</span>
                  </div>
                </div>

                <div class="countdown-timeline-meter">
                  <div class="countdown-timeline-bar" style="width: ${progressPct}%;" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>

                <div class="countdown-card-footer">
                  <div class="countdown-target-info">
                    <i class="bi bi-calendar-event me-1 text-accent" aria-hidden="true"></i>
                    <span class="countdown-target-datetxt">${m.dateText}</span>
                  </div>
                  <button type="button" class="btn-countdown-quick-add" data-milestone-id="${m.id}" title="Toggle 24h reminder for ${m.title}">
                    <i class="bi bi-bell-plus-fill me-1" aria-hidden="true"></i>
                    <span>Set Reminder</span>
                  </button>
                </div>
              </div>
            </div>`;

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
                ${countdownVisualHtml}
                <p class="timeline-card-desc">
                  ${m.description}
                </p>
                ${highlightsHtml}
                <div class="timeline-card-footer">
                  <div class="timeline-footer-actions">
                    <button type="button" class="btn btn-outline btn-calendar-action" data-milestone-id="${m.id}"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      title="Add ${m.title} to Calendar"
                      toolDescription="Choose Google Calendar, Outlook, or download calendar file (.ics).">
                      <i class="bi bi-calendar-plus" aria-hidden="true"></i>
                      <span>Add to Calendar</span>
                    </button>
                    <label class="timeline-remind-me-label" for="remind-me-${m.id}" title="Notify me 24 hours before ${m.title}">
                      <input type="checkbox"
                        id="remind-me-${m.id}"
                        class="timeline-remind-me-checkbox"
                        data-milestone-id="${m.id}"
                        aria-label="Remind me 24 hours before ${m.title}">
                      <span class="timeline-remind-me-custom-check" aria-hidden="true">
                        <i class="bi bi-check2"></i>
                      </span>
                      <span class="timeline-remind-me-label-text">
                        <i class="bi bi-bell-fill timeline-remind-bell-icon" aria-hidden="true"></i>
                        <span>Remind me</span>
                      </span>
                    </label>
                  </div>
                  ${noticeHtml}
                </div>
              </div>
            </article>`;
    }).join('');

    containerEl.innerHTML = markup;
}
