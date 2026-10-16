import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { MyRemindersController } from '../../src/features/calendar/MyRemindersController.ts';
import { milestoneReminderService } from '../../src/features/calendar/MilestoneReminderService.ts';
import { renderTimelineMilestones } from '../../src/features/calendar/TimelineRenderer.ts';
import { notificationGuidanceModal } from '../../src/features/calendar/NotificationGuidanceModal.ts';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../src/data/academicCalendar.ts';

const FULL_APP_HTML = `
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <title>SJCCC</title>
</head>
<body data-theme="light">
  <header>
    <button type="button" class="nav-link nav-link--reminders" id="navMyRemindersBtn">
      <span class="nav-text">Reminders</span>
      <span class="nav-reminders-badge is-zero" id="navRemindersBadge">0</span>
    </button>
  </header>

  <nav class="mobile-bottom-bar" id="mobileBottomBar">
    <button type="button" class="mobile-bottom-item mobile-bottom-item--reminders" id="bottomMyRemindersBtn">
      <div class="mobile-bottom-badge-wrapper">
        <span class="bottom-reminders-badge is-zero" id="bottomRemindersBadge">0</span>
      </div>
      <span class="mobile-bottom-label">Reminders</span>
    </button>
  </nav>

  <div class="timeline-track-container" id="timelineTrackContainer">
    <div class="timeline-milestones-list" id="timelineMilestonesList"></div>
  </div>
  <div id="milestoneToastContainer" class="milestone-toast-container"></div>
</body>
</html>
`;

describe('MyRemindersController - Navbar, Bottom Dock & Reminders Management', () => {
    let controller: MyRemindersController;
    let mockNotification: any;

    beforeEach(() => {
        const dom = new JSDOM(FULL_APP_HTML, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).HTMLDialogElement = dom.window.HTMLDialogElement;
        (globalThis as any).localStorage = dom.window.localStorage;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);

        dom.window.localStorage.clear();

        // Notification API mock
        mockNotification = vi.fn().mockImplementation(function (this: any, title: string, options: any) {
            this.title = title;
            this.options = options;
            this.close = vi.fn();
        });
        mockNotification.permission = 'granted';
        mockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
        (globalThis as any).Notification = mockNotification;
        (dom.window as any).Notification = mockNotification;

        // Render milestones into container
        const listEl = document.getElementById('timelineMilestonesList');
        renderTimelineMilestones(listEl);

        const trackContainer = document.querySelector<HTMLElement>('.timeline-track-container');
        milestoneReminderService.init(trackContainer);

        controller = MyRemindersController.getInstance();
        controller.init();
    });

    afterEach(() => {
        controller.destroy();
        milestoneReminderService.destroy();
        vi.restoreAllMocks();
    });

    it('initializes badges to zero and hides badge indicator', () => {
        const navBadge = document.getElementById('navRemindersBadge');
        const bottomBadge = document.getElementById('bottomRemindersBadge');

        expect(navBadge).not.toBeNull();
        expect(bottomBadge).not.toBeNull();
        expect(navBadge!.textContent).toBe('0');
        expect(bottomBadge!.textContent).toBe('0');
        expect(navBadge!.classList.contains('is-zero')).toBe(true);
        expect(bottomBadge!.classList.contains('is-zero')).toBe(true);
    });

    it('opens empty state modal when clicking nav button with no active reminders', () => {
        const navBtn = document.getElementById('navMyRemindersBtn');
        expect(navBtn).not.toBeNull();

        navBtn!.click();

        const modal = document.getElementById('myRemindersModal');
        expect(modal).not.toBeNull();
        expect(modal!.hasAttribute('hidden')).toBe(false);
        expect(modal!.classList.contains('is-open')).toBe(true);

        // Verify empty state text
        expect(modal!.textContent).toContain('No Active Reminders');
        expect(modal!.querySelector('#myRemindersBrowseBtn')).not.toBeNull();
    });

    it('opens empty state modal when clicking bottom navigation dock button', () => {
        const bottomBtn = document.getElementById('bottomMyRemindersBtn');
        expect(bottomBtn).not.toBeNull();

        bottomBtn!.click();

        const modal = document.getElementById('myRemindersModal');
        expect(modal).not.toBeNull();
        expect(modal!.classList.contains('is-open')).toBe(true);
    });

    it('updates badges and lists reminders when reminders are added', async () => {
        const milestone = ACADEMIC_MILESTONES_2026_2027[0];
        // Add a reminder directly into localStorage / service
        await milestoneReminderService.enableReminder(milestone);

        // Controller updates badge count
        controller.updateBadges();

        const navBadge = document.getElementById('navRemindersBadge');
        const bottomBadge = document.getElementById('bottomRemindersBadge');

        expect(navBadge!.textContent).toBe('1');
        expect(bottomBadge!.textContent).toBe('1');
        expect(navBadge!.classList.contains('is-zero')).toBe(false);
        expect(bottomBadge!.classList.contains('is-zero')).toBe(false);

        // Open modal
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        expect(modal.textContent).toContain(milestone.title);
        expect(modal.textContent).toContain(milestone.categoryLabel);
        expect(modal.querySelector('.my-reminders-remove-btn')).not.toBeNull();
        expect(modal.querySelector('#myRemindersClearAllBtn')).not.toBeNull();
    });

    it('displays blocked notification warning banner when permissions are denied', async () => {
        mockNotification.permission = 'denied';
        const milestone = ACADEMIC_MILESTONES_2026_2027[0];

        // Add a reminder
        await milestoneReminderService.enableReminder(milestone);

        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        const blockedBanner = modal.querySelector('.my-reminders-blocked-banner');
        expect(blockedBanner).not.toBeNull();
        expect(blockedBanner!.textContent).toContain('Browser Notifications Blocked');

        // Clicking open guide button triggers guidance modal
        const openGuideSpy = vi.spyOn(notificationGuidanceModal, 'open');
        const guideBtn = modal.querySelector<HTMLButtonElement>('#myRemindersOpenGuideBtn');
        expect(guideBtn).not.toBeNull();

        guideBtn!.click();
        expect(openGuideSpy).toHaveBeenCalled();
    });

    it('removes a reminder when clicking remove button and unchecks corresponding timeline checkbox', async () => {
        const milestone = ACADEMIC_MILESTONES_2026_2027[0];
        await milestoneReminderService.enableReminder(milestone);

        // Sync timeline checkbox
        const timelineCb = document.querySelector<HTMLInputElement>(`.timeline-remind-me-checkbox[data-milestone-id="${milestone.id}"]`);
        if (timelineCb) {
            timelineCb.checked = true;
        }

        controller.open();
        const modal = document.getElementById('myRemindersModal')!;

        const removeBtn = modal.querySelector<HTMLButtonElement>(`.my-reminders-remove-btn[data-milestone-id="${milestone.id}"]`);
        expect(removeBtn).not.toBeNull();

        removeBtn!.click();
        await new Promise((r) => setTimeout(r, 30));

        // Check storage is now empty
        const stored = milestoneReminderService.getAllStoredReminders();
        expect(stored[milestone.id]).toBeUndefined();

        // Timeline checkbox should now be unchecked
        if (timelineCb) {
            expect(timelineCb.checked).toBe(false);
        }

        // Modal should re-render empty state
        expect(modal.textContent).toContain('No Active Reminders');
    });

    it('clears all reminders when clicking Clear All', async () => {
        await milestoneReminderService.enableReminder(ACADEMIC_MILESTONES_2026_2027[0]);
        await milestoneReminderService.enableReminder(ACADEMIC_MILESTONES_2026_2027[1]);

        controller.open();
        const modal = document.getElementById('myRemindersModal')!;
        const clearAllBtn = modal.querySelector<HTMLButtonElement>('#myRemindersClearAllBtn');
        expect(clearAllBtn).not.toBeNull();

        clearAllBtn!.click();

        const stored = milestoneReminderService.getAllStoredReminders();
        expect(Object.keys(stored).length).toBe(0);

        const navBadge = document.getElementById('navRemindersBadge');
        expect(navBadge!.textContent).toBe('0');
        expect(navBadge!.classList.contains('is-zero')).toBe(true);
    });

    it('syncs theme attribute data-theme on modal based on root theme', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        expect(modal.getAttribute('data-theme')).toBe('dark');

        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark-mode');
        controller.open();
        expect(modal.getAttribute('data-theme')).toBe('light');
    });

    it('closes modal when Escape key is pressed or close button is clicked', () => {
        controller.open();
        const modal = document.getElementById('myRemindersModal')!;
        expect(modal.classList.contains('is-open')).toBe(true);

        // Click close button
        const closeBtn = modal.querySelector<HTMLButtonElement>('.my-reminders-close-btn');
        expect(closeBtn).not.toBeNull();
        closeBtn!.click();

        expect(modal.classList.contains('is-open')).toBe(false);
        expect(modal.hasAttribute('hidden')).toBe(true);

        // Reopen and test escape
        controller.open();
        expect(modal.classList.contains('is-open')).toBe(true);

        window.dispatchEvent(new (window as any).KeyboardEvent('keydown', { key: 'Escape' }));
        expect(modal.classList.contains('is-open')).toBe(false);
    });

    it('renders dedicated push notifications card with toggle switch inside dialog', () => {
        controller.open();
        const modal = document.getElementById('myRemindersModal')!;
        const pushCard = modal.querySelector<HTMLElement>('#myRemindersPushCard');
        expect(pushCard).not.toBeNull();

        const toggle = pushCard!.querySelector<HTMLInputElement>('#toggleNotificationPush');
        expect(toggle).not.toBeNull();
        expect(toggle!.getAttribute('role')).toBe('switch');
        expect(toggle!.checked).toBe(true);
        expect(toggle!.getAttribute('aria-checked')).toBe('true');
    });

    it('prompts for browser notification permission when clicking toggle from default state', async () => {
        mockNotification.permission = 'default';
        mockNotification.requestPermission = vi.fn().mockImplementation(async () => {
            mockNotification.permission = 'granted';
            return 'granted';
        });
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        const toggle = modal.querySelector<HTMLInputElement>('#toggleNotificationPush')!;
        expect(toggle.checked).toBe(false);

        // Click toggle to request permission
        toggle.checked = true;
        toggle.dispatchEvent(new (window as any).Event('change'));
        await new Promise((r) => setTimeout(r, 40));

        expect(mockNotification.requestPermission).toHaveBeenCalled();
        const updatedToggle = modal.querySelector<HTMLInputElement>('#toggleNotificationPush')!;
        expect(updatedToggle.checked).toBe(true);
        expect(modal.textContent).toContain('Active · Push Alerts Enabled');
    });

    it('toggles between active and muted states when permissions are already granted', () => {
        mockNotification.permission = 'granted';
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        let toggle = modal.querySelector<HTMLInputElement>('#toggleNotificationPush')!;
        expect(toggle.checked).toBe(true);

        // Toggle OFF (mute)
        toggle.checked = false;
        toggle.dispatchEvent(new (window as any).Event('change'));

        expect(milestoneReminderService.isPushNotificationsEnabled()).toBe(false);
        toggle = modal.querySelector<HTMLInputElement>('#toggleNotificationPush')!;
        expect(toggle.checked).toBe(false);
        expect(modal.textContent).toContain('Muted');

        // Toggle back ON
        toggle.checked = true;
        toggle.dispatchEvent(new (window as any).Event('change'));
        expect(milestoneReminderService.isPushNotificationsEnabled()).toBe(true);
    });

    it('disables toggle and presents unblock guidance when notifications are blocked', () => {
        mockNotification.permission = 'denied';
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        const toggle = modal.querySelector<HTMLInputElement>('#toggleNotificationPush')!;
        expect(toggle.disabled).toBe(true);
        expect(toggle.checked).toBe(false);
        expect(modal.textContent).toContain('Blocked in Browser');

        const unblockBtn = modal.querySelector<HTMLButtonElement>('#myRemindersOpenGuideBtn');
        expect(unblockBtn).not.toBeNull();
    });

    it('gates test alert button: visible in dev, omitted or hidden in production', () => {
        mockNotification.permission = 'granted';

        // In default test runner (localhost), isDev is true
        vi.spyOn(milestoneReminderService, 'isDevEnvironment').mockReturnValue(true);
        controller.open();
        let modal = document.getElementById('myRemindersModal')!;
        let testBtn = modal.querySelector<HTMLButtonElement>('#myRemindersTestNotificationBtn, #myRemindersTestAlertBtn');
        expect(testBtn).not.toBeNull();
        expect(testBtn!.textContent).toContain('Send Test Notification');

        // In production environment (e.g. Vercel deployment), isDev is false
        vi.spyOn(milestoneReminderService, 'isDevEnvironment').mockReturnValue(false);
        controller.renderModalContent();
        modal = document.getElementById('myRemindersModal')!;
        testBtn = modal.querySelector<HTMLButtonElement>('#myRemindersTestNotificationBtn, #myRemindersTestAlertBtn');
        expect(testBtn).toBeNull();
    });

    it('renders "Send Test Notification" button only when permissions are granted and triggers 5s delayed alert', async () => {
        vi.useFakeTimers();
        try {
            vi.spyOn(milestoneReminderService, 'isDevEnvironment').mockReturnValue(true);

            // 1. When permission is 'default', button does NOT appear
            mockNotification.permission = 'default';
            controller.open();
            let modal = document.getElementById('myRemindersModal')!;
            expect(modal.querySelector('#myRemindersTestNotificationBtn')).toBeNull();

            // 2. When permission is 'denied', button does NOT appear
            mockNotification.permission = 'denied';
            controller.open();
            modal = document.getElementById('myRemindersModal')!;
            expect(modal.querySelector('#myRemindersTestNotificationBtn')).toBeNull();

            // 3. When permission is 'granted', button appears
            mockNotification.permission = 'granted';
            milestoneReminderService.setPushNotificationsEnabled(true);
            controller.open();
            modal = document.getElementById('myRemindersModal')!;
            const testBtn = modal.querySelector<HTMLButtonElement>('#myRemindersTestNotificationBtn')!;
            expect(testBtn).not.toBeNull();
            expect(testBtn.textContent).toContain('Send Test Notification');

            // 4. Click button to trigger 5-second delayed test alert
            const sendSpy = vi.spyOn(milestoneReminderService, 'sendTestNotification').mockResolvedValue(true);
            testBtn.click();

            // Button should be disabled during countdown
            expect(testBtn.disabled).toBe(true);
            expect(testBtn.textContent).toContain('Sending test in 5s');

            // Fast-forward 1 second
            vi.advanceTimersByTime(1000);
            expect(testBtn.textContent).toContain('Sending test in 4s');

            // Fast-forward remaining 4 seconds (total 5 seconds)
            vi.advanceTimersByTime(4000);
            await Promise.resolve();

            expect(sendSpy).toHaveBeenCalled();
            expect(testBtn.disabled).toBe(false);
            expect(testBtn.textContent).toContain('Send Test Notification');
        } finally {
            vi.useRealTimers();
        }
    });

    it('checkNotificationStatus returns granted, denied, or default and reflects in UI badge immediately upon opening', () => {
        // 1. Default state
        mockNotification.permission = 'default';
        expect(controller.checkNotificationStatus()).toBe('default');
        expect(milestoneReminderService.checkNotificationStatus()).toBe('default');

        controller.open();
        let modal = document.getElementById('myRemindersModal')!;
        let statusBadge = modal.querySelector('.push-status-badge')!;
        expect(statusBadge.textContent).toContain('Disabled');
        expect(statusBadge.classList.contains('push-status-badge--default')).toBe(true);
        expect(statusBadge.querySelector('i')?.classList.contains('bi-info-circle-fill')).toBe(true);
        expect(modal.querySelector('#myRemindersUnblockHelperLink')).toBeNull();

        // 2. Granted state
        mockNotification.permission = 'granted';
        milestoneReminderService.setPushNotificationsEnabled(true);
        expect(controller.checkNotificationStatus()).toBe('granted');
        expect(milestoneReminderService.checkNotificationStatus()).toBe('granted');

        controller.open();
        modal = document.getElementById('myRemindersModal')!;
        statusBadge = modal.querySelector('.push-status-badge')!;
        expect(statusBadge.textContent).toContain('Active · Push Alerts Enabled');
        expect(statusBadge.classList.contains('push-status-badge--active')).toBe(true);
        expect(statusBadge.querySelector('i')?.classList.contains('bi-check-circle-fill')).toBe(true);
        expect(modal.querySelector('#myRemindersUnblockHelperLink')).toBeNull();

        // 3. Denied state
        mockNotification.permission = 'denied';
        expect(controller.checkNotificationStatus()).toBe('denied');
        expect(milestoneReminderService.checkNotificationStatus()).toBe('denied');

        controller.open();
        modal = document.getElementById('myRemindersModal')!;
        statusBadge = modal.querySelector('.push-status-badge')!;
        expect(statusBadge.textContent).toContain('Blocked in Browser');
        expect(statusBadge.classList.contains('push-status-badge--blocked')).toBe(true);
        expect(statusBadge.querySelector('i')?.classList.contains('bi-exclamation-triangle-fill')).toBe(true);
    });

    it('conditionally renders "How to unblock" helper link with platform-specific instructions when denied', () => {
        mockNotification.permission = 'denied';
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        const unblockSection = modal.querySelector('#myRemindersUnblockSection');
        expect(unblockSection).not.toBeNull();

        // Verifies platform-specific instructions box
        const stepsBox = modal.querySelector('.push-card-unblock-box')!;
        expect(stepsBox).not.toBeNull();
        expect(stepsBox.textContent).toContain('How to unblock in');
        expect(modal.querySelectorAll('.unblock-steps-list li').length).toBeGreaterThan(0);

        // Verifies helper link
        const helperLink = modal.querySelector<HTMLAnchorElement>('#myRemindersUnblockHelperLink')!;
        expect(helperLink).not.toBeNull();
        expect(helperLink.textContent).toContain('How to unblock notifications on');

        // Clicking helper link opens notification guidance modal
        const openGuideSpy = vi.spyOn(notificationGuidanceModal, 'open');
        helperLink.click();
        expect(openGuideSpy).toHaveBeenCalled();
    });

    it('renders Mute Notifications toggle and locally suppresses alerts without revoking browser permissions', async () => {
        mockNotification.permission = 'granted';
        controller.open();

        const modal = document.getElementById('myRemindersModal')!;
        const muteToggle = modal.querySelector<HTMLInputElement>('#toggleMuteNotifications');
        expect(muteToggle).not.toBeNull();
        expect(muteToggle!.getAttribute('role')).toBe('switch');
        expect(muteToggle!.checked).toBe(false);

        // Turn Mute ON
        muteToggle!.checked = true;
        muteToggle!.dispatchEvent(new (window as any).Event('change'));

        expect(milestoneReminderService.isMuted()).toBe(true);
        expect(milestoneReminderService.isNotificationsMuted()).toBe(true);
        // Browser permission remains granted!
        expect(mockNotification.permission).toBe('granted');
        expect(modal.textContent).toContain('Muted');

        // Test alert while muted: browser notification should NOT be constructed
        mockNotification.mockClear();
        await milestoneReminderService.sendTestNotification();
        expect(mockNotification).not.toHaveBeenCalled();

        // Notification history should record the suppressed alert
        const history = milestoneReminderService.getNotificationHistory();
        expect(history.length).toBe(1);
        expect(history[0].suppressed).toBe(true);
        expect(history[0].type).toBe('test');

        // Turn Mute OFF
        const updatedMuteToggle = modal.querySelector<HTMLInputElement>('#toggleMuteNotifications')!;
        updatedMuteToggle.checked = false;
        updatedMuteToggle.dispatchEvent(new (window as any).Event('change'));

        expect(milestoneReminderService.isMuted()).toBe(false);
        expect(milestoneReminderService.isNotificationsMuted()).toBe(false);

        // Test alert when unmuted: browser notification IS constructed
        await milestoneReminderService.sendTestNotification();
        expect(mockNotification).toHaveBeenCalledWith(
            expect.stringContaining('SJCCC Milestone Push Test'),
            expect.anything()
        );
    });

    it('suppresses 24-hour academic milestone notification when muted and records to history', async () => {
        mockNotification.permission = 'granted';
        milestoneReminderService.setMuted(true);

        const milestone = ACADEMIC_MILESTONES_2026_2027[0];
        mockNotification.mockClear();

        // Trigger reminder while muted
        milestoneReminderService.triggerReminder(milestone.id, false);

        // Notification API suppressed
        expect(mockNotification).not.toHaveBeenCalled();

        // Recorded in Notification History as muted / suppressed
        const history = milestoneReminderService.getNotificationHistory();
        expect(history.length).toBe(1);
        expect(history[0].milestoneId).toBe(milestone.id);
        expect(history[0].suppressed).toBe(true);
        expect(history[0].title).toContain(milestone.title);
    });

    it('renders Notification History tab, switches between tabs, and displays last 5 sent notifications', async () => {
        controller.open();
        const modal = document.getElementById('myRemindersModal')!;

        const tabReminders = modal.querySelector<HTMLButtonElement>('#myRemindersTabReminders')!;
        const tabHistory = modal.querySelector<HTMLButtonElement>('#myRemindersTabHistory')!;
        expect(tabReminders).not.toBeNull();
        expect(tabHistory).not.toBeNull();
        expect(tabReminders.classList.contains('is-active')).toBe(true);
        expect(tabHistory.classList.contains('is-active')).toBe(false);

        // Switch to Notification History tab
        tabHistory.click();
        expect(controller.getActiveTab()).toBe('history');
        expect(modal.querySelector('#myRemindersPanelHistory')!.hasAttribute('hidden')).toBe(false);
        expect(modal.querySelector('#myRemindersEmptyHistory')).not.toBeNull();
        expect(modal.textContent).toContain('No Sent Notifications');

        // Dispatch 6 notifications to verify history capping at 5
        for (let i = 0; i < 6; i++) {
            milestoneReminderService.recordNotificationHistory({
                title: `Notification Alert #${i + 1}`,
                body: `Detailed reminder text for alert #${i + 1}`,
                timestamp: Date.now() + i * 1000,
                type: 'milestone',
                milestoneId: ACADEMIC_MILESTONES_2026_2027[i % ACADEMIC_MILESTONES_2026_2027.length].id,
            });
        }

        controller.renderModalContent();

        // Verify only the last 5 sent notifications are displayed
        const historyCards = modal.querySelectorAll('.my-history-card');
        expect(historyCards.length).toBe(5);

        // Newest should be Alert #6
        expect(historyCards[0].textContent).toContain('Notification Alert #6');
        // Oldest retained should be Alert #2 (#1 trimmed)
        expect(historyCards[4].textContent).toContain('Notification Alert #2');
        expect(modal.textContent).not.toContain('Notification Alert #1');

        // Test clear history button
        const clearHistoryBtn = modal.querySelector<HTMLButtonElement>('#myRemindersClearHistoryBtn')!;
        expect(clearHistoryBtn).not.toBeNull();
        clearHistoryBtn.click();

        expect(milestoneReminderService.getNotificationHistory().length).toBe(0);
        expect(modal.querySelector('#myRemindersEmptyHistory')).not.toBeNull();
        expect(modal.textContent).toContain('No Sent Notifications');
    });

    it('provides a "View in Timeline" button in notification history cards that scrolls to the milestone', () => {
        const milestone = ACADEMIC_MILESTONES_2026_2027[0];
        milestoneReminderService.recordNotificationHistory({
            title: `Advance alert: ${milestone.title}`,
            body: `Starts on ${milestone.dateText}`,
            timestamp: Date.now(),
            type: 'milestone',
            milestoneId: milestone.id,
        });

        controller.open();
        controller.setActiveTab('history');

        const modal = document.getElementById('myRemindersModal')!;
        const jumpBtn = modal.querySelector<HTMLButtonElement>(`.my-history-jump-btn[data-milestone-id="${milestone.id}"]`);
        expect(jumpBtn).not.toBeNull();

        const scrollSpy = vi.spyOn(milestoneReminderService, 'scrollToMilestone');
        jumpBtn!.click();

        expect(scrollSpy).toHaveBeenCalledWith(milestone.id);
        expect(controller.getActiveTab()).toBe('history');
    });

    it('renders "Auto-Add Important Dates" button in empty state and populates reminders list with key milestones', () => {
        controller.open();
        const modal = document.getElementById('myRemindersModal')!;

        // Verify empty state is displayed with Auto-Add button
        expect(modal.querySelector('#myRemindersEmptyState')).not.toBeNull();
        const autoAddBtn = modal.querySelector<HTMLButtonElement>('#myRemindersAutoAddBtn');
        expect(autoAddBtn).not.toBeNull();
        expect(autoAddBtn!.textContent).toContain('Auto-Add Important Dates');

        // Click Auto-Add Important Dates
        autoAddBtn!.click();

        // Stored reminders should now be populated
        const stored = milestoneReminderService.getAllStoredReminders();
        const storedCount = Object.keys(stored).length;
        expect(storedCount).toBeGreaterThanOrEqual(10);

        // Exams and holidays should be present
        expect(stored['exams-t1-2026']).toBeDefined();
        expect(stored['midterm-break-t1-2026']).toBeDefined();
        expect(stored['christmas-vacation-2026']).toBeDefined();
        expect(stored['gce-national-exams-2027']).toBeDefined();

        // Modal should re-render and show scheduled reminder cards
        const reminderCards = modal.querySelectorAll('.my-reminder-card');
        expect(reminderCards.length).toBe(storedCount);

        // Tab badge and nav badges should be updated
        const tabBadge = modal.querySelector('#tabRemindersBadge');
        expect(tabBadge?.textContent).toBe(String(storedCount));
        const topNavBadge = document.getElementById('navRemindersBadge');
        expect(topNavBadge?.textContent).toBe(String(storedCount));

        // Toolbar Auto-Add button should now be rendered for subsequent updates
        const toolbarAutoAddBtn = modal.querySelector<HTMLButtonElement>('#myRemindersToolbarAutoAddBtn');
        expect(toolbarAutoAddBtn).not.toBeNull();
        expect(toolbarAutoAddBtn!.textContent).toContain('Auto-Add Important Dates');

        // Footer Auto-Add button should also be available
        const footerAutoAddBtn = modal.querySelector<HTMLButtonElement>('#myRemindersFooterAutoAddBtn');
        expect(footerAutoAddBtn).not.toBeNull();
    });

    it('allows auto-adding dates from toolbar and footer when reminders already exist', () => {
        // Start with only 1 reminder
        const initialMilestone = ACADEMIC_MILESTONES_2026_2027[0];
        milestoneReminderService.saveReminder({
            milestoneId: initialMilestone.id,
            title: initialMilestone.title,
            dateText: initialMilestone.dateText,
            location: initialMilestone.location,
            description: initialMilestone.description,
            eventTime: Date.now() + 1000000,
            reminderTime: Date.now() + 500000,
            createdAt: Date.now(),
        });

        controller.open();
        const modal = document.getElementById('myRemindersModal')!;
        expect(modal.querySelectorAll('.my-reminder-card').length).toBe(1);

        const toolbarBtn = modal.querySelector<HTMLButtonElement>('#myRemindersToolbarAutoAddBtn')!;
        expect(toolbarBtn).not.toBeNull();

        toolbarBtn.click();

        // Now all key milestones should be populated
        const stored = milestoneReminderService.getAllStoredReminders();
        expect(Object.keys(stored).length).toBeGreaterThanOrEqual(10);
        expect(modal.querySelectorAll('.my-reminder-card').length).toBeGreaterThanOrEqual(10);
    });
});

