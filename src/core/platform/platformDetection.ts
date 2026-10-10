/**
 * ============================================================================
 * SJCCC – Platform & Device Detection (platformDetection.ts)
 * 
 * Isolated, pure, and testable utility to identify Apple devices
 * (iPhone, iPad, iPadOS desktop-mode, iPod, macOS) for selecting the
 * lightweight timed hero animation mode and bypassing scroll-driven engines.
 * 
 * Explicitly guards against Android, Windows, and Linux false positives.
 * ============================================================================
 */

export interface PlatformNavigator {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
    userAgentData?: {
        platform?: string;
    };
}

/**
 * Determines whether the client environment is an Apple device/platform:
 * - iOS: iPhone, iPad, iPod
 * - iPadOS: Desktop-style user agent reporting ("Macintosh") with multi-touch points
 * - macOS: Desktop & laptop Apple hardware
 * 
 * Returns false for Windows, Android, Linux, and non-Apple platforms.
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
    // Note: Some Android browsers might include desktop tokens, so check Android first
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

    // 4. iPadOS desktop-class browsing:
    // Starting in iPadOS 13, Safari and Chrome on iPad default to desktop mode,
    // reporting a "Macintosh" user-agent and platform "MacIntel", but having multi-touch support (>1).
    const isMacIdentified = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) || /Mac/i.test(platform) || /Mac OS X/i.test(ua);
    if (isMacIdentified && maxTouchPoints > 1) {
        return true; // iPadOS in desktop browsing mode
    }

    // 5. macOS devices (MacBook, iMac, Mac Studio, Mac Pro, Mac mini)
    if (isMacIdentified) {
        return true;
    }

    // 6. Platform string fallback (e.g. legacy or minimal environments)
    if (platform && /Mac|iPhone|iPad|iPod/i.test(platform)) {
        return true;
    }

    return false;
}
