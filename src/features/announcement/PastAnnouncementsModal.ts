/**
 * ============================================================================
 * SJCCC – Past Announcements Modal Controller
 * Accessible, filterable modal displaying historical school notices & bulletins.
 * Supports Category filtering, Priority level filtering ('urgent', 'important', 'info'),
 * sorting (date / priority), search, interactive 'Mark as Read' checkmarks next to the date,
 * and real-time specific-row updates via the Custom Event Bus ('notice-read' event)
 * WITHOUT full modal refreshes.
 * ============================================================================
 */

import { PAST_ANNOUNCEMENTS, type SchoolAnnouncement, type AnnouncementPriorityLevel } from '../../data/pastAnnouncements.ts';
import { announcementState, announcementEventBus, type NoticeReadPayload } from './announcementState.ts';

export class PastAnnouncementsModal {
    private readonly modal: HTMLElement | null;
    private readonly triggerButtons: NodeListOf<HTMLElement>;
    private readonly closeBtn: HTMLElement | null;
    private readonly listContainer: HTMLElement | null;
    private readonly searchInput: HTMLInputElement | null;
    private readonly categoryButtons: NodeListOf<HTMLButtonElement>;
    private readonly priorityButtons: NodeListOf<HTMLButtonElement>;
    private readonly prioritySelect: HTMLSelectElement | null;
    private readonly sortSelect: HTMLSelectElement | null;
    private readonly clearStorageBtn: HTMLButtonElement | null;

    private activeCategory: string = 'all';
    private activePriority: string = 'all';
    private sortBy: string = 'newest';
    private searchQuery: string = '';
    private isOpen: boolean = false;
    private lastFocusedElement: HTMLElement | null = null;
    private unsubscribeNoticeRead?: () => void;

    constructor(
        modalId: string = 'pastAnnouncementsModal',
        triggerSelector: string = '#viewPastAnnouncementsBtn, [data-open-past-announcements]'
    ) {
        this.modal = document.getElementById(modalId);
        this.triggerButtons = document.querySelectorAll(triggerSelector);
        this.closeBtn = this.modal?.querySelector('.past-modal-close') ?? null;
        this.listContainer = this.modal?.querySelector('#pastAnnouncementsList') ?? null;
        this.searchInput = this.modal?.querySelector('#pastAnnouncementsSearch') ?? null;
        this.categoryButtons = this.modal?.querySelectorAll('.past-filter-btn') ?? document.querySelectorAll('.non-existent');
        this.priorityButtons = this.modal?.querySelectorAll('.past-priority-pill') ?? document.querySelectorAll('.non-existent');
        this.prioritySelect = this.modal?.querySelector('#pastPrioritySelect') ?? null;
        this.sortSelect = this.modal?.querySelector('#pastSortSelect') ?? null;
        this.clearStorageBtn = this.modal?.querySelector('#pastClearStorageBtn') ?? null;

        this.init();
    }

    private init(): void {
        if (!this.modal) return;

        // Render initial data list
        this.renderList();

        // Subscribe to 'notice-read' event from the Custom Event Bus:
        // Updates JUST the specific announcement row in-place without refreshing or re-rendering the modal
        this.unsubscribeNoticeRead = announcementEventBus.on<NoticeReadPayload>('notice-read', (payload) => {
            if (payload.id === '*') {
                this.updateAllRowsReadState(payload.allReadIds);
            } else {
                this.updateNoticeRow(payload.id, payload.isRead);
            }
        });

        // Trigger clicks
        this.triggerButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.open(btn);
            });
        });

        // Close button click
        this.closeBtn?.addEventListener('click', () => this.close());

        // Backdrop click to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Keyboard navigation (Esc to close)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Search input filter
        this.searchInput?.addEventListener('input', (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
            this.renderList();
        });

        // Category filter buttons
        this.categoryButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category') ?? 'all';
                this.setCategory(category, btn);
            });
        });

        // Priority filter buttons / pills
        this.priorityButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const priority = btn.getAttribute('data-priority-filter') ?? 'all';
                this.setPriority(priority, btn);
            });
        });

        // Priority dropdown change
        this.prioritySelect?.addEventListener('change', (e) => {
            const selectVal = (e.target as HTMLSelectElement).value;
            this.setPriority(selectVal);
        });

        // Sort dropdown change
        this.sortSelect?.addEventListener('change', (e) => {
            this.sortBy = (e.target as HTMLSelectElement).value;
            this.renderList();
        });

        // Reset Cache helper
        this.clearStorageBtn?.addEventListener('click', () => {
            this.clearAnnouncementStorage();
        });

        // Delegate list interactions (internal links & read checkmark badge clicks)
        this.listContainer?.addEventListener('click', (e) => {
            const targetEl = e.target as HTMLElement;

            // Handle clicking the checkmark button next to the date
            const readBadge = targetEl.closest<HTMLButtonElement>('.past-item-read-badge');
            if (readBadge) {
                const id = readBadge.getAttribute('data-id');
                if (id) {
                    this.toggleNoticeRead(id);
                }
                return;
            }

            // Handle internal link navigation
            const link = targetEl.closest<HTMLAnchorElement>('a');
            if (link && link.hash && link.hash.startsWith('#')) {
                const target = document.querySelector(link.hash);
                if (target) {
                    e.preventDefault();
                    this.close();
                    setTimeout(() => {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }, 350);
                }
            }
        });
    }

    public isNoticeRead(id: string): boolean {
        return announcementState.isNoticeRead(id);
    }

    public toggleNoticeRead(id: string): void {
        // Toggle in central manager, which emits 'notice-read' and updates the specific row
        announcementState.toggleNoticeRead(id);
    }

    /**
     * Programmatically re-renders JUST the targeted announcement card in the DOM
     * without refreshing the modal dialog or losing scroll position.
     */
    public updateNoticeRow(id: string, isRead: boolean): void {
        if (!this.listContainer) return;

        const cards = this.listContainer.querySelectorAll<HTMLElement>('.past-announcement-card');
        cards.forEach((card) => {
            const cardId = card.getAttribute('data-id');
            if (cardId && (cardId === id || announcementState.matchesNoticeId(cardId, id))) {
                // 1. Programmatically apply shared read-receipt CSS class
                card.classList.toggle('read-receipt-applied', isRead);
                card.classList.toggle('is-read-card', isRead);
                card.classList.toggle('notice-seen-dimmed', isRead);

                // 2. Update the row's read badge button
                const badge = card.querySelector<HTMLButtonElement>('.past-item-read-badge');
                if (badge) {
                    badge.classList.toggle('is-read', isRead);
                    badge.classList.toggle('is-unread', !isRead);
                    badge.setAttribute('aria-pressed', String(isRead));
                    badge.title = isRead
                        ? 'Marked as read in your browser (Click to unmark)'
                        : 'New unread notice (Click to mark as read)';
                    badge.setAttribute('aria-label', isRead ? 'Status: Marked as read' : 'Status: New unread notice');
                    badge.innerHTML = isRead
                        ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> <span class="read-label">Read</span>'
                        : '<span class="unread-pulse" aria-hidden="true"></span> <span class="read-label">New</span>';
                }

                // 3. Subtle micro-transition pulse
                card.classList.remove('read-receipt-pulsing');
                void card.offsetWidth; // trigger reflow
                card.classList.add('read-receipt-pulsing');
                setTimeout(() => {
                    card.classList.remove('read-receipt-pulsing');
                }, 500);
            }
        });
    }

    /**
     * Updates all rendered rows when a bulk state reset occurs
     */
    public updateAllRowsReadState(allReadIds: string[]): void {
        if (!this.listContainer) return;

        const cards = this.listContainer.querySelectorAll<HTMLElement>('.past-announcement-card');
        cards.forEach((card) => {
            const cardId = card.getAttribute('data-id');
            const isRead = cardId ? allReadIds.some((rId) => rId === cardId || announcementState.matchesNoticeId(rId, cardId)) : false;

            card.classList.toggle('read-receipt-applied', isRead);
            card.classList.toggle('is-read-card', isRead);
            card.classList.toggle('notice-seen-dimmed', isRead);

            const badge = card.querySelector<HTMLButtonElement>('.past-item-read-badge');
            if (badge) {
                badge.classList.toggle('is-read', isRead);
                badge.classList.toggle('is-unread', !isRead);
                badge.setAttribute('aria-pressed', String(isRead));
                badge.title = isRead
                    ? 'Marked as read in your browser (Click to unmark)'
                    : 'New unread notice (Click to mark as read)';
                badge.setAttribute('aria-label', isRead ? 'Status: Marked as read' : 'Status: New unread notice');
                badge.innerHTML = isRead
                    ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> <span class="read-label">Read</span>'
                    : '<span class="unread-pulse" aria-hidden="true"></span> <span class="read-label">New</span>';
            }
        });
    }

    public setCategory(category: string, activeBtn?: HTMLButtonElement): void {
        this.activeCategory = category;
        this.categoryButtons.forEach((b) => b.classList.remove('active'));
        if (activeBtn) {
            activeBtn.classList.add('active');
        } else {
            const found = Array.from(this.categoryButtons).find(b => b.getAttribute('data-category') === category);
            found?.classList.add('active');
        }
        this.renderList();
    }

    public setPriority(priority: string, activeBtn?: HTMLButtonElement): void {
        this.activePriority = priority;
        this.priorityButtons.forEach((b) => b.classList.remove('active'));
        if (activeBtn) {
            activeBtn.classList.add('active');
        } else {
            const found = Array.from(this.priorityButtons).find(b => b.getAttribute('data-priority-filter') === priority);
            found?.classList.add('active');
        }

        if (this.prioritySelect && this.prioritySelect.value !== priority) {
            this.prioritySelect.value = priority;
        }

        this.renderList();
    }

    public clearAnnouncementStorage(): void {
        try {
            announcementState.clearAllReadStates();

            const keysToRemove = [
                'announcement_dismissed',
                'Interview_announcement_dismissed',
                'sjccc_last_seen_urgent_notice_id',
                'sjccc_last_visit_timestamp',
                'sjccc_notice_read_form-one-interviews-august-2026',
                'sjccc_notice_read_school-resumption-2026',
            ];
            keysToRemove.forEach(k => {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
            });

            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sjccc_notice_') || key.includes('announcement'))) {
                    localStorage.removeItem(key);
                }
            }

            if (this.clearStorageBtn) {
                const origText = this.clearStorageBtn.innerHTML;
                this.clearStorageBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Cache Cleared!';
                this.clearStorageBtn.classList.add('btn-success');
                setTimeout(() => {
                    if (this.clearStorageBtn) {
                        this.clearStorageBtn.innerHTML = origText;
                        this.clearStorageBtn.classList.remove('btn-success');
                    }
                }, 2000);
            }

            const bar = document.getElementById('announcementBar');
            if (bar) {
                bar.classList.remove('dismissed', 'dismissing', 'is-read', 'notice-seen-dimmed', 'read-receipt-applied');
                bar.removeAttribute('aria-hidden');
                const markReadBtn = bar.querySelector<HTMLButtonElement>('#announcementMarkReadBtn');
                if (markReadBtn) {
                    markReadBtn.classList.remove('is-read', 'read-receipt-applied');
                    markReadBtn.classList.add('is-unread');
                    markReadBtn.setAttribute('aria-pressed', 'false');
                    const text = markReadBtn.querySelector('.mark-read-text');
                    const icon = markReadBtn.querySelector('i');
                    if (text) text.textContent = 'Mark as read';
                    if (icon) icon.className = 'bi bi-check2';
                }
                const root = document.documentElement;
                root.style.setProperty('--bar-height', `${bar.offsetHeight}px`);
            }

            this.updateAllRowsReadState([]);
        } catch {
            // Storage quota or privacy restriction fallback
        }
    }

    private getFilteredAnnouncements(): SchoolAnnouncement[] {
        const filtered = PAST_ANNOUNCEMENTS.filter((item) => {
            const matchesCategory = this.activeCategory === 'all' || item.category === this.activeCategory;
            const matchesPriority = this.activePriority === 'all' || item.priority === this.activePriority;
            const matchesSearch = !this.searchQuery ||
                item.title.toLowerCase().includes(this.searchQuery) ||
                item.summary.toLowerCase().includes(this.searchQuery) ||
                item.details.toLowerCase().includes(this.searchQuery) ||
                item.badge.toLowerCase().includes(this.searchQuery) ||
                item.date.toLowerCase().includes(this.searchQuery);

            return matchesCategory && matchesPriority && matchesSearch;
        });

        return filtered.sort((a, b) => {
            if (this.sortBy === 'priority') {
                const priorityWeight: Record<AnnouncementPriorityLevel, number> = {
                    urgent: 3,
                    important: 2,
                    info: 1
                };
                const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
                if (diff !== 0) return diff;
                return b.isoDate.localeCompare(a.isoDate);
            } else if (this.sortBy === 'oldest') {
                return a.isoDate.localeCompare(b.isoDate);
            } else {
                return b.isoDate.localeCompare(a.isoDate);
            }
        });
    }

    private renderList(): void {
        if (!this.listContainer) return;

        const filtered = this.getFilteredAnnouncements();

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <div class="past-announcements-empty">
                    <i class="bi bi-funnel" aria-hidden="true"></i>
                    <h4>No matching announcements</h4>
                    <p>No historical notices match your selected category, priority filter, or search keywords. Try selecting "All Priorities" or clearing filters.</p>
                </div>
            `;
            return;
        }

        const html = filtered.map((item) => {
            const categoryIcon = this.getCategoryIcon(item.category);
            const priorityBadge = this.getPriorityBadge(item.priority);
            const pinnedBadge = item.isPinned ? `<span class="past-item-pinned"><i class="bi bi-pin-angle-fill"></i> Pinned</span>` : '';
            const isRead = this.isNoticeRead(item.id);

            // Visual checkmark next to the date using shared CSS classes notice-read-receipt & is-read / is-unread
            const readStatusBadge = `
                <button type="button" class="past-item-read-badge notice-read-receipt ${isRead ? 'is-read' : 'is-unread'}" data-id="${item.id}" title="${isRead ? 'Marked as read in your browser (Click to unmark)' : 'New unread notice (Click to mark as read)'}" aria-label="${isRead ? 'Status: Marked as read' : 'Status: New unread notice'}" aria-pressed="${String(isRead)}">
                    ${isRead
                        ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> <span class="read-label">Read</span>'
                        : '<span class="unread-pulse" aria-hidden="true"></span> <span class="read-label">New</span>'
                    }
                </button>
            `;

            const actionBtn = item.linkText && item.linkHref ? `
                <a href="${item.linkHref}" class="past-item-action">
                    <span>${this.escapeHtml(item.linkText)}</span>
                    <i class="bi bi-arrow-right"></i>
                </a>
            ` : '';

            return `
                <article class="past-announcement-card priority-${item.priority} ${item.isPinned ? 'is-pinned' : ''} ${isRead ? 'read-receipt-applied is-read-card notice-seen-dimmed' : ''}" data-id="${item.id}" data-category="${item.category}" data-priority="${item.priority}">
                    <header class="past-item-header">
                        <div class="past-item-meta">
                            <span class="past-item-date"><i class="bi bi-calendar3"></i> ${this.escapeHtml(item.date)}</span>
                            ${readStatusBadge}
                            ${priorityBadge}
                            <span class="past-item-badge"><i class="${categoryIcon}"></i> ${this.escapeHtml(item.badge)}</span>
                            ${pinnedBadge}
                        </div>
                    </header>
                    <h3 class="past-item-title">${this.escapeHtml(item.title)}</h3>
                    <p class="past-item-summary">${this.escapeHtml(item.summary)}</p>
                    <div class="past-item-details">${this.escapeHtml(item.details)}</div>
                    ${actionBtn ? `<footer class="past-item-footer">${actionBtn}</footer>` : ''}
                </article>
            `;
        }).join('');

        this.listContainer.innerHTML = html;
    }

    private getPriorityBadge(priority: AnnouncementPriorityLevel): string {
        switch (priority) {
            case 'urgent':
                return `<span class="past-item-priority priority-urgent" title="Urgent Priority"><span class="priority-dot" aria-hidden="true"></span><i class="bi bi-exclamation-triangle-fill"></i> Urgent</span>`;
            case 'important':
                return `<span class="past-item-priority priority-important" title="Important Priority"><span class="priority-dot" aria-hidden="true"></span><i class="bi bi-patch-exclamation-fill"></i> Important</span>`;
            case 'info':
            default:
                return `<span class="past-item-priority priority-info" title="General Priority"><span class="priority-dot" aria-hidden="true"></span><i class="bi bi-info-circle-fill"></i> General</span>`;
        }
    }

    private getCategoryIcon(cat: string): string {
        switch (cat) {
            case 'admissions': return 'bi bi-person-plus-fill';
            case 'academic': return 'bi bi-mortarboard-fill';
            case 'campus': return 'bi bi-building';
            case 'celebration': return 'bi bi-trophy-fill';
            default: return 'bi bi-bell-fill';
        }
    }

    private escapeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    public open(triggerEl?: HTMLElement): void {
        if (!this.modal || this.isOpen) return;

        this.lastFocusedElement = triggerEl || (document.activeElement as HTMLElement | null);
        this.isOpen = true;

        // Fresh render to ensure latest read checkmark statuses from announcementState are displayed
        this.renderList();

        this.modal.removeAttribute('hidden');

        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${this.getScrollbarWidth()}px`;

        setTimeout(() => {
            this.searchInput?.focus();
        }, 150);
    }

    public close(): void {
        if (!this.modal || !this.isOpen) return;

        this.isOpen = false;
        const dialog = this.modal.querySelector('.past-modal-dialog');
        dialog?.classList.add('closing');

        setTimeout(() => {
            this.modal?.setAttribute('hidden', '');
            dialog?.classList.remove('closing');

            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            this.lastFocusedElement?.focus();
        }, 280);
    }

    private getScrollbarWidth(): number {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    public destroy(): void {
        this.unsubscribeNoticeRead?.();
    }
}
