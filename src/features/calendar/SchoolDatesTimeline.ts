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
import { CalendarActionSheet } from './CalendarActionSheet.ts';
import { TimelineDragScroller } from './TimelineDragScroller.ts';

export type { AcademicMilestone };
export { ACADEMIC_MILESTONES_2026_2027 };

export class SchoolDatesTimeline {
    private readonly container: HTMLElement | null;
    private readonly termTabs: NodeListOf<HTMLButtonElement>;
    private readonly categoryButtons: NodeListOf<HTMLButtonElement>;
    private readonly categoryCheckboxes: NodeListOf<HTMLInputElement>;
    private readonly categoryLabels: NodeListOf<HTMLLabelElement>;
    private readonly allCategoryCheckbox: HTMLInputElement | null;
    private readonly resetFiltersBtn: HTMLButtonElement | null;
    private readonly emptyNoticeText: HTMLElement | null;
    private readonly searchInput: HTMLInputElement | null;
    private readonly searchBox: HTMLElement | null;
    private readonly timelineItems: NodeListOf<HTMLElement>;
    private readonly emptyNotice: HTMLElement | null;
    private readonly disclosureWrapper: HTMLElement | null;
    private readonly disclosureBtn: HTMLButtonElement | null;
    private readonly disclosureText: HTMLElement | null;
    private readonly disclosureCount: HTMLElement | null;
    private searchHistoryDropdown: SearchHistoryDropdown | null = null;
    private dragScroller: TimelineDragScroller | null = null;

    private currentTerm: string = 'all';
    private currentCategory: string = 'all';
    private readonly selectedCategories: Set<string> = new Set();
    private searchQuery: string = '';
    private showAllMilestones: boolean = false;
    private readonly DEFAULT_VISIBLE_COUNT: number = 4;

    constructor(containerId: string = 'schoolDatesSection') {
        this.container = document.getElementById(containerId);
        this.termTabs = document.querySelectorAll<HTMLButtonElement>('.timeline-tab-btn');
        this.categoryButtons = document.querySelectorAll<HTMLButtonElement>('.timeline-category-btn');
        this.categoryCheckboxes = document.querySelectorAll<HTMLInputElement>('.timeline-category-checkbox');
        this.categoryLabels = document.querySelectorAll<HTMLLabelElement>('.timeline-category-checkbox-label');
        this.allCategoryCheckbox = document.getElementById('categoryFilterAll') as HTMLInputElement | null;
        this.resetFiltersBtn = document.getElementById('timelineResetFiltersBtn') as HTMLButtonElement | null;
        this.emptyNoticeText = document.getElementById('timelineEmptyNoticeText');
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
        this.syncDomCounts();
        this.bindTermFilterEvents();
        this.bindCategoryFilterEvents();
        this.bindSearchEvent();
        this.bindDisclosureEvents();
        this.bindCalendarExports();
        this.updateNextMilestoneBanner();
        this.initDragScroller();
        this.checkDeepLinkTarget();
        this.syncCategoryCheckboxVisuals();
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
        // Multi-select category checkboxes
        this.categoryCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                this.handleCategoryCheckboxChange(checkbox);
            });
        });

        // Reset filters button in empty notice
        this.resetFiltersBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearAllFilters();
        });

        // Backward compatibility for any legacy category button controls
        this.categoryButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const category = btn.dataset.timelineFilter || 'all';
                this.setCategoryFilter(category, btn);
            });
        });
    }

    private handleCategoryCheckboxChange(changedCheckbox: HTMLInputElement): void {
        const value = changedCheckbox.value;

        if (value === 'all') {
            if (changedCheckbox.checked) {
                this.selectedCategories.clear();
                this.categoryCheckboxes.forEach((cb) => {
                    if (cb !== changedCheckbox) cb.checked = false;
                });
            } else {
                // Prevent unchecking "All" without selecting an alternative category
                changedCheckbox.checked = true;
                return;
            }
        } else {
            if (changedCheckbox.checked) {
                this.selectedCategories.add(value);
                if (this.allCategoryCheckbox) {
                    this.allCategoryCheckbox.checked = false;
                }
            } else {
                this.selectedCategories.delete(value);
            }

            const specificCheckboxes = Array.from(this.categoryCheckboxes).filter((cb) => cb.value !== 'all');
            const allSpecificSelected = specificCheckboxes.length > 0 && specificCheckboxes.every((cb) => cb.checked);

            if (this.selectedCategories.size === 0 || allSpecificSelected) {
                // If nothing or everything is selected, restore "All Categories" as active
                this.selectedCategories.clear();
                if (this.allCategoryCheckbox) {
                    this.allCategoryCheckbox.checked = true;
                }
                if (!allSpecificSelected) {
                    specificCheckboxes.forEach((cb) => { cb.checked = false; });
                }
            }
        }

        this.syncCategoryCheckboxVisuals();
        this.applyFilters();
    }

    private syncCategoryCheckboxVisuals(): void {
        this.categoryLabels.forEach((label) => {
            const input = label.querySelector<HTMLInputElement>('.timeline-category-checkbox');
            if (input) {
                label.classList.toggle('is-checked', input.checked);
            }
        });
    }

    public getSelectedCategories(): string[] {
        if (this.selectedCategories.size === 0) {
            return ['all'];
        }
        return Array.from(this.selectedCategories);
    }

    public getCurrentCategory(): string {
        return this.currentCategory;
    }

    public setSelectedCategories(categories: string[]): void {
        this.selectedCategories.clear();
        const hasAll = categories.includes('all') || categories.length === 0;

        if (hasAll) {
            if (this.allCategoryCheckbox) this.allCategoryCheckbox.checked = true;
            this.categoryCheckboxes.forEach((cb) => {
                if (cb.value !== 'all') cb.checked = false;
            });
        } else {
            if (this.allCategoryCheckbox) this.allCategoryCheckbox.checked = false;
            categories.forEach((cat) => this.selectedCategories.add(cat));
            this.categoryCheckboxes.forEach((cb) => {
                if (cb.value !== 'all') {
                    cb.checked = this.selectedCategories.has(cb.value);
                }
            });
        }

        this.syncCategoryCheckboxVisuals();
        this.applyFilters();
    }

    public clearCategoryFilters(): void {
        this.setSelectedCategories(['all']);
    }

    public clearAllFilters(): void {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.searchQuery = '';
        this.clearCategoryFilters();
        const allTermBtn = Array.from(this.termTabs).find((b) => (b.dataset.timelineFilter || 'all') === 'all');
        if (allTermBtn) {
            this.setTermFilter('all', allTermBtn);
        } else {
            this.applyFilters();
        }
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

        if (category === 'all') {
            this.clearCategoryFilters();
        } else {
            this.setSelectedCategories([category]);
        }
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
        // Stage 1: Evaluate existing filters (term, multi-select categories, search query)
        const matchingItems: HTMLElement[] = [];
        const isCategoryFiltered = this.selectedCategories.size > 0;

        this.timelineItems.forEach((item) => {
            const itemTerm = item.dataset.term || '';
            const itemCategory = item.dataset.category || '';
            const textContent = (item.textContent || '').toLowerCase();

            const matchesTerm = this.currentTerm === 'all' || itemTerm === this.currentTerm;
            const matchesCategory = !isCategoryFiltered || this.selectedCategories.has(itemCategory);
            const matchesSearch = !this.searchQuery || textContent.includes(this.searchQuery);

            if (matchesTerm && matchesCategory && matchesSearch) {
                matchingItems.push(item);
            } else {
                item.classList.add('timeline-hidden');
            }
        });

        // Stage 2: Progressive disclosure rules
        const isSearchActive = this.searchQuery.length > 0;
        const isSpecificFilter = this.currentTerm !== 'all' || isCategoryFiltered;
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
            const isEmpty = matchingItems.length === 0;
            this.emptyNotice.style.display = isEmpty ? 'flex' : 'none';

            if (isEmpty && this.emptyNoticeText) {
                if (isSearchActive && isCategoryFiltered) {
                    this.emptyNoticeText.textContent = `No milestones match "${this.searchQuery}" across your selected category filters. Try expanding your categories or clearing the search.`;
                } else if (isCategoryFiltered) {
                    this.emptyNoticeText.textContent = 'No milestones match the selected categories for this term. Try checking additional categories or selecting "All Categories".';
                } else if (isSearchActive) {
                    this.emptyNoticeText.textContent = `No milestones match "${this.searchQuery}". Try selecting "All Categories" or clearing your search.`;
                } else {
                    this.emptyNoticeText.textContent = 'No milestones found for this selection.';
                }
            }
        }

        // Update disclosure button state
        this.updateDisclosureButton(matchingItems.length, shouldApplyDisclosure, isSearchActive, isSpecificFilter);

        // Update drag-to-scroll indicators and spine line alignment
        this.dragScroller?.updateScrollIndicators();
        this.dragScroller?.syncSpineLine();

        // Inject custom category-specific icons based on current filtering state
        this.updateMilestoneCategoryIcons();
    }

    /**
     * Updates milestone node markers with custom category-specific icons
     * (e.g., a book for exams, a sun for breaks, door/backpack for resumptions, church/cross for spiritual)
     * dynamically reflecting the active category filtering state.
     */
    public updateMilestoneCategoryIcons(): void {
        const isExamFiltered = this.selectedCategories.has('exam') && this.selectedCategories.size === 1;
        const isBreakFiltered = this.selectedCategories.has('break') && this.selectedCategories.size === 1;

        this.timelineItems.forEach((item) => {
            const category = item.dataset.category || '';
            const markerEl = item.querySelector<HTMLElement>('.timeline-node-marker');
            if (!markerEl) return;

            let iconEl = markerEl.querySelector<HTMLElement>('i');
            if (!iconEl) {
                iconEl = document.createElement('i');
                markerEl.appendChild(iconEl);
            }

            // Determine custom category icon class
            // When specifically filtered by category, or generally categorized:
            let iconClass = 'bi-circle-fill';
            if (category === 'exam') {
                // Book for exams (e.g. bi-book-half or bi-book)
                iconClass = isExamFiltered ? 'bi-book-half' : 'bi-book';
            } else if (category === 'break') {
                // Sun for breaks (e.g. bi-sun-fill or bi-sun)
                iconClass = isBreakFiltered ? 'bi-sun-fill' : 'bi-sun';
            } else if (category === 'resumption') {
                iconClass = 'bi-door-open-fill';
            } else if (category === 'spiritual') {
                iconClass = 'bi-bookmark-star-fill';
            }

            // Replace class list while preserving base 'bi'
            iconEl.className = `bi ${iconClass}`;
            markerEl.setAttribute('data-injected-category-icon', category);
        });
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
                if (this.dragScroller) {
                    this.dragScroller.scrollToMilestone(targetItem);
                } else {
                    targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
        }
    }

    private bindCalendarExports(): void {
        // Individual calendar action buttons for cards and banner
        const calendarButtons = this.container?.querySelectorAll<HTMLButtonElement>('.btn-calendar-action, .btn-download-ics');
        calendarButtons?.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;

                const milestone = ACADEMIC_MILESTONES_2026_2027.find((m) => m.id === milestoneId);
                if (!milestone) return;

                CalendarActionSheet.getInstance().open(milestone, btn);
            });
        });
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
        const actionBtn = banner.querySelector<HTMLButtonElement>('.btn-calendar-action, .btn-download-ics');

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

    private initDragScroller(): void {
        const trackContainer = this.container?.querySelector<HTMLElement>('.timeline-track-container') ??
            document.querySelector<HTMLElement>('.timeline-track-container');

        if (trackContainer) {
            this.dragScroller = new TimelineDragScroller({
                container: trackContainer,
                dragThreshold: 5,
                friction: 0.94,
                enableKeyboard: true,
            });
        }
    }

    public getDragScroller(): TimelineDragScroller | null {
        return this.dragScroller;
    }

    /**
     * Synchronizes DOM milestone and category counts from the canonical milestone array
     * based on data-category-count and data-term-count attributes,
     * ensuring all icon elements (<i class="...">) and button structures remain completely intact.
     */
    public syncDomCounts(milestones: readonly AcademicMilestone[] = ACADEMIC_MILESTONES_2026_2027): void {
        if (typeof document === 'undefined') return;

        const total = milestones.length;

        // 1. Synchronize all dedicated data-category-count elements
        const categoryCountEls = document.querySelectorAll<HTMLElement>('[data-category-count]');
        categoryCountEls.forEach((el) => {
            const cat = el.getAttribute('data-category-count');
            if (!cat) return;
            if (cat === 'all') {
                el.textContent = `(${total})`;
            } else {
                const count = milestones.filter((m) => m.category === cat).length;
                el.textContent = `(${count})`;
            }
        });

        // 2. Synchronize all dedicated data-term-count="all" elements
        const termCountEls = document.querySelectorAll<HTMLElement>('[data-term-count="all"]');
        termCountEls.forEach((el) => {
            el.textContent = `(${total})`;
        });

        // 3. Fallback for All Milestones tab buttons when no dedicated child count span is present
        const allTabBtns = document.querySelectorAll<HTMLButtonElement>('.timeline-tab-btn[data-timeline-filter="all"]');
        allTabBtns.forEach((btn) => {
            if (!btn.querySelector('[data-term-count="all"], [data-category-count="all"]')) {
                btn.childNodes.forEach((node) => {
                    if (node.nodeType === 3 && node.nodeValue && /\(\d+\)/.test(node.nodeValue)) {
                        node.nodeValue = node.nodeValue.replace(/\(\d+\)/, `(${total})`);
                    }
                });
            }
        });
    }

    public destroy(): void {
        if (this.dragScroller) {
            this.dragScroller.destroy();
            this.dragScroller = null;
        }
    }
}
