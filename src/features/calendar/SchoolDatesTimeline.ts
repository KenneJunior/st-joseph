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

export type { AcademicMilestone };
export { ACADEMIC_MILESTONES_2026_2027 };

export class SchoolDatesTimeline {
    private readonly container: HTMLElement | null;
    private readonly termTabs: NodeListOf<HTMLButtonElement>;
    private readonly categoryButtons: NodeListOf<HTMLButtonElement>;
    private readonly searchInput: HTMLInputElement | null;
    private readonly timelineItems: NodeListOf<HTMLElement>;
    private readonly emptyNotice: HTMLElement | null;
    private currentTerm: string = 'all';
    private currentCategory: string = 'all';
    private searchQuery: string = '';

    constructor(containerId: string = 'schoolDatesSection') {
        this.container = document.getElementById(containerId);
        this.termTabs = document.querySelectorAll<HTMLButtonElement>('.timeline-tab-btn');
        this.categoryButtons = document.querySelectorAll<HTMLButtonElement>('.timeline-category-btn');
        this.searchInput = document.getElementById('timelineSearchInput') as HTMLInputElement | null;
        this.timelineItems = document.querySelectorAll<HTMLElement>('.timeline-milestone');
        this.emptyNotice = document.getElementById('timelineEmptyNotice');

        if (!this.container) return;

        this.init();
    }

    private init(): void {
        this.bindTermFilterEvents();
        this.bindCategoryFilterEvents();
        this.bindSearchEvent();
        this.bindCalendarExports();
        this.updateNextMilestoneBanner();
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

    private applyFilters(): void {
        let visibleCount = 0;

        this.timelineItems.forEach((item) => {
            const itemTerm = item.dataset.term || '';
            const itemCategory = item.dataset.category || '';
            const textContent = (item.textContent || '').toLowerCase();

            const matchesTerm = this.currentTerm === 'all' || itemTerm === this.currentTerm;
            const matchesCategory = this.currentCategory === 'all' || itemCategory === this.currentCategory;
            const matchesSearch = !this.searchQuery || textContent.includes(this.searchQuery);

            if (matchesTerm && matchesCategory && matchesSearch) {
                item.classList.remove('timeline-hidden');
                visibleCount++;
            } else {
                item.classList.add('timeline-hidden');
            }
        });

        if (this.emptyNotice) {
            this.emptyNotice.style.display = visibleCount === 0 ? 'flex' : 'none';
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
