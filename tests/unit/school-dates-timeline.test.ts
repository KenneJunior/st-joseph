import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { SchoolDatesTimeline } from '../../src/features/calendar/SchoolDatesTimeline';
import { renderTimelineMilestones } from '../../src/features/calendar/TimelineRenderer';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../src/data/academicCalendar';

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
        <div class="timeline-filter-tabs" role="tablist" aria-label="Filter timeline by academic term">
          <button class="timeline-tab-btn active" data-filter-type="term" data-timeline-filter="all" role="tab" aria-selected="true">
            All Milestones (14)
          </button>
          <button class="timeline-tab-btn" data-filter-type="term" data-timeline-filter="term-1" role="tab" aria-selected="false">
            Term 1
          </button>
          <button class="timeline-tab-btn" data-filter-type="term" data-timeline-filter="term-2" role="tab" aria-selected="false">
            Term 2
          </button>
          <button class="timeline-tab-btn" data-filter-type="term" data-timeline-filter="term-3" role="tab" aria-selected="false">
            Term 3
          </button>
        </div>

        <div class="timeline-secondary-controls">
          <fieldset class="timeline-category-filters" role="group" aria-label="Filter timeline by event category">
            <legend class="timeline-category-legend visually-hidden">Event Categories</legend>
            <div class="timeline-checkbox-group">
              <label class="timeline-category-checkbox-label is-checked" for="categoryFilterAll">
                <input type="checkbox" id="categoryFilterAll" class="timeline-category-checkbox" data-timeline-filter="all" value="all" checked>
                <span class="timeline-custom-checkbox" aria-hidden="true">
                  <i class="bi bi-check2"></i>
                </span>
                <span class="timeline-category-label-text">All Categories</span>
              </label>

              <label class="timeline-category-checkbox-label" for="categoryFilterExams">
                <input type="checkbox" id="categoryFilterExams" class="timeline-category-checkbox" data-timeline-filter="exam" value="exam">
                <span class="timeline-custom-checkbox" aria-hidden="true">
                  <i class="bi bi-check2"></i>
                </span>
                <span class="timeline-category-label-text">Exams</span>
                <span class="timeline-category-count" data-category-count="exam">(4)</span>
              </label>

              <label class="timeline-category-checkbox-label" for="categoryFilterHolidays">
                <input type="checkbox" id="categoryFilterHolidays" class="timeline-category-checkbox" data-timeline-filter="break" value="break">
                <span class="timeline-custom-checkbox" aria-hidden="true">
                  <i class="bi bi-check2"></i>
                </span>
                <span class="timeline-category-label-text">Holidays</span>
                <span class="timeline-category-count" data-category-count="break">(3)</span>
              </label>

              <label class="timeline-category-checkbox-label" for="categoryFilterReligious">
                <input type="checkbox" id="categoryFilterReligious" class="timeline-category-checkbox" data-timeline-filter="spiritual" value="spiritual">
                <span class="timeline-custom-checkbox" aria-hidden="true">
                  <i class="bi bi-check2"></i>
                </span>
                <span class="timeline-category-label-text">Religious</span>
                <span class="timeline-category-count" data-category-count="spiritual">(3)</span>
              </label>

              <label class="timeline-category-checkbox-label" for="categoryFilterResumptions">
                <input type="checkbox" id="categoryFilterResumptions" class="timeline-category-checkbox" data-timeline-filter="resumption" value="resumption">
                <span class="timeline-custom-checkbox" aria-hidden="true">
                  <i class="bi bi-check2"></i>
                </span>
                <span class="timeline-category-label-text">Resumptions</span>
                <span class="timeline-category-count" data-category-count="resumption">(4)</span>
              </label>
            </div>
          </fieldset>

          <div class="timeline-search-box">
            <i class="bi bi-search" aria-hidden="true"></i>
            <input type="search" id="timelineSearchInput" class="timeline-search-input"
              placeholder="Search dates, e.g. exams, break, resumption..."
              aria-label="Search academic dates and milestones">
          </div>
        </div>
      </div>

      <div class="timeline-track-container" id="timelineTrackContainer" tabindex="0" role="region">
        <div class="timeline-drag-hint" id="timelineDragHint" aria-hidden="true">
          <i class="bi bi-arrows-expand-vertical"></i>
          <span>Drag or scroll to explore milestones</span>
        </div>
        <div class="timeline-track-line" aria-hidden="true"></div>

        <div class="timeline-milestones-list" id="timelineMilestonesList"></div>

        <div class="timeline-disclosure-wrapper" id="timelineDisclosureWrapper">
          <button type="button" class="btn btn-outline timeline-disclosure-btn" id="timelineDisclosureBtn"
            aria-expanded="false" aria-controls="timelineMilestonesList">
            <span class="timeline-disclosure-text">View Full Academic Calendar</span>
            <span class="timeline-disclosure-count">(10 more)</span>
            <i class="bi bi-chevron-down" aria-hidden="true"></i>
          </button>
        </div>

        <div class="timeline-empty-notice" id="timelineEmptyNotice">
          <i class="bi bi-calendar-x"></i>
          <h3>No milestones match your search</h3>
          <p id="timelineEmptyNoticeText">Try selecting "All Categories" or clearing your search term.</p>
          <button type="button" class="btn btn-outline btn-sm timeline-reset-filters-btn" id="timelineResetFiltersBtn">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset Filters
          </button>
        </div>
      </div>
    </div>
  </section>
</body>
</html>
`;

describe('SchoolDatesTimeline - Multi-Select Category Checkboxes & Search Synergy', () => {
    beforeEach(() => {
        if (typeof document === 'undefined') {
            const dom = new JSDOM(TIMELINE_HTML_FIXTURE, {
                url: 'https://saintjosephcollege.vercel.app/',
                pretendToBeVisual: true,
            });
            (globalThis as any).document = dom.window.document;
            (globalThis as any).window = dom.window;
        } else {
            document.body.innerHTML = TIMELINE_HTML_FIXTURE;
        }

        // Populate milestone articles dynamically matching production
        const listContainer = document.getElementById('timelineMilestonesList');
        renderTimelineMilestones(listContainer);
    });

    afterEach(() => {
        if (typeof document !== 'undefined') {
            document.body.innerHTML = '';
        }
    });

    it('initializes with All Categories checked and renders milestones', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        const allCheckbox = document.getElementById('categoryFilterAll') as HTMLInputElement;
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;

        expect(allCheckbox.checked).toBe(true);
        expect(examCheckbox.checked).toBe(false);
        expect(timeline.getSelectedCategories()).toEqual(['all']);

        const items = document.querySelectorAll('.timeline-milestone');
        expect(items.length).toBe(14);
    });

    it('filters correctly when a single category checkbox (Exams) is selected', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        const allCheckbox = document.getElementById('categoryFilterAll') as HTMLInputElement;
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;

        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));

        expect(allCheckbox.checked).toBe(false);
        expect(timeline.getSelectedCategories()).toEqual(['exam']);

        const allItems = Array.from(document.querySelectorAll<HTMLElement>('.timeline-milestone'));
        const visibleItems = allItems.filter((i) => !i.classList.contains('timeline-hidden'));
        const hiddenItems = allItems.filter((i) => i.classList.contains('timeline-hidden'));

        expect(visibleItems.length).toBe(4);
        visibleItems.forEach((item) => {
            expect(item.dataset.category).toBe('exam');
        });
        expect(hiddenItems.length).toBe(10);
    });

    it('supports multi-select by displaying milestones matching any selected category (Exams + Holidays)', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;
        const holidayCheckbox = document.getElementById('categoryFilterHolidays') as HTMLInputElement;

        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));

        holidayCheckbox.checked = true;
        holidayCheckbox.dispatchEvent(new window.Event('change'));

        const selected = timeline.getSelectedCategories();
        expect(selected).toContain('exam');
        expect(selected).toContain('break');
        expect(selected.length).toBe(2);

        const allItems = Array.from(document.querySelectorAll<HTMLElement>('.timeline-milestone'));
        const visibleItems = allItems.filter((i) => !i.classList.contains('timeline-hidden'));

        // 4 exams + 3 breaks = 7 milestones
        expect(visibleItems.length).toBe(7);
        visibleItems.forEach((item) => {
            const cat = item.dataset.category;
            expect(cat === 'exam' || cat === 'break').toBe(true);
        });
    });

    it('refines timeline view when search query is typed while category checkboxes are selected', () => {
        const _timeline = new SchoolDatesTimeline('schoolDatesSection');
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;
        const searchInput = document.getElementById('timelineSearchInput') as HTMLInputElement;

        // Select Exams (4 items)
        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));

        // Search specifically for "National GCE"
        searchInput.value = 'National GCE';
        searchInput.dispatchEvent(new window.Event('input'));

        const allItems = Array.from(document.querySelectorAll<HTMLElement>('.timeline-milestone'));
        const visibleItems = allItems.filter((i) => !i.classList.contains('timeline-hidden'));

        expect(visibleItems.length).toBe(1);
        expect(visibleItems[0].dataset.milestoneId).toBe('gce-national-exams-2027');
    });

    it('displays refined empty notice message when category and search combinations yield 0 results', () => {
        const _timeline = new SchoolDatesTimeline('schoolDatesSection');
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;
        const searchInput = document.getElementById('timelineSearchInput') as HTMLInputElement;
        const emptyNotice = document.getElementById('timelineEmptyNotice') as HTMLElement;
        const emptyNoticeText = document.getElementById('timelineEmptyNoticeText') as HTMLElement;

        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));

        // Search for a word that only exists in another category ("Christmas" is a break)
        searchInput.value = 'christmas';
        searchInput.dispatchEvent(new window.Event('input'));

        const allItems = Array.from(document.querySelectorAll<HTMLElement>('.timeline-milestone'));
        const visibleItems = allItems.filter((i) => !i.classList.contains('timeline-hidden'));

        expect(visibleItems.length).toBe(0);
        expect(emptyNotice.style.display).toBe('flex');
        expect(emptyNoticeText.textContent).toContain('christmas');
        expect(emptyNoticeText.textContent).toContain('category');
    });

    it('resets search query and restores All Categories when reset button is clicked', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;
        const allCheckbox = document.getElementById('categoryFilterAll') as HTMLInputElement;
        const searchInput = document.getElementById('timelineSearchInput') as HTMLInputElement;
        const resetBtn = document.getElementById('timelineResetFiltersBtn') as HTMLButtonElement;

        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));
        searchInput.value = 'christmas';
        searchInput.dispatchEvent(new window.Event('input'));

        resetBtn.click();

        expect(searchInput.value).toBe('');
        expect(allCheckbox.checked).toBe(true);
        expect(examCheckbox.checked).toBe(false);
        expect(timeline.getSelectedCategories()).toEqual(['all']);

        const emptyNotice = document.getElementById('timelineEmptyNotice') as HTMLElement;
        expect(emptyNotice.style.display).toBe('none');
    });

    it('restores All Categories automatically when all specific category checkboxes are deselected', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        const allCheckbox = document.getElementById('categoryFilterAll') as HTMLInputElement;
        const religiousCheckbox = document.getElementById('categoryFilterReligious') as HTMLInputElement;

        // Check Religious
        religiousCheckbox.checked = true;
        religiousCheckbox.dispatchEvent(new window.Event('change'));
        expect(allCheckbox.checked).toBe(false);

        // Deselect Religious
        religiousCheckbox.checked = false;
        religiousCheckbox.dispatchEvent(new window.Event('change'));

        // All Categories should automatically be restored
        expect(allCheckbox.checked).toBe(true);
        expect(timeline.getSelectedCategories()).toEqual(['all']);
    });

    it('allows programmatically setting categories via setSelectedCategories', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');
        timeline.setSelectedCategories(['spiritual', 'resumption']);

        const selected = timeline.getSelectedCategories();
        expect(selected).toContain('spiritual');
        expect(selected).toContain('resumption');

        const religiousCheckbox = document.getElementById('categoryFilterReligious') as HTMLInputElement;
        const resumptionCheckbox = document.getElementById('categoryFilterResumptions') as HTMLInputElement;
        expect(religiousCheckbox.checked).toBe(true);
        expect(resumptionCheckbox.checked).toBe(true);

        const allItems = Array.from(document.querySelectorAll<HTMLElement>('.timeline-milestone'));
        const visibleItems = allItems.filter((i) => !i.classList.contains('timeline-hidden'));

        // 3 spiritual + 4 resumptions = 7 milestones
        expect(visibleItems.length).toBe(7);
    });

    it('synchronizes DOM total and category counts dynamically (REC-07)', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');

        // Verify total count in All Milestones tab
        const allBtn = document.querySelector<HTMLButtonElement>('.timeline-tab-btn[data-timeline-filter="all"]')!;
        expect(allBtn).toBeDefined();
        expect(allBtn.textContent).toContain('(14)');

        // Verify icons in button remain intact
        const icon = allBtn.querySelector('i');
        expect(allBtn.innerHTML).toContain('All Milestones');

        // Verify individual category counts
        const examCount = document.querySelector('[data-category-count="exam"]');
        const breakCount = document.querySelector('[data-category-count="break"]');
        const spiritualCount = document.querySelector('[data-category-count="spiritual"]');
        const resumptionCount = document.querySelector('[data-category-count="resumption"]');

        expect(examCount?.textContent).toBe('(4)');
        expect(breakCount?.textContent).toBe('(3)');
        expect(spiritualCount?.textContent).toBe('(3)');
        expect(resumptionCount?.textContent).toBe('(4)');

        // Test dynamic re-synchronization with custom dataset
        const customSubset = ACADEMIC_MILESTONES_2026_2027.filter((m) => m.category === 'exam');
        timeline.syncDomCounts(customSubset);

        expect(allBtn.textContent).toContain(`(${customSubset.length})`);
        expect(examCount?.textContent).toBe(`(${customSubset.length})`);
        expect(breakCount?.textContent).toBe('(0)');
        expect(spiritualCount?.textContent).toBe('(0)');
        expect(resumptionCount?.textContent).toBe('(0)');

        // Verify checkbox inputs, custom checkbox spans, and icons are still intact
        expect(document.querySelectorAll('.timeline-category-checkbox').length).toBe(5);
        expect(document.querySelectorAll('.timeline-custom-checkbox i').length).toBe(5);
        expect(allBtn.textContent).toContain('All Milestones');
    });

    it('defensively renders chronological order when passed an unsorted milestone array (REC-01)', () => {
        const listContainer = document.getElementById('timelineMilestonesList')!;

        // Intentionally reverse or scramble the milestone array
        const scrambled = [...ACADEMIC_MILESTONES_2026_2027].reverse();
        const originalFirstId = scrambled[0].id;

        renderTimelineMilestones(listContainer, scrambled);

        // Verify input array was not mutated
        expect(scrambled[0].id).toBe(originalFirstId);

        // Verify rendered cards in DOM follow strict chronological localStartDate order
        const renderedArticles = Array.from(listContainer.querySelectorAll<HTMLElement>('.timeline-milestone'));
        expect(renderedArticles.length).toBe(14);

        const renderedIds = renderedArticles.map((a) => a.dataset.milestoneId);
        expect(renderedIds[0]).toBe('resumption-new-2026'); // 2026-08-21

        const examsT2Idx = renderedIds.indexOf('exams-t2-2027');
        const feastIdx = renderedIds.indexOf('feast-st-joseph-2027');
        expect(examsT2Idx).toBeLessThan(feastIdx);
    });

    it('correctly calculates deterministic milestone term range (REC-07)', async () => {
        const { getTermMilestoneSpan } = await import('../../src/data/academicCalendar');
        const term1Span = getTermMilestoneSpan('term-1');
        expect(term1Span).toEqual({
            start: '2026-08-21',
            end: '2027-01-03',
        });

        const term2Span = getTermMilestoneSpan('term-2');
        expect(term2Span).toEqual({
            start: '2027-01-04',
            end: '2027-03-26',
        });

        const term3Span = getTermMilestoneSpan('term-3');
        expect(term3Span).toEqual({
            start: '2027-04-12',
            end: '2027-06-25',
        });
    });

    it('injects custom category-specific icons into milestone markers based on filtering state', () => {
        const timeline = new SchoolDatesTimeline('schoolDatesSection');

        // Check initial state: exams have book icon, breaks have sun icon
        const examMilestones = document.querySelectorAll<HTMLElement>('.timeline-milestone[data-category="exam"]');
        expect(examMilestones.length).toBeGreaterThan(0);
        examMilestones.forEach((el) => {
            const icon = el.querySelector('.timeline-node-marker i');
            expect(icon?.className).toContain('bi-book');
        });

        const breakMilestones = document.querySelectorAll<HTMLElement>('.timeline-milestone[data-category="break"]');
        expect(breakMilestones.length).toBeGreaterThan(0);
        breakMilestones.forEach((el) => {
            const icon = el.querySelector('.timeline-node-marker i');
            expect(icon?.className).toContain('bi-sun');
        });

        // Filter specifically by exam category
        const examCheckbox = document.getElementById('categoryFilterExams') as HTMLInputElement;
        examCheckbox.checked = true;
        examCheckbox.dispatchEvent(new window.Event('change'));

        examMilestones.forEach((el) => {
            const icon = el.querySelector('.timeline-node-marker i');
            expect(icon?.className).toContain('bi-book');
        });

        // Filter specifically by break category
        const breakCheckbox = document.getElementById('categoryFilterHolidays') as HTMLInputElement;
        breakCheckbox.checked = true;
        examCheckbox.checked = false;
        breakCheckbox.dispatchEvent(new window.Event('change'));

        breakMilestones.forEach((el) => {
            const icon = el.querySelector('.timeline-node-marker i');
            expect(icon?.className).toContain('bi-sun');
        });
    });
});
