/**
 * ============================================================================
 * SJCCC – Calendar Action Sheet Controller
 * ============================================================================
 * Accessible, lightweight, mobile-responsive dialog for choosing calendar
 * destination (Google Calendar, Outlook / M365, or Apple / .ics download).
 *
 * Truthful UX:
 *  - Never falsely claims "Saved" or "Added" to a calendar.
 *  - Full focus trapping & restoration to originating button.
 *  - Handles Escape, backdrop clicks, keyboard navigation, and live ARIA announcements.
 *  - Robust object URL lifecycle and rapid-click protection.
 *  - Offline network hints without global blocking.
 * ============================================================================
 */

import type { AcademicMilestone } from '../../data/academicCalendar';
import { buildGoogleCalendarUrl, buildOutlookUrl, generateIcs } from './CalendarSerializer';

export class CalendarActionSheet {
    private static instance: CalendarActionSheet | null = null;
    private dialogEl: HTMLElement | null = null;
    private currentMilestone: AcademicMilestone | null = null;
    private originatingBtn: HTMLElement | null = null;
    private isActionPending = false;
    private activeObjectUrl: string | null = null;

    private constructor() {
        this.ensureDomElements();
        this.bindEvents();
    }

    public static getInstance(): CalendarActionSheet {
        if (!CalendarActionSheet.instance) {
            CalendarActionSheet.instance = new CalendarActionSheet();
        }
        return CalendarActionSheet.instance;
    }

    private ensureDomElements(): void {
        let existing = document.getElementById('calendarActionDialog');
        if (!existing) {
            const overlay = document.createElement('div');
            overlay.id = 'calendarActionDialog';
            overlay.className = 'calendar-action-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'calDialogTitle');
            overlay.setAttribute('aria-describedby', 'calDialogDesc');
            overlay.hidden = true;

            const backdrop = document.createElement('div');
            backdrop.className = 'calendar-action-backdrop';
            backdrop.dataset.action = 'close';
            overlay.appendChild(backdrop);

            const sheet = document.createElement('div');
            sheet.className = 'calendar-action-sheet';
            sheet.tabIndex = -1;

            const header = document.createElement('div');
            header.className = 'calendar-action-header';

            const titleGroup = document.createElement('div');
            titleGroup.className = 'calendar-action-title-group';

            const kicker = document.createElement('span');
            kicker.className = 'calendar-action-kicker';
            kicker.innerHTML = '<i class="bi bi-calendar-plus" aria-hidden="true"></i> Add to Calendar';

            const title = document.createElement('h3');
            title.id = 'calDialogTitle';
            title.className = 'calendar-action-title';
            title.textContent = 'Select Calendar';

            const desc = document.createElement('p');
            desc.id = 'calDialogDesc';
            desc.className = 'calendar-action-event-info';

            titleGroup.appendChild(kicker);
            titleGroup.appendChild(title);
            titleGroup.appendChild(desc);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'calendar-action-close-btn';
            closeBtn.dataset.action = 'close';
            closeBtn.setAttribute('aria-label', 'Close calendar options dialog');
            closeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

            header.appendChild(titleGroup);
            header.appendChild(closeBtn);
            sheet.appendChild(header);

            const body = document.createElement('div');
            body.className = 'calendar-action-body';

            const providerList = document.createElement('div');
            providerList.className = 'calendar-provider-list';
            providerList.setAttribute('role', 'menu');

            const googleBtn = document.createElement('button');
            googleBtn.type = 'button';
            googleBtn.className = 'calendar-provider-btn';
            googleBtn.dataset.provider = 'google';
            googleBtn.setAttribute('role', 'menuitem');
            googleBtn.innerHTML = `
              <div class="calendar-provider-icon google-icon"><i class="bi bi-google" aria-hidden="true"></i></div>
              <div class="calendar-provider-details">
                <span class="calendar-provider-name">Google Calendar</span>
                <span class="calendar-provider-desc">Opens Google Calendar in a new browser tab</span>
              </div>
              <i class="bi bi-box-arrow-up-right calendar-provider-arrow" aria-hidden="true"></i>
            `;

            const outlookBtn = document.createElement('button');
            outlookBtn.type = 'button';
            outlookBtn.className = 'calendar-provider-btn';
            outlookBtn.dataset.provider = 'outlook';
            outlookBtn.setAttribute('role', 'menuitem');
            outlookBtn.innerHTML = `
              <div class="calendar-provider-icon outlook-icon"><i class="bi bi-microsoft" aria-hidden="true"></i></div>
              <div class="calendar-provider-details">
                <span class="calendar-provider-name">Outlook / Microsoft 365</span>
                <span class="calendar-provider-desc">Opens Outlook Web compose page</span>
              </div>
              <i class="bi bi-box-arrow-up-right calendar-provider-arrow" aria-hidden="true"></i>
            `;

            const icsBtn = document.createElement('button');
            icsBtn.type = 'button';
            icsBtn.className = 'calendar-provider-btn';
            icsBtn.dataset.provider = 'ics';
            icsBtn.setAttribute('role', 'menuitem');
            icsBtn.innerHTML = `
              <div class="calendar-provider-icon ics-icon"><i class="bi bi-file-earmark-arrow-down" aria-hidden="true"></i></div>
              <div class="calendar-provider-details">
                <span class="calendar-provider-name">Apple Calendar / Other Apps</span>
                <span class="calendar-provider-desc">Downloads calendar file (.ics)</span>
              </div>
              <i class="bi bi-download calendar-provider-arrow" aria-hidden="true"></i>
            `;

            providerList.appendChild(googleBtn);
            providerList.appendChild(outlookBtn);
            providerList.appendChild(icsBtn);
            body.appendChild(providerList);

            const offlineHint = document.createElement('div');
            offlineHint.id = 'calOfflineHint';
            offlineHint.className = 'calendar-offline-hint';
            offlineHint.hidden = true;
            offlineHint.innerHTML = `
              <i class="bi bi-wifi-off" aria-hidden="true"></i>
              <span>You are currently offline. Web calendar links may not load until connection is restored; calendar file (.ics) download is fully available.</span>
            `;
            body.appendChild(offlineHint);

            const guidance = document.createElement('div');
            guidance.id = 'calActionGuidance';
            guidance.className = 'calendar-action-guidance';
            guidance.hidden = true;

            const guidanceContent = document.createElement('div');
            guidanceContent.className = 'calendar-guidance-content';

            const guidanceIcon = document.createElement('i');
            guidanceIcon.id = 'calGuidanceIcon';
            guidanceIcon.className = 'bi bi-info-circle-fill';
            guidanceIcon.setAttribute('aria-hidden', 'true');

            const guidanceText = document.createElement('div');
            guidanceText.id = 'calGuidanceText';

            guidanceContent.appendChild(guidanceIcon);
            guidanceContent.appendChild(guidanceText);
            guidance.appendChild(guidanceContent);
            body.appendChild(guidance);

            sheet.appendChild(body);

            const footer = document.createElement('div');
            footer.className = 'calendar-action-footer';

            const dismissBtn = document.createElement('button');
            dismissBtn.type = 'button';
            dismissBtn.className = 'btn btn-outline calendar-action-dismiss-btn';
            dismissBtn.dataset.action = 'close';
            dismissBtn.textContent = 'Cancel';

            footer.appendChild(dismissBtn);
            sheet.appendChild(footer);

            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            if (!document.getElementById('calendarStatusLive')) {
                const live = document.createElement('div');
                live.id = 'calendarStatusLive';
                live.className = 'sr-only';
                live.setAttribute('aria-live', 'polite');
                live.setAttribute('aria-atomic', 'true');
                document.body.appendChild(live);
            }
        }
        this.dialogEl = document.getElementById('calendarActionDialog');
    }

    private bindEvents(): void {
        if (!this.dialogEl) return;

        // Click delegation
        this.dialogEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            const closeTrigger = target.closest<HTMLElement>('[data-action="close"]');
            if (closeTrigger) {
                e.preventDefault();
                this.close();
                return;
            }

            const providerBtn = target.closest<HTMLButtonElement>('[data-provider]');
            if (providerBtn && !this.isActionPending) {
                e.preventDefault();
                const provider = providerBtn.dataset.provider as 'google' | 'outlook' | 'ics';
                this.handleProviderAction(provider);
            }
        });

        // Keydown handling for Escape & focus trapping
        this.dialogEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                return;
            }

            if (e.key === 'Tab') {
                this.trapFocus(e);
            }
        });

        // Online / Offline synchronization
        window.addEventListener('online', () => this.updateConnectivityHints());
        window.addEventListener('offline', () => this.updateConnectivityHints());
    }

    public open(milestone: AcademicMilestone, triggerBtn: HTMLElement): void {
        this.ensureDomElements();
        if (!this.dialogEl) return;

        this.currentMilestone = milestone;
        this.originatingBtn = triggerBtn;
        this.isActionPending = false;

        // Set aria-expanded on trigger button
        this.originatingBtn.setAttribute('aria-expanded', 'true');

        // Populate event details
        const titleEl = document.getElementById('calDialogTitle');
        const descEl = document.getElementById('calDialogDesc');
        const guidanceEl = document.getElementById('calActionGuidance');

        if (titleEl) {
            titleEl.textContent = 'Add to Calendar';
        }
        if (descEl) {
            descEl.innerHTML = `<strong>${milestone.title}</strong><br><span class="cal-event-sub">${milestone.dateText} &bull; ${milestone.location}</span>`;
        }
        if (guidanceEl) {
            guidanceEl.hidden = true;
        }

        this.updateConnectivityHints();

        // Reveal dialog
        this.dialogEl.hidden = false;
        this.dialogEl.classList.add('is-open');
        document.body.classList.add('calendar-modal-open');

        // Focus first actionable element inside sheet
        setTimeout(() => {
            const firstActionable = this.dialogEl?.querySelector<HTMLElement>('[data-provider="google"], button[data-action="close"]');
            firstActionable?.focus();
        }, 50);

        this.announceToScreenReader(`Calendar options dialog opened for ${milestone.title}. Select Google Calendar, Outlook, or download calendar file.`);
    }

    public close(): void {
        if (!this.dialogEl || this.dialogEl.hidden) return;

        this.dialogEl.classList.remove('is-open');
        this.dialogEl.hidden = true;
        document.body.classList.remove('calendar-modal-open');

        if (this.originatingBtn) {
            this.originatingBtn.setAttribute('aria-expanded', 'false');
            this.originatingBtn.focus();
        }

        this.currentMilestone = null;
        this.isActionPending = false;
    }

    private handleProviderAction(provider: 'google' | 'outlook' | 'ics'): void {
        if (!this.currentMilestone) return;
        this.isActionPending = true;

        const m = this.currentMilestone;

        if (provider === 'google') {
            const url = buildGoogleCalendarUrl(m);
            this.announceToScreenReader(`Opening Google Calendar in a new tab for ${m.title}.`);
            this.showGuidance('Opening Google Calendar in a new tab. Please confirm and save the event in Google Calendar.', 'info');
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => {
                this.isActionPending = false;
            }, 600);
        } else if (provider === 'outlook') {
            const url = buildOutlookUrl(m);
            this.announceToScreenReader(`Opening Outlook Web in a new tab for ${m.title}.`);
            this.showGuidance('Opening Outlook in a new tab. Please verify and save the event in Outlook Web.', 'info');
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => {
                this.isActionPending = false;
            }, 600);
        } else if (provider === 'ics') {
            this.announceToScreenReader(`Generating calendar file for ${m.title}.`);
            this.showGuidance('Generating calendar file...', 'info');

            try {
                const icsContent = generateIcs(m);
                const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

                if (this.activeObjectUrl) {
                    URL.revokeObjectURL(this.activeObjectUrl);
                    this.activeObjectUrl = null;
                }

                const url = URL.createObjectURL(blob);
                this.activeObjectUrl = url;

                const a = document.createElement('a');
                a.href = url;
                a.download = `SJCCC-${m.id}.ics`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Safe cleanup after browser initiates download
                setTimeout(() => {
                    if (this.activeObjectUrl === url) {
                        URL.revokeObjectURL(url);
                        this.activeObjectUrl = null;
                    }
                }, 2000);

                const msg = 'Calendar file download started. Open the file from your Downloads folder or notification to add it to Apple Calendar or your default calendar app.';
                this.showGuidance(msg, 'success');
                this.announceToScreenReader(msg);
            } catch (err) {
                const errMsg = 'Unable to prepare calendar file. Please use Google Calendar or Outlook web instead.';
                this.showGuidance(errMsg, 'error');
                this.announceToScreenReader(errMsg);
            } finally {
                setTimeout(() => {
                    this.isActionPending = false;
                }, 600);
            }
        }
    }

    private showGuidance(text: string, type: 'info' | 'success' | 'error'): void {
        const guidanceEl = document.getElementById('calActionGuidance');
        const textEl = document.getElementById('calGuidanceText');
        const iconEl = document.getElementById('calGuidanceIcon');
        if (!guidanceEl || !textEl || !iconEl) return;

        guidanceEl.hidden = false;
        guidanceEl.className = `calendar-action-guidance is-${type}`;
        textEl.textContent = text;

        if (type === 'success') {
            iconEl.className = 'bi bi-check-circle-fill';
        } else if (type === 'error') {
            iconEl.className = 'bi bi-exclamation-triangle-fill';
        } else {
            iconEl.className = 'bi bi-info-circle-fill';
        }
    }

    private updateConnectivityHints(): void {
        const hintEl = document.getElementById('calOfflineHint');
        if (!hintEl) return;
        // Strictly evaluate connectivity - only show offline warning if navigator.onLine is explicitly false
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        hintEl.hidden = !isOffline;
        hintEl.style.display = isOffline ? 'flex' : 'none';
    }

    private trapFocus(e: KeyboardEvent): void {
        if (!this.dialogEl) return;
        const focusable = this.dialogEl.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    private announceToScreenReader(message: string): void {
        const liveRegion = document.getElementById('calendarStatusLive');
        if (liveRegion) {
            liveRegion.textContent = '';
            // Allow DOM to cycle
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 30);
        }
    }
}
