/**
 * ============================================================================
 * SJCCC – Announcement Bar Controller
 * Dismissible top notice bar with persistence timer, notice version tracking,
 * "Read more" expandable content toggle, "View past announcements" archive modal,
 * centralized reactive `announcementState` management across browser sessions,
 * subtle fade-out / slide-out visual feedback animation when "Mark as Read" is toggled,
 * visual alert shake effect and optional Web Audio chime on page load for unread urgent notices,
 * visual priority indicators ('urgent'/'important'/'info'), keyboard accessibility (Esc),
 * smooth exit animations, and dynamic CSS layout variables
 * ============================================================================
 */

import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';
import { PastAnnouncementsModal } from './PastAnnouncementsModal.ts';
import { announcementState, announcementEventBus, type NoticeReadPayload } from './announcementState.ts';

export type AnnouncementPriority = 'urgent' | 'important' | 'info';

export interface AnnouncementBarOptions {
    barSelector: string;
    closeBtnSelector: string;
    headerSelector?: string;
    storageKey?: string;
    /**
     * Number of days before the bar shows up again.
     * Default: 30 days. Use decimals for shorter intervals (e.g., 0.5 = 12h)
     */
    dismissForDays?: number;
    /**
     * Unique ID representing the current announcement.
     * If the notice changes, the bar automatically re-displays even if an older
     * notice was dismissed. If omitted, reads `data-announcement-id` from the bar.
     */
    announcementId?: string;
    /**
     * Visual priority level: 'urgent' | 'important' | 'info'.
     * Default: reads `data-priority` from the bar element or 'important'.
     */
    priority?: AnnouncementPriority;
    /**
     * Selector for the "Read more" toggle button. Default: `#announcementToggleBtn, .announcement-bar__toggle-btn`
     */
    toggleBtnSelector?: string;
    /**
     * Selector for the expandable detail text. Default: `#announcementMoreContent, .announcement-bar__more-content`
     */
    moreContentSelector?: string;
    /**
     * Selector for the "Mark as read" button. Default: `#announcementMarkReadBtn, .announcement-bar__mark-read-btn`
     */
    markReadBtnSelector?: string;
    /**
     * Selector for the "View past announcements" button. Default: `#viewPastAnnouncementsBtn, .announcement-bar__past-btn`
     */
    pastAnnouncementsBtnSelector?: string;
    /**
     * Selector for the past announcements modal dialog. Default: `pastAnnouncementsModal`
     */
    pastModalId?: string;
    /**
     * Optional ISO publication timestamp string (e.g. '2026-08-21T08:00:00Z')
     * or milliseconds epoch to identify when this notice was published.
     */
    publishedAt?: string | number;
    /**
     * Whether to activate subtle 'new notice' auto-scroll or pulse animation
     * when visited in a session with a newly published urgent notice. Default: true.
     */
    enableNewNoticePulse?: boolean;
    /**
     * Callback fired when user dismisses the announcement bar
     */
    onDismiss?: () => void;
    /**
     * Callback fired when the announcement bar is active and displayed
     */
    onShow?: () => void;
    /**
     * Callback fired when the user marks the announcement as read/unread
     */
    onMarkRead?: (isRead: boolean) => void;
}

interface StoredDismissalRecord {
    hiddenUntil: number;
    noticeId: string;
}

export class AnnouncementBar {
    private readonly bar: HTMLElement | null;
    private readonly closeBtn: HTMLButtonElement | null;
    private readonly header: HTMLElement | null;
    private readonly toggleBtn: HTMLButtonElement | null;
    private readonly moreContent: HTMLElement | null;
    private readonly markReadBtn: HTMLButtonElement | null;
    private readonly priorityEl: HTMLElement | null;
    private readonly storageKey: string;
    private readonly dismissDurationMs: number;
    private readonly announcementId: string;
    private readonly publishedTimestamp: number;
    private readonly enableNewNoticePulse: boolean;
    private currentPriority: AnnouncementPriority;
    private readonly onDismiss?: () => void;
    private readonly onShow?: () => void;
    private readonly onMarkRead?: (isRead: boolean) => void;

    private pastModal: PastAnnouncementsModal | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private rAFId: number | null = null;
    private dismissTimer: ReturnType<typeof setTimeout> | null = null;
    private isCurrentlyDismissed = false;
    private isExpanded = false;
    private isRead = false;
    private unsubscribeState?: () => void;
    private unsubscribeNoticeRead?: () => void;

    private readonly boundUpdateLayout = this.updateLayout.bind(this);
    private readonly boundDismiss = () => this.dismiss();
    private readonly boundKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
    private readonly boundToggleReadMore = () => this.toggleReadMore();
    private readonly boundToggleMarkAsRead = () => this.toggleMarkAsRead();

    constructor(options: AnnouncementBarOptions) {
        this.bar = document.querySelector(options.barSelector);
        this.closeBtn = document.querySelector(options.closeBtnSelector);
        this.header = options.headerSelector ? document.querySelector(options.headerSelector) : null;

        const toggleSelector = options.toggleBtnSelector ?? '#announcementToggleBtn, .announcement-bar__toggle-btn';
        this.toggleBtn = this.bar?.querySelector(toggleSelector) ?? null;

        const moreSelector = options.moreContentSelector ?? '#announcementMoreContent, .announcement-bar__more-content';
        this.moreContent = this.bar?.querySelector(moreSelector) ?? null;

        const markReadSelector = options.markReadBtnSelector ?? '#announcementMarkReadBtn, .announcement-bar__mark-read-btn';
        this.markReadBtn = this.bar?.querySelector(markReadSelector) ?? null;

        this.priorityEl = this.bar?.querySelector('.announcement-priority, .announcement-bar__priority') ?? null;

        this.storageKey = options.storageKey ?? STORAGE_KEYS.ANNOUNCEMENT_DISMISSED;
        this.onDismiss = options.onDismiss;
        this.onShow = options.onShow;
        this.onMarkRead = options.onMarkRead;

        // Determine announcement version ID
        const idFromAttr = this.bar?.getAttribute('data-announcement-id');
        this.announcementId = options.announcementId || idFromAttr || 'sjccc-announcement-v1';

        // Publication date & new notice pulse animation settings
        this.enableNewNoticePulse = options.enableNewNoticePulse ?? true;
        const pubAttr = this.bar?.getAttribute('data-published-at');
        if (options.publishedAt !== undefined) {
            this.publishedTimestamp = typeof options.publishedAt === 'number'
                ? options.publishedAt
                : new Date(options.publishedAt).getTime();
        } else if (pubAttr) {
            this.publishedTimestamp = new Date(pubAttr).getTime();
        } else {
            this.publishedTimestamp = Date.parse('2026-08-21T08:00:00Z');
        }

        // Determine priority level ('urgent' | 'important' | 'info')
        const priorityFromAttr = this.bar?.getAttribute('data-priority') as AnnouncementPriority | null;
        this.currentPriority = options.priority || priorityFromAttr || 'important';

        // Convert days to milliseconds (Default: 30 days)
        const days = options.dismissForDays ?? 30;
        this.dismissDurationMs = days * 24 * 60 * 60 * 1000;

        if (!this.bar) return;

        // Initialize historical modal controller
        const pastModalId = options.pastModalId ?? 'pastAnnouncementsModal';
        const pastBtnSelector = options.pastAnnouncementsBtnSelector ?? '#viewPastAnnouncementsBtn, .announcement-bar__past-btn';
        this.pastModal = new PastAnnouncementsModal(pastModalId, pastBtnSelector);

        this.init();
    }

    private init(): void {
        const isDismissed = this.checkIfDismissed();

        if (isDismissed) {
            this.hideBarInstantly();
        } else {
            this.show();
        }

        // Check persistent centralized state for 'Mark as Read' status
        this.isRead = announcementState.isNoticeRead(this.announcementId);
        this.applyReadState(this.isRead);

        // Subscribe to 'notice-read' event on the Custom Event Bus (ensures real-time sync with modal)
        this.unsubscribeNoticeRead = announcementEventBus.on<NoticeReadPayload>('notice-read', (payload) => {
            const matchesCurrent = payload.id === '*' || payload.id === this.announcementId || announcementState.matchesNoticeId(this.announcementId, payload.id);
            if (matchesCurrent) {
                const nextRead = payload.id === '*' ? false : payload.isRead;
                if (this.isRead !== nextRead) {
                    this.isRead = nextRead;
                    this.applyReadState(nextRead);
                    this.scheduleLayoutUpdate();
                }
            }
        });

        // Apply initial visual priority
        this.setPriority(this.currentPriority);

        this.observeSizeChanges();
        this.scheduleLayoutUpdate();
        window.addEventListener('load', this.boundUpdateLayout, { once: true });

        // Record session visit baseline if not already present
        try {
            if (!localStorage.getItem('sjccc_last_visit_timestamp')) {
                localStorage.setItem('sjccc_last_visit_timestamp', Date.now().toString());
            }
        } catch {
            // Ignore storage restrictions
        }

        // Trigger subtle 'new notice' auto-scroll or pulse animation for new urgent notices
        if (!isDismissed && !this.isRead && this.currentPriority === 'urgent') {
            if (this.enableNewNoticePulse && this.checkIfNewUrgentNoticeSinceLastSession()) {
                this.triggerNewNoticeAlert();
            } else {
                this.triggerUrgentAlert();
            }
        }
    }

    /**
     * Determines whether this is a newly published urgent notice since the user's previous session
     */
    private checkIfNewUrgentNoticeSinceLastSession(): boolean {
        if (this.currentPriority !== 'urgent' || this.isRead || this.isCurrentlyDismissed) {
            return false;
        }

        try {
            const lastSeenId = localStorage.getItem('sjccc_last_seen_urgent_notice_id');
            const lastVisitRaw = localStorage.getItem('sjccc_last_visit_timestamp');
            const lastVisitTimestamp = lastVisitRaw ? parseInt(lastVisitRaw, 10) : 0;

            // Brand new visitor or newly published notice ID
            if (!lastSeenId || lastSeenId !== this.announcementId) {
                return true;
            }

            // Notice published or updated after the user's recorded last visit
            if (this.publishedTimestamp > 0 && lastVisitTimestamp > 0 && this.publishedTimestamp > lastVisitTimestamp) {
                return true;
            }
        } catch {
            return true;
        }

        return false;
    }

    /**
     * Executes subtle auto-scroll and breathing pulse animation for newly published urgent announcements
     */
    private triggerNewNoticeAlert(): void {
        if (!this.bar || this.isCurrentlyDismissed || this.isRead) return;

        setTimeout(() => {
            if (!this.bar || this.isRead || this.isCurrentlyDismissed) return;

            // 1. Smooth auto-scroll bringing top announcement into clear view if scrolled down
            if (window.scrollY > 20) {
                try {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                } catch {
                    window.scrollTo(0, 0);
                }
            }

            // 2. Add glowing breathing aura pulse class
            this.bar.classList.add('new-notice-pulse');

            // 3. Inject subtle 'New Alert' beacon pill next to the priority tag
            const priorityEl = this.bar.querySelector('.announcement-priority, .announcement-bar__priority');
            let beaconPill = this.bar.querySelector('.new-notice-beacon-pill');
            if (!beaconPill && priorityEl && priorityEl.parentNode) {
                beaconPill = document.createElement('span');
                beaconPill.className = 'new-notice-beacon-pill';
                beaconPill.setAttribute('aria-label', 'New urgent notice published since your last visit');
                beaconPill.innerHTML = '<i class="bi bi-broadcast" aria-hidden="true"></i> New Alert';
                priorityEl.insertAdjacentElement('afterend', beaconPill);
            }

            // 4. Update session tracking in localStorage
            try {
                localStorage.setItem('sjccc_last_seen_urgent_notice_id', this.announcementId);
                localStorage.setItem('sjccc_last_visit_timestamp', Date.now().toString());
            } catch {
                // Ignore storage restrictions
            }

            // 6. Remove pulse class after 3 animation cycles finish (8.4s)
            setTimeout(() => {
                this.bar?.classList.remove('new-notice-pulse');
            }, 8400);
        }, 400);
    }

    private bindEvents(): void {
        this.closeBtn?.addEventListener('click', this.boundDismiss);
        this.bar?.addEventListener('keydown', this.boundKeydown);
        this.toggleBtn?.addEventListener('click', this.boundToggleReadMore);
        this.markReadBtn?.addEventListener('click', this.boundToggleMarkAsRead);
    }

    private handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.dismiss();
        }
    }

    /**
     * Triggers attention shake and gentle audio alert for unread urgent notices on page load
     */
    private triggerUrgentAlert(): void {
        if (!this.bar || this.isCurrentlyDismissed || this.isRead) return;

        // Brief 350ms delay after load for optimal visual effect
        setTimeout(() => {
            if (!this.bar || this.isRead || this.isCurrentlyDismissed) return;

            // Visual shake effect
            this.bar.classList.add('urgent-alert-shake');

            setTimeout(() => {
                this.bar?.classList.remove('urgent-alert-shake');
            }, 1800);
        }, 400);
    }

    /**
     * Persistent 'Mark as Read' using centralized announcementState
     * with subtle fade-out / slide-out visual feedback animation
     */
    public toggleMarkAsRead(forceState?: boolean): void {
        if (!this.bar) return;

        const nextReadState = forceState !== undefined ? forceState : !this.isRead;
        this.isRead = nextReadState;

        // Persist to centralized state (notifies subscribers including Past Announcements Modal)
        announcementState.setNoticeRead(this.announcementId, this.isRead);

        // Trigger subtle fade-out or slide-out visual feedback animation
        if (this.isRead) {
            this.bar.classList.remove('is-unmarking-read');
            this.bar.classList.add('is-marking-read');
            setTimeout(() => {
                this.bar?.classList.remove('is-marking-read');
            }, 420);
        } else {
            this.bar.classList.remove('is-marking-read');
            this.bar.classList.add('is-unmarking-read');
            setTimeout(() => {
                this.bar?.classList.remove('is-unmarking-read');
            }, 380);
        }

        this.applyReadState(this.isRead);
        this.onMarkRead?.(this.isRead);
        this.scheduleLayoutUpdate();
    }

    public markAsRead(): void {
        this.toggleMarkAsRead(true);
    }

    public markAsUnread(): void {
        this.toggleMarkAsRead(false);
    }

    public isMarkedRead(): boolean {
        return this.isRead;
    }

    private applyReadState(isRead: boolean): void {
        if (!this.bar) return;

        // Apply shared classes programmatically (including .read-receipt-applied)
        this.bar.classList.toggle('read-receipt-applied', isRead);
        this.bar.classList.toggle('is-read', isRead);
        this.bar.classList.toggle('notice-seen-dimmed', isRead);

        if (this.markReadBtn) {
            this.markReadBtn.setAttribute('aria-pressed', String(isRead));
            this.markReadBtn.classList.add('notice-read-receipt');
            this.markReadBtn.classList.toggle('read-receipt-applied', isRead);
            this.markReadBtn.classList.toggle('is-read', isRead);
            this.markReadBtn.classList.toggle('is-unread', !isRead);

            const icon = this.markReadBtn.querySelector('i');
            const textSpan = this.markReadBtn.querySelector('.mark-read-text, .action-btn-text');

            if (isRead) {
                this.markReadBtn.title = 'Announcement marked as read (Click to unmark)';
                this.markReadBtn.setAttribute('data-tooltip', 'Marked read (click to unmark)');
                this.markReadBtn.setAttribute('aria-label', 'Announcement marked as read');
                if (icon) icon.className = 'bi bi-check-circle-fill';
                if (textSpan) textSpan.textContent = 'Read';
            } else {
                this.markReadBtn.title = 'Mark this announcement as read (persists across visits)';
                this.markReadBtn.setAttribute('data-tooltip', 'Mark as read');
                this.markReadBtn.setAttribute('aria-label', 'Mark this announcement as read');
                if (icon) icon.className = 'bi bi-check2';
                if (textSpan) textSpan.textContent = 'Mark as read';
            }
        }
    }

    /**
     * Clears all announcement-related localStorage (dismissals & read marks)
     */
    public static clearAllStorage(): void {
        try {
            announcementState.clearAllReadStates();

            const keys = [
                'announcement_dismissed',
                'Interview_announcement_dismissed',
                'sjccc_last_seen_urgent_notice_id',
                'sjccc_last_visit_timestamp',
                STORAGE_KEYS.INTERVIEW_ANNOUNCEMENT_DISMISSED,
                STORAGE_KEYS.ANNOUNCEMENT_DISMISSED
            ];
            keys.forEach(k => localStorage.removeItem(k));

            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sjccc_notice_') || key.includes('announcement'))) {
                    localStorage.removeItem(key);
                }
            }
        } catch {
            // Storage quota/privacy
        }
    }

    /**
     * Sets the visual priority indicator ('urgent' | 'important' | 'info')
     */
    public setPriority(priority: AnnouncementPriority): void {
        this.currentPriority = priority;
        if (!this.bar) return;

        this.bar.setAttribute('data-priority', priority);
        this.bar.classList.remove('priority-urgent', 'priority-important', 'priority-info');
        this.bar.classList.add(`priority-${priority}`);

        if (this.priorityEl) {
            this.priorityEl.className = `announcement-priority priority-${priority}`;
            this.priorityEl.setAttribute('data-priority', priority);

            const icon = this.priorityEl.querySelector('.priority-icon');
            const label = this.priorityEl.querySelector('.priority-label');

            let iconClass = 'bi bi-patch-exclamation-fill';
            let labelText = 'Important';

            if (priority === 'urgent') {
                iconClass = 'bi bi-exclamation-triangle-fill';
                labelText = 'Urgent';
                this.priorityEl.setAttribute('aria-label', 'Priority: Urgent Notice');
            } else if (priority === 'important') {
                iconClass = 'bi bi-patch-exclamation-fill';
                labelText = 'Important';
                this.priorityEl.setAttribute('aria-label', 'Priority: Important Notice');
            } else {
                iconClass = 'bi bi-info-circle-fill';
                labelText = 'General';
                this.priorityEl.setAttribute('aria-label', 'Priority: General Information');
            }

            if (icon) icon.className = `${iconClass} priority-icon`;
            if (label) label.textContent = labelText;
        }

        this.scheduleLayoutUpdate();
    }

    public getPriority(): AnnouncementPriority {
        return this.currentPriority;
    }

    /**
     * Toggles the expandable message content ("Read more" / "Read less")
     */
    public toggleReadMore(forceState?: boolean): void {
        if (!this.bar) return;

        this.isExpanded = forceState !== undefined ? forceState : !this.isExpanded;
        this.bar.classList.toggle('is-expanded', this.isExpanded);

        if (this.moreContent) {
            if (this.isExpanded) {
                this.moreContent.removeAttribute('hidden');
            } else {
                this.moreContent.setAttribute('hidden', '');
            }
        }

        if (this.toggleBtn) {
            this.toggleBtn.setAttribute('aria-expanded', String(this.isExpanded));
            const textSpan = this.toggleBtn.querySelector('.toggle-text');
            const icon = this.toggleBtn.querySelector('i');

            if (this.isExpanded) {
                if (textSpan) textSpan.textContent = 'Read less';
                if (icon) icon.className = 'bi bi-chevron-up';
            } else {
                if (textSpan) textSpan.textContent = 'Read more';
                if (icon) icon.className = 'bi bi-chevron-down';
            }
        }

        this.scheduleLayoutUpdate();
    }

    /**
     * Checks localStorage to see if the dismissal record is valid and unexpired.
     */
    private checkIfDismissed(): boolean {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return false;

        try {
            let hiddenUntil: number;
            let storedId: string | null = null;

            if (raw.startsWith('{')) {
                const parsed = JSON.parse(raw) as StoredDismissalRecord;
                hiddenUntil = parsed.hiddenUntil;
                storedId = parsed.noticeId;
            } else {
                hiddenUntil = parseInt(raw, 10);
            }

            if (storedId && storedId !== this.announcementId) {
                localStorage.removeItem(this.storageKey);
                return false;
            }

            if (!isNaN(hiddenUntil) && Date.now() < hiddenUntil) {
                return true;
            }
        } catch {
            // Malformed data
        }

        localStorage.removeItem(this.storageKey);
        return false;
    }

    /**
     * Gracefully dismisses the bar with smooth slide up & layout variable interpolation
     */
    public dismiss(permanent = true): void {
        if (!this.bar || this.isCurrentlyDismissed) return;

        this.isCurrentlyDismissed = true;

        if (permanent) {
            const record: StoredDismissalRecord = {
                hiddenUntil: Date.now() + this.dismissDurationMs,
                noticeId: this.announcementId,
            };
            localStorage.setItem(this.storageKey, JSON.stringify(record));
        }

        this.bar.classList.add('dismissing');
        this.bar.setAttribute('aria-hidden', 'true');

        const currentHeight = this.bar.offsetHeight;
        const startTime = performance.now();
        const duration = 320;

        const animateCollapse = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const interpolatedHeight = Math.max(0, currentHeight * (1 - eased));

            document.documentElement.style.setProperty('--bar-height', `${interpolatedHeight.toFixed(1)}px`);

            if (progress < 1) {
                requestAnimationFrame(animateCollapse);
            } else {
                this.finalizeDismissal();
            }
        };

        requestAnimationFrame(animateCollapse);
    }

    private finalizeDismissal(): void {
        if (!this.bar) return;

        this.bar.classList.remove('dismissing');
        this.bar.classList.add('dismissed');
        document.documentElement.style.setProperty('--bar-height', '0px');

        this.closeBtn?.removeEventListener('click', this.boundDismiss);
        this.bar.removeEventListener('keydown', this.boundKeydown);
        this.toggleBtn?.removeEventListener('click', this.boundToggleReadMore);
        this.markReadBtn?.removeEventListener('click', this.boundToggleMarkAsRead);

        this.scheduleLayoutUpdate();
        this.onDismiss?.();
    }

    private hideBarInstantly(): void {
        if (!this.bar) return;
        this.isCurrentlyDismissed = true;
        this.bar.classList.add('dismissed');
        this.bar.setAttribute('aria-hidden', 'true');
        document.documentElement.style.setProperty('--bar-height', '0px');
    }

    /**
     * Shows the announcement bar programmatically
     */
    public show(): void {
        if (!this.bar) return;
        this.isCurrentlyDismissed = false;
        this.bar.classList.remove('dismissed', 'dismissing');
        this.bar.removeAttribute('aria-hidden');
        this.bindEvents();
        this.scheduleLayoutUpdate();
        this.onShow?.();
    }

    /**
     * Clears dismissal record from localStorage and displays the bar
     */
    public resetDismissal(): void {
        localStorage.removeItem(this.storageKey);
        this.show();
    }

    public isDismissed(): boolean {
        return this.isCurrentlyDismissed;
    }

    public isMessageExpanded(): boolean {
        return this.isExpanded;
    }

    /**
     * Dynamically updates the announcement text, date, and CTA link
     */
    public updateMessage(title: string, dateText?: string, moreDetails?: string, ctaText?: string, ctaHref?: string): void {
        if (!this.bar) return;

        const titleEl = this.bar.querySelector('.announcement-bar__title');
        const dateEl = this.bar.querySelector('.announcement-bar__date');
        const ctaEl = this.bar.querySelector('.announcement-bar__cta');

        if (titleEl) titleEl.textContent = title;
        if (dateEl && dateText) dateEl.textContent = dateText;
        if (this.moreContent && moreDetails) {
            this.moreContent.textContent = moreDetails;
        }

        if (ctaEl) {
            if (ctaText) {
                const span = ctaEl.querySelector('span');
                if (span) span.textContent = ctaText;
                else ctaEl.textContent = ctaText;
            }
            if (ctaHref && ctaEl instanceof HTMLAnchorElement) {
                ctaEl.href = ctaHref;
            }
        }

        this.scheduleLayoutUpdate();
    }

    /**
     * Opens the past announcements modal programmatically
     */
    public openPastAnnouncements(): void {
        this.pastModal?.open();
    }

    private scheduleLayoutUpdate(): void {
        if (this.rAFId) cancelAnimationFrame(this.rAFId);
        this.rAFId = requestAnimationFrame(() => this.boundUpdateLayout());
    }

    private updateLayout(): void {
        const root = document.documentElement;

        const headerHeight = this.header?.offsetHeight ?? 0;
        const isDismissed = this.bar?.classList.contains('dismissed') || this.isCurrentlyDismissed;
        const barHeight = isDismissed || !this.bar ? 0 : this.bar.offsetHeight;

        if (this.header) {
            root.style.setProperty('--header-height', `${headerHeight}px`);
        }
        root.style.setProperty('--bar-height', `${barHeight}px`);
    }

    private observeSizeChanges(): void {
        if (typeof ResizeObserver === 'undefined') return;

        this.resizeObserver = new ResizeObserver(() => this.scheduleLayoutUpdate());
        if (this.header) this.resizeObserver.observe(this.header);
        if (this.bar) this.resizeObserver.observe(this.bar);
    }

    public destroy(): void {
        this.unsubscribeState?.();
        this.unsubscribeNoticeRead?.();
        this.resizeObserver?.disconnect();
        window.removeEventListener('load', this.boundUpdateLayout);
        this.closeBtn?.removeEventListener('click', this.boundDismiss);
        this.bar?.removeEventListener('keydown', this.boundKeydown);
        this.toggleBtn?.removeEventListener('click', this.boundToggleReadMore);
        this.markReadBtn?.removeEventListener('click', this.boundToggleMarkAsRead);
        if (this.rAFId) cancelAnimationFrame(this.rAFId);
        if (this.dismissTimer) clearTimeout(this.dismissTimer);
        this.pastModal?.destroy();
    }
}
