import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { TimelineStaggerEntrance } from '../../src/features/calendar/TimelineStaggerEntrance';
import { SchoolDatesTimeline } from '../../src/features/calendar/SchoolDatesTimeline';
import { renderTimelineMilestones } from '../../src/features/calendar/TimelineRenderer';

const TIMELINE_HTML_FIXTURE = `
<!DOCTYPE html>
<html>
<body>
  <section id="schoolDatesSection" class="school-dates-section" aria-labelledby="schoolDatesTitle">
    <div class="school-dates-container">
      <span class="section-label">Academic Calendar 2026/2027</span>
      <h2 class="section-title" id="schoolDatesTitle">Upcoming School Dates &amp; Milestones</h2>
      <div class="section-divider"></div>
      <p class="section-subtitle">Key academic markers guiding students, parents, and faculty.</p>

      <aside class="next-milestone-banner" id="nextMilestoneBanner" aria-label="Next Upcoming Milestone">
        <span class="banner-milestone-countdown">Loading...</span>
        <h3 class="banner-milestone-title">First Term Mid-Term Break</h3>
        <strong class="banner-milestone-date">26 Oct – 30 Oct 2026</strong>
        <p class="banner-milestone-desc">Scheduled instructional breather.</p>
      </aside>

      <div class="timeline-controls-bar">
        <div class="timeline-filter-tabs" role="tablist">
          <button class="timeline-tab-btn active" data-filter-type="term" data-timeline-filter="all" role="tab" aria-selected="true">
            All Milestones (14)
          </button>
        </div>

        <div class="timeline-secondary-controls">
          <fieldset class="timeline-category-filters">
            <legend class="timeline-category-legend visually-hidden">Event Categories</legend>
            <div class="timeline-checkbox-group">
              <label class="timeline-category-checkbox-label is-checked" for="categoryFilterAll">
                <input type="checkbox" id="categoryFilterAll" class="timeline-category-checkbox" data-timeline-filter="all" value="all" checked>
                <span class="timeline-custom-checkbox"><i class="bi bi-check2"></i></span>
                <span class="timeline-category-label-text">All Categories</span>
              </label>
              <label class="timeline-category-checkbox-label" for="categoryFilterExams">
                <input type="checkbox" id="categoryFilterExams" class="timeline-category-checkbox" data-timeline-filter="exam" value="exam">
                <span class="timeline-custom-checkbox"><i class="bi bi-check2"></i></span>
                <span class="timeline-category-label-text">Exams</span>
                <span class="timeline-category-count" data-category-count="exam">(4)</span>
              </label>
            </div>
          </fieldset>

          <div class="timeline-search-box">
            <i class="bi bi-search"></i>
            <input type="search" id="timelineSearchInput" class="timeline-search-input" placeholder="Search dates...">
          </div>
        </div>
      </div>

      <div class="timeline-track-container" id="timelineTrackContainer" tabindex="0" role="region">
        <div class="timeline-drag-hint" id="timelineDragHint">
          <i class="bi bi-arrows-expand-vertical"></i>
          <span>Drag or scroll to explore milestones</span>
        </div>
        <div class="timeline-track-line"></div>

        <div class="timeline-milestones-list" id="timelineMilestonesList"></div>

        <div class="timeline-disclosure-wrapper" id="timelineDisclosureWrapper">
          <button type="button" class="btn btn-outline timeline-disclosure-btn" id="timelineDisclosureBtn">
            <span class="timeline-disclosure-text">View Full Academic Calendar</span>
            <span class="timeline-disclosure-count">(10 more)</span>
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>

        <div class="timeline-empty-notice" id="timelineEmptyNotice">
          <h3>No milestones match your search</h3>
          <p id="timelineEmptyNoticeText">Try selecting "All Categories".</p>
          <button type="button" class="btn btn-outline btn-sm timeline-reset-filters-btn" id="timelineResetFiltersBtn">
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  </section>
</body>
</html>
`;

describe('TimelineStaggerEntrance - Staggered Visual Discovery Animation Controller', () => {
    let originalMatchMedia: any;

    beforeEach(() => {
        if (typeof document === 'undefined') {
            const dom = new JSDOM(TIMELINE_HTML_FIXTURE, {
                url: 'https://saintjosephcollege.vercel.app/',
                pretendToBeVisual: true,
            });
            (globalThis as any).document = dom.window.document;
            (globalThis as any).window = dom.window;
            (globalThis as any).HTMLElement = dom.window.HTMLElement;
        } else {
            document.body.innerHTML = TIMELINE_HTML_FIXTURE;
        }

        originalMatchMedia = (typeof window !== 'undefined') ? window.matchMedia : undefined;

        const listContainer = document.getElementById('timelineMilestonesList');
        renderTimelineMilestones(listContainer);
    });

    afterEach(() => {
        if (typeof window !== 'undefined' && originalMatchMedia !== undefined) {
            window.matchMedia = originalMatchMedia;
        }
        if (typeof document !== 'undefined') {
            document.body.innerHTML = '';
        }
        vi.restoreAllMocks();
    });

    it('initializes on .timeline-track-container and attaches marker class', () => {
        const container = document.getElementById('timelineTrackContainer')!;
        const stagger = new TimelineStaggerEntrance({
            container,
            baseDelay: 85,
        });

        expect(container.classList.contains('has-stagger-observer')).toBe(true);
        stagger.destroy();
        expect(container.classList.contains('has-stagger-observer')).toBe(false);
    });

    it('assigns progressive stagger delays to milestones when entered', () => {
        const container = document.getElementById('timelineTrackContainer')!;
        const stagger = new TimelineStaggerEntrance({
            container,
            baseDelay: 80,
            maxDelayCap: 400,
        });

        const milestones = Array.from(container.querySelectorAll<HTMLElement>('.timeline-milestone'));
        expect(milestones.length).toBe(14);

        // Enter 4 items sequentially
        stagger.enterMilestone(milestones[0], 0);
        stagger.enterMilestone(milestones[1], 1);
        stagger.enterMilestone(milestones[2], 2);
        stagger.enterMilestone(milestones[3], 3);

        expect(milestones[0].style.getPropertyValue('--milestone-delay')).toBe('0ms');
        expect(milestones[0].classList.contains('is-entered')).toBe(true);
        expect(milestones[0].classList.contains('revealed')).toBe(true);

        expect(milestones[1].style.getPropertyValue('--milestone-delay')).toBe('80ms');
        expect(milestones[1].classList.contains('is-entered')).toBe(true);

        expect(milestones[2].style.getPropertyValue('--milestone-delay')).toBe('160ms');
        expect(milestones[2].classList.contains('is-entered')).toBe(true);

        expect(milestones[3].style.getPropertyValue('--milestone-delay')).toBe('240ms');
        expect(milestones[3].classList.contains('is-entered')).toBe(true);

        stagger.destroy();
    });

    it('enforces maximum delay cap to prevent excessive waiting times on long lists', () => {
        const container = document.getElementById('timelineTrackContainer')!;
        const stagger = new TimelineStaggerEntrance({
            container,
            baseDelay: 100,
            maxDelayCap: 350,
        });

        const milestones = Array.from(container.querySelectorAll<HTMLElement>('.timeline-milestone'));
        stagger.enterMilestone(milestones[5], 5); // 5 * 100 = 500ms > cap (350ms)

        expect(milestones[5].style.getPropertyValue('--milestone-delay')).toBe('350ms');
        stagger.destroy();
    });

    it('reveals all items instantly when prefersReducedMotion is active', () => {
        const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('prefers-reduced-motion: reduce'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        window.matchMedia = matchMediaMock;

        const container = document.getElementById('timelineTrackContainer')!;
        const stagger = new TimelineStaggerEntrance({ container });

        const milestones = Array.from(container.querySelectorAll<HTMLElement>('.timeline-milestone:not(.timeline-hidden)'));
        milestones.forEach((item) => {
            expect(item.classList.contains('is-entered')).toBe(true);
            expect(item.classList.contains('revealed')).toBe(true);
            expect(item.style.getPropertyValue('--milestone-delay')).toBe('');
        });

        stagger.destroy();
    });

    it('integrates seamlessly with SchoolDatesTimeline controller lifecycle', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        const staggerController = timeline.getStaggerEntrance();

        expect(staggerController).not.toBeNull();
        const container = document.getElementById('timelineTrackContainer')!;
        expect(container.classList.contains('has-stagger-observer')).toBe(true);

        // Filter by exams
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;
        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));

        const visibleMilestones = Array.from(container.querySelectorAll<HTMLElement>('.timeline-milestone:not(.timeline-hidden)'));
        expect(visibleMilestones.length).toBe(4);
    });

    it('reveals all milestones when revealAllInstantly() is called', () => {
        const container = document.getElementById('timelineTrackContainer')!;
        const stagger = new TimelineStaggerEntrance({ container });

        stagger.revealAllInstantly();

        const visibleMilestones = Array.from(container.querySelectorAll<HTMLElement>('.timeline-milestone:not(.timeline-hidden)'));
        visibleMilestones.forEach((item) => {
            expect(item.classList.contains('is-entered')).toBe(true);
        });

        stagger.destroy();
    });
});
