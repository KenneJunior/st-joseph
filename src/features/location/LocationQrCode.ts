/**
 * ============================================================================
 * SJCCC – Campus Location Dynamic Google Maps Navigation QR Code
 * Generates vector SVG and high-resolution downloadable QR codes linking
 * directly to Google Maps navigation for St. Joseph's Catholic Comprehensive College.
 * Provides instant camera scanning, link copying, and an enlarged modal view.
 * ============================================================================
 */

import QRCode from 'qrcode';

export interface LocationQrCodeOptions {
    containerId?: string;
    modalContainerId?: string;
    navigationUrl?: string;
    destinationName?: string;
    coordinates?: string;
}

export class LocationQrCode {
    public static readonly DEFAULT_NAVIGATION_URL =
        'https://www.google.com/maps/dir/?api=1&destination=6.031509,10.015436';
    public static readonly DEFAULT_COORDINATES = '6.0315° N, 10.0154° E';
    public static readonly DEFAULT_DESTINATION_NAME =
        "St. Joseph's Catholic Comprehensive College, Mbengwi";

    private container: HTMLElement | null;
    private navigationUrl: string;
    private destinationName: string;
    private coordinates: string;
    private modalEl: HTMLElement | null = null;
    private cachedSvg: string | null = null;

    constructor(options: LocationQrCodeOptions = {}) {
        this.container = document.getElementById(options.containerId || 'locationQrCodeContainer');
        this.navigationUrl = options.navigationUrl || LocationQrCode.DEFAULT_NAVIGATION_URL;
        this.destinationName = options.destinationName || LocationQrCode.DEFAULT_DESTINATION_NAME;
        this.coordinates = options.coordinates || LocationQrCode.DEFAULT_COORDINATES;

        this.init();
    }

    public getSvg(): string | null {
        return this.cachedSvg;
    }

    public getNavigationUrl(): string {
        return this.navigationUrl;
    }

    public getCoordinates(): string {
        return this.coordinates;
    }

    private async init(): Promise<void> {
        this.bindEvents();
        await this.renderInlineQr();
    }

    /**
     * Generates and injects the dynamic SVG QR code into the inline preview box.
     */
    public async renderInlineQr(): Promise<void> {
        if (!this.container) return;

        try {
            const svgString = await QRCode.toString(this.navigationUrl, {
                type: 'svg',
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: '#07182E',
                    light: '#ffffff'
                }
            });

            this.cachedSvg = svgString;
            this.container.innerHTML = `
                <div class="location-qr-svg-wrapper" role="img" aria-label="QR Code linking to Google Maps navigation for St. Joseph's Catholic Comprehensive College">
                    ${svgString}
                    <div class="location-qr-center-icon" aria-hidden="true" title="SJCCC GPS">
                        <i class="bi bi-geo-alt-fill"></i>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('[LocationQrCode] Failed to render QR code:', err);
            this.container.innerHTML = `
                <div class="location-qr-fallback">
                    <i class="bi bi-qr-code"></i>
                    <span>GPS Navigation Ready</span>
                </div>
            `;
        }
    }

    private bindEvents(): void {
        // Enlarge QR modal buttons
        const enlargeBtn = document.getElementById('locationOpenQrModalBtn');
        if (enlargeBtn) {
            enlargeBtn.addEventListener('click', () => this.openModal());
        }

        const toolbarQrBtn = document.getElementById('locationScanQrBtn');
        if (toolbarQrBtn) {
            toolbarQrBtn.addEventListener('click', () => this.openModal());
        }

        // Clicking the inline QR code itself opens the modal
        if (this.container) {
            this.container.addEventListener('click', () => this.openModal());
            this.container.style.cursor = 'pointer';
        }

        // Copy GPS Link button
        const copyBtn = document.getElementById('locationCopyNavUrlBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyNavigationUrl(copyBtn));
        }
    }

    /**
     * Copies the Google Maps navigation URL to clipboard with user feedback.
     */
    public async copyNavigationUrl(triggerBtn?: HTMLElement): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(this.navigationUrl);
            this.showFeedback('GPS navigation link copied to clipboard!', 'success', triggerBtn);
            return true;
        } catch {
            // Fallback for older browsers
            try {
                const textarea = document.createElement('textarea');
                textarea.value = this.navigationUrl;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showFeedback('GPS navigation link copied to clipboard!', 'success', triggerBtn);
                return true;
            } catch {
                this.showFeedback('Failed to copy. Please open maps directly.', 'error', triggerBtn);
                return false;
            }
        }
    }

    private showFeedback(message: string, type: 'success' | 'error', triggerBtn?: HTMLElement): void {
        const feedbackEl = document.getElementById('locationQrFeedback');
        if (feedbackEl) {
            feedbackEl.textContent = message;
            feedbackEl.className = `location-qr-feedback is-${type}`;
            window.setTimeout(() => {
                feedbackEl.textContent = '';
                feedbackEl.className = 'location-qr-feedback';
            }, 3500);
        }

        if (triggerBtn) {
            const originalHtml = triggerBtn.innerHTML;
            triggerBtn.innerHTML = `<i class="bi bi-check-lg" aria-hidden="true"></i> <span>Copied!</span>`;
            triggerBtn.classList.add('is-copied');
            window.setTimeout(() => {
                triggerBtn.innerHTML = originalHtml;
                triggerBtn.classList.remove('is-copied');
            }, 2500);
        }

        // A11y announcement
        const announcer = document.getElementById('a11y-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    /**
     * Opens an accessible, high-definition modal displaying the large QR code.
     */
    public async openModal(): Promise<void> {
        if (!this.modalEl) {
            this.buildModal();
        }

        if (!this.modalEl) return;

        if (!this.modalEl.parentNode) {
            document.body.appendChild(this.modalEl);
        }
        document.body.style.overflow = 'hidden';

        // Animate entrance
        requestAnimationFrame(() => {
            if (this.modalEl) {
                this.modalEl.classList.add('is-open');
                const closeBtn = this.modalEl.querySelector<HTMLElement>('.location-modal-close-btn');
                closeBtn?.focus();
            }
        });

        // Render high-res SVG inside modal
        const modalQrContainer = this.modalEl.querySelector('.location-modal-qr-target');
        if (modalQrContainer && !modalQrContainer.hasChildNodes()) {
            try {
                const modalSvg = await QRCode.toString(this.navigationUrl, {
                    type: 'svg',
                    errorCorrectionLevel: 'H',
                    margin: 2,
                    color: {
                        dark: '#07182E',
                        light: '#ffffff'
                    }
                });

                modalQrContainer.innerHTML = `
                    <div class="location-modal-qr-visual" role="img" aria-label="Large Google Maps Navigation QR Code">
                        ${modalSvg}
                        <div class="location-modal-center-emblem" aria-hidden="true">
                            <i class="bi bi-geo-alt-fill"></i>
                        </div>
                    </div>
                `;
            } catch (err) {
                console.error('[LocationQrCode] Modal QR render failed:', err);
            }
        }

        // A11y announcement
        const announcer = document.getElementById('a11y-announcer');
        if (announcer) {
            announcer.textContent = 'Google Maps Navigation QR Code opened. Scan with phone or download.';
        }
    }

    public closeModal(): void {
        if (!this.modalEl) return;

        this.modalEl.classList.remove('is-open');
        document.body.style.overflow = '';

        window.setTimeout(() => {
            if (this.modalEl && this.modalEl.parentNode) {
                this.modalEl.parentNode.removeChild(this.modalEl);
            }
        }, 250);

        // Return focus
        const trigger = document.getElementById('locationOpenQrModalBtn') ||
            document.getElementById('locationScanQrBtn');
        trigger?.focus();
    }

    private buildModal(): void {
        const modal = document.createElement('div');
        modal.id = 'locationQrModal';
        modal.className = 'location-qr-modal-backdrop';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'locationQrModalTitle');

        modal.innerHTML = `
            <div class="location-qr-modal-dialog">
                <button type="button" class="location-modal-close-btn" aria-label="Close QR Code dialog">
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>

                <div class="location-modal-header">
                    <span class="location-modal-kicker">
                        <i class="bi bi-compass-fill" aria-hidden="true"></i> Turn-by-Turn GPS Route
                    </span>
                    <h3 id="locationQrModalTitle" class="location-modal-title">Scan for Google Maps Navigation</h3>
                    <p class="location-modal-subtitle">${this.destinationName}</p>
                </div>

                <div class="location-modal-body">
                    <div class="location-modal-qr-frame">
                        <div class="location-modal-qr-target"></div>
                        <span class="location-modal-scan-hint">
                            <i class="bi bi-camera-fill" aria-hidden="true"></i> Compatible with iOS Camera, Google Lens &amp; all QR scanners
                        </span>
                    </div>

                    <div class="location-modal-meta-box">
                        <div class="location-modal-meta-row">
                            <span class="location-modal-meta-label"><i class="bi bi-geo-alt"></i> Coordinates:</span>
                            <code class="location-modal-meta-value">${this.coordinates}</code>
                        </div>
                        <div class="location-modal-meta-row">
                            <span class="location-modal-meta-label"><i class="bi bi-pin-map"></i> Destination:</span>
                            <span class="location-modal-meta-desc">Mbengwi, Momo Division, North West Region, Cameroon</span>
                        </div>
                    </div>
                </div>

                <div class="location-modal-actions">
                    <a href="${this.navigationUrl}" target="_blank" rel="noopener noreferrer"
                        class="btn btn-primary location-modal-btn">
                        <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                        <span>Start Driving Route</span>
                    </a>
                    <button type="button" class="btn btn-outline location-modal-btn" id="locationModalCopyBtn">
                        <i class="bi bi-link-45deg" aria-hidden="true"></i>
                        <span>Copy Route Link</span>
                    </button>
                    <button type="button" class="btn btn-ghost location-modal-btn" id="locationModalDownloadBtn">
                        <i class="bi bi-download" aria-hidden="true"></i>
                        <span>Save QR Image</span>
                    </button>
                </div>
                <div class="location-modal-toast" id="locationModalToast" role="status" aria-live="polite"></div>
            </div>
        `;

        // Event listeners
        const closeBtn = modal.querySelector('.location-modal-close-btn');
        closeBtn?.addEventListener('click', () => this.closeModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Copy button in modal
        const modalCopyBtn = modal.querySelector('#locationModalCopyBtn');
        modalCopyBtn?.addEventListener('click', async () => {
            await this.copyNavigationUrl();
            this.showModalToast('Link copied to clipboard!');
        });

        // Download QR image button
        const downloadBtn = modal.querySelector('#locationModalDownloadBtn');
        downloadBtn?.addEventListener('click', () => this.downloadQrCode());

        this.modalEl = modal;
    }

    private showModalToast(message: string): void {
        const toast = this.modalEl?.querySelector('#locationModalToast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('is-visible');
            window.setTimeout(() => {
                toast.textContent = '';
                toast.classList.remove('is-visible');
            }, 3000);
        }
    }

    /**
     * Downloads a branded PNG image with high-contrast QR code for offline drivers/visitors.
     */
    public async downloadQrCode(): Promise<void> {
        try {
            // Render high-res data URL
            const dataUrl = await QRCode.toDataURL(this.navigationUrl, {
                width: 600,
                margin: 3,
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#07182E',
                    light: '#FFFFFF'
                }
            });

            // Create offscreen canvas to compose institutional card
            const canvas = document.createElement('canvas');
            canvas.width = 680;
            canvas.height = 820;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get 2d canvas context');

            // Background
            ctx.fillStyle = '#07182E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Border gold accent
            ctx.strokeStyle = '#C9A229';
            ctx.lineWidth = 4;
            ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

            // Header text
            ctx.fillStyle = '#C9A229';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("ST. JOSEPH'S CATHOLIC COMPREHENSIVE COLLEGE", canvas.width / 2, 64);

            ctx.fillStyle = '#F3D779';
            ctx.font = 'italic 16px serif';
            ctx.fillText('MBENGWI, MOMO DIVISION · "EDIFICAMUS REGNUM DEI"', canvas.width / 2, 94);

            // QR image
            const img = new Image();
            img.src = dataUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Draw white background card for QR code
            ctx.fillStyle = '#FFFFFF';
            const qrCardX = 80;
            const qrCardY = 125;
            const qrCardSize = 520;
            ctx.fillRect(qrCardX, qrCardY, qrCardSize, qrCardSize);
            ctx.strokeStyle = 'rgba(201, 162, 41, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(qrCardX, qrCardY, qrCardSize, qrCardSize);

            // Draw QR code
            ctx.drawImage(img, qrCardX + 20, qrCardY + 20, qrCardSize - 40, qrCardSize - 40);

            // Coordinates footer
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('GPS: 6.0315° N, 10.0154° E', canvas.width / 2, 690);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '15px system-ui, sans-serif';
            ctx.fillText('Scan with smartphone camera for Google Maps Navigation', canvas.width / 2, 725);

            ctx.fillStyle = '#C9A229';
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillText('saintjosephcollege.vercel.app', canvas.width / 2, 760);

            // Export to download
            const downloadUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'SJCCC-Mbengwi-GoogleMaps-Navigation-QR.png';
            link.href = downloadUrl;
            link.click();

            this.showModalToast('QR Code image downloaded successfully!');
        } catch (err) {
            console.error('[LocationQrCode] Download failed:', err);
            this.showModalToast('Could not download image. Please scan directly.');
        }
    }
}
