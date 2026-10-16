import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderTimelineMilestones } from '../../src/features/calendar/TimelineRenderer.ts';
import { MilestoneReminderService, milestoneReminderService } from '../../src/features/calendar/MilestoneReminderService.ts';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../src/data/academicCalendar.ts';
import { STORAGE_KEYS } from '../../src/core/storage/storageKeys.ts';

const TIMELINE_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="timeline-track-container" id="timelineTrackContainer">
    <div class="timeline-milestones-list" id="timelineMilestonesList"></div>
  </div>
  <div id="milestoneToastContainer" class="milestone-toast-container"></div>
</body>
</html>
`;

describe('Academic Milestone 24-Hour Reminder & Toast Notification System', () => {
    let mockNotification: any;
    let service: MilestoneReminderService;

    beforeEach(() => {
        const dom = new JSDOM(TIMELINE_HTML, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;
        (globalThis as any).localStorage = dom.window.localStorage;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);

        dom.window.localStorage.clear();

        // Mock Notification API constructible function
        mockNotification = vi.fn().mockImplementation(function (this: any, title: string, options: any) {
            this.title = title;
            this.options = options;
            this.close = vi.fn();
        });
        mockNotification.permission = 'default';
        mockNotification.requestPermission = vi.fn().mockImplementation(async () => {
            mockNotification.permission = 'granted';
            return 'granted';
        });
        (globalThis as any).Notification = mockNotification;
        (dom.window as any).Notification = mockNotification;

        // Render milestones into the timeline container
        const listEl = document.getElementById('timelineMilestonesList');
        renderTimelineMilestones(listEl);

        service = new MilestoneReminderService();
    });

    afterEach(() => {
        service.destroy();
        vi.restoreAllMocks();
    });

    it('renders a "Remind me" checkbox inside each milestone within the timeline track container', () => {
        const container = document.querySelector('.timeline-track-container');
        expect(container).not.toBeNull();

        const milestones = container!.querySelectorAll('.timeline-milestone');
        expect(milestones.length).toBe(ACADEMIC_MILESTONES_2026_2027.length);

        const checkboxes = container!.querySelectorAll<HTMLInputElement>('.timeline-remind-me-checkbox');
        expect(checkboxes.length).toBe(milestones.length);

        checkboxes.forEach((cb) => {
            const milestoneId = cb.dataset.milestoneId;
            expect(milestoneId).toBeDefined();

            const label = cb.closest('label');
            expect(label).not.toBeNull();
            expect(label!.textContent).toContain('Remind me');
        });
    });

    it('requests Notification permission and saves reminder when checked', async () => {
        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        const firstCb = container!.querySelector<HTMLInputElement>('.timeline-remind-me-checkbox')!;
        expect(firstCb).not.toBeNull();
        expect(firstCb.checked).toBe(false);

        // Check the box
        firstCb.checked = true;
        firstCb.dispatchEvent(new (window as any).Event('change'));

        // Wait microtasks
        await new Promise((r) => setTimeout(r, 20));

        expect(mockNotification.requestPermission).toHaveBeenCalled();

        // Stored in localStorage
        const stored = service.getAllStoredReminders();
        const milestoneId = firstCb.dataset.milestoneId!;
        expect(stored[milestoneId]).toBeDefined();
        expect(stored[milestoneId].milestoneId).toBe(milestoneId);

        // Toast was rendered
        const toastContainer = document.getElementById('milestoneToastContainer');
        expect(toastContainer).not.toBeNull();
        const toasts = toastContainer!.querySelectorAll('.milestone-toast');
        expect(toasts.length).toBeGreaterThanOrEqual(1);
    });

    it('immediately triggers notification if milestone is within 24 hours of start or past', async () => {
        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        // Pick a milestone that started in Aug/Sep 2026 (or mock Date.now to be within 24h)
        const pastMilestoneId = 'resumption-new-2026';
        mockNotification.permission = 'granted';

        await service.setReminder(pastMilestoneId, true);

        // Since resumption-new-2026 was in August 2026 (or before current time), it's within 24h
        expect(mockNotification).toHaveBeenCalledWith(
            expect.stringContaining('resumption-new-2026') ? expect.any(String) : expect.stringContaining('Upcoming Milestone'),
            expect.objectContaining({
                body: expect.stringContaining('Orientation'),
            })
        );

        const toastContainer = document.getElementById('milestoneToastContainer');
        const reminderToast = toastContainer!.querySelector('.milestone-toast--reminder');
        expect(reminderToast).not.toBeNull();
        expect(reminderToast!.textContent).toContain('New Students Resumption');
    });

    it('schedules future reminder and shows testable toast when milestone is >24h away', async () => {
        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        // Mock Date.now to be Jan 1 2026 (all milestones are in the future)
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00Z').getTime());

        const milestone = ACADEMIC_MILESTONES_2026_2027[0];
        await service.setReminder(milestone.id, true);

        const toastContainer = document.getElementById('milestoneToastContainer');
        const successToast = toastContainer!.querySelector('.milestone-toast--success');
        expect(successToast).not.toBeNull();
        expect(successToast!.textContent).toContain('Reminder Scheduled');
        expect(successToast!.textContent).toContain('Test Alert Now');

        // Click the Test Alert Now action button
        const testBtn = successToast!.querySelector<HTMLButtonElement>('.milestone-toast-action-btn')!;
        expect(testBtn).not.toBeNull();
        testBtn.click();

        // Notification API is called for the test
        expect(mockNotification).toHaveBeenCalled();
    });

    it('removes reminder and cancels timers when unchecked', async () => {
        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        const milestoneId = 'midterm-break-t1-2026';
        await service.setReminder(milestoneId, true);
        expect(service.isReminded(milestoneId)).toBe(true);

        await service.setReminder(milestoneId, false);
        expect(service.isReminded(milestoneId)).toBe(false);

        const stored = service.getAllStoredReminders();
        expect(stored[milestoneId]).toBeUndefined();

        const toastContainer = document.getElementById('milestoneToastContainer');
        const infoToast = toastContainer!.querySelector('.milestone-toast--info');
        expect(infoToast).not.toBeNull();
        expect(infoToast!.textContent).toContain('cancelled');
    });

    it('restores checked state from localStorage on re-initialization', () => {
        const milestoneId = ACADEMIC_MILESTONES_2026_2027[1].id;
        const initialRecord = {
            milestoneId,
            title: 'Sample',
            dateText: '02 Sep 2026',
            location: 'Campus',
            description: 'Desc',
            eventTime: Date.now() + 1000000,
            reminderTime: Date.now() + 500000,
            createdAt: Date.now(),
        };

        localStorage.setItem(STORAGE_KEYS.MILESTONE_REMINDERS, JSON.stringify({
            [milestoneId]: initialRecord,
        }));

        const newService = new MilestoneReminderService();
        newService.init(document.querySelector<HTMLElement>('.timeline-track-container'));

        const cb = document.querySelector<HTMLInputElement>(
            `.timeline-remind-me-checkbox[data-milestone-id="${milestoneId}"]`
        );
        expect(cb).not.toBeNull();
        expect(cb!.checked).toBe(true);
        expect(cb!.closest('.timeline-remind-me-label')?.classList.contains('is-checked')).toBe(true);

        newService.destroy();
    });

    it('gracefully handles denied notification permissions with in-app toast', async () => {
        mockNotification.permission = 'denied';
        mockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00Z').getTime());

        await service.setReminder('exams-t1-2026', true);

        // Even though permission was denied, service does not throw and still creates toast
        const toastContainer = document.getElementById('milestoneToastContainer');
        expect(toastContainer!.innerHTML).toContain('Browser Notifications Blocked');
    });

    it('creates theme-aware toast notifications that synchronize with active theme', () => {
        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        // 1. Light theme by default
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');

        const toast1 = service.showToast({
            title: 'Light Theme Alert',
            message: 'Testing light theme awareness',
            type: 'info',
        });
        expect(toast1.getAttribute('data-theme')).toBe('light');

        // 2. Dark theme active
        document.documentElement.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');

        const toast2 = service.showToast({
            title: 'Dark Theme Alert',
            message: 'Testing dark theme awareness',
            type: 'warning',
        });
        expect(toast2.getAttribute('data-theme')).toBe('dark');

        // 3. Dynamic sync of existing toasts when theme changes
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        service.syncActiveToastsTheme();

        expect(toast1.getAttribute('data-theme')).toBe('light');
        expect(toast2.getAttribute('data-theme')).toBe('light');
    });

    it('includes a device-detected permission guidance link when notifications are blocked', async () => {
        mockNotification.permission = 'denied';
        mockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        const openSpy = vi.spyOn(service, 'showNotificationHelp');

        await service.setReminder('resumption-new-2026', true);

        const toastContainer = document.getElementById('milestoneToastContainer');
        const helpLink = toastContainer!.querySelector<HTMLButtonElement>('.milestone-toast-help-link');
        expect(helpLink).not.toBeNull();
        expect(helpLink!.textContent).toContain('How to allow notifications on');

        // Clicking the link opens device-specific permission guidance
        helpLink!.click();
        expect(openSpy).toHaveBeenCalled();
    });

    it('autoAddImportantDates automatically populates reminders with key academic milestones (exams, holidays, resumptions)', () => {
        const container = document.querySelector<HTMLElement>('.timeline-track-container');
        service.init(container);

        // Initially no reminders
        expect(Object.keys(service.getAllStoredReminders()).length).toBe(0);

        const result = service.autoAddImportantDates();

        expect(result.addedCount).toBeGreaterThanOrEqual(10);
        expect(result.totalStoredCount).toBe(result.addedCount);

        const stored = service.getAllStoredReminders();
        // Verify key milestones are present:
        // Exams
        expect(stored['exams-t1-2026']).toBeDefined();
        expect(stored['exams-t1-2026'].title).toContain('First Term Examinations');
        expect(stored['exams-t2-2027']).toBeDefined();
        expect(stored['gce-national-exams-2027']).toBeDefined();
        // Holidays / Breaks
        expect(stored['midterm-break-t1-2026']).toBeDefined();
        expect(stored['christmas-vacation-2026']).toBeDefined();
        expect(stored['midterm-break-t2-2027']).toBeDefined();
        // Resumptions
        expect(stored['resumption-new-2026']).toBeDefined();
        expect(stored['resumption-old-2026']).toBeDefined();

        // Toast feedback rendered
        const toastContainer = document.getElementById('milestoneToastContainer');
        expect(toastContainer).not.toBeNull();
        expect(toastContainer!.textContent).toContain('Important Dates Added');

        // Calling autoAddImportantDates again when already populated reports up to date
        const secondResult = service.autoAddImportantDates();
        expect(secondResult.addedCount).toBe(0);
        expect(toastContainer!.textContent).toContain('Reminders Up to Date');
    });
});


