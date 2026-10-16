# Implementation Plan: Visual 'Enable Notifications' Toggle in 'My Reminders'

Add a dedicated push notification settings card with an accessible toggle switch inside the **My Reminders** dialog. The toggle allows users to check notification status, request browser push permissions on demand, view browser unblock guides when blocked, and trigger a test alert strictly within development environments.

---

## 1. User Choices & Requirements Summary
- **Position**: Placed in a dedicated notification status card positioned directly above the reminders list and below the dialog header.
- **Blocked State**: When notifications are denied/blocked in browser settings, the toggle displays a "Blocked in Browser" warning badge and a direct action button to open the browser-specific unblock instructions modal.
- **Environment-Gated Test Alert**: A "Send Test Alert" button will be present to verify browser notifications immediately, but enabled **only in development environments** (`localhost`, `127.0.0.1`, or AI Studio dev runners), and omitted/disabled when deployed in production (e.g. Vercel or production domains).
- **Anti-AI Slop & Zero-Pill Design**: Adheres to strict typographic hierarchy, unboxed metadata, accessible switch controls (`role="switch"`, `aria-checked`), and theme awareness (light/dark mode).

---

## 2. Architecture & Component Changes

### A. State & Preference Management (`src/features/calendar/MilestoneReminderService.ts`)
- Add user push preference management (`isPushNotificationsEnabled()`, `setPushNotificationsEnabled(boolean)`).
- Store preference in `localStorage` under `sjccc_milestone_push_enabled` (defaults to `true` when permission is granted).
- Provide helper `getNotificationState()` returning:
  - `'granted'` (active push enabled)
  - `'muted'` (permission granted in browser, but user toggled app alerts off)
  - `'default'` (permission not yet requested)
  - `'denied'` (blocked at browser/OS level)
  - `'unsupported'` (browser lacks Notification API)
- Provide environment detection utility `isDevEnvironment()` checking `import.meta.env.DEV` and `location.hostname` (`localhost`, `127.0.0.1`, `ais-dev-*`).

### B. Controller & UI Rendering (`src/features/calendar/MyRemindersController.ts`)
- Render dedicated status card `#myRemindersPushCard` above the reminders list in `renderModalContent()`:
  - **Header & Title**: Notification bell icon with descriptive subtitle.
  - **Interactive Toggle Control**: Custom styled accessible switch input (`#toggleNotificationPush`, `role="switch"`) with clear focus states and WCAG AA contrast.
  - **State-Specific Feedback**:
    - **Default (Unprompted)**: Shows "Advance Push Alerts Disabled" with "Tap toggle to allow browser notifications". Toggling calls `milestoneReminderService.requestNotificationPermission()`.
    - **Granted & Active**: Shows "Push Notifications Active" with indicator. In dev mode, renders the `#myRemindersSendTestBtn` button.
    - **Muted**: Shows "Notifications Paused" when granted in browser but user turned toggle off.
    - **Denied / Blocked**: Shows "Notifications Blocked" status badge, informative message explaining that system alerts are blocked by the browser, and the "How to unblock on [Browser]" button that opens the `NotificationGuidanceModal`.
- Bind event listeners:
  - Toggle change handler: requests permission if default, toggles preference if granted/muted, opens guidance modal if denied.
  - Test alert button handler (dev only): triggers an immediate test milestone alert via Service Worker and audio chime.
  - Listen to `milestone-reminders-updated` and permission changes to re-render card dynamically.

### C. Styling & Responsive Design (`src/css/features/milestone-reminder.css`)
- Add styles for:
  - `.my-reminders-push-card`: Clean elevated card with border, subtle background tint, and responsive padding.
  - `.my-reminders-toggle-row`: Flex layout aligning title, status description, and the switch toggle.
  - `.switch-control`: Accessible switch toggle component with smooth transition animation, visible `:focus-visible` outline, and high-contrast thumb indicator.
  - `.push-card-actions`: Action row for dev-only test button and unblock guidance button.
  - Dark mode variables and high contrast overrides.

---

## 3. Verification & Testing Plan

### Automated Unit Tests (`tests/unit/my-reminders-controller.test.ts` & `tests/unit/milestone-reminder.test.ts`)
1. **Toggle Rendering**:
   - Verify `#toggleNotificationPush` renders inside `#myRemindersPushCard` above the reminders list.
   - Verify `aria-checked` and `role="switch"` attributes are present.
2. **Permission Request Flow**:
   - When permission is `'default'` and toggle is clicked, verify `requestNotificationPermission()` is triggered.
   - Verify UI re-renders into the active/granted state upon approval.
3. **Blocked State Behavior**:
   - When `Notification.permission === 'denied'`, verify toggle is disabled and shows the blocked indicator plus the unblock guide trigger button.
4. **Dev Environment Test Alert Gating**:
   - Verify "Send Test Alert" button renders in development mode.
   - Verify "Send Test Alert" button is omitted or hidden in production environments.
5. **Full Suite Regression**:
   - Run `npx vitest run` across all 25 test suites to ensure zero regressions.
   - Run `npm run lint` (`tsc --noEmit`) to verify strict type correctness.
