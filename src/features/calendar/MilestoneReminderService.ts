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

export interface StoredMilestoneReminder {
    milestoneId: string;
    title: string;
    dateText: string;
    location: string;
    description: string;
    eventTime: number; // UTC timestamp of event start
    reminderTime: number; // UTC timestamp 24 hours prior to eventTime
    createdAt: number;
    notifiedAt?: number;
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

        const record: StoredMilestoneReminder = {
            milestoneId: milestone.id,
            title: milestone.title,
            dateText: milestone.dateText,
            location: milestone.location,
            description: milestone.description,
            eventTime,
            reminderTime,
            createdAt: now,
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

        // Play subtle synthetic audio chime
        void milestoneChimeSynthesizer.playChime();

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

        // 1. Show rich in-app Toast Notification
        this.showToast({
            type: 'reminder',
            title: titleText,
            message: bodyText,
            dateBadge: milestone.dateText,
            actionLabel: 'View in Timeline',
            onAction: () => {
                this.scrollToMilestone(milestone.id);
            },
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
        } catch (err) {
            console.warn('[MilestoneReminderService] Could not persist push preference:', err);
        }

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
                ${actionBtnHtml ? `<div class="milestone-toast-actions">${actionBtnHtml}</div>` : ''}
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
            milestoneEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
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
