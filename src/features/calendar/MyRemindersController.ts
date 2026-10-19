/**
 * ============================================================================
 * SJCCC – My Reminders Navigation & Schedule Management Controller
 * (MyRemindersController.ts)
 * 
 * Manages the 'My Reminders' entry points in both the desktop top nav bar
 * and mobile bottom tab bar, along with the interactive modal for managing
 * scheduled milestone notifications and subtle audio chime preferences.
 * ============================================================================
 */

import {
    milestoneReminderService,
    REMINDER_CATEGORIES,
    type ReminderCategory,
    type SnoozeDurationHours,
} from './MilestoneReminderService.ts';
import {
    milestoneChimeSynthesizer,
    CHIME_OPTIONS,
    type ChimeId,
} from './MilestoneChimeSynthesizer.ts';
import { CalendarActionSheet } from './CalendarActionSheet.ts';
import {
    detectPlatform,
    getNotificationPermissionGuidance,
} from '../../core/platform/platformDetection.ts';
import { LiquidGlassAdapter } from '../../ui/effects/LiquidGlassAdapter.ts';

export class MyRemindersController {
    private static instance: MyRemindersController | null = null;

    private topNavBtn: HTMLElement | null = null;
    private bottomNavBtn: HTMLElement | null = null;
    private topNavBadge: HTMLElement | null = null;
    private bottomNavBadge: HTMLElement | null = null;
    private modalEl: HTMLElement | null = null;
    private isOpen: boolean = false;
    private lastFocusedEl: HTMLElement | null = null;
    private activeTab: 'reminders' | 'history' = 'reminders';
    private selectedCategoryFilter: 'all' | ReminderCategory = 'all';
    private showCustomForm: boolean = false;
    private lastRenderedRemindersHash: string = '';

    private constructor() {
        this.init();
    }

    public static getInstance(): MyRemindersController {
        if (!MyRemindersController.instance) {
            MyRemindersController.instance = new MyRemindersController();
        }
        return MyRemindersController.instance;
    }

    public setActiveTab(tab: 'reminders' | 'history'): void {
        this.activeTab = tab;
        if (!this.modalEl || !this.isOpen) return;

        const tabReminders = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersTabReminders');
        const tabHistory = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersTabHistory');
        const panelReminders = this.modalEl.querySelector<HTMLElement>('#myRemindersPanelReminders');
        const panelHistory = this.modalEl.querySelector<HTMLElement>('#myRemindersPanelHistory');

        if (tabReminders && tabHistory && panelReminders && panelHistory) {
            const isReminders = tab === 'reminders';
            tabReminders.classList.toggle('is-active', isReminders);
            tabReminders.setAttribute('aria-selected', isReminders ? 'true' : 'false');

            tabHistory.classList.toggle('is-active', !isReminders);
            tabHistory.setAttribute('aria-selected', !isReminders ? 'true' : 'false');

            panelReminders.classList.toggle('is-active', isReminders);
            panelReminders.hidden = !isReminders;

            panelHistory.classList.toggle('is-active', !isReminders);
            panelHistory.hidden = isReminders;
        } else {
            this.renderModalContent();
        }
    }

    public getActiveTab(): 'reminders' | 'history' {
        return this.activeTab;
    }

    public setSelectedCategoryFilter(cat: 'all' | ReminderCategory): void {
        this.selectedCategoryFilter = cat;
        if (this.isOpen) {
            this.renderModalContent();
        }
    }

    public getSelectedCategoryFilter(): 'all' | ReminderCategory {
        return this.selectedCategoryFilter;
    }

    /**
     * Automatically populates the reminders list with key academic milestones
     * (e.g., examinations, holidays, resumptions) directly from the school calendar.
     */
    public autoAddImportantDates(): { addedCount: number; milestones: any[]; totalStoredCount: number } {
        const result = milestoneReminderService.autoAddImportantDates();
        this.updateBadges();
        if (this.isOpen) {
            this.renderModalContent();
        }
        return result;
    }

    public init(): void {
        if (typeof document === 'undefined') {
            return;
        }
        this.topNavBtn = document.getElementById('navMyRemindersBtn');
        this.bottomNavBtn = document.getElementById('bottomMyRemindersBtn');
        this.topNavBadge = document.getElementById('navRemindersBadge');
        this.bottomNavBadge = document.getElementById('bottomRemindersBadge');

        this.ensureModalElement();
        this.bindEvents();
        this.updateBadges();
    }

    /**
     * Binds click events to top and bottom nav buttons, and listens for reminder updates.
     */
    private bindEvents(): void {
        this.topNavBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.open();
        });

        this.bottomNavBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.open();
        });

        // Listen for internal service updates
        window.addEventListener('milestone-reminders-updated', () => {
            this.updateBadges();
            if (this.isOpen) {
                this.renderModalContent();
            }
        });

        window.addEventListener('milestone-chime-changed', () => {
            if (this.isOpen) {
                this.renderModalContent();
            }
        });

        // Keep modal data-theme synchronized instantaneously on theme change
        window.addEventListener('themechange', (e: Event) => {
            const customEvent = e as CustomEvent<{ theme: string; isDark: boolean }>;
            const isDark = customEvent.detail?.isDark ?? (
                document.documentElement.classList.contains('dark-mode') ||
                document.body?.classList.contains('dark-mode')
            );
            if (this.modalEl) {
                this.modalEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
            }
        });

        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'sjccc-milestone-reminders' || e.key === 'sjccc-milestone-chime') {
                this.updateBadges();
                if (this.isOpen) {
                    this.renderModalContent();
                }
            }
        });

        // Close on Escape key
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('keydown', handleEscape);
    }

    /**
     * Updates badge count indicators on both top nav and bottom mobile bar.
     */
    public updateBadges(): number {
        const stored = milestoneReminderService.getAllStoredReminders();
        const activeCount = Object.keys(stored).length;

        [this.topNavBadge, this.bottomNavBadge].forEach((badge) => {
            if (!badge) return;
            badge.textContent = String(activeCount);
            badge.setAttribute('aria-label', `${activeCount} reminder${activeCount === 1 ? '' : 's'} active`);

            if (activeCount === 0) {
                badge.classList.add('is-zero');
            } else {
                badge.classList.remove('is-zero');
                badge.classList.remove('badge-bump');
                void badge.offsetWidth;
                badge.classList.add('badge-bump');
            }
        });

        return activeCount;
    }

    /**
     * Creates or locates the #myRemindersModal dialog overlay in the DOM.
     */
    private ensureModalElement(): HTMLElement {
        let modal = document.getElementById('myRemindersModal');
        if (!modal) {
            modal = document.createElement('dialog');
            modal.id = 'myRemindersModal';
            modal.className = 'my-reminders-overlay';
            modal.setAttribute('aria-labelledby', 'myRemindersTitle');
            modal.setAttribute('aria-describedby', 'myRemindersDesc');
            modal.hidden = true;
            document.body.appendChild(modal);
        }

        // Close when clicking outside dialog sheet (on the backdrop) or on close buttons
        modal.addEventListener('click', (e) => {
            const target = e.target as HTMLElement | null;
            if (target === modal || target?.dataset.action === 'close' || target?.closest('[data-action="close"]')) {
                this.close();
            }
        });

        this.modalEl = modal;
        return modal;
    }

    /**
     * Opens the My Reminders management modal dialog.
     */
    public open(): void {
        const modal = this.ensureModalElement();
        this.lastFocusedEl = (document.activeElement as HTMLElement) || null;
        this.isOpen = true;

        this.topNavBtn?.setAttribute('aria-expanded', 'true');
        this.bottomNavBtn?.setAttribute('aria-expanded', 'true');

        this.renderModalContent();

        modal.classList.add('is-open');
        modal.hidden = false;
        if (typeof (modal as HTMLDialogElement).showModal === 'function') {
            try {
                (modal as HTMLDialogElement).showModal();
            } catch {
                // Fallback for polyfills/mock DOM
            }
        }

        document.body.classList.add('reminders-modal-open');

        // Apply physical LiquidGlass optical refraction and tactile ripple to reminders modal dialog
        const dialog = modal.querySelector<HTMLElement>('.my-reminders-modal__dialog') || modal;
        LiquidGlassAdapter.enhancePopup(dialog);

        // Focus first close button or primary action
        const closeBtn = modal.querySelector<HTMLElement>('#myRemindersCloseBtn');
        closeBtn?.focus();
    }

    /**
     * Closes the My Reminders management modal dialog.
     */
    public close(): void {
        if (!this.modalEl) return;
        this.isOpen = false;

        this.topNavBtn?.setAttribute('aria-expanded', 'false');
        this.bottomNavBtn?.setAttribute('aria-expanded', 'false');

        if (typeof (this.modalEl as HTMLDialogElement).close === 'function') {
            try {
                (this.modalEl as HTMLDialogElement).close();
            } catch {
                // Fallback
            }
        }
        this.modalEl.classList.remove('is-open');
        this.modalEl.hidden = true;
        document.body.classList.remove('reminders-modal-open');

        // Restore focus
        if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
            this.lastFocusedEl.focus();
        }
    }

    /**
     * Service function that uses the Notification API to determine 'granted', 'denied', or 'default' states
     * (or 'unsupported' if the browser lacks Notification support) and reflects them in the UI badge immediately upon opening.
     */
    public checkNotificationStatus(): NotificationPermission | 'unsupported' {
        return milestoneReminderService.checkNotificationStatus();
    }

    /**
     * Dynamically generates the contents of the My Reminders dialog.
     */
    public renderModalContent(): void {
        if (!this.modalEl) return;

        const storedReminders = milestoneReminderService.getAllStoredReminders();
        const reminderList = Object.values(storedReminders);
        const count = reminderList.length;
        const currentChime = milestoneChimeSynthesizer.getSelectedChime();
        const platform = detectPlatform();

        // Theme attribute synchronization
        const isDark = (typeof document !== 'undefined') && (
            document.documentElement.classList.contains('dark-mode') ||
            document.body?.classList.contains('dark-mode') ||
            document.documentElement.getAttribute('data-theme') === 'dark'
        );
        this.modalEl.setAttribute('data-theme', isDark ? 'dark' : 'light');

        // Check Notification API permission status immediately using checkNotificationStatus()
        const permStatus = this.checkNotificationStatus();
        const isPushEnabled = milestoneReminderService.isPushNotificationsEnabled();
        const isDev = milestoneReminderService.isDevEnvironment();
        const isMuted = milestoneReminderService.isMuted();
        const historyList = milestoneReminderService.getNotificationHistory();

        const isPushActive = permStatus === 'granted' && isPushEnabled && !isMuted;
        const isPushMuted = (permStatus === 'granted' && (!isPushEnabled || isMuted)) || isMuted;
        const isPushBlocked = permStatus === 'denied';
        const isPushUnsupported = permStatus === 'unsupported';
        const notifState = isPushActive ? 'granted' : isPushMuted ? 'muted' : isPushBlocked ? 'denied' : isPushUnsupported ? 'unsupported' : 'default';

        let statusText = '';
        let statusBadgeClass = '';
        let statusBadgeIcon = '';
        let statusDesc = '';

        if (isPushActive) {
            statusText = 'Active · Push Alerts Enabled';
            statusBadgeClass = 'push-status-badge--active';
            statusBadgeIcon = 'bi-check-circle-fill'; // Checkmark for granted
            statusDesc = 'Browser alerts will sound and notify you 24 hours prior to scheduled milestones.';
        } else if (isPushMuted) {
            statusText = 'Muted · Alerts Paused';
            statusBadgeClass = 'push-status-badge--muted';
            statusBadgeIcon = 'bi-pause-circle-fill';
            statusDesc = 'Advance push alerts and test alerts are suppressed locally without revoking browser permissions.';
        } else if (isPushBlocked) {
            statusText = 'Blocked in Browser';
            statusBadgeClass = 'push-status-badge--blocked';
            statusBadgeIcon = 'bi-exclamation-triangle-fill'; // Warning for denied
            statusDesc = `Push notifications are blocked in your ${platform.browserLabel} settings on ${platform.osLabel}. Tap the 'How to unblock' link below to view unblock instructions.`;
        } else if (isPushUnsupported) {
            statusText = 'Not Supported';
            statusBadgeClass = 'push-status-badge--unsupported';
            statusBadgeIcon = 'bi-info-circle-fill';
            statusDesc = 'Web push notifications are not supported by this browser. In-app alerts remain active.';
        } else {
            // Default state
            statusText = 'Disabled';
            statusBadgeClass = 'push-status-badge--default';
            statusBadgeIcon = 'bi-info-circle-fill'; // Info for default
            statusDesc = 'Enable browser push notifications to receive advance alerts 24 hours before your milestones.';
        }

        const isChecked = isPushActive;
        const isDisabled = isPushBlocked || isPushUnsupported;
        const guidance = getNotificationPermissionGuidance(platform);

        const unblockHelperHtml = isPushBlocked ? `
          <div class="my-reminders-unblock-wrapper" id="myRemindersUnblockSection">
            <div class="push-card-unblock-box">
              <div class="unblock-box-header">
                <i class="bi bi-shield-exclamation" aria-hidden="true"></i>
                <span class="unblock-box-title">How to unblock in ${platform.browserLabel} on ${platform.osLabel}:</span>
              </div>
              <ol class="unblock-steps-list">
                ${guidance.steps.slice(0, 3).map((step, idx) => `
                  <li>
                    <span class="step-num">${idx + 1}</span>
                    <span class="step-text">${step}</span>
                  </li>
                `).join('')}
              </ol>
            </div>
            <div class="unblock-actions-row">
              <a href="#how-to-unblock" class="my-reminders-unblock-link" id="myRemindersUnblockHelperLink" role="button" aria-label="How to unblock notifications on ${platform.browserLabel}">
                <i class="bi bi-question-circle" aria-hidden="true"></i>
                <span>How to unblock notifications on ${platform.browserLabel}</span>
                <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
              </a>
              <button type="button" class="btn-allow-guide" id="myRemindersOpenGuideBtn" aria-label="Open visual unblock instructions">
                <i class="bi bi-book-half" aria-hidden="true"></i>
                <span>Visual Unblock Guide</span>
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        ` : '';

        const pushCardHtml = `
          <div class="my-reminders-push-card ${isPushBlocked ? 'my-reminders-blocked-banner' : ''}" id="myRemindersPushCard" data-state="${notifState}" role="${isPushBlocked ? 'alert' : 'region'}" aria-label="Browser Push Notification Settings">
            <div class="push-card-main">
              <div class="push-card-icon-col" aria-hidden="true">
                <div class="push-card-icon-badge ${isChecked ? 'is-active' : ''} ${isPushBlocked ? 'is-blocked' : ''}">
                  <i class="bi ${isPushBlocked ? 'bi-bell-slash-fill' : isChecked ? 'bi-bell-fill' : 'bi-bell'}"></i>
                </div>
              </div>
              <div class="push-card-content">
                <div class="push-card-header-row">
                  <div class="push-card-title-group">
                    <div class="push-card-title-with-badge">
                      <h4 class="push-card-title ${isPushBlocked ? 'blocked-banner-title' : ''}">${isPushBlocked ? 'Browser Notifications Blocked' : 'Browser Push Notifications'}</h4>
                      <span class="push-status-badge ${statusBadgeClass}">
                        <i class="bi ${statusBadgeIcon} push-status-badge-icon" aria-hidden="true"></i>
                        <span class="push-status-text">${statusText}</span>
                      </span>
                    </div>
                    <p class="push-card-desc">${statusDesc}</p>
                  </div>
                  <div class="push-card-toggle-wrapper">
                    <label class="switch-control ${isDisabled ? 'is-disabled' : ''}" for="toggleNotificationPush"
                      title="${isPushBlocked ? 'Notifications blocked in browser settings' : 'Toggle browser push notifications'}">
                      <input type="checkbox" id="toggleNotificationPush" role="switch"
                        aria-checked="${isChecked ? 'true' : 'false'}"
                        aria-label="Toggle browser push notifications"
                        ${isChecked ? 'checked' : ''}
                        ${isDisabled ? 'disabled' : ''}>
                      <span class="switch-slider" aria-hidden="true"></span>
                    </label>
                  </div>
                </div>

                <div class="push-card-actions">
                  ${unblockHelperHtml}
                  ${isDev && permStatus === 'granted' ? `
                    <button type="button" class="btn btn-outline btn-xs my-reminders-test-alert-btn my-reminders-test-notification-btn" id="myRemindersTestNotificationBtn" data-testid="myRemindersTestAlertBtn"
                      title="Send test browser push notification with a 5-second delay to verify alerts"
                      aria-label="Send test notification with 5-second delay">
                      <i class="bi bi-bell-fill" aria-hidden="true"></i>
                      <span>Send Test Notification</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;

        // Notification History HTML (last 5 sent notifications)
        let historyHtml = '';
        if (historyList.length === 0) {
            historyHtml = `
              <div class="my-reminders-empty-history" id="myRemindersEmptyHistory">
                <div class="empty-state-icon" aria-hidden="true">
                  <i class="bi bi-clock-history"></i>
                </div>
                <h4 class="empty-state-title">No Sent Notifications</h4>
                <p class="empty-state-text">
                  No notifications have been triggered yet. When 24-hour advance alerts or test alerts are dispatched,
                  the last 5 notifications will be archived here so you can review any reminders you missed while away from your device.
                </p>
              </div>
            `;
        } else {
            historyHtml = `
              <div class="my-reminders-history-container" id="myRemindersHistoryContainer">
                <div class="my-reminders-history-header">
                  <div class="history-header-info">
                    <span class="history-count-label">
                      <i class="bi bi-archive-fill" aria-hidden="true"></i> Last ${historyList.length} Sent Notification${historyList.length === 1 ? '' : 's'}
                    </span>
                    <span class="history-sub-label">Review alerts dispatched while you were away from your device</span>
                  </div>
                  <button type="button" class="btn btn-outline btn-xs my-reminders-clear-history-btn" id="myRemindersClearHistoryBtn"
                    title="Clear notification history log">
                    <i class="bi bi-trash3" aria-hidden="true"></i> Clear History
                  </button>
                </div>
                <div class="my-reminders-history-list" role="list" aria-label="Recent notification history">
                  ${historyList.map((item) => {
                      const formattedTime = new Date(item.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                      });
                      const isSuppressed = Boolean(item.suppressed);
                      const isTest = item.type === 'test';
                      const statusClass = isSuppressed ? 'history-badge--suppressed' : 'history-badge--delivered';
                      const statusText = isSuppressed ? 'Muted / Missed' : 'Delivered';
                      const statusIcon = isSuppressed ? 'bi-volume-mute-fill' : 'bi-check-circle-fill';

                      return `
                        <div class="my-history-card ${isSuppressed ? 'is-suppressed' : ''}" role="listitem" data-notif-id="${item.id}">
                          <div class="my-history-card__header">
                            <div class="my-history-meta">
                              <span class="my-history-type-badge ${isTest ? 'is-test' : ''}">
                                <i class="bi ${isTest ? 'bi-lightning-charge-fill' : 'bi-calendar-event'}" aria-hidden="true"></i>
                                <span>${isTest ? 'Test Alert' : (item.categoryLabel || 'Academic Milestone')}</span>
                              </span>
                              <span class="my-history-status-badge ${statusClass}">
                                <i class="bi ${statusIcon}" aria-hidden="true"></i>
                                <span>${statusText}</span>
                              </span>
                            </div>
                            <time class="my-history-timestamp" datetime="${new Date(item.timestamp).toISOString()}">
                              <i class="bi bi-clock" aria-hidden="true"></i> ${formattedTime}
                            </time>
                          </div>
                          <h4 class="my-history-title">${item.title}</h4>
                          <p class="my-history-body">${item.body}</p>
                          ${item.milestoneId ? `
                            <div class="my-history-card__actions">
                              <button type="button" class="btn btn-outline btn-xs my-history-jump-btn"
                                data-milestone-id="${item.milestoneId}"
                                title="View this milestone in the academic timeline">
                                <i class="bi bi-box-arrow-in-down-right" aria-hidden="true"></i> View in Timeline
                              </button>
                            </div>
                          ` : ''}
                        </div>
                      `;
                  }).join('')}
                </div>
              </div>
            `;
        }

        // Sort reminders chronologically by reminderTime
        reminderList.sort((a, b) => a.reminderTime - b.reminderTime);

        const customFormHtml = `
          <div class="my-reminders-custom-form" id="myRemindersCustomForm">
            <div class="custom-form-header">
              <h5 class="custom-form-title">
                <i class="bi bi-calendar-plus-fill" aria-hidden="true"></i> Add Custom Schedule Item
              </h5>
              <button type="button" class="custom-form-close-btn" id="myRemindersCloseFormBtn" aria-label="Cancel">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div class="custom-form-body">
              <div class="custom-form-field">
                <label for="customReminderTitle">Title / Task</label>
                <input type="text" id="customReminderTitle" class="custom-form-input" placeholder="e.g. Physics Coursework, Tuition 2nd Installment, Mock Prep" />
              </div>
              <div class="custom-form-row">
                <div class="custom-form-field">
                  <label for="customReminderCategory">Category</label>
                  <select id="customReminderCategory" class="custom-form-select">
                    <option value="Exams">Exams (Purple)</option>
                    <option value="Assignments" selected>Assignments (Amber)</option>
                    <option value="Fees">Fees (Emerald)</option>
                    <option value="General">General (Sky Blue)</option>
                  </select>
                </div>
                <div class="custom-form-field">
                  <label for="customReminderDate">Due / Milestone Date</label>
                  <input type="date" id="customReminderDate" class="custom-form-input" value="2026-11-20" />
                </div>
              </div>
              <div class="custom-form-actions">
                <button type="button" class="btn btn-primary btn-xs" id="myRemindersSaveCustomBtn">
                  <i class="bi bi-check-lg"></i> Save Reminder
                </button>
                <button type="button" class="btn btn-outline btn-xs" id="myRemindersCancelCustomBtn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        `;

        let listHtml = '';
        if (count === 0) {
            listHtml = `
              <div class="my-reminders-empty-state" id="myRemindersEmptyState">
                <div class="empty-state-icon" aria-hidden="true">
                  <i class="bi bi-bell-slash"></i>
                </div>
                <h4 class="empty-state-title">No Active Reminders</h4>
                <p class="empty-state-text">
                  You haven't scheduled any milestone alerts yet. Automatically populate your schedule with key academic milestones (exams, breaks, and resumptions), create a custom reminder, or browse the calendar below.
                </p>
                <div class="my-reminders-empty-actions">
                  <button type="button" class="btn btn-primary btn-sm my-reminders-auto-add-btn" id="myRemindersAutoAddBtn"
                    title="Automatically add all key academic milestones (exams, holidays) to My Reminders">
                    <i class="bi bi-calendar-plus-fill" aria-hidden="true"></i> Auto-Add Important Dates
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" id="myRemindersToggleNewBtn"
                    title="Add a custom reminder for assignments, fee deadlines, or exams">
                    <i class="bi bi-plus-lg" aria-hidden="true"></i> + Custom Reminder
                  </button>
                  <button type="button" class="btn btn-outline btn-sm my-reminders-browse-btn" id="myRemindersBrowseBtn">
                    <i class="bi bi-calendar-check" aria-hidden="true"></i> Browse Academic Calendar
                  </button>
                </div>
                ${this.showCustomForm ? customFormHtml : ''}
              </div>
            `;
        } else {
            const examsCount = reminderList.filter((r) => (r.category || 'General') === 'Exams').length;
            const assignmentsCount = reminderList.filter((r) => (r.category || 'General') === 'Assignments').length;
            const feesCount = reminderList.filter((r) => (r.category || 'General') === 'Fees').length;
            const generalCount = reminderList.filter((r) => (r.category || 'General') === 'General').length;

            const filteredList = this.selectedCategoryFilter === 'all'
                ? reminderList
                : reminderList.filter((item) => (item.category || 'General') === this.selectedCategoryFilter);

            listHtml = `
              <!-- Category Filter Chips -->
              <div class="my-reminders-category-filters" role="tablist" aria-label="Filter reminders by category">
                <button type="button" class="category-filter-chip ${this.selectedCategoryFilter === 'all' ? 'is-active' : ''}" data-cat-filter="all">
                  <i class="bi bi-grid-fill" aria-hidden="true"></i>
                  <span>All</span>
                  <span class="category-filter-count">${count}</span>
                </button>
                <button type="button" class="category-filter-chip category-filter-chip--exams ${this.selectedCategoryFilter === 'Exams' ? 'is-active' : ''}" data-cat-filter="Exams">
                  <i class="bi bi-mortarboard-fill" aria-hidden="true"></i>
                  <span>Exams</span>
                  <span class="category-filter-count">${examsCount}</span>
                </button>
                <button type="button" class="category-filter-chip category-filter-chip--assignments ${this.selectedCategoryFilter === 'Assignments' ? 'is-active' : ''}" data-cat-filter="Assignments">
                  <i class="bi bi-journal-check" aria-hidden="true"></i>
                  <span>Assignments</span>
                  <span class="category-filter-count">${assignmentsCount}</span>
                </button>
                <button type="button" class="category-filter-chip category-filter-chip--fees ${this.selectedCategoryFilter === 'Fees' ? 'is-active' : ''}" data-cat-filter="Fees">
                  <i class="bi bi-cash-coin" aria-hidden="true"></i>
                  <span>Fees</span>
                  <span class="category-filter-count">${feesCount}</span>
                </button>
                <button type="button" class="category-filter-chip category-filter-chip--general ${this.selectedCategoryFilter === 'General' ? 'is-active' : ''}" data-cat-filter="General">
                  <i class="bi bi-bookmark-star-fill" aria-hidden="true"></i>
                  <span>General</span>
                  <span class="category-filter-count">${generalCount}</span>
                </button>
              </div>

              <!-- List Toolbar -->
              <div class="my-reminders-list-toolbar" id="myRemindersListToolbar">
                <div class="list-toolbar-info">
                  <span class="list-toolbar-title">
                    <i class="bi bi-bell-fill" aria-hidden="true"></i>
                    <strong>${filteredList.length}</strong> ${this.selectedCategoryFilter === 'all' ? 'Scheduled Milestone' : `${this.selectedCategoryFilter} Item`}${filteredList.length === 1 ? '' : 's'}
                  </span>
                  <span class="list-toolbar-hint">Advance alerts trigger 24h prior to each milestone</span>
                </div>
                <div class="list-toolbar-actions">
                  <button type="button" class="btn btn-outline btn-xs" id="myRemindersToggleNewBtn"
                    title="Add a custom reminder for assignments, fee deadlines, or exams">
                    <i class="bi bi-plus-lg" aria-hidden="true"></i>
                    <span>+ Custom Reminder</span>
                  </button>
                  <button type="button" class="btn btn-outline btn-xs my-reminders-auto-add-btn" id="myRemindersToolbarAutoAddBtn"
                    title="Populate key academic dates (exams, holidays) directly from the school calendar">
                    <i class="bi bi-calendar-plus-fill" aria-hidden="true"></i>
                    <span>Auto-Add Important Dates</span>
                  </button>
                </div>
              </div>

              <!-- Optional Custom Reminder Form -->
              ${this.showCustomForm ? customFormHtml : ''}

              <!-- Reminders Items List -->
              ${filteredList.length === 0 ? `
                <div class="my-reminders-empty-category">
                  <i class="bi bi-funnel"></i>
                  <p>No reminders in the <strong>${this.selectedCategoryFilter}</strong> category.</p>
                  <button type="button" class="btn btn-outline btn-xs" id="myRemindersResetCatFilterBtn">
                    View All Reminders
                  </button>
                </div>
              ` : `
                <div class="my-reminders-items-list" role="list">
                  ${filteredList
                      .map((item) => {
                          const milestone = milestoneReminderService.findMilestone(item.milestoneId);
                          const reminderDate = new Date(item.reminderTime);
                          const formattedAlert = reminderDate.toLocaleString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                          });

                          const cat = item.category || 'General';
                          const catConfig = REMINDER_CATEGORIES[cat] || REMINDER_CATEGORIES['General'];
                          const snoozeOptions = milestoneReminderService.getSnoozeOptions(item.milestoneId);
                          const isSnoozed = Boolean(item.snoozedUntil && item.snoozedUntil > Date.now());
                          const snoozeTimeFormatted = isSnoozed
                              ? new Date(item.snoozedUntil!).toLocaleString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                              })
                              : '';

                          const termLabel = milestone?.termLabel || 'Academic Calendar';
                          const categoryLabel = milestone?.categoryLabel || 'Milestone';

                          return `
                            <div class="my-reminder-card my-reminder-card--${cat.toLowerCase()}" role="listitem" data-milestone-id="${item.milestoneId}">
                              <div class="my-reminder-card__header">
                                <div class="my-reminder-meta">
                                  <span class="category-badge category-badge--${cat.toLowerCase()}">
                                    <i class="bi ${catConfig.icon}" aria-hidden="true"></i>
                                    <span>${cat}</span>
                                  </span>
                                  <span class="my-reminder-term">${termLabel}</span>
                                  <span aria-hidden="true">·</span>
                                  <span class="my-reminder-category">${categoryLabel}</span>
                                </div>
                                <div class="my-reminder-card__top-actions">
                                  <label class="visually-hidden" for="catSelect-${item.milestoneId}">Category</label>
                                  <select class="my-reminder-category-select" id="catSelect-${item.milestoneId}" data-milestone-id="${item.milestoneId}" title="Change Category">
                                    <option value="Exams" ${cat === 'Exams' ? 'selected' : ''}>Exams</option>
                                    <option value="Assignments" ${cat === 'Assignments' ? 'selected' : ''}>Assignments</option>
                                    <option value="Fees" ${cat === 'Fees' ? 'selected' : ''}>Fees</option>
                                    <option value="General" ${cat === 'General' ? 'selected' : ''}>General</option>
                                  </select>
                                  <button type="button" class="my-reminder-remove-btn my-reminders-remove-btn"
                                    data-milestone-id="${item.milestoneId}"
                                    aria-label="Cancel reminder for ${item.title}"
                                    title="Cancel this reminder">
                                    <i class="bi bi-bell-slash" aria-hidden="true"></i>
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                              <h4 class="my-reminder-title">${item.title}</h4>
                              <div class="my-reminder-date-info">
                                <span><i class="bi bi-calendar3" aria-hidden="true"></i> ${item.dateText}</span>
                                ${milestone?.location ? `<span><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${milestone.location}</span>` : ''}
                              </div>

                              ${isSnoozed ? `
                                <div class="my-reminder-snoozed-alert">
                                  <div class="snoozed-alert-info">
                                    <i class="bi bi-alarm-fill" aria-hidden="true"></i>
                                    <span>Snoozed: Notifies on <strong>${snoozeTimeFormatted}</strong></span>
                                  </div>
                                  <button type="button" class="btn btn-outline btn-xs btn-cancel-snooze" data-milestone-id="${item.milestoneId}" title="Reset to standard 24-hour advance alert">
                                    <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset
                                  </button>
                                </div>
                              ` : `
                                <div class="my-reminder-schedule-pill">
                                  <i class="bi bi-clock-history" aria-hidden="true"></i>
                                  <span>Notifies 24h prior: <strong>${formattedAlert}</strong></span>
                                </div>
                              `}

                              <div class="my-reminder-card__actions">
                                <button type="button" class="btn btn-outline btn-sm my-reminder-jump-btn"
                                  data-milestone-id="${item.milestoneId}">
                                  <i class="bi bi-box-arrow-in-down-right" aria-hidden="true"></i> View in Timeline
                                </button>
                                <button type="button" class="btn btn-outline btn-sm my-reminder-calendar-btn"
                                  data-milestone-id="${item.milestoneId}">
                                  <i class="bi bi-calendar-plus" aria-hidden="true"></i> Add to Calendar
                                </button>

                                <!-- Snooze Option for Reminder Item -->
                                <div class="my-reminder-snooze-wrapper">
                                  <button type="button" class="btn btn-outline btn-sm my-reminder-snooze-btn"
                                    data-milestone-id="${item.milestoneId}"
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    title="Snooze this reminder (1h, 6h, or 12h without exceeding milestone date)">
                                    <i class="bi bi-alarm" aria-hidden="true"></i>
                                    <span>Snooze</span>
                                    <i class="bi bi-chevron-down" aria-hidden="true"></i>
                                  </button>
                                  <div class="my-reminder-snooze-flyout" id="snoozeFlyout-${item.milestoneId}" hidden>
                                    <div class="snooze-flyout-label">Delay alert by:</div>
                                    <div class="snooze-chips-row">
                                      ${snoozeOptions.map((opt) => `
                                        <button type="button" class="btn-snooze-chip ${!opt.valid ? 'is-disabled' : ''}"
                                          data-milestone-id="${item.milestoneId}"
                                          data-hours="${opt.hours}"
                                          ${!opt.valid ? 'disabled title="Cannot snooze past the reminder date"' : `title="Delay alert by ${opt.label}"`}>
                                          +${opt.hours}h
                                          ${!opt.valid ? '<span class="snooze-chip-disallowed">Past date</span>' : ''}
                                        </button>
                                      `).join('')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          `;
                      })
                      .join('')}
                </div>
              `}
            `;
        }

        // Chime selection section
        const chimesHtml = `
          <div class="my-reminders-chime-section">
            <div class="chime-section-header">
              <div class="chime-section-title-group">
                <h4 class="chime-section-title">
                  <i class="bi bi-music-note-beamed" aria-hidden="true"></i> Notification Chime
                </h4>
                <p class="chime-section-desc">
                  Choose a subtle, organic acoustic chime played during in-app milestone toast notifications.
                </p>
              </div>
            </div>

            <div class="chime-options-grid" role="radiogroup" aria-label="Milestone notification chime sound">
              ${CHIME_OPTIONS.map((opt) => {
                  const isSelected = opt.id === currentChime;
                  return `
                    <div class="chime-option-card ${isSelected ? 'is-selected' : ''}" data-chime-id="${opt.id}">
                      <label class="chime-option-label" for="chime-${opt.id}">
                        <input type="radio" name="milestone-chime" id="chime-${opt.id}" value="${opt.id}"
                          class="chime-radio-input" ${isSelected ? 'checked' : ''}>
                        <div class="chime-option-radio-indicator" aria-hidden="true">
                          <i class="bi bi-check2"></i>
                        </div>
                        <div class="chime-option-details">
                          <span class="chime-option-name">
                            <i class="bi ${opt.icon}" aria-hidden="true"></i> ${opt.name}
                          </span>
                          <span class="chime-option-desc">${opt.description}</span>
                        </div>
                      </label>
                      ${
                          opt.id !== 'silent'
                              ? `
                        <button type="button" class="chime-preview-btn" data-play-chime="${opt.id}"
                          aria-label="Preview ${opt.name} chime" title="Listen to ${opt.name}">
                          <i class="bi bi-volume-up-fill" aria-hidden="true"></i>
                          <span>Test</span>
                        </button>
                      `
                              : ''
                      }
                    </div>
                  `;
              }).join('')}
            </div>
          </div>
        `;

        const headerHtml = `
          <div class="my-reminders-header__titles">
            <span class="my-reminders-kicker">
              <i class="bi bi-bell-fill" aria-hidden="true"></i> Notification Schedule
            </span>
            <h3 id="myRemindersTitle" class="my-reminders-title">My Reminders</h3>
            <p id="myRemindersDesc" class="my-reminders-subtitle">
              ${count === 0 ? 'No milestones scheduled' : `${count} academic milestone${count === 1 ? '' : 's'} scheduled for advance notification`}
            </p>
          </div>
          <button type="button" class="my-reminders-close-btn" id="myRemindersCloseBtn" data-action="close"
            aria-label="Close My Reminders dialog">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        `;

        const bodyHtml = `
          ${pushCardHtml}

          <div class="my-reminders-tabs" role="tablist" aria-label="Reminders tabs">
            <button type="button" class="my-reminders-tab ${this.activeTab === 'reminders' ? 'is-active' : ''}"
              id="myRemindersTabReminders" role="tab"
              aria-selected="${this.activeTab === 'reminders' ? 'true' : 'false'}"
              aria-controls="myRemindersPanelReminders"
              data-tab="reminders">
              <i class="bi bi-calendar-check" aria-hidden="true"></i>
              <span>Scheduled Reminders</span>
              <span class="my-reminders-tab-badge ${count === 0 ? 'is-zero' : ''}" id="tabRemindersBadge">${count}</span>
            </button>
            <button type="button" class="my-reminders-tab ${this.activeTab === 'history' ? 'is-active' : ''}"
              id="myRemindersTabHistory" role="tab"
              aria-selected="${this.activeTab === 'history' ? 'true' : 'false'}"
              aria-controls="myRemindersPanelHistory"
              data-tab="history">
              <i class="bi bi-clock-history" aria-hidden="true"></i>
              <span>Notification History</span>
              <span class="my-reminders-tab-badge ${historyList.length === 0 ? 'is-zero' : ''}" id="tabHistoryBadge">${historyList.length}</span>
            </button>
          </div>

          <div class="my-reminders-tab-panel ${this.activeTab === 'reminders' ? 'is-active' : ''}"
            id="myRemindersPanelReminders" role="tabpanel" aria-labelledby="myRemindersTabReminders"
            ${this.activeTab !== 'reminders' ? 'hidden' : ''}>
            ${listHtml}
            ${chimesHtml}
          </div>

          <div class="my-reminders-tab-panel ${this.activeTab === 'history' ? 'is-active' : ''}"
            id="myRemindersPanelHistory" role="tabpanel" aria-labelledby="myRemindersTabHistory"
            ${this.activeTab !== 'history' ? 'hidden' : ''}>
            ${historyHtml}
          </div>
        `;

        const footerHtml = `
          <span class="my-reminders-footer-note">
            <i class="bi bi-shield-check" aria-hidden="true"></i> Advance alerts trigger 24h prior to milestone events.
          </span>
          <div class="my-reminders-footer-actions">
            ${count > 0 ? `
              <button type="button" class="btn btn-outline btn-sm my-reminders-clear-btn" id="myRemindersClearAllBtn">
                <i class="bi bi-trash3" aria-hidden="true"></i> Clear All Reminders
              </button>
            ` : ''}
            <button type="button" class="btn btn-primary btn-sm" data-action="close">
              Done
            </button>
          </div>
        `;

        const historyHash = historyList.map(h => `${h.timestamp}_${h.title}`).join('|');
        const currentRemindersHash = `${reminderList.map(r => r.milestoneId + (r.category || '') + (r.snoozedUntil || 0)).join('|')}#${historyHash}#${this.selectedCategoryFilter}#${this.showCustomForm}#${currentChime}#${this.activeTab}`;

        let sheetEl = this.modalEl.querySelector<HTMLElement>('.my-reminders-sheet');
        if (!sheetEl) {
            this.modalEl.innerHTML = `
              <div class="my-reminders-backdrop" data-action="close"></div>
              <div class="my-reminders-sheet" role="document">
                <div class="my-reminders-header" id="myRemindersHeader">${headerHtml}</div>
                <div class="my-reminders-body" id="myRemindersBody">${bodyHtml}</div>
                <div class="my-reminders-footer" id="myRemindersFooter">${footerHtml}</div>
              </div>
            `;
            this.lastRenderedRemindersHash = currentRemindersHash;
            this.bindModalInnerEvents();
        } else {
            const subtitleEl = this.modalEl.querySelector<HTMLElement>('#myRemindersDesc');
            if (subtitleEl) {
                const nextSubtitle = count === 0 ? 'No milestones scheduled' : `${count} academic milestone${count === 1 ? '' : 's'} scheduled for advance notification`;
                if (subtitleEl.textContent !== nextSubtitle) {
                    subtitleEl.textContent = nextSubtitle;
                }
            }

            // In-place push card synchronization to avoid tearing down switch controls and causing flicker
            const pushCard = this.modalEl.querySelector<HTMLElement>('#myRemindersPushCard');
            if (pushCard) {
                this.updatePushCardInPlace(
                    pushCard,
                    isChecked,
                    isPushBlocked,
                    statusBadgeClass,
                    statusBadgeIcon,
                    statusText,
                    statusDesc,
                    isDisabled,
                    notifState,
                    isDev,
                    permStatus,
                    unblockHelperHtml
                );
            } else {
                const bodyEl = this.modalEl.querySelector<HTMLElement>('#myRemindersBody');
                if (bodyEl) {
                    bodyEl.innerHTML = bodyHtml;
                    this.bindModalInnerEvents();
                    return;
                }
            }

            // Sync tab badge counters
            const tabRemindersBadge = this.modalEl.querySelector('#tabRemindersBadge');
            if (tabRemindersBadge) {
                tabRemindersBadge.textContent = `${count}`;
                tabRemindersBadge.className = `my-reminders-tab-badge ${count === 0 ? 'is-zero' : ''}`;
            }
            const tabHistoryBadge = this.modalEl.querySelector('#tabHistoryBadge');
            if (tabHistoryBadge) {
                tabHistoryBadge.textContent = `${historyList.length}`;
                tabHistoryBadge.className = `my-reminders-tab-badge ${historyList.length === 0 ? 'is-zero' : ''}`;
            }

            // Sync tab panels ONLY when reminders list, filters, or chimes have changed
            if (this.lastRenderedRemindersHash !== currentRemindersHash) {
                this.lastRenderedRemindersHash = currentRemindersHash;
                const panelReminders = this.modalEl.querySelector('#myRemindersPanelReminders');
                if (panelReminders) {
                    panelReminders.innerHTML = `${listHtml}${chimesHtml}`;
                }
                const panelHistory = this.modalEl.querySelector('#myRemindersPanelHistory');
                if (panelHistory) {
                    panelHistory.innerHTML = historyHtml;
                }
                this.bindPanelEvents();
            }
        }
    }

    private updatePushCardInPlace(
        pushCard: HTMLElement,
        isChecked: boolean,
        isPushBlocked: boolean,
        statusBadgeClass: string,
        statusBadgeIcon: string,
        statusText: string,
        statusDesc: string,
        isDisabled: boolean,
        notifState: string,
        isDev: boolean,
        permStatus: string,
        unblockHelperHtml: string
    ): void {
        pushCard.setAttribute('data-state', notifState);
        pushCard.setAttribute('role', isPushBlocked ? 'alert' : 'region');
        if (isPushBlocked) {
            pushCard.classList.add('my-reminders-blocked-banner');
        } else {
            pushCard.classList.remove('my-reminders-blocked-banner');
        }

        const iconBadge = pushCard.querySelector('.push-card-icon-badge');
        if (iconBadge) {
            iconBadge.className = `push-card-icon-badge ${isChecked ? 'is-active' : ''} ${isPushBlocked ? 'is-blocked' : ''}`;
            const icon = iconBadge.querySelector('i');
            if (icon) {
                icon.className = `bi ${isPushBlocked ? 'bi-bell-slash-fill' : isChecked ? 'bi-bell-fill' : 'bi-bell'}`;
            }
        }

        const title = pushCard.querySelector('.push-card-title');
        if (title) {
            title.textContent = isPushBlocked ? 'Browser Notifications Blocked' : 'Browser Push Notifications';
            if (isPushBlocked) {
                title.classList.add('blocked-banner-title');
            } else {
                title.classList.remove('blocked-banner-title');
            }
        }

        const statusBadge = pushCard.querySelector('.push-status-badge');
        if (statusBadge) {
            statusBadge.className = `push-status-badge ${statusBadgeClass}`;
            const icon = statusBadge.querySelector('.push-status-badge-icon');
            if (icon) {
                icon.className = `bi ${statusBadgeIcon} push-status-badge-icon`;
            }
            const text = statusBadge.querySelector('.push-status-text');
            if (text) {
                text.textContent = statusText;
            }
        }

        const desc = pushCard.querySelector('.push-card-desc');
        if (desc) {
            desc.textContent = statusDesc;
        }

        const toggle = pushCard.querySelector<HTMLInputElement>('#toggleNotificationPush');
        if (toggle) {
            if (toggle.checked !== isChecked) {
                toggle.checked = isChecked;
            }
            toggle.setAttribute('aria-checked', isChecked ? 'true' : 'false');
            toggle.disabled = isDisabled;
            const switchControl = toggle.closest('.switch-control');
            if (switchControl) {
                if (isDisabled) {
                    switchControl.classList.add('is-disabled');
                } else {
                    switchControl.classList.remove('is-disabled');
                }
            }
        }

        // Manage actions container (Unblock instructions and Test Alert button)
        const actionsCol = pushCard.querySelector('.push-card-actions');
        if (actionsCol) {
            // Unblock section management
            const existingUnblock = actionsCol.querySelector('#myRemindersUnblockSection');
            if (isPushBlocked) {
                if (!existingUnblock && unblockHelperHtml.trim()) {
                    const temp = document.createElement('div');
                    temp.innerHTML = unblockHelperHtml.trim();
                    if (temp.firstElementChild) {
                        actionsCol.prepend(temp.firstElementChild);
                        this.bindUnblockGuideEvents(actionsCol as HTMLElement);
                    }
                }
            } else if (existingUnblock) {
                existingUnblock.remove();
            }

            // Test button management (appears in dev mode when permissions are granted)
            const existingTestBtn = actionsCol.querySelector<HTMLButtonElement>(
                '#myRemindersTestNotificationBtn, #myRemindersTestAlertBtn, .my-reminders-test-notification-btn'
            );
            const shouldShowTestBtn = isDev && permStatus === 'granted';
            if (shouldShowTestBtn) {
                if (!existingTestBtn) {
                    const testBtnHtml = `
                      <button type="button" class="btn btn-outline btn-xs my-reminders-test-alert-btn my-reminders-test-notification-btn" id="myRemindersTestNotificationBtn" data-testid="myRemindersTestAlertBtn"
                        title="Send test browser push notification with a 5-second delay to verify alerts"
                        aria-label="Send test notification with 5-second delay">
                        <i class="bi bi-bell-fill" aria-hidden="true"></i>
                        <span>Send Test Notification</span>
                      </button>
                    `.trim();
                    const temp = document.createElement('div');
                    temp.innerHTML = testBtnHtml;
                    if (temp.firstElementChild) {
                        actionsCol.appendChild(temp.firstElementChild);
                        this.bindTestNotificationButton(actionsCol as HTMLElement);
                    }
                }
            } else if (existingTestBtn) {
                existingTestBtn.remove();
            }
        }
    }

    private bindPushCardEvents(): void {
        if (!this.modalEl) return;

        // Visual 'Enable Notifications' push toggle
        const pushToggle = this.modalEl.querySelector<HTMLInputElement>('#toggleNotificationPush');
        if (pushToggle && !(pushToggle as any)._hasBoundPushToggle) {
            (pushToggle as any)._hasBoundPushToggle = true;
            pushToggle.addEventListener('change', async (e) => {
                const target = e.currentTarget as HTMLInputElement;
                const notifState = milestoneReminderService.getNotificationState();

                if (notifState === 'denied') {
                    target.checked = false;
                    this.close();
                    milestoneReminderService.showNotificationHelp();
                    return;
                }

                if (notifState === 'default') {
                    const perm = await milestoneReminderService.requestNotificationPermission();
                    if (perm === 'granted') {
                        milestoneReminderService.setPushNotificationsEnabled(true);
                    } else if (perm === 'denied') {
                        milestoneReminderService.setPushNotificationsEnabled(false);
                        this.renderModalContent();
                        milestoneReminderService.showNotificationHelp();
                        return;
                    }
                    this.renderModalContent();
                    return;
                }

                milestoneReminderService.setPushNotificationsEnabled(target.checked);
            });
        }

        const actionsCol = this.modalEl.querySelector<HTMLElement>('.push-card-actions');
        if (actionsCol) {
            this.bindTestNotificationButton(actionsCol);
            this.bindUnblockGuideEvents(actionsCol);
        }
    }

    private bindTestNotificationButton(container: HTMLElement): void {
        const testNotificationBtn = container.querySelector<HTMLButtonElement>(
            '#myRemindersTestNotificationBtn, #myRemindersTestAlertBtn, .my-reminders-test-notification-btn'
        );
        if (!testNotificationBtn || (testNotificationBtn as any)._hasBoundTestBtn) return;
        (testNotificationBtn as any)._hasBoundTestBtn = true;

        testNotificationBtn.addEventListener('click', async () => {
            if (testNotificationBtn.disabled) return;
            testNotificationBtn.disabled = true;
            const originalHtml = `
              <i class="bi bi-bell-fill" aria-hidden="true"></i>
              <span>Send Test Notification</span>
            `;
            let remaining = 5;

            testNotificationBtn.innerHTML = `
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              <span>Sending test in ${remaining}s...</span>
            `;

            milestoneReminderService.showToast({
                type: 'info',
                title: 'Test Notification Scheduled',
                message: 'A test alert will trigger in 5 seconds. You can switch tabs or minimize the browser to verify background delivery!',
                duration: 5000,
            });

            const countdownInterval = window.setInterval(() => {
                remaining -= 1;
                if (remaining > 0 && testNotificationBtn) {
                    testNotificationBtn.innerHTML = `
                      <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                      <span>Sending test in ${remaining}s...</span>
                    `;
                }
            }, 1000);

            window.setTimeout(() => {
                window.clearInterval(countdownInterval);
                if (testNotificationBtn) {
                    testNotificationBtn.disabled = false;
                    testNotificationBtn.innerHTML = originalHtml;
                }
                void milestoneReminderService.sendTestNotification();
            }, 5000);
        });
    }

    private bindUnblockGuideEvents(container: HTMLElement): void {
        const openGuideBtns = container.querySelectorAll<HTMLElement>(
            '#myRemindersOpenGuideBtn, #myRemindersUnblockHelperLink, .my-reminders-unblock-link, .btn-allow-guide'
        );
        openGuideBtns.forEach((btn) => {
            if ((btn as any)._hasBoundGuide) return;
            (btn as any)._hasBoundGuide = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
                milestoneReminderService.showNotificationHelp();
            });
        });
    }

    /**
     * Binds events for elements rendered inside the modal body.
     */
    private bindModalInnerEvents(): void {
        if (!this.modalEl) return;

        this.bindPushCardEvents();

        // Tab switcher buttons
        const tabReminders = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersTabReminders');
        const tabHistory = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersTabHistory');

        tabReminders?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveTab('reminders');
        });

        tabHistory?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveTab('history');
        });

        this.bindPanelEvents();
    }

    /**
     * Binds events for buttons and forms inside tab panels and footers.
     */
    private bindPanelEvents(): void {
        if (!this.modalEl) return;

        // Clear Notification History button
        const clearHistoryBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersClearHistoryBtn');
        clearHistoryBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            milestoneReminderService.clearNotificationHistory();
            this.renderModalContent();
        });

        // History jump to timeline button
        const historyJumpBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('.my-history-jump-btn');
        historyJumpBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;
                this.close();
                milestoneReminderService.scrollToMilestone(milestoneId);
            });
        });

        // 'Send Test Notification' button (appears only when permissions are granted)
        const testNotificationBtn = this.modalEl.querySelector<HTMLButtonElement>(
            '#myRemindersTestNotificationBtn, #myRemindersTestAlertBtn, .my-reminders-test-notification-btn'
        );
        testNotificationBtn?.addEventListener('click', async () => {
            testNotificationBtn.disabled = true;
            const originalHtml = testNotificationBtn.innerHTML;
            let remaining = 5;

            testNotificationBtn.innerHTML = `
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
              <span>Sending test in ${remaining}s...</span>
            `;

            milestoneReminderService.showToast({
                type: 'info',
                title: 'Test Notification Scheduled',
                message: 'A test alert will trigger in 5 seconds. You can switch tabs or minimize the browser to verify background delivery!',
                duration: 5000,
            });

            const countdownInterval = window.setInterval(() => {
                remaining -= 1;
                if (remaining > 0 && testNotificationBtn) {
                    testNotificationBtn.innerHTML = `
                      <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                      <span>Sending test in ${remaining}s...</span>
                    `;
                }
            }, 1000);

            window.setTimeout(async () => {
                window.clearInterval(countdownInterval);
                try {
                    await milestoneReminderService.sendTestNotification();
                } finally {
                    if (testNotificationBtn) {
                        testNotificationBtn.disabled = false;
                        testNotificationBtn.innerHTML = originalHtml;
                    }
                }
            }, 5000);
        });

        // Auto-Add Important Dates button(s) (empty state, toolbar, footer)
        const autoAddBtns = this.modalEl.querySelectorAll<HTMLButtonElement>(
            '#myRemindersAutoAddBtn, #myRemindersToolbarAutoAddBtn, #myRemindersFooterAutoAddBtn, .my-reminders-auto-add-btn'
        );
        autoAddBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.autoAddImportantDates();
            });
        });

        // Browse Academic Calendar button (in empty state)
        const browseBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersBrowseBtn');
        browseBtn?.addEventListener('click', () => {
            this.close();
            const schoolDatesSection = document.getElementById('schoolDatesSection');
            schoolDatesSection?.scrollIntoView({ behavior: 'smooth' });
        });

        // Open notification guidance guide button or helper link (if blocked banner/card is shown)
        const openGuideBtns = this.modalEl.querySelectorAll<HTMLElement>(
            '#myRemindersOpenGuideBtn, #myRemindersUnblockHelperLink, .my-reminders-unblock-link, .btn-allow-guide'
        );
        openGuideBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
                milestoneReminderService.showNotificationHelp();
            });
        });

        // Individual remove buttons
        const removeBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('.my-reminder-remove-btn');
        removeBtns.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;

                const milestone = milestoneReminderService.findMilestone(milestoneId);
                if (milestone) {
                    await milestoneReminderService.setReminder(milestoneId, false);
                } else {
                    milestoneReminderService.removeStoredReminder(milestoneId);
                }

                this.updateBadges();
                this.renderModalContent();
            });
        });

        // View in Timeline buttons
        const jumpBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('.my-reminder-jump-btn');
        jumpBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;

                this.close();
                milestoneReminderService.scrollToMilestone(milestoneId);
            });
        });

        // Add to Calendar buttons
        const calBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('.my-reminder-calendar-btn');
        calBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;

                const milestone = milestoneReminderService.findMilestone(milestoneId);
                if (milestone) {
                    this.close();
                    CalendarActionSheet.getInstance().open(milestone, btn);
                }
            });
        });

        // Clear All button
        const clearBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersClearAllBtn');
        clearBtn?.addEventListener('click', () => {
            const all = milestoneReminderService.getAllStoredReminders();
            Object.keys(all).forEach((id) => {
                const milestone = milestoneReminderService.findMilestone(id);
                if (milestone) {
                    milestoneReminderService.disableReminder(milestone);
                } else {
                    milestoneReminderService.removeStoredReminder(id);
                }
            });

            // Uncheck any DOM checkboxes in timeline
            document.querySelectorAll<HTMLInputElement>('.timeline-remind-me-checkbox').forEach((cb) => {
                cb.checked = false;
                const label = cb.closest<HTMLLabelElement>('.timeline-remind-me-label');
                label?.classList.remove('is-checked');
            });

            this.updateBadges();
            this.renderModalContent();
        });

        // Chime option radio selections
        const chimeRadios = this.modalEl.querySelectorAll<HTMLInputElement>('.chime-radio-input');
        chimeRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                const chimeId = radio.value as ChimeId;
                milestoneChimeSynthesizer.setSelectedChime(chimeId);
                milestoneChimeSynthesizer.playChime(chimeId);
                this.modalEl?.querySelectorAll('.chime-option-card').forEach((card) => {
                    const el = card as HTMLElement;
                    el.classList.toggle('is-selected', el.dataset.chimeId === chimeId);
                });
            });
        });

        // Chime test/preview buttons
        const previewBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('[data-play-chime]');
        previewBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const chimeId = btn.dataset.playChime as ChimeId;
                if (chimeId) {
                    milestoneChimeSynthesizer.playChime(chimeId);
                    btn.classList.add('is-playing');
                    setTimeout(() => btn.classList.remove('is-playing'), 500);
                }
            });
        });

        // Category Filter Chips
        const catFilterChips = this.modalEl.querySelectorAll<HTMLButtonElement>('.category-filter-chip');
        catFilterChips.forEach((chip) => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const cat = chip.dataset.catFilter as 'all' | ReminderCategory;
                if (cat) {
                    this.setSelectedCategoryFilter(cat);
                }
            });
        });

        const resetCatBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersResetCatFilterBtn');
        resetCatBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setSelectedCategoryFilter('all');
        });

        // Category Selector changes
        const catSelects = this.modalEl.querySelectorAll<HTMLSelectElement>('.my-reminder-category-select');
        catSelects.forEach((sel) => {
            sel.addEventListener('change', () => {
                const milestoneId = sel.dataset.milestoneId;
                const newCat = sel.value as ReminderCategory;
                if (milestoneId && newCat) {
                    milestoneReminderService.updateReminderCategory(milestoneId, newCat);
                    this.renderModalContent();
                }
            });
        });

        // Card Snooze flyout triggers
        const snoozeBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('.my-reminder-snooze-btn');
        snoozeBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                if (!milestoneId) return;
                const flyout = this.modalEl?.querySelector<HTMLElement>(`#snoozeFlyout-${milestoneId}`);
                if (flyout) {
                    const isHidden = flyout.hasAttribute('hidden');
                    // Hide any other open flyouts
                    this.modalEl?.querySelectorAll('.my-reminder-snooze-flyout').forEach((f) => f.setAttribute('hidden', ''));
                    if (isHidden) {
                        flyout.removeAttribute('hidden');
                        btn.setAttribute('aria-expanded', 'true');
                    } else {
                        flyout.setAttribute('hidden', '');
                        btn.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });

        // Card Snooze duration choice chips (+1h, +6h, +12h)
        const snoozeChips = this.modalEl.querySelectorAll<HTMLButtonElement>('.btn-snooze-chip');
        snoozeChips.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                const hours = Number(btn.dataset.hours) as SnoozeDurationHours;
                if (milestoneId && hours) {
                    milestoneReminderService.snoozeReminder(milestoneId, hours);
                    this.renderModalContent();
                }
            });
        });

        // Card Cancel Snooze button
        const cancelSnoozeBtns = this.modalEl.querySelectorAll<HTMLButtonElement>('.btn-cancel-snooze');
        cancelSnoozeBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const milestoneId = btn.dataset.milestoneId;
                if (milestoneId) {
                    milestoneReminderService.cancelSnooze(milestoneId);
                    this.renderModalContent();
                }
            });
        });

        // Custom Reminder Form Toggle
        const toggleNewBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersToggleNewBtn');
        toggleNewBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCustomForm = !this.showCustomForm;
            this.renderModalContent();
        });

        const closeFormBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersCloseFormBtn');
        closeFormBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCustomForm = false;
            this.renderModalContent();
        });

        const cancelCustomBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersCancelCustomBtn');
        cancelCustomBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCustomForm = false;
            this.renderModalContent();
        });

        const saveCustomBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersSaveCustomBtn');
        saveCustomBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const titleInput = this.modalEl?.querySelector<HTMLInputElement>('#customReminderTitle');
            const catSelect = this.modalEl?.querySelector<HTMLSelectElement>('#customReminderCategory');
            const dateInput = this.modalEl?.querySelector<HTMLInputElement>('#customReminderDate');

            const title = titleInput?.value.trim() || '';
            const category = (catSelect?.value as ReminderCategory) || 'General';
            const dateVal = dateInput?.value || '';

            if (!title) {
                titleInput?.focus();
                return;
            }

            const eventTime = dateVal ? new Date(`${dateVal}T08:00:00Z`).getTime() : (Date.now() + 7 * 86400000);
            const dateText = dateVal ? new Date(dateVal).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Upcoming Milestone';

            milestoneReminderService.addCustomReminder({
                title,
                category,
                dateText,
                eventTime,
            });

            this.showCustomForm = false;
            this.updateBadges();
            this.renderModalContent();
        });
    }

    /**
     * Cleans up the controller instance and removes modal element from DOM.
     */
    public destroy(): void {
        this.close();
        if (this.modalEl && this.modalEl.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
        }
        this.modalEl = null;
        this.topNavBtn = null;
        this.bottomNavBtn = null;
        this.topNavBadge = null;
        this.bottomNavBadge = null;
    }
}

export const myRemindersController = MyRemindersController.getInstance();
