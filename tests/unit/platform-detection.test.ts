import { describe, it, expect } from 'vitest';
import { isApplePlatform, type PlatformNavigator } from '../../src/core/platform/platformDetection.ts';

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
