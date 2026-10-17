/**
 * ============================================================================
 * SJCCC – Academic Milestone 24-Hour Reminder Service
 * Coordinates 'Remind me' checkboxes within .timeline-track-container,
 * browser Notification API permissions and alerts, and rich in-app toast notifications.
 * ============================================================================
 */

import { type AcademicMilestone, ACADEMIC_MILESTONES_2026_2027 } from '../../data/academicCalendar.ts';
import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';
import {
    milestoneChimeSynthesizer,
    CHIME_OPTIONS,
    type ChimeId,
    type ChimeOption,
} from './MilestoneChimeSynthesizer.ts';
import {
    detectPlatform,
    getNotificationPermissionGuidance,
} from '../../core/platform/platformDetection.ts';
import {
    notificationGuidanceModal,
    NotificationGuidanceModal,
} from './NotificationGuidanceModal.ts';

export {
    milestoneChimeSynthesizer,
    CHIME_OPTIONS,
    type ChimeId,
    type ChimeOption,
    notificationGuidanceModal,
    NotificationGuidanceModal,
};

export type ReminderCategory = 'Exams' | 'Assignments' | 'Fees' | 'General';

export interface ReminderCategoryConfig {
    id: ReminderCategory;
    label: string;
    icon: string;
    color: string;
    textColor: string;
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
    badgeClass: string;
    cardClass: string;
    description: string;
}

export const REMINDER_CATEGORIES: Record<ReminderCategory, ReminderCategoryConfig> = {
    Exams: {
        id: 'Exams',
        label: 'Exams',
        icon: 'bi-mortarboard-fill',
        color: '#8b5cf6',
        textColor: '#6d28d9',
        bgLight: 'rgba(139, 92, 246, 0.12)',
        bgDark: 'rgba(139, 92, 246, 0.22)',
        borderLight: 'rgba(139, 92, 246, 0.3)',
        borderDark: 'rgba(167, 139, 250, 0.35)',
        badgeClass: 'category-badge--exams',
        cardClass: 'my-reminder-card--exams',
        description: 'Examinations, mock tests, and GCE evaluations',
    },
    Assignments: {
        id: 'Assignments',
        label: 'Assignments',
        icon: 'bi-journal-check',
        color: '#f59e0b',
        textColor: '#b45309',
        bgLight: 'rgba(245, 158, 11, 0.12)',
        bgDark: 'rgba(245, 158, 11, 0.22)',
        borderLight: 'rgba(245, 158, 11, 0.3)',
        borderDark: 'rgba(251, 191, 36, 0.35)',
        badgeClass: 'category-badge--assignments',
        cardClass: 'my-reminder-card--assignments',
        description: 'Coursework, homework, projects, and lab submissions',
    },
    Fees: {
        id: 'Fees',
        label: 'Fees',
        icon: 'bi-cash-coin',
        color: '#10b981',
        textColor: '#047857',
        bgLight: 'rgba(16, 185, 129, 0.12)',
        bgDark: 'rgba(16, 185, 129, 0.22)',
        borderLight: 'rgba(16, 185, 129, 0.3)',
        borderDark: 'rgba(52, 211, 153, 0.35)',
        badgeClass: 'category-badge--fees',
        cardClass: 'my-reminder-card--fees',
        description: 'Tuition installments, PTA levies, and clearance payments',
    },
    General: {
        id: 'General',
        label: 'General',
        icon: 'bi-bookmark-star-fill',
        color: '#0284c7',
        textColor: '#0369a1',
        bgLight: 'rgba(2, 132, 199, 0.12)',
        bgDark: 'rgba(2, 132, 199, 0.22)',
        borderLight: 'rgba(2, 132, 199, 0.3)',
        borderDark: 'rgba(56, 189, 248, 0.35)',
        badgeClass: 'category-badge--general',
        cardClass: 'my-reminder-card--general',
        description: 'Semester resumptions, breaks, holidays, and campus events',
    },
};

/**
 * Heuristically infers the most relevant organization category ('Exams', 'Assignments', 'Fees', 'General')
 * from title, description, and canonical milestone metadata.
 */
export function inferReminderCategory(title: string, desc?: string, originalCategory?: string): ReminderCategory {
    const text = `${title} ${desc || ''}`.toLowerCase();
    if (
        originalCategory === 'exam' ||
        text.includes('exam') ||
        text.includes('mock') ||
        text.includes('gce') ||
        text.includes('evaluation') ||
        text.includes('test')
    ) {
        return 'Exams';
    }
    if (
        text.includes('fee') ||
        text.includes('tuition') ||
        text.includes('payment') ||
        text.includes('pta') ||
        text.includes('clearance') ||
        text.includes('installment') ||
        text.includes('dues')
    ) {
        return 'Fees';
    }
    if (
        text.includes('assignment') ||
        text.includes('homework') ||
        text.includes('coursework') ||
        text.includes('submission') ||
        text.includes('project') ||
        text.includes('workshop report') ||
        text.includes('practical report')
    ) {
        return 'Assignments';
    }
    return 'General';
}

export type SnoozeDurationHours = 1 | 6 | 12;

export interface SnoozeOptionInfo {
    hours: SnoozeDurationHours;
    label: string;
    ms: number;
    valid: boolean;
    targetTime: number;
    reason?: string;
}

export interface StoredMilestoneReminder {
    milestoneId: string;
    title: string;
    dateText: string;
    location: string;
    description: string;
    eventTime: number; // UTC timestamp of event start
    reminderTime: number; // UTC timestamp 24 hours prior to eventTime or snoozed time
    createdAt: number;
    notifiedAt?: number;
    category?: ReminderCategory;
    snoozedUntil?: number;
    snoozeCount?: number;
}

export interface SentNotificationRecord {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    type: 'milestone' | 'test';
    suppressed?: boolean;
    milestoneId?: string;
    dateText?: string;
    categoryLabel?: string;
}

export interface ToastOptions {
    id?: string;
    type?: 'reminder' | 'success' | 'info' | 'warning';
    title: string;
    message: string;
    dateBadge?: string;
    actionLabel?: string;
    onAction?: () => void;
    linkText?: string;
    linkUrl?: string;
    onLinkClick?: () => void;
    duration?: number; // ms, default 7000ms
    playChime?: boolean;
    milestoneId?: string;
    eventTime?: number;
    category?: ReminderCategory;
    onSnooze?: (hours: SnoozeDurationHours) => void;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_SET_TIMEOUT_MS = 2147483647; // 32-bit signed int (~24.8 days)

export class MilestoneReminderService {
    private container: HTMLElement | null = null;
    private toastContainer: HTMLElement | null = null;
    private activeTimers: Map<string, number> = new Map();
    private checkIntervalId: number | null = null;
    private themeObserver: MutationObserver | null = null;
    private isInitialized = false;

    constructor() {
        // Safe lazy constructor
    }

    /**
     * Initializes the reminder service across the timeline track container.
     */
    public init(containerElement?: HTMLElement | null): void {
        this.container = containerElement
            || document.querySelector<HTMLElement>('.timeline-track-container')
            || document.body;

        this.ensureToastContainer();
        this.syncCheckboxesFromStorage();
        this.bindCheckboxEvents();
        this.scheduleStoredReminders();
        this.startPeriodicCheck();

        // Listen for notificationclick FOCUS_MILESTONE signals from the Service Worker
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            try {
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data?.type === 'FOCUS_MILESTONE' && event.data.milestoneId) {
                        this.scrollToMilestone(event.data.milestoneId);
                    }
                });
            } catch {
                // Ignore in mock DOM
            }
        }

        this.isInitialized = true;
    }

    /**
     * Ensures the singleton toast container element exists in the DOM.
     */
    private ensureToastContainer(): HTMLElement {
        let el = document.getElementById('milestoneToastContainer');
        if (!el) {
            el = document.createElement('div');
            el.id = 'milestoneToastContainer';
            el.className = 'milestone-toast-container';
            el.setAttribute('aria-live', 'polite');
            el.setAttribute('aria-atomic', 'true');
            el.setAttribute('role', 'region');
            el.setAttribute('aria-label', 'Milestone reminders and notifications');
            document.body.appendChild(el);
        }
        this.toastContainer = el;

        // Ensure active toasts remain theme-synchronized if user toggles dark/light mode
        if (!this.themeObserver && typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
            try {
                this.themeObserver = new MutationObserver(() => {
                    this.syncActiveToastsTheme();
                });
                this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
                if (document.body) {
                    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                }
            } catch {
                // Ignore in headless/mock DOM
            }
        }

        return el;
    }

    /**
     * Synchronizes all active toasts with the current active theme.
     */
    public syncActiveToastsTheme(): void {
        if (!this.toastContainer) return;
        const isDark = (typeof document !== 'undefined') && (
            document.documentElement.classList.contains('dark-mode') ||
            document.body?.classList.contains('dark-mode') ||
            document.documentElement.getAttribute('data-theme') === 'dark'
        );
        const theme = isDark ? 'dark' : 'light';
        const toasts = this.toastContainer.querySelectorAll<HTMLElement>('.milestone-toast');
        toasts.forEach((toast) => {
            toast.setAttribute('data-theme', theme);
        });
    }

    /**
     * Opens the device-specific notification permission guidance modal.
     */
    public showNotificationHelp(guideKey?: string): void {
        notificationGuidanceModal.open(guideKey);
    }

    /**
     * Binds change listeners to all 'Remind me' checkboxes in the timeline container.
     */
    public bindCheckboxEvents(): void {
        const root = this.container || document;
        const checkboxes = root.querySelectorAll<HTMLInputElement>('.timeline-remind-me-checkbox');

        checkboxes.forEach((cb) => {
            // Avoid duplicate listeners
            if (cb.dataset.reminderBound === 'true') return;
            cb.dataset.reminderBound = 'true';

            cb.addEventListener('change', async () => {
                await this.handleCheckboxToggle(cb);
            });
        });
    }

    /**
     * Synchronizes all checkboxes with the persisted storage state.
     */
    public syncCheckboxesFromStorage(): void {
        const stored = this.getAllStoredReminders();
        const root = this.container || document;
        const checkboxes = root.querySelectorAll<HTMLInputElement>('.timeline-remind-me-checkbox');

        checkboxes.forEach((cb) => {
            const milestoneId = cb.dataset.milestoneId || '';
            const isSaved = Boolean(stored[milestoneId]);
            cb.checked = isSaved;

            const label = cb.closest<HTMLLabelElement>('.timeline-remind-me-label');
            if (label) {
                label.classList.toggle('is-checked', isSaved);
            }
        });
    }

    /**
     * Handles user interaction with a milestone 'Remind me' checkbox.
     */
    public async handleCheckboxToggle(checkbox: HTMLInputElement): Promise<void> {
        const milestoneId = checkbox.dataset.milestoneId;
        if (!milestoneId) return;

        const milestone = this.findMilestone(milestoneId);
        if (!milestone) return;

        const label = checkbox.closest<HTMLLabelElement>('.timeline-remind-me-label');

        if (checkbox.checked) {
            if (label) label.classList.add('is-checked');
            await this.enableReminder(milestone);
        } else {
            if (label) label.classList.remove('is-checked');
            this.disableReminder(milestone);
        }
    }

    /**
     * Enables 24-hour reminder for a milestone, prompts for notification permission,
     * schedules the timer, and displays the appropriate toast notification.
     */
    public async enableReminder(milestoneOrId: AcademicMilestone | string): Promise<void> {
        let milestone: AcademicMilestone;
        if (typeof milestoneOrId === 'string') {
            const found = this.findMilestone(milestoneOrId);
            if (found) {
                milestone = found;
            } else {
                milestone = {
                    ...ACADEMIC_MILESTONES_2026_2027[0],
                    id: milestoneOrId,
                    title: milestoneOrId,
                } as unknown as AcademicMilestone;
            }
        } else {
            milestone = milestoneOrId;
        }

        // Request browser notification permission if available and not yet granted/denied
        const perm = await this.requestNotificationPermission();

        const eventTime = this.getMilestoneStartTime(milestone);
        const reminderTime = eventTime - TWENTY_FOUR_HOURS_MS;
        const now = Date.now();

        const category = inferReminderCategory(milestone.title, milestone.description, milestone.category);

        const record: StoredMilestoneReminder = {
            milestoneId: milestone.id,
            title: milestone.title,
            dateText: milestone.dateText,
            location: milestone.location,
            description: milestone.description,
            eventTime,
            reminderTime,
            createdAt: now,
            category,
        };

        this.saveReminder(record);

        // If the milestone is already within 24 hours of starting (or past)
        if (now >= reminderTime) {
            // Immediately trigger the 24-hour notification
            this.triggerReminder(milestone.id, false);
            if (perm === 'denied') {
                const platform = detectPlatform();
                const guidance = getNotificationPermissionGuidance(platform);
                this.showToast({
                    type: 'warning',
                    title: 'Browser Notifications Blocked',
                    message: `Browser alerts are blocked in settings, but in-app toast notifications will still alert you! You can unblock notifications in ${platform.browserLabel} on ${platform.osLabel}.`,
                    linkText: `How to allow notifications on ${platform.browserLabel} (${platform.osLabel})`,
                    onLinkClick: () => {
                        this.showNotificationHelp(guidance.key);
                    },
                    actionLabel: `Allow Guide`,
                    onAction: () => {
                        this.showNotificationHelp(guidance.key);
                    },
                    duration: 12000,
                });
            }
        } else {
            // Milestone is in the future (>24h away)
            const delayMs = reminderTime - now;
            this.scheduleTimer(milestone.id, delayMs);

            const reminderDate = new Date(reminderTime);
            const formattedDate = this.formatDateTime(reminderDate);

            // Inform the user via in-app toast with option to test
            this.showToast({
                type: 'success',
                title: 'Reminder Scheduled',
                message: `You'll be notified 24 hours before ${milestone.title} (${formattedDate}).`,
                dateBadge: milestone.dateText,
                actionLabel: perm === 'denied' ? undefined : 'Test Alert Now',
                onAction: () => {
                    this.triggerReminder(milestone.id, true);
                },
            });

            if (perm === 'denied') {
                const platform = detectPlatform();
                const guidance = getNotificationPermissionGuidance(platform);
                this.showToast({
                    type: 'warning',
                    title: 'Browser Notifications Blocked',
                    message: `Browser alerts are blocked in settings, but in-app toast notifications will still alert you! You can unblock notifications in ${platform.browserLabel} on ${platform.osLabel}.`,
                    linkText: `How to allow notifications on ${platform.browserLabel} (${platform.osLabel})`,
                    onLinkClick: () => {
                        this.showNotificationHelp(guidance.key);
                    },
                    actionLabel: `Allow Guide`,
                    onAction: () => {
                        this.showNotificationHelp(guidance.key);
                    },
                    duration: 12000,
                });
            }
        }
    }

    /**
     * Disables reminder for a milestone and removes from storage.
     */
    public disableReminder(milestone: AcademicMilestone): void {
        this.clearTimer(milestone.id);
        this.removeStoredReminder(milestone.id);

        this.showToast({
            type: 'info',
            title: 'Reminder Removed',
            message: `24-hour reminder cancelled for "${milestone.title}".`,
            duration: 4000,
        });
    }

    /**
     * Triggers the 24-hour notification for a milestone (both Toast and Browser Notification).
     */
    public triggerReminder(milestoneId: string, isManualTest = false): void {
        const milestone = this.findMilestone(milestoneId);
        if (!milestone) return;

        // Mark as notified in storage
        const stored = this.getAllStoredReminders();
        if (stored[milestoneId] && !isManualTest) {
            stored[milestoneId].notifiedAt = Date.now();
            this.persistAllReminders(stored);
        }

        const titleText = isManualTest
            ? `[Test Alert] 24h Before: ${milestone.title}`
            : `Upcoming Milestone (in 24 Hours): ${milestone.title}`;

        const bodyText = `${milestone.title} commences on ${milestone.dateText} at ${milestone.location}. ${milestone.timeOrDuration || ''}`.trim();

        const isMuted = this.isMuted();

        // Record to Notification History (maintaining last 5 sent notifications)
        this.recordNotificationHistory({
            milestoneId: milestone.id,
            title: titleText,
            body: bodyText,
            timestamp: Date.now(),
            type: isManualTest ? 'test' : 'milestone',
            suppressed: isMuted,
            dateText: milestone.dateText,
            categoryLabel: milestone.categoryLabel,
        });

        // If muted, locally suppress audio chime, browser notification, and standard popup
        if (isMuted) {
            this.showToast({
                type: 'info',
                title: `Muted: ${milestone.title}`,
                message: `Advance alert for "${milestone.title}" was suppressed locally because notifications are muted. Review in Notification History.`,
                dateBadge: milestone.dateText,
                duration: 6000,
            });
            return;
        }

        // Play subtle synthetic audio chime
        void milestoneChimeSynthesizer.playChime();

        const milestoneCategory = stored[milestoneId]?.category || inferReminderCategory(milestone.title, milestone.description, milestone.category);
        const eventStartTime = stored[milestoneId]?.eventTime || this.getMilestoneStartTime(milestone);

        // 1. Show rich in-app Toast Notification
        this.showToast({
            type: 'reminder',
            title: titleText,
            message: bodyText,
            dateBadge: milestone.dateText,
            category: milestoneCategory,
            actionLabel: 'View in Timeline',
            onAction: () => {
                this.scrollToMilestone(milestone.id);
            },
            milestoneId: milestone.id,
            eventTime: eventStartTime,
            duration: isManualTest ? 8000 : 12000,
        });

        // 2. Fire Browser Notification API
        this.showBrowserNotification(titleText, {
            body: bodyText,
            tag: `sjccc-milestone-${milestone.id}`,
            icon: '/assets/favicon.ico',
        });
    }

    /**
     * Triggers Browser Notification API if supported and granted.
     */
    public showBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return null;
        }

        if (this.isMuted()) {
            return null;
        }

        if (Notification.permission === 'granted') {
            try {
                return new Notification(title, {
                    icon: '/assets/favicon.ico',
                    badge: '/assets/favicon.ico',
                    ...options,
                });
            } catch (err) {
                console.warn('[MilestoneReminderService] Browser notification could not be created:', err);
                return null;
            }
        }

        return null;
    }

    /**
     * Requests Notification API permission from the browser.
     */
    public async requestNotificationPermission(): Promise<NotificationPermission> {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'denied';
        }

        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            if (Notification.permission === 'granted') {
                this.setPushNotificationsEnabled(true);
            }
            return Notification.permission;
        }

        try {
            const res = await Notification.requestPermission();
            if (res === 'granted') {
                this.setPushNotificationsEnabled(true);
            }
            return res;
        } catch {
            return Notification.permission;
        }
    }

    /**
     * Checks if push notifications are enabled by the user preference.
     */
    public isPushNotificationsEnabled(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            const storedMute = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_MUTED);
            if (storedMute === 'true') {
                return false;
            }
            const stored = localStorage.getItem(STORAGE_KEYS.MILESTONE_PUSH_ENABLED);
            if (stored === null) {
                return 'Notification' in window && Notification.permission === 'granted';
            }
            return stored === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Sets user preference for browser push notifications and updates UI.
     */
    public setPushNotificationsEnabled(enabled: boolean): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEYS.MILESTONE_PUSH_ENABLED, enabled ? 'true' : 'false');
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_MUTED, enabled ? 'false' : 'true');
        } catch (err) {
            console.warn('[MilestoneReminderService] Could not persist push preference:', err);
        }

        this.dispatchUpdateEvent();
    }

    /**
     * Checks if notifications are locally muted by user preference.
     */
    public isMuted(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            const storedMute = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_MUTED);
            if (storedMute !== null) {
                return storedMute === 'true';
            }
            const pushPref = localStorage.getItem(STORAGE_KEYS.MILESTONE_PUSH_ENABLED);
            if (pushPref === 'false') {
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Alias for isMuted() indicating whether notifications are locally suppressed.
     */
    public isNotificationsMuted(): boolean {
        return this.isMuted();
    }

    /**
     * Sets local mute state for notifications without revoking browser permissions.
     */
    public setMuted(muted: boolean): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_MUTED, muted ? 'true' : 'false');
            localStorage.setItem(STORAGE_KEYS.MILESTONE_PUSH_ENABLED, muted ? 'false' : 'true');
        } catch (err) {
            console.warn('[MilestoneReminderService] Could not persist mute preference:', err);
        }

        this.dispatchUpdateEvent();
    }

    /**
     * Alias for setMuted(muted).
     */
    public setNotificationsMuted(muted: boolean): void {
        this.setMuted(muted);
    }

    /**
     * Retrieves the last 5 sent notifications from localStorage.
     */
    public getNotificationHistory(): SentNotificationRecord[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    /**
     * Records a sent or triggered notification to history, maintaining the last 5 sent notifications.
     */
    public recordNotificationHistory(record: Omit<SentNotificationRecord, 'id'>): SentNotificationRecord {
        const history = this.getNotificationHistory();
        const newRecord: SentNotificationRecord = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            ...record,
        };
        const updated = [newRecord, ...history].slice(0, 5);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(updated));
            } catch (err) {
                console.warn('[MilestoneReminderService] Could not persist notification history:', err);
            }
            this.dispatchUpdateEvent();
        }
        return newRecord;
    }

    /**
     * Clears all notification history records.
     */
    public clearNotificationHistory(): void {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
            } catch (err) {
                console.warn('[MilestoneReminderService] Could not clear notification history:', err);
            }
            this.dispatchUpdateEvent();
        }
    }

    /**
     * Dispatches milestone-reminders-updated custom event across window.
     */
    public dispatchUpdateEvent(): void {
        if (typeof window !== 'undefined') {
            try {
                const Evt = (window as any).CustomEvent || CustomEvent;
                window.dispatchEvent(new Evt('milestone-reminders-updated'));
            } catch {
                // Safe fallback in non-standard test runners
            }
        }
    }

    /**
     * Service function that uses the Notification API to determine 'granted', 'denied', or 'default' states
     * (or 'unsupported' if window or Notification API is unavailable).
     */
    public checkNotificationStatus(): NotificationPermission | 'unsupported' {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    }

    /**
     * Returns high-level state of notifications for UI toggle representation:
     * - 'granted': Browser permission granted AND push toggle is enabled
     * - 'muted': Browser permission granted, but user toggled push alerts OFF
     * - 'default': Browser permission not yet requested (unprompted)
     * - 'denied': Browser permission blocked in browser/OS settings
     * - 'unsupported': Browser lacks Notification API
     */
    public getNotificationState(): 'granted' | 'muted' | 'default' | 'denied' | 'unsupported' {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'unsupported';
        }
        const perm = Notification.permission;
        if (perm === 'denied') {
            return 'denied';
        }
        if (perm === 'granted') {
            return this.isPushNotificationsEnabled() ? 'granted' : 'muted';
        }
        return 'default';
    }

    /**
     * Returns whether the application is running in a local or development environment.
     * Production deployments (such as Vercel or custom domains) return false to disable test keys.
     */
    public isDevEnvironment(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            if ((import.meta as any).env?.DEV) return true;
        } catch {
            // ignore
        }
        const host = window.location.hostname || '';
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
            return true;
        }
        if (host.includes('ais-dev')) {
            return true;
        }
        return false;
    }

    /**
     * Sends an immediate test alert to verify browser notifications and chime.
     */
    public async sendTestNotification(): Promise<boolean> {
        const isMuted = this.isMuted();
        const title = 'SJCCC Milestone Push Test';
        const body = isMuted
            ? 'Browser push alert was suppressed because notifications are currently muted.'
            : 'Browser push notifications are active and ready to alert you 24 hours before your scheduled milestones!';

        // Record test alert in Notification History (last 5 sent notifications)
        this.recordNotificationHistory({
            title,
            body,
            timestamp: Date.now(),
            type: 'test',
            suppressed: isMuted,
        });

        // If muted, suppress chime, browser notification, and SW message
        if (isMuted) {
            this.showToast({
                type: 'warning',
                title: 'Test Notification Suppressed (Muted)',
                message: 'Notifications are muted. The test alert was suppressed locally without revoking browser permissions and recorded in Notification History.',
                duration: 6000,
            });
            return true;
        }

        milestoneChimeSynthesizer.playChime();

        // Try service worker notification first
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({
                    type: 'TEST_PUSH_NOTIFICATION',
                });
            } catch (err) {
                console.warn('[MilestoneReminderService] SW postMessage failed for test push:', err);
            }
        }

        // Also trigger via Notification constructor if permission granted
        this.showBrowserNotification('SJCCC Milestone Push Test', {
            body: 'Browser push notifications are active and ready to alert you 24 hours before your scheduled milestones!',
            tag: 'sjccc-test-push',
        });

        this.showToast({
            type: 'success',
            title: 'Test Notification Dispatched',
            message: 'Browser push alert sent! Check your system notification center or desktop alert area.',
            duration: 6000,
        });

        return true;
    }

    /**
     * Schedules and dispatches a test alert with a delay (defaults to 5 seconds)
     * to allow users to verify background notification delivery and synthetic chime.
     */
    public async sendDelayedTestNotification(delaySeconds: number = 5): Promise<boolean> {
        this.showToast({
            type: 'info',
            title: 'Test Notification Scheduled',
            message: `A test alert will sound and trigger in ${delaySeconds} seconds. You can switch tabs or minimize the browser to verify background delivery!`,
            duration: Math.max(delaySeconds * 1000, 3000),
        });

        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, delaySeconds * 1000);
        });

        return this.sendTestNotification();
    }

    /**
     * Renders an interactive in-app toast notification card into #milestoneToastContainer.
     */
    public showToast(options: ToastOptions): HTMLElement {
        const container = this.ensureToastContainer();

        const toast = document.createElement('div');
        toast.className = `milestone-toast milestone-toast--${options.type || 'info'}`;
        toast.setAttribute('role', options.type === 'reminder' ? 'alert' : 'status');

        // Dynamic theme synchronization
        const isDark = (typeof document !== 'undefined') && (
            document.documentElement.classList.contains('dark-mode') ||
            document.body?.classList.contains('dark-mode') ||
            document.documentElement.getAttribute('data-theme') === 'dark'
        );
        toast.setAttribute('data-theme', isDark ? 'dark' : 'light');

        // Optional chime playback
        if (options.playChime) {
            void milestoneChimeSynthesizer.playChime();
        }

        const iconClass = options.type === 'reminder'
            ? 'bi-bell-fill'
            : options.type === 'success'
                ? 'bi-check-circle-fill'
                : options.type === 'warning'
                    ? 'bi-exclamation-triangle-fill'
                    : 'bi-info-circle-fill';

        const dateBadgeHtml = options.dateBadge
            ? `<span class="milestone-toast-badge"><i class="bi bi-calendar3"></i> ${options.dateBadge}</span>`
            : '';

        const actionBtnHtml = options.actionLabel
            ? `<button type="button" class="milestone-toast-action-btn">${options.actionLabel}</button>`
            : '';

        let snoozeBtnHtml = '';
        if (options.milestoneId || options.type === 'reminder') {
            const mId = options.milestoneId || '';
            if (mId) {
                const snoozeOpts = this.getSnoozeOptions(mId);
                if (snoozeOpts.length > 0) {
                    snoozeBtnHtml = `
                      <div class="milestone-toast-snooze-wrapper">
                        <button type="button" class="milestone-toast-snooze-btn" aria-haspopup="true" aria-expanded="false" title="Delay reminder alert (1h, 6h, or 12h without going past event date)">
                          <i class="bi bi-alarm" aria-hidden="true"></i>
                          <span>Snooze</span>
                          <i class="bi bi-chevron-down" aria-hidden="true"></i>
                        </button>
                        <div class="milestone-toast-snooze-flyout" hidden>
                          <span class="snooze-flyout-heading">Delay reminder:</span>
                          <div class="snooze-flyout-buttons">
                            ${snoozeOpts.map((opt) => `
                              <button type="button" class="snooze-flyout-item ${!opt.valid ? 'is-disabled' : ''}"
                                data-snooze-hours="${opt.hours}"
                                data-milestone-id="${mId}"
                                ${!opt.valid ? 'disabled title="Cannot snooze: exceeds event date"' : `title="Delay reminder by ${opt.label}"`}>
                                <i class="bi bi-clock-history" aria-hidden="true"></i>
                                <span>+${opt.hours}h (${opt.label})</span>
                                ${!opt.valid ? '<span class="snooze-invalid-tag">Past date</span>' : ''}
                              </button>
                            `).join('')}
                          </div>
                        </div>
                      </div>
                    `;
                }
            }
        }

        const linkBtnHtml = options.linkText
            ? `<div class="milestone-toast-links">
                <button type="button" class="milestone-toast-help-link" aria-haspopup="dialog" title="${options.linkText}">
                  <i class="bi bi-question-circle" aria-hidden="true"></i>
                  <span>${options.linkText}</span>
                  <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                </button>
              </div>`
            : '';

        toast.innerHTML = `
            <div class="milestone-toast-glow" aria-hidden="true"></div>
            <div class="milestone-toast-content">
              <div class="milestone-toast-icon">
                <i class="bi ${iconClass}"></i>
              </div>
              <div class="milestone-toast-body">
                <div class="milestone-toast-header">
                  <strong class="milestone-toast-title">${options.title}</strong>
                  ${dateBadgeHtml}
                </div>
                <p class="milestone-toast-message">${options.message}</p>
                ${(actionBtnHtml || snoozeBtnHtml) ? `<div class="milestone-toast-actions">${actionBtnHtml} ${snoozeBtnHtml}</div>` : ''}
                ${linkBtnHtml}
              </div>
              <button type="button" class="milestone-toast-close" aria-label="Dismiss notification">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="milestone-toast-progress" aria-hidden="true">
              <div class="milestone-toast-progress-bar"></div>
            </div>
        `;

        // Wire up close button
        const closeBtn = toast.querySelector<HTMLButtonElement>('.milestone-toast-close');
        closeBtn?.addEventListener('click', () => {
            this.dismissToast(toast);
        });

        // Wire up action button
        if (options.onAction) {
            const actionBtn = toast.querySelector<HTMLButtonElement>('.milestone-toast-action-btn');
            actionBtn?.addEventListener('click', () => {
                options.onAction?.();
                this.dismissToast(toast);
            });
        }

        // Wire up Snooze toggle and items
        const snoozeWrapper = toast.querySelector<HTMLElement>('.milestone-toast-snooze-wrapper');
        if (snoozeWrapper && options.milestoneId) {
            const snoozeBtn = snoozeWrapper.querySelector<HTMLButtonElement>('.milestone-toast-snooze-btn');
            const snoozeFlyout = snoozeWrapper.querySelector<HTMLElement>('.milestone-toast-snooze-flyout');
            const snoozeItems = snoozeWrapper.querySelectorAll<HTMLButtonElement>('.snooze-flyout-item');

            snoozeBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = snoozeFlyout?.hasAttribute('hidden') ?? true;
                if (isHidden) {
                    snoozeFlyout?.removeAttribute('hidden');
                    snoozeBtn?.setAttribute('aria-expanded', 'true');
                } else {
                    snoozeFlyout?.setAttribute('hidden', '');
                    snoozeBtn?.setAttribute('aria-expanded', 'false');
                }
            });

            snoozeItems.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const hours = Number(btn.dataset.snoozeHours) as SnoozeDurationHours;
                    if (hours && options.milestoneId) {
                        this.snoozeReminder(options.milestoneId, hours);
                        options.onSnooze?.(hours);
                        this.dismissToast(toast);
                    }
                });
            });
        }

        // Wire up link button
        if (options.onLinkClick) {
            const linkBtn = toast.querySelector<HTMLButtonElement>('.milestone-toast-help-link');
            linkBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                options.onLinkClick?.();
            });
        }

        // Auto-dismiss timer
        const duration = options.duration ?? 7000;
        let dismissTimer: number | null = null;
        const progressBar = toast.querySelector<HTMLElement>('.milestone-toast-progress-bar');

        if (progressBar && duration > 0) {
            progressBar.style.transition = `transform ${duration}ms linear`;
            // Trigger animation next tick
            requestAnimationFrame(() => {
                progressBar.style.transform = 'scaleX(0)';
            });
        }

        if (duration > 0) {
            dismissTimer = window.setTimeout(() => {
                this.dismissToast(toast);
            }, duration);

            // Pause on hover
            toast.addEventListener('mouseenter', () => {
                if (dismissTimer !== null) {
                    clearTimeout(dismissTimer);
                    dismissTimer = null;
                }
                if (progressBar) progressBar.style.animationPlayState = 'paused';
            });

            toast.addEventListener('mouseleave', () => {
                if (dismissTimer === null) {
                    dismissTimer = window.setTimeout(() => {
                        this.dismissToast(toast);
                    }, 3000);
                }
            });
        }

        container.appendChild(toast);

        // Entrance animation
        requestAnimationFrame(() => {
            toast.classList.add('is-visible');
        });

        return toast;
    }

    /**
     * Smoothly animates out and removes a toast notification.
     */
    public dismissToast(toast: HTMLElement): void {
        toast.classList.remove('is-visible');
        toast.classList.add('is-leaving');
        window.setTimeout(() => {
            toast.remove();
        }, 320);
    }

    /**
     * Scrolls smoothly to the milestone card and applies highlight effect.
     */
    public scrollToMilestone(milestoneId: string): void {
        const milestoneEl = document.getElementById(milestoneId)
            || document.querySelector(`[data-milestone-id="${milestoneId}"]`);

        if (milestoneEl) {
            if (typeof milestoneEl.scrollIntoView === 'function') {
                milestoneEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            milestoneEl.classList.add('is-highlighted-reminder');
            window.setTimeout(() => {
                milestoneEl.classList.remove('is-highlighted-reminder');
            }, 3000);
        }
    }

    /**
     * Schedules a setTimeout for a milestone reminder if within MAX_SET_TIMEOUT_MS.
     */
    private scheduleTimer(milestoneId: string, delayMs: number): void {
        this.clearTimer(milestoneId);

        if (delayMs <= 0) {
            this.triggerReminder(milestoneId, false);
            return;
        }

        if (delayMs <= MAX_SET_TIMEOUT_MS) {
            const timerId = window.setTimeout(() => {
                this.triggerReminder(milestoneId, false);
                this.activeTimers.delete(milestoneId);
            }, delayMs);
            this.activeTimers.set(milestoneId, timerId);
        }
    }

    /**
     * Clears an active timer for a milestone ID.
     */
    private clearTimer(milestoneId: string): void {
        const existing = this.activeTimers.get(milestoneId);
        if (existing !== undefined) {
            clearTimeout(existing);
            this.activeTimers.delete(milestoneId);
        }
    }

    /**
     * Starts periodic interval checking for pending reminders (e.g. across sleep/wake).
     */
    private startPeriodicCheck(): void {
        if (this.checkIntervalId !== null) return;

        this.checkIntervalId = window.setInterval(() => {
            this.checkPendingReminders();
        }, 30000);
    }

    /**
     * Checks all stored reminders and fires any that have passed reminderTime.
     */
    public checkPendingReminders(): void {
        const stored = this.getAllStoredReminders();
        const now = Date.now();

        Object.values(stored).forEach((record) => {
            if (!record.notifiedAt && now >= record.reminderTime) {
                this.triggerReminder(record.milestoneId, false);
            }
        });
    }

    /**
     * Restores active timers for all stored milestones.
     */
    private scheduleStoredReminders(): void {
        const stored = this.getAllStoredReminders();
        const now = Date.now();

        Object.values(stored).forEach((record) => {
            if (record.notifiedAt) return; // already notified

            if (now >= record.reminderTime) {
                // If it reached reminder time while page was closed, trigger notification
                this.triggerReminder(record.milestoneId, false);
            } else {
                const delayMs = record.reminderTime - now;
                this.scheduleTimer(record.milestoneId, delayMs);
            }
        });
    }

    /**
     * Retrieves all stored reminders from localStorage.
     */
    public getAllStoredReminders(): Record<string, StoredMilestoneReminder> {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.MILESTONE_REMINDERS);
            if (!raw) return {};
            const parsed = JSON.parse(raw) as Record<string, StoredMilestoneReminder>;
            let modified = false;
            Object.values(parsed).forEach((item) => {
                if (!item.category) {
                    const milestone = this.findMilestone(item.milestoneId);
                    item.category = inferReminderCategory(item.title, item.description, milestone?.category);
                    modified = true;
                }
            });
            if (modified) {
                this.persistAllReminders(parsed);
            }
            return parsed;
        } catch {
            return {};
        }
    }

    /**
     * Updates the user category of a stored reminder ('Exams', 'Assignments', 'Fees', 'General').
     */
    public updateReminderCategory(milestoneId: string, category: ReminderCategory): boolean {
        const stored = this.getAllStoredReminders();
        if (!stored[milestoneId]) return false;

        stored[milestoneId].category = category;
        this.persistAllReminders(stored);
        this.dispatchUpdateEvent();
        return true;
    }

    /**
     * Calculates available snooze options (1h, 6h, 12h) for a given milestone.
     * Enforces the invariant: snooze time must not go past the event date (eventTime).
     */
    public getSnoozeOptions(milestoneId: string, now: number = Date.now()): SnoozeOptionInfo[] {
        const stored = this.getAllStoredReminders();
        const item = stored[milestoneId];
        const milestone = this.findMilestone(milestoneId);
        const eventTime = item?.eventTime || (milestone ? this.getMilestoneStartTime(milestone) : now + 24 * 3600 * 1000);

        const presets: Array<{ hours: SnoozeDurationHours; label: string }> = [
            { hours: 1, label: '1 hour' },
            { hours: 6, label: '6 hours' },
            { hours: 12, label: '12 hours' },
        ];

        return presets.map((preset) => {
            const ms = preset.hours * 60 * 60 * 1000;
            const targetTime = now + ms;
            // Strict invariant: cannot exceed the date of the reminder
            const valid = targetTime <= eventTime;
            return {
                hours: preset.hours,
                label: preset.label,
                ms,
                valid,
                targetTime,
                reason: valid ? undefined : `Cannot delay by ${preset.label}: would exceed the scheduled event date (${new Date(eventTime).toLocaleDateString()}).`,
            };
        });
    }

    /**
     * Snoozes a reminder by 1, 6, or 12 hours.
     * Rejects delays that would go after the milestone's scheduled date/time.
     */
    public snoozeReminder(
        milestoneId: string,
        hours: SnoozeDurationHours,
        now: number = Date.now()
    ): { success: boolean; snoozedUntil?: number; message: string } {
        const stored = this.getAllStoredReminders();
        const item = stored[milestoneId];
        if (!item) {
            return { success: false, message: 'Reminder record not found.' };
        }

        const ms = hours * 60 * 60 * 1000;
        const targetTime = now + ms;

        // Invariant check: let it not go after the date of the reminder
        if (targetTime > item.eventTime) {
            const errMessage = `Cannot snooze by ${hours}h: would exceed the milestone date (${new Date(item.eventTime).toLocaleDateString()}).`;
            this.showToast({
                type: 'warning',
                title: 'Snooze Blocked',
                message: errMessage,
                duration: 5000,
            });
            return { success: false, message: errMessage };
        }

        // Cancel previous timer
        this.clearTimer(milestoneId);

        // Update record
        item.reminderTime = targetTime;
        item.snoozedUntil = targetTime;
        item.snoozeCount = (item.snoozeCount || 0) + 1;
        item.notifiedAt = undefined; // allow triggering when timer fires

        this.persistAllReminders(stored);

        // Schedule new timer
        const delayMs = targetTime - now;
        this.scheduleTimer(milestoneId, delayMs);

        const formattedTargetTime = new Date(targetTime).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
        const formattedTargetDate = new Date(targetTime).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });

        // Record to notification history
        this.recordNotificationHistory({
            milestoneId: item.milestoneId,
            title: `Reminder Snoozed: ${item.title}`,
            body: `Snoozed for ${hours} hour${hours === 1 ? '' : 's'}. Next alert will fire on ${formattedTargetDate} at ${formattedTargetTime}.`,
            timestamp: now,
            type: 'milestone',
            suppressed: false,
            dateText: item.dateText,
            categoryLabel: item.category || 'General',
        });

        this.showToast({
            type: 'success',
            title: 'Reminder Snoozed',
            message: `"${item.title}" snoozed for ${hours} hour${hours === 1 ? '' : 's'}. Next alert: ${formattedTargetDate} at ${formattedTargetTime}.`,
            dateBadge: item.dateText,
            duration: 6000,
        });

        this.dispatchUpdateEvent();

        return {
            success: true,
            snoozedUntil: targetTime,
            message: `Snoozed for ${hours} hour${hours === 1 ? '' : 's'}.`,
        };
    }

    /**
     * Resets any active snooze back to the standard 24 hours prior schedule.
     */
    public cancelSnooze(milestoneId: string): void {
        const stored = this.getAllStoredReminders();
        const item = stored[milestoneId];
        if (!item) return;

        this.clearTimer(milestoneId);
        item.reminderTime = item.eventTime - TWENTY_FOUR_HOURS_MS;
        item.snoozedUntil = undefined;
        this.persistAllReminders(stored);

        const now = Date.now();
        if (now < item.reminderTime) {
            this.scheduleTimer(milestoneId, item.reminderTime - now);
        }

        this.showToast({
            type: 'info',
            title: 'Snooze Cancelled',
            message: `"${item.title}" reverted to standard 24-hour advance alert.`,
            duration: 4000,
        });

        this.dispatchUpdateEvent();
    }

    /**
     * Adds a custom reminder (e.g. for user assignments, tuition fee deadlines, exams).
     */
    public addCustomReminder(options: {
        title: string;
        category: ReminderCategory;
        dateText: string;
        eventTime: number;
        description?: string;
        location?: string;
    }): StoredMilestoneReminder {
        const stored = this.getAllStoredReminders();
        const customId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const reminderTime = options.eventTime - TWENTY_FOUR_HOURS_MS;

        const record: StoredMilestoneReminder = {
            milestoneId: customId,
            title: options.title,
            dateText: options.dateText,
            location: options.location || 'SJCCC Campus, Mbengwi',
            description: options.description || '',
            eventTime: options.eventTime,
            reminderTime: reminderTime > now ? reminderTime : (now + 60000),
            createdAt: now,
            category: options.category,
        };

        stored[customId] = record;
        this.persistAllReminders(stored);

        if (now < record.reminderTime) {
            this.scheduleTimer(customId, record.reminderTime - now);
        }

        this.showToast({
            type: 'success',
            title: 'Reminder Added',
            message: `Added "${options.title}" to your ${options.category} schedule.`,
            duration: 5000,
        });

        this.dispatchUpdateEvent();
        return record;
    }

    public getToastContainer(): HTMLElement | null {
        return this.toastContainer;
    }

    public getIsInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Persists all reminders dictionary to localStorage.
     */
    private persistAllReminders(data: Record<string, StoredMilestoneReminder>): void {
        try {
            localStorage.setItem(STORAGE_KEYS.MILESTONE_REMINDERS, JSON.stringify(data));
        } catch (err) {
            console.warn('[MilestoneReminderService] Failed to persist reminders:', err);
        }
    }

    /**
     * Saves or updates a single reminder in localStorage.
     */
    public saveReminder(record: StoredMilestoneReminder): void {
        const stored = this.getAllStoredReminders();
        stored[record.milestoneId] = record;
        this.persistAllReminders(stored);
    }

    /**
     * Removes a single milestone reminder from localStorage.
     */
    public removeStoredReminder(milestoneId: string): void {
        const stored = this.getAllStoredReminders();
        delete stored[milestoneId];
        this.persistAllReminders(stored);
    }

    /**
     * Checks if a milestone currently has an active reminder.
     */
    public isReminded(milestoneId: string): boolean {
        const stored = this.getAllStoredReminders();
        return Boolean(stored[milestoneId]);
    }

    /**
     * Programmatically sets or clears reminder on a milestone.
     */
    public async setReminder(milestoneId: string, enabled: boolean): Promise<void> {
        const milestone = this.findMilestone(milestoneId);
        if (!milestone) return;

        const cb = document.querySelector<HTMLInputElement>(
            `.timeline-remind-me-checkbox[data-milestone-id="${milestoneId}"]`
        );
        if (cb) {
            cb.checked = enabled;
            const label = cb.closest<HTMLLabelElement>('.timeline-remind-me-label');
            if (label) label.classList.toggle('is-checked', enabled);
        }

        if (enabled) {
            await this.enableReminder(milestone);
        } else {
            this.disableReminder(milestone);
        }
    }

    /**
     * Automatically populates the reminders list with key academic milestones
     * (examinations, holidays/breaks, and semester resumptions) directly from the school calendar.
     */
    public autoAddImportantDates(): { addedCount: number; milestones: AcademicMilestone[]; totalStoredCount: number } {
        const stored = this.getAllStoredReminders();
        const importantMilestones = ACADEMIC_MILESTONES_2026_2027.filter((m) =>
            m.category === 'exam' ||
            m.category === 'break' ||
            m.category === 'resumption' ||
            m.isKeyMilestone === true
        );

        let addedCount = 0;
        const now = Date.now();

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            this.requestNotificationPermission().catch(() => {});
        }

        importantMilestones.forEach((milestone) => {
            if (!stored[milestone.id]) {
                const eventTime = this.getMilestoneStartTime(milestone);
                const reminderTime = eventTime - TWENTY_FOUR_HOURS_MS;
                const category = inferReminderCategory(milestone.title, milestone.description, milestone.category);
                const record: StoredMilestoneReminder = {
                    milestoneId: milestone.id,
                    title: milestone.title,
                    dateText: milestone.dateText,
                    location: milestone.location,
                    description: milestone.description,
                    eventTime,
                    reminderTime,
                    createdAt: now,
                    category,
                };
                stored[milestone.id] = record;
                addedCount++;

                // If in future (>now), schedule timer
                if (now < reminderTime) {
                    const delayMs = reminderTime - now;
                    this.scheduleTimer(milestone.id, delayMs);
                }
            }
        });

        if (addedCount > 0) {
            this.persistAllReminders(stored);
            this.syncCheckboxesFromStorage();

            this.showToast({
                type: 'success',
                title: 'Important Dates Added',
                message: `Added ${addedCount} key academic milestone${addedCount === 1 ? '' : 's'} (exams and holidays) directly from the school calendar to your reminders!`,
                duration: 6000,
            });

            this.dispatchUpdateEvent();
        } else {
            this.showToast({
                type: 'info',
                title: 'Reminders Up to Date',
                message: 'All key academic milestones (exams and holidays) are already present in your reminders.',
                duration: 4000,
            });
        }

        return {
            addedCount,
            milestones: importantMilestones,
            totalStoredCount: Object.keys(stored).length,
        };
    }

    /**
     * Computes the epoch millisecond start time for a milestone.
     */
    public getMilestoneStartTime(milestone: AcademicMilestone): number {
        if (milestone.startDate instanceof Date && !isNaN(milestone.startDate.getTime())) {
            return milestone.startDate.getTime();
        }

        if (typeof (milestone as any).startDate === 'string') {
            const parsed = new Date((milestone as any).startDate).getTime();
            if (!isNaN(parsed)) {
                return parsed;
            }
        }

        if (milestone.localStartDate) {
            const [yStr, mStr, dStr] = milestone.localStartDate.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10) - 1;
            const d = parseInt(dStr, 10);

            let h = 8;
            let min = 0;

            if (milestone.temporalType === 'timed' || milestone.temporalType === 'multi-day-timed') {
                if (milestone.localStartTime) {
                    const [hStr, minStr] = milestone.localStartTime.split(':');
                    h = parseInt(hStr, 10) || 8;
                    min = parseInt(minStr, 10) || 0;
                }
            }

            // WAT is UTC+1 (subtract 1 hour for UTC epoch)
            return Date.UTC(y, m, d, h - 1, min, 0);
        }

        return Date.now();
    }

    /**
     * Looks up milestone by ID in canonical data.
     */
    public findMilestone(id: string): AcademicMilestone | undefined {
        return ACADEMIC_MILESTONES_2026_2027.find((m) => m.id === id);
    }

    /**
     * Formats a Date object into human-friendly representation.
     */
    private formatDateTime(date: Date): string {
        try {
            return date.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return date.toDateString();
        }
    }

    /**
     * Cleans up timers and intervals.
     */
    public destroy(): void {
        this.activeTimers.forEach((timerId) => clearTimeout(timerId));
        this.activeTimers.clear();

        if (this.checkIntervalId !== null) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }

        if (this.themeObserver) {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }

        this.isInitialized = false;
    }
}

export const milestoneReminderService = new MilestoneReminderService();
