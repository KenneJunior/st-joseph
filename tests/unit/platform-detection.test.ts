import { describe, it, expect } from 'vitest';
import { isApplePlatform, detectPlatform, getCalendarExportGuidance, type PlatformNavigator } from '../../src/core/platform/platformDetection.ts';

describe('Platform & Device Detection (isApplePlatform)', () => {
    it('identifies iPhone devices across Safari and Chrome', () => {
        const iphoneSafari: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
            platform: 'iPhone',
            maxTouchPoints: 5,
        };
        expect(isApplePlatform(iphoneSafari)).toBe(true);

        const iphoneChrome: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/116.0.5845.177 Mobile/15E148 Safari/604.1',
            platform: 'iPhone',
            maxTouchPoints: 5,
        };
        expect(isApplePlatform(iphoneChrome)).toBe(true);
    });

    it('identifies classic iPad and iPod devices', () => {
        const ipadClassic: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
            platform: 'iPad',
            maxTouchPoints: 5,
        };
        expect(isApplePlatform(ipadClassic)).toBe(true);

        const ipodTouch: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
            platform: 'iPod touch',
            maxTouchPoints: 5,
        };
        expect(isApplePlatform(ipodTouch)).toBe(true);
    });

    it('identifies modern iPadOS in desktop-class browsing mode (Macintosh UA with multi-touch points)', () => {
        // Modern iPadOS 13+ reports Macintosh user agent with MacIntel platform, but has multi-touch points (> 1)
        const ipadosDesktopSafari: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
            platform: 'MacIntel',
            maxTouchPoints: 5,
        };
        expect(isApplePlatform(ipadosDesktopSafari)).toBe(true);

        const ipadosDesktopChrome: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            platform: 'MacIntel',
            maxTouchPoints: 10,
        };
        expect(isApplePlatform(ipadosDesktopChrome)).toBe(true);
    });

    it('identifies macOS desktops and laptops', () => {
        const macSafari: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
            platform: 'MacIntel',
            maxTouchPoints: 0,
        };
        expect(isApplePlatform(macSafari)).toBe(true);

        const macChrome: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            platform: 'MacIntel',
            maxTouchPoints: 0,
        };
        expect(isApplePlatform(macChrome)).toBe(true);

        const macFirefox: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
            platform: 'MacIntel',
            maxTouchPoints: 0,
        };
        expect(isApplePlatform(macFirefox)).toBe(true);
    });

    it('identifies Apple platforms via modern Client Hints (userAgentData)', () => {
        const macUad: PlatformNavigator = {
            userAgentData: { platform: 'macOS' },
            userAgent: '',
            platform: '',
        };
        expect(isApplePlatform(macUad)).toBe(true);

        const iosUad: PlatformNavigator = {
            userAgentData: { platform: 'iOS' },
            userAgent: '',
            platform: '',
        };
        expect(isApplePlatform(iosUad)).toBe(true);
    });

    it('strictly rejects Windows devices (Chrome, Edge, Firefox)', () => {
        const winChrome: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            platform: 'Win32',
            maxTouchPoints: 0,
        };
        expect(isApplePlatform(winChrome)).toBe(false);

        const winEdge: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
            platform: 'Win32',
            maxTouchPoints: 10, // Touchscreen Windows laptop
        };
        expect(isApplePlatform(winEdge)).toBe(false);

        const winFirefox: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
            platform: 'Win32',
            maxTouchPoints: 0,
        };
        expect(isApplePlatform(winFirefox)).toBe(false);
    });

    it('strictly rejects Android smartphones and tablets', () => {
        const androidPhone: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
            platform: 'Linux armv81',
            maxTouchPoints: 5,
        };
        expect(isApplePlatform(androidPhone)).toBe(false);

        const androidTablet: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Safari/537.36',
            platform: 'Linux aarch64',
            maxTouchPoints: 10,
        };
        expect(isApplePlatform(androidTablet)).toBe(false);
    });

    it('strictly rejects Linux and ChromeOS environments', () => {
        const linuxDesktop: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
            platform: 'Linux x86_64',
            maxTouchPoints: 0,
        };
        expect(isApplePlatform(linuxDesktop)).toBe(false);

        const chromeOs: PlatformNavigator = {
            userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            platform: 'Linux x86_64',
            maxTouchPoints: 10,
        };
        expect(isApplePlatform(chromeOs)).toBe(false);
    });

    it('gracefully handles missing or empty navigator info', () => {
        expect(isApplePlatform({})).toBe(false);
        expect(isApplePlatform({ userAgent: '' })).toBe(false);
    });
});

describe('Enhanced Platform & Browser Detection (detectPlatform)', () => {
    it('detects iPhone Safari as iOS, mobile, Safari, with ICS recommendation', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
            platform: 'iPhone',
            maxTouchPoints: 5,
        });

        expect(info.os).toBe('ios');
        expect(info.deviceCategory).toBe('mobile');
        expect(info.browser).toBe('safari');
        expect(info.isApple).toBe(true);
        expect(info.isMobileOrTablet).toBe(true);
        expect(info.isInAppBrowser).toBe(false);
        expect(info.recommendedProvider).toBe('ics');
        expect(info.osLabel).toBe('Apple iOS');
    });

    it('detects iPadOS in desktop browsing mode as iOS, tablet, Safari', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
            platform: 'MacIntel',
            maxTouchPoints: 5,
        });

        expect(info.os).toBe('ios');
        expect(info.deviceCategory).toBe('tablet');
        expect(info.browser).toBe('safari');
        expect(info.isApple).toBe(true);
        expect(info.isMobileOrTablet).toBe(true);
        expect(info.recommendedProvider).toBe('ics');
    });

    it('detects Android phone Chrome as android, mobile, Chrome, with Google Calendar recommendation', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
            platform: 'Linux armv81',
            maxTouchPoints: 5,
        });

        expect(info.os).toBe('android');
        expect(info.deviceCategory).toBe('mobile');
        expect(info.browser).toBe('chrome');
        expect(info.isApple).toBe(false);
        expect(info.isMobileOrTablet).toBe(true);
        expect(info.recommendedProvider).toBe('google');
        expect(info.osLabel).toBe('Android');
    });

    it('detects Android tablet as android, tablet, Chrome', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Safari/537.36',
            platform: 'Linux aarch64',
            maxTouchPoints: 10,
        });

        expect(info.os).toBe('android');
        expect(info.deviceCategory).toBe('tablet');
        expect(info.isMobileOrTablet).toBe(true);
        expect(info.recommendedProvider).toBe('google');
    });

    it('detects Windows Edge as windows, desktop, edge, with Outlook recommendation', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
            platform: 'Win32',
            maxTouchPoints: 0,
        });

        expect(info.os).toBe('windows');
        expect(info.deviceCategory).toBe('desktop');
        expect(info.browser).toBe('edge');
        expect(info.isApple).toBe(false);
        expect(info.isMobileOrTablet).toBe(false);
        expect(info.recommendedProvider).toBe('outlook');
        expect(info.osLabel).toBe('Windows');
    });

    it('detects macOS Chrome as macos, desktop, chrome, with ICS recommendation', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            platform: 'MacIntel',
            maxTouchPoints: 0,
        });

        expect(info.os).toBe('macos');
        expect(info.deviceCategory).toBe('desktop');
        expect(info.browser).toBe('chrome');
        expect(info.isApple).toBe(true);
        expect(info.recommendedProvider).toBe('ics');
    });

    it('detects in-app browsers across Instagram, TikTok, and Android WebViews', () => {
        const instagramUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 324.0.0.18.109';
        const igInfo = detectPlatform({ userAgent: instagramUa, platform: 'iPhone', maxTouchPoints: 5 });
        expect(igInfo.isInAppBrowser).toBe(true);

        const tiktokUa = 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240105.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36 musical_ly_33.5.3';
        const ttInfo = detectPlatform({ userAgent: tiktokUa, platform: 'Linux armv81', maxTouchPoints: 5 });
        expect(ttInfo.isInAppBrowser).toBe(true);

        const androidWv = 'Mozilla/5.0 (Linux; U; Android 13; en-us; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36';
        const wvInfo = detectPlatform({ userAgent: androidWv, platform: 'Linux armv81', maxTouchPoints: 5 });
        expect(wvInfo.isInAppBrowser).toBe(true);
    });

    it('gracefully handles empty or undefined navigators', () => {
        const emptyInfo = detectPlatform({});
        expect(emptyInfo.os).toBe('unknown');
        expect(emptyInfo.deviceCategory).toBe('unknown');
        expect(emptyInfo.browser).toBe('unknown');
        expect(emptyInfo.isInAppBrowser).toBe(false);
        expect(emptyInfo.isApple).toBe(false);
    });
});

describe('Calendar Platform Guidance Generation (getCalendarExportGuidance)', () => {
    it('produces tailored Apple Calendar instructions for iOS', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1',
            platform: 'iPhone',
            maxTouchPoints: 5,
        });

        const guidance = getCalendarExportGuidance(info, 'Re-opening / Resumption');
        expect(guidance.suggestedApp).toBe('Apple Calendar');
        expect(guidance.instructions).toContain('Apple Calendar');
        expect(guidance.steps.length).toBeGreaterThanOrEqual(3);
        expect(guidance.hasInAppRestriction).toBe(false);
    });

    it('produces tailored Google/Samsung Calendar instructions for Android', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
            platform: 'Linux armv81',
            maxTouchPoints: 5,
        });

        const guidance = getCalendarExportGuidance(info, 'Re-opening / Resumption');
        expect(guidance.suggestedApp).toContain('Google Calendar');
        expect(guidance.instructions).toContain('Google Calendar or Samsung Calendar');
        expect(guidance.steps[0]).toContain('notification');
        expect(guidance.hasInAppRestriction).toBe(false);
    });

    it('produces Outlook instructions for Windows', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
            platform: 'Win32',
        });

        const guidance = getCalendarExportGuidance(info, 'Second Term Exams');
        expect(guidance.suggestedApp).toContain('Outlook');
        expect(guidance.instructions).toContain('Outlook or Windows Calendar');
        expect(guidance.hasInAppRestriction).toBe(false);
    });

    it('flags in-app browser restrictions with actionable workarounds', () => {
        const info = detectPlatform({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Instagram 324.0.0.18.109',
            platform: 'iPhone',
            maxTouchPoints: 5,
        });

        const guidance = getCalendarExportGuidance(info, 'Solemn Feast of St. Joseph');
        expect(guidance.hasInAppRestriction).toBe(true);
        expect(guidance.instructions).toContain('Open in Browser');
        expect(guidance.instructions).toContain('Google Calendar');
    });
});
