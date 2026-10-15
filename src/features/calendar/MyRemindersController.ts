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
import { detectPlatform } from '../../core/platform/platformDetection.ts';

export class MyRemindersController {
    private static instance: MyRemindersController | null = null;

    private topNavBtn: HTMLElement | null = null;
    private bottomNavBtn: HTMLElement | null = null;
    private topNavBadge: HTMLElement | null = null;
    private bottomNavBadge: HTMLElement | null = null;
    private modalEl: HTMLElement | null = null;
    private isOpen: boolean = false;
    private lastFocusedEl: HTMLElement | null = null;

    private constructor() {
        this.init();
    }

    public static getInstance(): MyRemindersController {
        if (!MyRemindersController.instance) {
            MyRemindersController.instance = new MyRemindersController();
        }
        return MyRemindersController.instance;
    }

    public init(): void {
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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
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
        this.modalEl.hidden = true;
        document.body.classList.remove('reminders-modal-open');

        // Restore focus
        if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
            this.lastFocusedEl.focus();
        }
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

        // Check if browser notifications are blocked
        const isPermDenied = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied';
        const blockedBannerHtml = isPermDenied
            ? `
              <div class="my-reminders-blocked-banner" role="alert">
                <div class="blocked-banner-icon" aria-hidden="true">
                  <i class="bi bi-bell-slash-fill"></i>
                </div>
                <div class="blocked-banner-content">
                  <strong class="blocked-banner-title">Browser Notifications Blocked</strong>
                  <p class="blocked-banner-desc">
                    Your browser on <strong>${platform.browserLabel} (${platform.osLabel})</strong> is currently blocking notification alerts. In-app notifications will still chime, but system popups require permission.
                  </p>
                  <button type="button" class="btn-allow-guide" id="myRemindersOpenGuideBtn">
                    <i class="bi bi-question-circle" aria-hidden="true"></i>
                    <span>How to allow notifications on ${platform.browserLabel}</span>
                    <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            `
            : '';

        // Sort reminders chronologically by reminderTime
        reminderList.sort((a, b) => a.reminderTime - b.reminderTime);

        let listHtml = '';
        if (count === 0) {
            listHtml = `
              ${blockedBannerHtml}
              <div class="my-reminders-empty-state">
                <div class="empty-state-icon" aria-hidden="true">
                  <i class="bi bi-bell-slash"></i>
                </div>
                <h4 class="empty-state-title">No Active Reminders</h4>
                <p class="empty-state-text">
                  You haven't scheduled any milestone alerts yet. Browse the Academic Calendar below and check
                  <strong>"Remind me"</strong> on exams, breaks, or resumptions to receive advance alerts.
                </p>
                <button type="button" class="btn btn-primary btn-sm my-reminders-browse-btn" id="myRemindersBrowseBtn">
                  <i class="bi bi-calendar-check" aria-hidden="true"></i> Browse Academic Calendar
                </button>
              </div>
            `;
        } else {
            listHtml = `
              ${blockedBannerHtml}
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
                              <button type="button" class="my-reminder-remove-btn"
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
              ${listHtml}
              ${chimesHtml}
            </div>

            <div class="my-reminders-footer">
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

        // Browse Academic Calendar button (in empty state)
        const browseBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersBrowseBtn');
        browseBtn?.addEventListener('click', () => {
            this.close();
            const schoolDatesSection = document.getElementById('schoolDatesSection');
            schoolDatesSection?.scrollIntoView({ behavior: 'smooth' });
        });

        // Open notification guidance guide button (if blocked banner is shown)
        const openGuideBtn = this.modalEl.querySelector<HTMLButtonElement>('#myRemindersOpenGuideBtn');
        openGuideBtn?.addEventListener('click', () => {
            this.close();
            milestoneReminderService.showNotificationHelp();
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
}

export const myRemindersController = MyRemindersController.getInstance();
