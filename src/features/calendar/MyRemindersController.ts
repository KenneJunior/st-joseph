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
        if (this.isOpen) {
            this.renderModalContent();
        }
    }

    public getActiveTab(): 'reminders' | 'history' {
        return this.activeTab;
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

                <div class="push-card-mute-row" id="pushCardMuteRow">
                  <div class="mute-row-info">
                    <div class="mute-row-title-with-badge">
                      <span class="mute-row-title">
                        <i class="bi bi-bell-slash" aria-hidden="true"></i> Mute Notifications
                      </span>
                      ${isMuted ? `<span class="mute-status-tag"><i class="bi bi-volume-mute-fill" aria-hidden="true"></i> Muted Locally</span>` : ''}
                    </div>
                    <p class="mute-row-desc">Locally suppress the reception of test and future academic notifications without revoking browser permissions.</p>
                  </div>
                  <div class="mute-row-toggle-wrapper">
                    <label class="switch-control ${isDisabled ? 'is-disabled' : ''}" for="toggleMuteNotifications"
                      title="${isDisabled ? 'Notifications unavailable' : 'Locally suppress test and academic notifications'}">
                      <input type="checkbox" id="toggleMuteNotifications" role="switch"
                        aria-checked="${isMuted ? 'true' : 'false'}"
                        aria-label="Mute Notifications"
                        ${isMuted ? 'checked' : ''}
                        ${isDisabled ? 'disabled' : ''}>
                      <span class="switch-slider switch-slider--amber" aria-hidden="true"></span>
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

        let listHtml = '';
        if (count === 0) {
            listHtml = `
              <div class="my-reminders-empty-state" id="myRemindersEmptyState">
                <div class="empty-state-icon" aria-hidden="true">
                  <i class="bi bi-bell-slash"></i>
                </div>
                <h4 class="empty-state-title">No Active Reminders</h4>
                <p class="empty-state-text">
                  You haven't scheduled any milestone alerts yet. Automatically populate your schedule with key academic milestones (exams, breaks, and resumptions) or browse the calendar below.
                </p>
                <div class="my-reminders-empty-actions">
                  <button type="button" class="btn btn-primary btn-sm my-reminders-auto-add-btn" id="myRemindersAutoAddBtn"
                    title="Automatically add all key academic milestones (exams, holidays) to My Reminders">
                    <i class="bi bi-calendar-plus-fill" aria-hidden="true"></i> Auto-Add Important Dates
                  </button>
                  <button type="button" class="btn btn-outline btn-sm my-reminders-browse-btn" id="myRemindersBrowseBtn">
                    <i class="bi bi-calendar-check" aria-hidden="true"></i> Browse Academic Calendar
                  </button>
                </div>
              </div>
            `;
        } else {
            listHtml = `
              <div class="my-reminders-list-toolbar" id="myRemindersListToolbar">
                <div class="list-toolbar-info">
                  <span class="list-toolbar-title">
                    <i class="bi bi-bell-fill" aria-hidden="true"></i>
                    <strong>${count}</strong> Scheduled Milestone${count === 1 ? '' : 's'}
                  </span>
                  <span class="list-toolbar-hint">Advance alerts trigger 24h prior to each milestone</span>
                </div>
                <button type="button" class="btn btn-outline btn-xs my-reminders-auto-add-btn" id="myRemindersToolbarAutoAddBtn"
                  title="Populate key academic dates (exams, holidays) directly from the school calendar">
                  <i class="bi bi-calendar-plus-fill" aria-hidden="true"></i>
                  <span>Auto-Add Important Dates</span>
                </button>
              </div>
              <div class="my-reminders-items-list" role="list">
                ${reminderList
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

                        const termLabel = milestone?.termLabel || 'Academic Calendar';
                        const categoryLabel = milestone?.categoryLabel || 'Milestone';

                        return `
                          <div class="my-reminder-card" role="listitem" data-milestone-id="${item.milestoneId}">
                            <div class="my-reminder-card__header">
                              <div class="my-reminder-meta">
                                <span class="my-reminder-term">${termLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span class="my-reminder-category">${categoryLabel}</span>
                              </div>
                              <button type="button" class="my-reminder-remove-btn my-reminders-remove-btn"
                                data-milestone-id="${item.milestoneId}"
                                aria-label="Cancel reminder for ${item.title}"
                                title="Cancel this reminder">
                                <i class="bi bi-bell-slash" aria-hidden="true"></i>
                                <span>Cancel</span>
                              </button>
                            </div>
                            <h4 class="my-reminder-title">${item.title}</h4>
                            <div class="my-reminder-date-info">
                              <span><i class="bi bi-calendar3" aria-hidden="true"></i> ${item.dateText}</span>
                              ${milestone?.location ? `<span><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${milestone.location}</span>` : ''}
                            </div>
                            <div class="my-reminder-schedule-pill">
                              <i class="bi bi-clock-history" aria-hidden="true"></i>
                              <span>Notifies 24h prior: <strong>${formattedAlert}</strong></span>
                            </div>
                            <div class="my-reminder-card__actions">
                              <button type="button" class="btn btn-outline btn-sm my-reminder-jump-btn"
                                data-milestone-id="${item.milestoneId}">
                                <i class="bi bi-box-arrow-in-down-right" aria-hidden="true"></i> View in Timeline
                              </button>
                              <button type="button" class="btn btn-outline btn-sm my-reminder-calendar-btn"
                                data-milestone-id="${item.milestoneId}">
                                <i class="bi bi-calendar-plus" aria-hidden="true"></i> Add to Calendar
                              </button>
                            </div>
                          </div>
                        `;
                    })
                    .join('')}
              </div>
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

        this.modalEl.innerHTML = `
          <div class="my-reminders-backdrop" data-action="close"></div>
          <div class="my-reminders-sheet" role="document">
            <div class="my-reminders-header">
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
            </div>

            <div class="my-reminders-body">
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
            </div>

            <div class="my-reminders-footer">
              <span class="my-reminders-footer-note">
                <i class="bi bi-shield-check" aria-hidden="true"></i> Advance alerts trigger 24h prior to milestone events.
              </span>
              <div class="my-reminders-footer-actions">
                <button type="button" class="btn btn-outline btn-sm my-reminders-auto-add-btn" id="myRemindersFooterAutoAddBtn"
                  title="Automatically populate reminders with key academic dates from the calendar">
                  <i class="bi bi-calendar-plus" aria-hidden="true"></i> Auto-Add Dates
                </button>
                ${count > 0 ? `
                  <button type="button" class="btn btn-outline btn-sm my-reminders-clear-btn" id="myRemindersClearAllBtn">
                    <i class="bi bi-trash3" aria-hidden="true"></i> Clear All Reminders
                  </button>
                ` : ''}
                <button type="button" class="btn btn-primary btn-sm" data-action="close">
                  Done
                </button>
              </div>
            </div>
          </div>
        `;

        this.bindModalInnerEvents();
    }

    /**
     * Binds events for elements rendered inside the modal body.
     */
    private bindModalInnerEvents(): void {
        if (!this.modalEl) return;

        // Visual 'Enable Notifications' push toggle
        const pushToggle = this.modalEl.querySelector<HTMLInputElement>('#toggleNotificationPush');
        pushToggle?.addEventListener('change', async (e) => {
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
            this.renderModalContent();
        });

        // 'Mute Notifications' toggle (locally suppresses alerts without revoking browser permissions)
        const muteToggle = this.modalEl.querySelector<HTMLInputElement>('#toggleMuteNotifications');
        muteToggle?.addEventListener('change', (e) => {
            const target = e.currentTarget as HTMLInputElement;
            milestoneReminderService.setMuted(target.checked);
            this.renderModalContent();
        });

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
                this.renderModalContent();
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
                }
            });
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
