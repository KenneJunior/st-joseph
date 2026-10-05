/**
 * ============================================================================
 * SJCCC – Upcoming School Dates & Academic Milestones Timeline Controller
 * Coordinates filtering, interactive cards, timeline animations, and calendar export
 * for the 2026/2027 academic year.
 * ============================================================================
 */

import {
    type AcademicMilestone,
    ACADEMIC_MILESTONES_2026_2027,
} from '../../data/academicCalendar.ts';
import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';
import { SearchHistoryDropdown } from '../../ui/utils/SearchHistoryDropdown.ts';

export type { AcademicMilestone };
export { ACADEMIC_MILESTONES_2026_2027 };

export class SchoolDatesTimeline {
    private readonly container: HTMLElement | null;
    private readonly termTabs: NodeListOf<HTMLButtonElement>;
    private readonly categoryButtons: NodeListOf<HTMLButtonElement>;
    private readonly searchInput: HTMLInputElement | null;
    private readonly searchBox: HTMLElement | null;
    private readonly timelineItems: NodeListOf<HTMLElement>;
    private readonly emptyNotice: HTMLElement | null;
    private readonly disclosureWrapper: HTMLElement | null;
    private readonly disclosureBtn: HTMLButtonElement | null;
    private readonly disclosureText: HTMLElement | null;
    private readonly disclosureCount: HTMLElement | null;
    private searchHistoryDropdown: SearchHistoryDropdown | null = null;

    private currentTerm: string = 'all';
    private currentCategory: string = 'all';
    private searchQuery: string = '';
    private showAllMilestones: boolean = false;
    private readonly DEFAULT_VISIBLE_COUNT: number = 4;

    constructor(containerId: string = 'schoolDatesSection') {
        this.container = document.getElementById(containerId);
        this.termTabs = document.querySelectorAll<HTMLButtonElement>('.timeline-tab-btn');
        this.categoryButtons = document.querySelectorAll<HTMLButtonElement>('.timeline-category-btn');
        this.searchInput = document.getElementById('timelineSearchInput') as HTMLInputElement | null;
        this.searchBox = this.searchInput?.closest<HTMLElement>('.timeline-search-box') ?? null;
        this.timelineItems = document.querySelectorAll<HTMLElement>('.timeline-milestone');
        this.emptyNotice = document.getElementById('timelineEmptyNotice');
        this.disclosureWrapper = document.getElementById('timelineDisclosureWrapper');
        this.disclosureBtn = document.getElementById('timelineDisclosureBtn') as HTMLButtonElement | null;
        this.disclosureText = this.disclosureBtn?.querySelector('.timeline-disclosure-text') || null;
        this.disclosureCount = this.disclosureBtn?.querySelector('.timeline-disclosure-count') || null;

        if (!this.container) return;

        this.init();
    }

    private init(): void {
        this.bindTermFilterEvents();
        this.bindCategoryFilterEvents();
        this.bindSearchEvent();
        this.bindDisclosureEvents();
        this.bindCalendarExports();
        this.updateNextMilestoneBanner();
        this.checkDeepLinkTarget();
        this.applyFilters();

        window.addEventListener('hashchange', () => this.checkDeepLinkTarget());
    }

    private bindDisclosureEvents(): void {
        if (!this.disclosureBtn) return;

        this.disclosureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAllMilestones = !this.showAllMilestones;
            this.applyFilters();
        });
    }

    private bindTermFilterEvents(): void {
        this.termTabs.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const term = btn.dataset.timelineFilter || 'all';
                this.setTermFilter(term, btn);
            });
        });
    }

    private bindCategoryFilterEvents(): void {
        this.categoryButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const category = btn.dataset.timelineFilter || 'all';
                this.setCategoryFilter(category, btn);
            });
        });
    }

    private bindSearchEvent(): void {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', () => {
            this.searchQuery = this.searchInput?.value.trim().toLowerCase() || '';
            this.applyFilters();
        });

        this.searchInput.addEventListener('search', () => {
            if (!this.searchInput?.value) {
                this.searchQuery = '';
                this.applyFilters();
                this.searchHistoryDropdown?.syncVisibility();
            }
        });

        this.searchHistoryDropdown = new SearchHistoryDropdown({
            inputEl: this.searchInput,
            wrapperEl: this.searchBox,
            storageKey: STORAGE_KEYS.DATES_SEARCH_HISTORY,
            idPrefix: 'timeline-search-history',
            regionLabel: 'Recent searches',
            onSelectQuery: (query: string) => {
                this.searchQuery = query.trim().toLowerCase();
                this.applyFilters();
            },
            shouldSaveQuery: (query: string) => {
                const q = query.trim().toLowerCase();
                if (q.length < 2) return false;
                return Array.from(this.timelineItems).some((item) =>
                    (item.textContent || '').toLowerCase().includes(q)
                );
            },
        });
    }

    private setTermFilter(term: string, activeBtn: HTMLButtonElement): void {
        this.currentTerm = term;

        this.termTabs.forEach((btn) => {
            const isActive = btn === activeBtn;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        this.applyFilters();
    }

    private setCategoryFilter(category: string, activeBtn: HTMLButtonElement): void {
        this.currentCategory = category;

        this.categoryButtons.forEach((btn) => {
            const isActive = btn === activeBtn;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        this.applyFilters();
    }

    /**
     * Determines the most contextually relevant milestone IDs based on the current date:
     * 1. Currently active milestone(s) (happening now)
     * 2. Next upcoming milestone(s)
     * 3. Subsequent chronological future milestones
     * 4. Past milestones only fill remaining slots if fewer than `limit` future/active milestones exist.
     */
    private getRelevantMilestoneIds(limit: number = this.DEFAULT_VISIBLE_COUNT): Set<string> {
        const now = new Date();
        const activeOrUpcoming = ACADEMIC_MILESTONES_2026_2027.filter((m) => m.endDate >= now);

        let selectedIds: string[] = [];
        if (activeOrUpcoming.length >= limit) {
            selectedIds = activeOrUpcoming.slice(0, limit).map((m) => m.id);
        } else if (activeOrUpcoming.length > 0) {
            const past = ACADEMIC_MILESTONES_2026_2027.filter((m) => m.endDate < now);
            const needed = limit - activeOrUpcoming.length;
            const recentPast = past.slice(-needed);
            selectedIds = [...recentPast.map((m) => m.id), ...activeOrUpcoming.map((m) => m.id)];
        } else {
            selectedIds = ACADEMIC_MILESTONES_2026_2027.slice(0, limit).map((m) => m.id);
        }

        return new Set(selectedIds);
    }

    private applyFilters(): void {
        // Stage 1: Evaluate existing filters (term, category, search)
        const matchingItems: HTMLElement[] = [];

        this.timelineItems.forEach((item) => {
            const itemTerm = item.dataset.term || '';
            const itemCategory = item.dataset.category || '';
            const textContent = (item.textContent || '').toLowerCase();

            const matchesTerm = this.currentTerm === 'all' || itemTerm === this.currentTerm;
            const matchesCategory = this.currentCategory === 'all' || itemCategory === this.currentCategory;
            const matchesSearch = !this.searchQuery || textContent.includes(this.searchQuery);

            if (matchesTerm && matchesCategory && matchesSearch) {
                matchingItems.push(item);
            } else {
                item.classList.add('timeline-hidden');
            }
        });

        // Stage 2: Progressive disclosure rules
        const isSearchActive = this.searchQuery.length > 0;
        const isSpecificFilter = this.currentTerm !== 'all' || this.currentCategory !== 'all';
        const hasFewMatches = matchingItems.length <= this.DEFAULT_VISIBLE_COUNT;

        // Progressive disclosure is only applied when on the unfiltered overview (all terms, all categories, no search, showAll is false, and > 4 matches)
        const shouldApplyDisclosure = !this.showAllMilestones && !isSearchActive && !isSpecificFilter && !hasFewMatches;

        if (shouldApplyDisclosure) {
            const relevantIds = this.getRelevantMilestoneIds(this.DEFAULT_VISIBLE_COUNT);

            // Prioritize matching items that match relevant active/upcoming IDs
            const visibleItems = matchingItems.filter((item) => relevantIds.has(item.dataset.milestoneId || ''));

            // If fewer than limit matched (edge case), append chronologically from matchingItems
            if (visibleItems.length < this.DEFAULT_VISIBLE_COUNT) {
                for (const item of matchingItems) {
                    if (!visibleItems.includes(item)) {
                        visibleItems.push(item);
                        if (visibleItems.length >= this.DEFAULT_VISIBLE_COUNT) break;
                    }
                }
            }

            const visibleSet = new Set(visibleItems);

            matchingItems.forEach((item) => {
                item.classList.remove('timeline-disclosed-enter');
                item.style.animationDelay = '';

                if (visibleSet.has(item)) {
                    item.classList.remove('timeline-hidden');
                    item.classList.add('revealed');
                } else {
                    item.classList.add('timeline-hidden');
                }
            });
        } else {
            // Show all matching items with a smooth staggered entrance for newly revealed cards
            let staggerIndex = 0;
            matchingItems.forEach((item) => {
                const wasHidden = item.classList.contains('timeline-hidden');
                item.classList.remove('timeline-hidden');
                item.classList.add('revealed');

                if (wasHidden) {
                    item.classList.remove('timeline-disclosed-enter');
                    // Force DOM reflow to retrigger animation
                    void item.offsetWidth;
                    item.classList.add('timeline-disclosed-enter');
                    item.style.animationDelay = `${Math.min(staggerIndex * 50, 400)}ms`;
                    staggerIndex++;
                } else {
                    item.classList.remove('timeline-disclosed-enter');
                    item.style.animationDelay = '';
                }
            });
        }

        // Update empty notice
        if (this.emptyNotice) {
            this.emptyNotice.style.display = matchingItems.length === 0 ? 'flex' : 'none';
        }

        // Update disclosure button state
        this.updateDisclosureButton(matchingItems.length, shouldApplyDisclosure, isSearchActive, isSpecificFilter);
    }

    private updateDisclosureButton(
        matchingCount: number,
        isDisclosedCompact: boolean,
        isSearchActive: boolean,
        isSpecificFilter: boolean
    ): void {
        if (!this.disclosureWrapper || !this.disclosureBtn) return;

        // Hide disclosure control when:
        // 1. Zero matching items (empty notice is shown)
        // 2. 4 or fewer matching items exist
        // 3. User is actively searching
        // 4. User selected a specific term or category (focused view)
        if (matchingCount <= this.DEFAULT_VISIBLE_COUNT || isSearchActive || isSpecificFilter) {
            this.disclosureWrapper.style.display = 'none';
            return;
        }

        this.disclosureWrapper.style.display = 'flex';

        if (isDisclosedCompact) {
            // Compact view (4 items visible)
            const hiddenCount = matchingCount - this.DEFAULT_VISIBLE_COUNT;
            this.disclosureBtn.setAttribute('aria-expanded', 'false');
            if (this.disclosureText) {
                this.disclosureText.textContent = 'View Full Academic Calendar';
            }
            if (this.disclosureCount) {
                this.disclosureCount.textContent = `(${hiddenCount} more)`;
                this.disclosureCount.style.display = 'inline';
            }
        } else {
            // Expanded view (All items visible)
            this.disclosureBtn.setAttribute('aria-expanded', 'true');
            if (this.disclosureText) {
                this.disclosureText.textContent = 'Show Compact Calendar';
            }
            if (this.disclosureCount) {
                this.disclosureCount.textContent = '';
                this.disclosureCount.style.display = 'none';
            }
        }
    }

    private checkDeepLinkTarget(): void {
        const hash = window.location.hash.replace('#', '');
        if (!hash || hash === 'schoolDatesSection') return;

        const targetItem = Array.from(this.timelineItems).find(
            (item) => item.dataset.milestoneId === hash || item.id === hash
        );

        if (targetItem) {
            this.showAllMilestones = true;
            const itemTerm = targetItem.dataset.term;
            if (itemTerm && this.currentTerm !== 'all' && this.currentTerm !== itemTerm) {
                this.currentTerm = 'all';
            }
            this.applyFilters();

            setTimeout(() => {
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
        }
    }

    private bindCalendarExports(): void {
        // Individual calendar downloads for cards and banner
        const calendarButtons = this.container?.querySelectorAll<HTMLButtonElement>('.btn-download-ics');
        calendarButtons?.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;

                const milestone = ACADEMIC_MILESTONES_2026_2027.find((m) => 
                    m.id === milestoneId ||
                    (milestoneId === 'term1-exams-2026' && m.id === 'exams-t1-2026') ||
                    (milestoneId === 'christmas-break-2026' && m.id === 'christmas-vacation-2026') ||
                    (milestoneId === 'patronal-feast-2027' && m.id === 'feast-st-joseph-2027') ||
                    (milestoneId === 'term2-exams-2027' && m.id === 'exams-t2-2027') ||
                    (milestoneId === 'easter-break-2027' && m.id === 'midterm-break-t2-2027') ||
                    (milestoneId === 'holy-spirit-mass-2026' && m.id === 'resumption-old-2026')
                );
                if (!milestone) return;

                this.downloadICS(milestone);
                this.provideButtonFeedback(btn);
            });
        });
    }

    private provideButtonFeedback(btn: HTMLButtonElement): void {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Saved (.ics)';
        btn.classList.add('btn-saved');

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('btn-saved');
        }, 2000);
    }

    /**
     * Updates the next milestone banner with dynamic countdown calculation
     */
    private updateNextMilestoneBanner(): void {
        const banner = document.getElementById('nextMilestoneBanner');
        if (!banner) return;

        const countdownElem = banner.querySelector<HTMLElement>('.banner-milestone-countdown');
        const titleElem = banner.querySelector<HTMLElement>('.banner-milestone-title');
        const dateElem = banner.querySelector<HTMLElement>('.banner-milestone-date');
        const descElem = banner.querySelector<HTMLElement>('.banner-milestone-desc');
        const actionBtn = banner.querySelector<HTMLButtonElement>('.btn-download-ics');

        const now = new Date();
        // Find the first upcoming milestone whose end date is in the future
        let targetMilestone = ACADEMIC_MILESTONES_2026_2027.find((m) => m.endDate > now);

        // Fallback to first milestone if all have passed, or default to Mid-Term Break 1
        if (!targetMilestone) {
            targetMilestone = ACADEMIC_MILESTONES_2026_2027[2]; // midterm-break-t1-2026
        }

        if (targetMilestone) {
            if (titleElem) titleElem.textContent = targetMilestone.title;
            if (dateElem) dateElem.textContent = targetMilestone.dateText;
            if (descElem) descElem.textContent = targetMilestone.description;
            if (actionBtn) {
                actionBtn.dataset.milestoneId = targetMilestone.id;
                actionBtn.setAttribute('title', `Add ${targetMilestone.title} to Calendar`);
            }

            // Highlight corresponding milestone item in timeline
            this.timelineItems.forEach((item) => {
                if (item.dataset.milestoneId === targetMilestone.id) {
                    item.classList.add('is-current-upcoming');
                } else {
                    item.classList.remove('is-current-upcoming');
                }
            });

            // Countdown text calculation
            if (countdownElem) {
                const diffTime = targetMilestone.startDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 0) {
                    countdownElem.textContent = `Starts in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
                } else if (now >= targetMilestone.startDate && now <= targetMilestone.endDate) {
                    countdownElem.textContent = 'Happening Now';
                } else {
                    countdownElem.textContent = `Scheduled: ${targetMilestone.dateText}`;
                }
            }
        }
    }

    /**
     * Creates and triggers a single .ics calendar invite download
     */
    private downloadICS(milestone: AcademicMilestone): void {
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SJCCC Mbengwi//Academic Calendar 2026-2027//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${milestone.id}-sjccc-2026-2027@sjccc.edu.cm`,
            `DTSTAMP:${this.getNowISO()}`,
            `DTSTART:${milestone.startDateISO}`,
            `DTEND:${milestone.endDateISO}`,
            `SUMMARY:SJCCC: ${this.escapeICS(milestone.title)}`,
            `DESCRIPTION:${this.escapeICS(`${milestone.description} | Academic Year 2026/2027`)}`,
            `LOCATION:${this.escapeICS(milestone.location)}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SJCCC-${milestone.id}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private escapeICS(str: string): string {
        return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    }

    private getNowISO(): string {
        return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
}
