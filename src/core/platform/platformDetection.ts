/**
 * ============================================================================
 * SJCCC – Platform & Device Detection (platformDetection.ts)
 * 
 * Comprehensive, pure, and testable platform, browser, and capability detection
 * system. Powers:
 *  1. Hero section message presentation (TimedHeroRotator vs ScrollEngine).
 *  2. Add to Calendar modal provider adaptation & recommendation badging.
 *  3. Tailored post-download instructions for RFC 5545 (.ics) calendar files
 *     across iOS, Android, macOS, Windows, Linux, and in-app webviews.
 * 
 * Zero external dependencies. Fully guarded against SSR / missing globals.
 * ============================================================================
 */

export interface PlatformNavigator {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
    userAgentData?: {
        platform?: string;
        mobile?: boolean;
    };
}

export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'chromeos' | 'unknown';
export type DeviceCategory = 'mobile' | 'tablet' | 'desktop' | 'unknown';
export type BrowserFamily = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung-internet' | 'unknown';
export type CalendarProviderKey = 'google' | 'outlook' | 'ics';

export interface DevicePlatformInfo {
    os: OperatingSystem;
    deviceCategory: DeviceCategory;
    browser: BrowserFamily;
    isInAppBrowser: boolean;
    isApple: boolean;
    isMobileOrTablet: boolean;
    supportsBlobDownload: boolean;
    supportsTouch: boolean;
    recommendedProvider: CalendarProviderKey;
    osLabel: string;
    browserLabel: string;
}

export interface CalendarPlatformGuidance {
    headline: string;
    instructions: string;
    steps: readonly string[];
    suggestedApp: string;
    hasInAppRestriction: boolean;
}

/**
 * Checks whether the browser environment supports Blob URL creation and anchor downloading.
 */
function checkBlobDownloadSupport(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return true; // Assume standard capability in virtual test runner
    }
    try {
        const hasBlob = typeof Blob !== 'undefined';
        const hasCreateObjectUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
        const hasAnchorDownload = 'download' in document.createElement('a');
        return hasBlob && hasCreateObjectUrl && hasAnchorDownload;
    } catch {
        return false;
    }
}

/**
 * Detects whether the current browser is an in-app browser or embedded webview
 * (such as inside Instagram, Facebook, TikTok, Twitter/X, WeChat, or Android WebView).
 * These webviews frequently restrict or fail to handle .ics file downloads.
 */
function detectInAppBrowser(ua: string): boolean {
    if (!ua) return false;

    // Major social in-app browser user-agent tokens
    const inAppTokens = /FBAN|FBAV|Instagram|TikTok|Twitter|Snapchat|Line\/|WeChat|MicroMessenger|musical_ly|Pinterest|LinkedInApp/i;
    if (inAppTokens.test(ua)) {
        return true;
    }

    // Android WebView signature: contains "Version/X.X" and "Chrome" or explicit "; wv)"
    if (/;\s*wv\)|Version\/[0-9.]+\s+Chrome/i.test(ua) && /Android/i.test(ua)) {
        return true;
    }

    // iOS WebKit webview: Mobile Safari token present without "Safari/" or with custom container
    if (/iPhone|iPad|iPod/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) {
        return true;
    }

    return false;
}

/**
 * Resolves the primary Operating System from navigator signals.
 */
function resolveOperatingSystem(nav: PlatformNavigator): OperatingSystem {
    const ua = nav.userAgent || '';
    const platform = nav.platform || '';
    const maxTouchPoints = nav.maxTouchPoints ?? 0;
    const uadPlatform = nav.userAgentData?.platform?.toLowerCase();

    // 1. Android check (must precede Linux)
    if (/Android/i.test(ua) || uadPlatform === 'android') {
        return 'android';
    }

    // 2. Windows check
    if (/Windows NT|Windows Phone|Windows|Win32|Win64/i.test(ua) || /Win/i.test(platform) || uadPlatform === 'windows') {
        return 'windows';
    }

    // 3. Modern Client Hints for Apple
    if (uadPlatform === 'ios') return 'ios';
    if (uadPlatform === 'macos') return 'macos';

    // 4. iOS check (iPhone, iPad, iPod)
    if (/iPhone|iPad|iPod/i.test(ua) || (platform && /iPhone|iPad|iPod/i.test(platform))) {
        return 'ios';
    }

    // 5. iPadOS in desktop browsing mode (reports Macintosh, but multi-touch > 1)
    const isMacLike = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) || /Mac/i.test(platform) || /Mac OS X/i.test(ua);
    if (isMacLike && maxTouchPoints > 1) {
        return 'ios'; // iPadOS
    }

    // 6. macOS
    if (isMacLike) {
        return 'macos';
    }

    // 7. ChromeOS
    if (/CrOS/i.test(ua) || uadPlatform === 'chrome os' || uadPlatform === 'chromium os') {
        return 'chromeos';
    }

    // 8. Linux (excluding previous matches)
    if (/Linux|X11/i.test(ua) || /Linux/i.test(platform) || uadPlatform === 'linux') {
        return 'linux';
    }

    return 'unknown';
}

/**
 * Resolves the device form factor category (mobile, tablet, desktop, unknown).
 */
function resolveDeviceCategory(os: OperatingSystem, ua: string, maxTouchPoints: number, isUadMobile?: boolean): DeviceCategory {
    if (os === 'unknown' && !ua) {
        return 'unknown';
    }

    // Explicit tablet checks
    if (/iPad/i.test(ua) || (os === 'ios' && maxTouchPoints > 1 && /Macintosh|MacIntel/i.test(ua))) {
        return 'tablet';
    }
    if (os === 'android' && (!/Mobile/i.test(ua) || /Tablet|SM-T|SM-X/i.test(ua))) {
        return 'tablet';
    }

    // Explicit mobile checks
    if (isUadMobile || /Mobile|iP(hone|od)|Android.*Mobile/i.test(ua)) {
        return 'mobile';
    }
    if (os === 'ios' || os === 'android') {
        return 'mobile';
    }

    // Desktop platforms
    if (os === 'macos' || os === 'windows' || os === 'linux' || os === 'chromeos') {
        return 'desktop';
    }

    return maxTouchPoints > 0 ? 'mobile' : 'desktop';
}

/**
 * Resolves the browser family.
 */
function resolveBrowserFamily(ua: string): BrowserFamily {
    if (!ua) return 'unknown';

    // In-app browsers often identify as Chrome or Safari underneath, but their UX is distinct
    if (/SamsungBrowser/i.test(ua)) {
        return 'samsung-internet';
    }
    if (/Edg([A-Z]|ios)?\//i.test(ua)) {
        return 'edge';
    }
    if (/Firefox|FxiOS/i.test(ua)) {
        return 'firefox';
    }
    if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) {
        return 'chrome';
    }
    if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) {
        return 'safari';
    }

    return 'unknown';
}

/**
 * Maps OS to a clean human-readable display label.
 */
function getOsLabel(os: OperatingSystem): string {
    switch (os) {
        case 'ios': return 'Apple iOS';
        case 'android': return 'Android';
        case 'macos': return 'macOS';
        case 'windows': return 'Windows';
        case 'chromeos': return 'ChromeOS';
        case 'linux': return 'Linux';
        default: return 'Device';
    }
}

/**
 * Maps browser to a clean display label.
 */
function getBrowserLabel(browser: BrowserFamily, isInApp: boolean): string {
    if (isInApp) return 'In-App Browser';
    switch (browser) {
        case 'safari': return 'Safari';
        case 'chrome': return 'Google Chrome';
        case 'firefox': return 'Mozilla Firefox';
        case 'edge': return 'Microsoft Edge';
        case 'samsung-internet': return 'Samsung Internet';
        default: return 'Web Browser';
    }
}

/**
 * Selects the optimal calendar provider to highlight/recommend based on OS.
 */
function resolveRecommendedProvider(os: OperatingSystem): CalendarProviderKey {
    switch (os) {
        case 'ios':
        case 'macos':
            // Apple Calendar (.ics) provides native, zero-login 1-tap integration on Apple devices
            return 'ics';
        case 'android':
            // Google Calendar provides the native default calendar experience on Android
            return 'google';
        case 'windows':
            // Outlook / Microsoft 365 is the native default productivity suite on Windows
            return 'outlook';
        default:
            return 'google';
    }
}

/**
 * Pure, isolated detection function that returns comprehensive platform, browser,
 * and capability information.
 * 
 * @param nav Optional navigator subset for deterministic testing.
 */
export function detectPlatform(nav?: PlatformNavigator): DevicePlatformInfo {
    const targetNav: PlatformNavigator | undefined = nav ?? (typeof navigator !== 'undefined' ? (navigator as unknown as PlatformNavigator) : undefined);

    if (!targetNav) {
        return {
            os: 'unknown',
            deviceCategory: 'unknown',
            browser: 'unknown',
            isInAppBrowser: false,
            isApple: false,
            isMobileOrTablet: false,
            supportsBlobDownload: true,
            supportsTouch: false,
            recommendedProvider: 'google',
            osLabel: 'Device',
            browserLabel: 'Web Browser',
        };
    }

    const ua = targetNav.userAgent || '';
    const maxTouchPoints = targetNav.maxTouchPoints ?? 0;
    const isUadMobile = targetNav.userAgentData?.mobile;

    const os = resolveOperatingSystem(targetNav);
    const isApple = os === 'ios' || os === 'macos';
    const deviceCategory = resolveDeviceCategory(os, ua, maxTouchPoints, isUadMobile);
    const isMobileOrTablet = deviceCategory === 'mobile' || deviceCategory === 'tablet';
    const isInAppBrowser = detectInAppBrowser(ua);
    const browser = resolveBrowserFamily(ua);
    const supportsBlobDownload = checkBlobDownloadSupport();
    const supportsTouch = maxTouchPoints > 0;
    const recommendedProvider = resolveRecommendedProvider(os);

    return {
        os,
        deviceCategory,
        browser,
        isInAppBrowser,
        isApple,
        isMobileOrTablet,
        supportsBlobDownload,
        supportsTouch,
        recommendedProvider,
        osLabel: getOsLabel(os),
        browserLabel: getBrowserLabel(browser, isInAppBrowser),
    };
}

/**
 * Determines whether the client environment is an Apple device/platform:
 * - iOS: iPhone, iPad, iPod
 * - iPadOS: Desktop-style user agent reporting ("Macintosh") with multi-touch points
 * - macOS: Desktop & laptop Apple hardware
 * 
 * Preserves 100% backwards compatibility with earlier Phase versions.
 * 
 * @param nav Optional navigator subset for deterministic testing.
 */
export function isApplePlatform(nav?: PlatformNavigator): boolean {
    const targetNav: PlatformNavigator | undefined = nav ?? (typeof navigator !== 'undefined' ? (navigator as unknown as PlatformNavigator) : undefined);
    if (!targetNav) {
        return false;
    }

    const ua = targetNav.userAgent || '';
    const platform = targetNav.platform || '';
    const maxTouchPoints = targetNav.maxTouchPoints ?? 0;
    const uadPlatform = targetNav.userAgentData?.platform?.toLowerCase();

    // 1. Explicitly reject standard non-Apple platforms first
    if (/Android/i.test(ua) || uadPlatform === 'android') {
        return false;
    }

    if (/Windows NT|Windows Phone|Windows|Win32|Win64/i.test(ua) || /Win/i.test(platform) || uadPlatform === 'windows') {
        return false;
    }

    if ((/Linux|X11/i.test(ua) || /Linux/i.test(platform)) && !/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua)) {
        return false;
    }

    // 2. Modern Client Hints (navigator.userAgentData) if provided
    if (uadPlatform) {
        if (uadPlatform === 'macos' || uadPlatform === 'ios') {
            return true;
        }
    }

    // 3. Classic iOS devices: iPhone, iPad, iPod
    if (/iPhone|iPad|iPod/i.test(ua)) {
        return true;
    }

    // 4. iPadOS desktop-class browsing
    const isMacIdentified = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) || /Mac/i.test(platform) || /Mac OS X/i.test(ua);
    if (isMacIdentified && maxTouchPoints > 1) {
        return true;
    }

    // 5. macOS devices
    if (isMacIdentified) {
        return true;
    }

    // 6. Platform string fallback
    if (platform && /Mac|iPhone|iPad|iPod/i.test(platform)) {
        return true;
    }

    return false;
}

/**
 * Returns intelligent, platform-tailored post-download instructions and next steps
 * when a user downloads an RFC 5545 .ics calendar file.
 */
export function getCalendarExportGuidance(platformInfo: DevicePlatformInfo, milestoneTitle: string): CalendarPlatformGuidance {
    const { os, isInAppBrowser } = platformInfo;

    if (isInAppBrowser) {
        return {
            headline: 'Calendar file downloaded. In-app browser detected.',
            instructions: 'If your app did not open your calendar automatically, tap the menu (•••) and choose "Open in Browser" (Safari or Chrome), or use the Google Calendar option above.',
            steps: [
                'Look for the downloaded file in your device notifications or Downloads folder.',
                'If the file cannot be opened here, open this page in your main browser (Safari or Chrome).',
                'Alternatively, use the "Google Calendar" button above for direct web calendar addition.'
            ],
            suggestedApp: 'Default Calendar App',
            hasInAppRestriction: true,
        };
    }

    switch (os) {
        case 'ios':
            return {
                headline: 'Calendar file downloaded. Add to Apple Calendar.',
                instructions: 'Open the downloaded file to add this milestone to Apple Calendar.',
                steps: [
                    'Tap the download icon (or banner) in Safari.',
                    `Select the downloaded file for "${milestoneTitle}".`,
                    'Tap "Add All" or "Add to Calendar" in the top right to complete.'
                ],
                suggestedApp: 'Apple Calendar',
                hasInAppRestriction: false,
            };

        case 'macos':
            return {
                headline: 'Calendar file downloaded. Open in Apple Calendar.',
                instructions: 'Open the file from your Downloads folder to import into Apple Calendar or Outlook for Mac.',
                steps: [
                    'Open your Downloads folder (Option + Command + L in Safari).',
                    `Double-click the downloaded file for "${milestoneTitle}".`,
                    'Select your destination calendar and click "OK".'
                ],
                suggestedApp: 'Apple Calendar / Outlook for Mac',
                hasInAppRestriction: false,
            };

        case 'android':
            return {
                headline: 'Calendar file downloaded. Import into your Calendar.',
                instructions: 'Tap the download notification or open from Downloads in your Files app to add to Google Calendar or Samsung Calendar.',
                steps: [
                    'Pull down your notification shade and tap "Download complete".',
                    'Choose "Google Calendar" or "Samsung Calendar" when prompted.',
                    'Tap "Save" or "Import" to confirm the milestone on your schedule.'
                ],
                suggestedApp: 'Google Calendar / Samsung Calendar',
                hasInAppRestriction: false,
            };

        case 'windows':
            return {
                headline: 'Calendar file downloaded. Import into Outlook / Windows Calendar.',
                instructions: 'Open the downloaded file from your browser downloads bar to add to Outlook or Windows Calendar.',
                steps: [
                    'Open your browser downloads (Ctrl + J).',
                    `Click the downloaded file for "${milestoneTitle}".`,
                    'In Outlook or Calendar, click "Save & Close".'
                ],
                suggestedApp: 'Outlook / Windows Calendar',
                hasInAppRestriction: false,
            };

        case 'chromeos':
        case 'linux':
        default:
            return {
                headline: 'Calendar file downloaded. Open from your Downloads.',
                instructions: 'Open the downloaded calendar file to import this milestone into your calendar application.',
                steps: [
                    'Check your browser downloads bar or Downloads folder.',
                    `Open the downloaded file for "${milestoneTitle}".`,
                    'Confirm the import in your preferred calendar application.'
                ],
                suggestedApp: 'Default Calendar App',
                hasInAppRestriction: false,
            };
    }
}

export interface NotificationPlatformGuidance {
    key: string;
    headline: string;
    instructions: string;
    steps: readonly string[];
    browserLabel: string;
    osLabel: string;
    quickTip?: string;
    osSteps?: readonly string[];
    shortcutUrl?: string;
    iconClass?: string;
}

/**
 * Returns tailored step-by-step instructions for allowing notifications
 * based on the user's detected browser and operating system.
 */
export function getNotificationPermissionGuidance(
    platformInfo: DevicePlatformInfo = detectPlatform()
): NotificationPlatformGuidance {
    const { os, browser, browserLabel, osLabel } = platformInfo;

    // Windows OS system-level instructions
    const windowsOsSteps: readonly string[] = [
        'Open Windows Settings (press Win + I).',
        'Navigate to System > Notifications (or Notifications & actions).',
        'Verify that master Notifications are toggled ON.',
        `Ensure ${browserLabel} is enabled under "Notifications from apps and other senders".`
    ];

    // macOS system-level instructions
    const macOsSteps: readonly string[] = [
        'Open Apple menu > System Settings (or System Preferences).',
        'Click "Notifications" in the sidebar.',
        `Select ${browserLabel} and ensure "Allow Notifications" is enabled with Banners or Alerts.`,
        'Check that Focus / Do Not Disturb is not silencing alerts.'
    ];

    if (browser === 'firefox') {
        return {
            key: 'firefox',
            headline: `How to Allow Notifications in ${browserLabel}`,
            instructions: `Notifications are currently blocked in Firefox. Follow these steps to enable milestone alerts on ${osLabel}:`,
            steps: [
                'Click the crossed-out notification/lock icon immediately to the left of the address bar.',
                'Under "Permissions", click the "✕" button next to "Blocked" to clear the restriction.',
                'Refresh this page and check the "Remind me" box again.',
                'Select "Allow Notifications" when Firefox prompts for permission.'
            ],
            osSteps: os === 'windows' ? windowsOsSteps : (os === 'macos' ? macOsSteps : undefined),
            browserLabel,
            osLabel,
            iconClass: 'bi-browser-firefox',
            quickTip: 'You can also check Firefox Settings > Privacy & Security > Permissions > Notifications > Settings.'
        };
    }

    if (browser === 'safari') {
        if (os === 'ios') {
            return {
                key: 'safari-ios',
                headline: 'How to Enable Notifications on Apple iPhone / iPad',
                instructions: 'Apple iOS requires adding this website to your Home Screen to deliver web push notifications:',
                steps: [
                    'Tap the Share button (square icon with an arrow pointing upward) in Safari.',
                    'Scroll down and tap "Add to Home Screen", then tap "Add" in the top right.',
                    'Open the SJCCC app from your Home Screen.',
                    'When prompted, tap "Allow Notifications" to receive 24-hour milestone alerts.'
                ],
                osSteps: [
                    'Open iOS Settings > Notifications > SJCCC (or Safari).',
                    'Ensure "Allow Notifications" is toggled ON with Badges, Sounds, and Banners enabled.'
                ],
                browserLabel,
                osLabel,
                iconClass: 'bi-phone',
                quickTip: 'Apple web push requires iOS 16.4+ installed as a Home Screen web app.'
            };
        }
        return {
            key: 'safari-mac',
            headline: `How to Allow Notifications in ${browserLabel} on ${osLabel}`,
            instructions: 'Safari requires notification permission in its Website Settings:',
            steps: [
                'In the Safari top menu bar, click "Safari" and choose "Settings..." (or press Cmd + ,).',
                'Click the "Websites" tab at the top of the settings window.',
                'Click "Notifications" in the left sidebar list.',
                'Find this website in the list and change the dropdown from "Deny" to "Allow".'
            ],
            osSteps: macOsSteps,
            browserLabel,
            osLabel,
            iconClass: 'bi-browser-safari',
            quickTip: 'Also verify that system notifications for Safari are enabled in macOS System Settings > Notifications.'
        };
    }

    if (browser === 'edge') {
        return {
            key: 'edge',
            headline: `How to Allow Notifications in ${browserLabel}`,
            instructions: `Notifications are currently blocked in Microsoft Edge. Follow these steps on ${osLabel}:`,
            steps: [
                'Click the padlock or site info icon on the left side of the address bar.',
                'Find "Notifications" in the dropdown list of permissions.',
                'Change the setting from "Block" to "Allow".',
                'Reload the tab to activate your reminder schedule.'
            ],
            osSteps: os === 'windows' ? windowsOsSteps : (os === 'macos' ? macOsSteps : undefined),
            browserLabel,
            osLabel,
            iconClass: 'bi-browser-edge',
            shortcutUrl: 'edge://settings/content/notifications',
            quickTip: 'Alternatively, visit edge://settings/content/notifications in Edge.'
        };
    }

    if (os === 'android') {
        return {
            key: 'android',
            headline: 'How to Allow Notifications on Android',
            instructions: 'Enable notification alerts in your mobile browser settings:',
            steps: [
                'Tap the site settings/lock icon to the left of the URL address in your browser.',
                'Tap "Permissions" and then "Notifications".',
                'Switch the toggle to "Allowed".',
                'If still blocked, check device Settings > Apps > Chrome/Samsung Internet > Notifications.'
            ],
            osSteps: [
                'Open Android device Settings > Apps > Chrome (or your current browser).',
                'Tap Notifications and toggle "All Chrome notifications" ON.'
            ],
            browserLabel,
            osLabel,
            iconClass: 'bi-phone',
            quickTip: 'Make sure your phone is not in "Do Not Disturb" mode during alert times.'
        };
    }

    // Default: Chrome / Chromium on Windows, macOS, Linux, ChromeOS
    return {
        key: os === 'windows' ? 'chrome-windows' : 'chrome',
        headline: `How to Allow Notifications in ${browserLabel}${os === 'windows' ? ' on Windows' : ''}`,
        instructions: `Notifications are currently blocked in ${browserLabel} on ${osLabel}. Follow these simple steps:`,
        steps: [
            'Click the tune/padlock icon immediately to the left of the URL in your address bar.',
            'Locate "Notifications" in the site permissions menu.',
            'Change the dropdown option from "Block" to "Allow".',
            'Reload the page to immediately activate your reminder schedule.'
        ],
        osSteps: os === 'windows' ? windowsOsSteps : (os === 'macos' ? macOsSteps : undefined),
        browserLabel,
        osLabel,
        iconClass: os === 'windows' ? 'bi-windows' : 'bi-browser-chrome',
        shortcutUrl: 'chrome://settings/content/notifications',
        quickTip: 'In Chrome, you can also manage permissions at chrome://settings/content/notifications.'
    };
}

/**
 * Returns a comprehensive catalog of notification unblock guides for all major
 * platforms and browsers (Windows, Chrome, Firefox, Safari Mac, Safari iOS, Edge, Android).
 */
export function getAllNotificationPermissionGuides(): NotificationPlatformGuidance[] {
    return [
        {
            key: 'chrome-windows',
            browserLabel: 'Google Chrome',
            osLabel: 'Windows 10 / 11',
            iconClass: 'bi-windows',
            headline: 'Allow Notifications in Google Chrome on Windows',
            instructions: 'Follow these steps to unblock notifications in Chrome on your Windows PC:',
            steps: [
                'Click the "View site information" (tune/padlock) icon on the left of the address bar.',
                'Find "Notifications" and switch the toggle/dropdown to "Allow".',
                'If not listed, click "Site settings" and change Notifications from Block to Allow.',
                'Reload the page to start receiving advance milestone alerts.'
            ],
            osSteps: [
                'Press Win + I to open Windows Settings.',
                'Go to System > Notifications.',
                'Ensure master Notifications are ON and "Google Chrome" is enabled in the app list.'
            ],
            shortcutUrl: 'chrome://settings/content/notifications',
            quickTip: 'You can paste chrome://settings/content/notifications into Chrome address bar to manage site permissions.'
        },
        {
            key: 'firefox',
            browserLabel: 'Mozilla Firefox',
            osLabel: 'Windows / Mac / Linux',
            iconClass: 'bi-browser-firefox',
            headline: 'Allow Notifications in Mozilla Firefox',
            instructions: 'Follow these steps to unblock notifications in Firefox:',
            steps: [
                'Click the permissions icon (crossed-out notification bell or padlock) to the left of the address bar.',
                'Click the "✕" next to "Blocked" under Send Notifications to clear the block.',
                'Refresh the page and tap "Remind me" on your chosen milestone.',
                'When Firefox prompts "Will you allow saintjosephcollege... to send notifications?", click "Allow".'
            ],
            osSteps: [
                'On Windows: Check Windows Settings (Win + I) > System > Notifications > Firefox: On.',
                'On Mac: Open System Settings > Notifications > Firefox and turn ON "Allow Notifications".'
            ],
            quickTip: 'Manage all blocked sites in Firefox Settings (Cmd/Ctrl + ,) > Privacy & Security > Permissions > Notifications.'
        },
        {
            key: 'safari-mac',
            browserLabel: 'Apple Safari',
            osLabel: 'macOS (MacBook / iMac)',
            iconClass: 'bi-browser-safari',
            headline: 'Allow Notifications in Safari on Mac',
            instructions: 'Follow these steps to grant notification permissions in Safari for Mac:',
            steps: [
                'In the top menu bar, click "Safari" and choose "Settings..." (or "Preferences...", shortcut Cmd + ,).',
                'Select the "Websites" tab at the top of the dialog.',
                'In the left sidebar, select "Notifications".',
                'Find this website in the list and change the dropdown setting from "Deny" to "Allow".'
            ],
            osSteps: [
                'Open Apple menu > System Settings > Notifications.',
                'Select Safari and ensure "Allow Notifications" is enabled.',
                'Ensure Focus / Do Not Disturb mode allows alerts from Safari.'
            ],
            quickTip: 'Close and re-open the webpage tab to immediately verify notification capability.'
        },
        {
            key: 'safari-ios',
            browserLabel: 'Apple Safari (iOS)',
            osLabel: 'iPhone & iPad',
            iconClass: 'bi-phone',
            headline: 'Enable Milestone Alerts on iPhone & iPad',
            instructions: 'iOS requires installing the web app to your Home Screen for push alerts:',
            steps: [
                'Tap the Share button (square with arrow pointing upward) in the Safari bottom bar.',
                'Scroll down and tap "Add to Home Screen", then tap "Add" in the top right.',
                'Launch the "SJCCC" icon from your iPhone/iPad Home Screen.',
                'Navigate to the Academic Calendar and tap "Remind me", then tap "Allow" on the iOS prompt.'
            ],
            osSteps: [
                'Open iPhone Settings > Notifications > SJCCC.',
                'Ensure "Allow Notifications" is toggled ON with Sound, Badges, and Lock Screen banners.'
            ],
            quickTip: 'Web push notifications are supported on iOS 16.4 and newer.'
        },
        {
            key: 'edge',
            browserLabel: 'Microsoft Edge',
            osLabel: 'Windows 10 / 11 / Mac',
            iconClass: 'bi-browser-edge',
            headline: 'Allow Notifications in Microsoft Edge',
            instructions: 'Follow these steps to unblock notifications in Microsoft Edge:',
            steps: [
                'Click the padlock or site info icon to the left of the address bar.',
                'Find "Notifications" in the dropdown and change it from "Block" to "Allow".',
                'If not visible, click "Permissions for this site" and set Notifications to "Allow".',
                'Refresh the page to activate milestone notifications.'
            ],
            osSteps: [
                'On Windows: Check Windows Settings (Win + I) > System > Notifications > Microsoft Edge: On.'
            ],
            shortcutUrl: 'edge://settings/content/notifications',
            quickTip: 'You can navigate to edge://settings/content/notifications in Edge.'
        },
        {
            key: 'android',
            browserLabel: 'Chrome / Samsung Internet',
            osLabel: 'Android Phones & Tablets',
            iconClass: 'bi-phone',
            headline: 'Allow Notifications on Android',
            instructions: 'Follow these steps to unblock notifications on your Android device:',
            steps: [
                'Tap the lock/tune icon or menu (⋮) in your browser address bar.',
                'Tap "Site settings" or "Permissions", then select "Notifications".',
                'Switch the toggle to "Allowed" or tap "Reset permissions".',
                'Refresh this page and tap "Remind me" to approve the notification prompt.'
            ],
            osSteps: [
                'Open Android Settings > Apps > Chrome (or Samsung Internet).',
                'Tap Notifications and verify "Allow notifications" is turned ON.'
            ],
            quickTip: 'Ensure your device is not in "Do Not Disturb" mode when expecting alerts.'
        }
    ];
}


