// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocationQrCode } from '../../src/features/location/LocationQrCode.ts';

describe('LocationQrCode – Dynamic Google Maps Navigation QR Code', () => {
    let containerEl: HTMLElement;
    let qrModalBtn: HTMLButtonElement;
    let copyBtn: HTMLButtonElement;
    let toolbarScanBtn: HTMLButtonElement;
    let feedbackEl: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="location">
                <div id="locationQrCodeContainer"></div>
                <button id="locationOpenQrModalBtn" type="button">Enlarge QR</button>
                <button id="locationCopyNavUrlBtn" type="button">Copy GPS Link</button>
                <button id="locationScanQrBtn" type="button">Scan Navigation QR</button>
                <div id="locationQrFeedback"></div>
                <div id="a11y-announcer"></div>
            </div>
        `;

        // Mock clipboard API
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });

        containerEl = document.getElementById('locationQrCodeContainer') as HTMLElement;
        qrModalBtn = document.getElementById('locationOpenQrModalBtn') as HTMLButtonElement;
        copyBtn = document.getElementById('locationCopyNavUrlBtn') as HTMLButtonElement;
        toolbarScanBtn = document.getElementById('locationScanQrBtn') as HTMLButtonElement;
        feedbackEl = document.getElementById('locationQrFeedback') as HTMLElement;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        const modal = document.getElementById('locationQrModal');
        modal?.remove();
        document.body.innerHTML = '';
    });

    it('initializes with default Google Maps navigation URL and coordinates', () => {
        const qr = new LocationQrCode();
        expect(qr.getNavigationUrl()).toBe(LocationQrCode.DEFAULT_NAVIGATION_URL);
        expect(qr.getNavigationUrl()).toContain('google.com/maps/dir');
        expect(qr.getNavigationUrl()).toContain('destination=6.031509,10.015436');
        expect(qr.getCoordinates()).toBe('6.0315° N, 10.0154° E');
    });

    it('dynamically renders SVG QR code and center GPS emblem in container', async () => {
        const qr = new LocationQrCode({ containerId: 'locationQrCodeContainer' });
        await qr.renderInlineQr();

        const svg = qr.getSvg();
        expect(svg).toBeDefined();
        expect(svg).toContain('<svg');

        expect(containerEl.innerHTML).toContain('location-qr-svg-wrapper');
        expect(containerEl.innerHTML).toContain('location-qr-center-icon');
        expect(containerEl.innerHTML).toContain('bi-geo-alt-fill');
    });

    it('copies navigation URL to clipboard and provides feedback toast', async () => {
        const qr = new LocationQrCode();
        const success = await qr.copyNavigationUrl(copyBtn);

        expect(success).toBe(true);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            LocationQrCode.DEFAULT_NAVIGATION_URL
        );
        expect(feedbackEl.textContent).toContain('GPS navigation link copied');
        expect(feedbackEl.classList.contains('is-success')).toBe(true);
    });

    it('opens and closes the high-definition navigation QR modal', async () => {
        const qr = new LocationQrCode();
        await qr.openModal();

        const modal = document.getElementById('locationQrModal');
        expect(modal).not.toBeNull();
        expect(modal?.getAttribute('role')).toBe('dialog');
        expect(modal?.getAttribute('aria-modal')).toBe('true');
        expect(modal?.innerHTML).toContain('Scan for Google Maps Navigation');
        expect(modal?.innerHTML).toContain('6.0315° N, 10.0154° E');

        qr.closeModal();
        expect(modal?.classList.contains('is-open')).toBe(false);
    });

    it('binds toolbar and inline buttons to trigger modal display', async () => {
        const qr = new LocationQrCode();
        await qr.renderInlineQr();

        expect(document.getElementById('locationQrModal')).toBeNull();

        // Click toolbar button
        toolbarScanBtn.click();
        expect(document.getElementById('locationQrModal')).not.toBeNull();

        qr.closeModal();
    });
});
