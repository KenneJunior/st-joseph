/**
 * ============================================================================
 * SJCCC – Notification Permission Guidance Controller
 * (NotificationGuidanceModal.ts)
 * 
 * Accessible, theme-aware interactive dialog that guides users on how to
 * unblock and allow browser milestone notifications across Windows, macOS,
 * iOS, Android, Chrome, Firefox, Safari, and Edge using device detection.
 * ============================================================================
 */

import {
    detectPlatform,
    getNotificationPermissionGuidance,
    getAllNotificationPermissionGuides,
    type DevicePlatformInfo,
} from '../../core/platform/platformDetection.ts';
import { LiquidGlassAdapter } from '../../ui/effects/LiquidGlassAdapter.ts';

export class NotificationGuidanceModal {
    private static instance: NotificationGuidanceModal | null = null;

    private modalEl: HTMLElement | null = null;
    private isOpen: boolean = false;
    private lastFocusedEl: HTMLElement | null = null;
    private activeGuideKey: string = '';
    private detectedPlatform: DevicePlatformInfo;

    private constructor() {
        this.detectedPlatform = detectPlatform();
        const initialGuide = getNotificationPermissionGuidance(this.detectedPlatform);
        this.activeGuideKey = initialGuide.key;
    }

    public static getInstance(): NotificationGuidanceModal {
        if (!NotificationGuidanceModal.instance) {
            NotificationGuidanceModal.instance = new NotificationGuidanceModal();
        }
        return NotificationGuidanceModal.instance;
    }

    /**
     * Opens the Notification Permission Guidance dialog.
     * @param targetGuideKey Optional specific guide key to display initially.
     */
    public open(targetGuideKey?: string): void {
        this.detectedPlatform = detectPlatform();
        const detectedGuide = getNotificationPermissionGuidance(this.detectedPlatform);
        this.activeGuideKey = targetGuideKey || detectedGuide.key;

        const modal = this.ensureModalElement();
        this.lastFocusedEl = (document.activeElement as HTMLElement) || null;
        this.isOpen = true;

        this.renderContent();

        modal.hidden = false;
        if (typeof (modal as HTMLDialogElement).showModal === 'function') {
            try {
                (modal as HTMLDialogElement).showModal();
            } catch {
                // Fallback for mocked DOM / older engines
            }
        }

        document.body.classList.add('notification-guide-open');

        // Apply physical LiquidGlass optical refraction and tactile ripple to notification guidance dialog
        const dialog = modal.querySelector<HTMLElement>('.notification-guidance-dialog') || modal;
        LiquidGlassAdapter.enhancePopup(dialog);

        const closeBtn = modal.querySelector<HTMLElement>('#notificationGuideCloseBtn');
        closeBtn?.focus();
    }

    /**
     * Closes the guidance dialog.
     */
    public close(): void {
        if (!this.modalEl) return;
        this.isOpen = false;

        if (typeof (this.modalEl as HTMLDialogElement).close === 'function') {
            try {
                (this.modalEl as HTMLDialogElement).close();
            } catch {
                // Fallback
            }
        }

        this.modalEl.hidden = true;
        document.body.classList.remove('notification-guide-open');

        if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
            this.lastFocusedEl.focus();
        }
    }

    public getIsOpen(): boolean {
        return this.isOpen;
    }

    /**
     * Ensures the singleton modal dialog element exists in the DOM.
     */
    private ensureModalElement(): HTMLElement {
        let modal = document.getElementById('notificationGuidanceModal');
        if (!modal) {
            modal = document.createElement('dialog');
            modal.id = 'notificationGuidanceModal';
            modal.className = 'notification-guide-overlay';
            modal.setAttribute('aria-labelledby', 'notificationGuideTitle');
            modal.setAttribute('aria-describedby', 'notificationGuideDesc');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.hidden = true;
            document.body.appendChild(modal);

            // Backdrop click close & close buttons
            modal.addEventListener('click', (e) => {
                const target = e.target as HTMLElement | null;
                if (target === modal || target?.dataset.action === 'close' || target?.closest('[data-action="close"]')) {
                    this.close();
                }
            });

            // Escape key close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Observe theme changes to keep open modal reactive
            if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
                try {
                    const themeObserver = new MutationObserver(() => {
                        if (this.isOpen) {
                            const isDark = document.documentElement.classList.contains('dark-mode')
                                || document.body.classList.contains('dark-mode')
                                || document.documentElement.getAttribute('data-theme') === 'dark';
                            modal?.setAttribute('data-theme', isDark ? 'dark' : 'light');
                        }
                    });
                    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
                } catch {
                    // Ignore in mock DOM
                }
            }
        }

        this.modalEl = modal;
        return modal;
    }

    /**
     * Renders the dynamic dialog contents for the currently selected guide.
     */
    public renderContent(): void {
        if (!this.modalEl) return;

        const allGuides = getAllNotificationPermissionGuides();
        const activeGuide = allGuides.find((g) => g.key === this.activeGuideKey)
            || getNotificationPermissionGuidance(this.detectedPlatform);

        const currentPerm = typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'denied';

        const permBadgeClass = currentPerm === 'granted'
            ? 'guide-status-badge--granted'
            : currentPerm === 'denied'
                ? 'guide-status-badge--denied'
                : 'guide-status-badge--default';

        const permLabel = currentPerm === 'granted'
            ? 'Allowed'
            : currentPerm === 'denied'
                ? 'Blocked'
                : 'Not Set';

        // Synchronize theme attribute
        const isDark = document.documentElement.classList.contains('dark-mode')
            || document.body.classList.contains('dark-mode')
            || document.documentElement.getAttribute('data-theme') === 'dark';
        this.modalEl.setAttribute('data-theme', isDark ? 'dark' : 'light');

        const headerHtml = `
            <div class="notification-guide-header__text">
              <span class="notification-guide-kicker">
                <i class="bi bi-bell-slash-fill" aria-hidden="true"></i> Notification Setup Guide
              </span>
              <h3 id="notificationGuideTitle" class="notification-guide-title">
                Allow Milestone Notifications
              </h3>
              <p id="notificationGuideDesc" class="notification-guide-subtitle">
                Step-by-step instructions to enable 24-hour advance milestone reminders on your browser and operating system.
              </p>
            </div>
            <button type="button" class="notification-guide-close-btn" id="notificationGuideCloseBtn"
              data-action="close" aria-label="Close notification guide">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
        `;

        const deviceBarHtml = `
            <div class="device-detected-info">
              <i class="bi bi-laptop" aria-hidden="true"></i>
              <span>Detected Platform: <strong>${this.detectedPlatform.browserLabel}</strong> on <strong>${this.detectedPlatform.osLabel}</strong></span>
            </div>
            <div class="guide-status-badge ${permBadgeClass}">
              <i class="bi ${currentPerm === 'granted' ? 'bi-check-circle-fill' : currentPerm === 'denied' ? 'bi-shield-x' : 'bi-info-circle-fill'}" aria-hidden="true"></i>
              Status: ${permLabel}
            </div>
        `;

        const tabsHtml = allGuides
            .map((g) => {
                const isSelected = g.key === activeGuide.key;
                return `
                  <button type="button" role="tab"
                    class="notification-guide-tab ${isSelected ? 'is-active' : ''}"
                    data-guide-key="${g.key}"
                    aria-selected="${isSelected ? 'true' : 'false'}"
                    title="${g.headline}">
                    <i class="bi ${g.iconClass || 'bi-globe'}" aria-hidden="true"></i>
                    <span>${g.browserLabel}</span>
                  </button>
                `;
            })
            .join('');

        const bodyHtml = `
            <div class="guide-active-card">
              <div class="guide-card-header">
                <div class="guide-card-icon">
                  <i class="bi ${activeGuide.iconClass || 'bi-gear-wide-connected'}" aria-hidden="true"></i>
                </div>
                <div class="guide-card-titles">
                  <h4 class="guide-card-headline">${activeGuide.headline}</h4>
                  <p class="guide-card-summary">${activeGuide.instructions}</p>
                </div>
              </div>

              <!-- Numbered Steps -->
              <ol class="guide-steps-list">
                ${activeGuide.steps
                  .map((step, idx) => `
                    <li class="guide-step-item">
                      <span class="guide-step-number" aria-hidden="true">${idx + 1}</span>
                      <div class="guide-step-content">${step}</div>
                    </li>
                  `)
                  .join('')}
              </ol>

              <!-- OS Level System Steps -->
              ${activeGuide.osSteps && activeGuide.osSteps.length > 0 ? `
                <div class="guide-os-section">
                  <h5 class="guide-os-title">
                    <i class="bi bi-shield-lock" aria-hidden="true"></i> System Notification Settings (${activeGuide.osLabel})
                  </h5>
                  <ol class="guide-steps-list guide-steps-list--os">
                    ${activeGuide.osSteps
                      .map((step, idx) => `
                        <li class="guide-step-item">
                          <span class="guide-step-number guide-step-number--os" aria-hidden="true">OS ${idx + 1}</span>
                          <div class="guide-step-content">${step}</div>
                        </li>
                      `)
                      .join('')}
                  </ol>
                </div>
              ` : ''}

              <!-- Quick Tip -->
              ${activeGuide.quickTip ? `
                <div class="guide-quick-tip">
                  <i class="bi bi-lightbulb-fill" aria-hidden="true"></i>
                  <div>
                    <strong>Helpful Tip:</strong> ${activeGuide.quickTip}
                  </div>
                </div>
              ` : ''}
            </div>
        `;

        const footerHtml = `
            <span class="guide-footer-note">
              <i class="bi bi-info-circle" aria-hidden="true"></i> In-app toast alerts remain active regardless of browser permission.
            </span>
            <div class="guide-footer-buttons">
              <button type="button" class="btn btn-secondary btn-sm" id="guideTestPermBtn">
                <i class="bi bi-bell" aria-hidden="true"></i> Test Notifications
              </button>
              <button type="button" class="btn btn-primary btn-sm" data-action="close">
                Got It
              </button>
            </div>
        `;

        let sheetEl = this.modalEl.querySelector<HTMLElement>('.notification-guide-sheet');
        if (!sheetEl) {
            this.modalEl.innerHTML = `
              <div class="notification-guide-backdrop" data-action="close" aria-hidden="true"></div>
              <div class="notification-guide-sheet" role="document">
                <div class="notification-guide-header" id="notificationGuideHeader">${headerHtml}</div>
                <div class="notification-guide-device-bar" id="notificationGuideDeviceBar">${deviceBarHtml}</div>
                <div class="notification-guide-tabs" id="notificationGuideTabs" role="tablist" aria-label="Choose your device or browser">${tabsHtml}</div>
                <div class="notification-guide-body" id="notificationGuideBody" role="tabpanel">${bodyHtml}</div>
                <div class="notification-guide-footer" id="notificationGuideFooter">${footerHtml}</div>
              </div>
            `;
        } else {
            const deviceBarEl = sheetEl.querySelector<HTMLElement>('#notificationGuideDeviceBar');
            const tabsEl = sheetEl.querySelector<HTMLElement>('#notificationGuideTabs');
            const bodyEl = sheetEl.querySelector<HTMLElement>('#notificationGuideBody');
            const footerEl = sheetEl.querySelector<HTMLElement>('#notificationGuideFooter');

            if (deviceBarEl) deviceBarEl.innerHTML = deviceBarHtml;
            if (tabsEl) tabsEl.innerHTML = tabsHtml;
            if (bodyEl) {
                bodyEl.classList.remove('guide-fade-in');
                bodyEl.innerHTML = bodyHtml;
                // Trigger reflow to restart CSS animation smoothly
                void bodyEl.offsetWidth;
                bodyEl.classList.add('guide-fade-in');
            }
            if (footerEl) footerEl.innerHTML = footerHtml;
        }

        this.bindEvents();
    }

    /**
     * Binds click events inside the dialog using robust event delegation.
     */
    private bindEvents(): void {
        if (!this.modalEl) return;

        // Tab switcher with event delegation
        const tabsEl = this.modalEl.querySelector<HTMLElement>('#notificationGuideTabs');
        if (tabsEl && !(tabsEl as any)._hasBoundTabs) {
            (tabsEl as any)._hasBoundTabs = true;
            tabsEl.addEventListener('click', (e) => {
                const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.notification-guide-tab');
                if (!target) return;
                const guideKey = target.dataset.guideKey;
                if (guideKey && guideKey !== this.activeGuideKey) {
                    this.activeGuideKey = guideKey;
                    this.renderContent();
                }
            });
        }

        // Test notification button
        const testBtn = this.modalEl.querySelector<HTMLButtonElement>('#guideTestPermBtn');
        if (testBtn && !(testBtn as any)._hasBoundTestPerm) {
            (testBtn as any)._hasBoundTestPerm = true;
            testBtn.addEventListener('click', async () => {
                if (typeof window === 'undefined' || !('Notification' in window)) {
                    const noteEl = this.modalEl?.querySelector('.guide-footer-note');
                    if (noteEl) {
                        noteEl.innerHTML = '<i class="bi bi-exclamation-circle" aria-hidden="true"></i> Notification API is not supported by this browser.';
                    }
                    return;
                }

                try {
                    const res = await Notification.requestPermission();
                    if (res === 'granted') {
                        try {
                            new Notification('SJCCC Notifications Enabled!', {
                                body: 'Milestone reminder alerts will now reach you 24 hours in advance.',
                                icon: '/assets/icons/168X168.svg',
                            });
                        } catch {
                            // Some mobile browsers fail on new Notification
                        }
                    }
                    this.renderContent();
                } catch {
                    this.renderContent();
                }
            });
        }
    }
}

export const notificationGuidanceModal = NotificationGuidanceModal.getInstance();
