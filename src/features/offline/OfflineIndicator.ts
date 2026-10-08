/**
 * ============================================================================
 * SJCCC – Offline Status Indicator
 * Monitors network status by listening directly to window 'online' and 'offline'
 * events. Queries the Service Worker to verify cache availability for key
 * sections (Academics, FAQ, Prospectus, Campus Map).
 * Displays a subtle, non-intrusive status pill with an expandable detail card.
 * ============================================================================
 */

import { checkCacheAvailability, type CacheAvailabilityReport } from '../../services/serviceWorker.ts';

export interface OfflineIndicatorOptions {
    containerId?: string;
    autoMount?: boolean;
}

export class OfflineIndicator {
    private container: HTMLElement | null = null;
    private isExpanded = false;
    private currentReport: CacheAvailabilityReport | null = null;
    private onlineDismissTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly onlineHandler: () => void;
    private readonly offlineHandler: () => void;

    constructor(options: OfflineIndicatorOptions = {}) {
        this.onlineHandler = () => this.handleOnline();
        this.offlineHandler = () => this.handleOffline();

        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.onlineHandler);
            window.addEventListener('offline', this.offlineHandler);
        }

        if (options.autoMount !== false) {
            this.init();
        }
    }

    public async init(): Promise<void> {
        // Only trigger offline status on initialization if browser explicitly reports offline
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            await this.handleOffline();
        }
    }

    private async handleOffline(): Promise<void> {
        if (this.onlineDismissTimer) {
            clearTimeout(this.onlineDismissTimer);
            this.onlineDismissTimer = null;
        }

        // Query the Service Worker / CacheStorage to evaluate section readiness
        this.currentReport = await checkCacheAvailability();
        this.render();
    }

    private handleOnline(): void {
        if (!this.container) return;

        // Transition indicator to show restored connectivity
        this.container.classList.add('online');
        const titleEl = this.container.querySelector('.offline-indicator-title');
        const textEl = this.container.querySelector('.offline-indicator-text');

        if (titleEl) titleEl.textContent = 'Back Online';
        if (textEl) textEl.textContent = '· Connection restored';

        // Auto-dismiss smoothly after 2.8 seconds
        this.onlineDismissTimer = setTimeout(() => {
            this.hide();
        }, 2800);
    }

    public render(): void {
        if (!this.container) {
            this.container = document.createElement('aside');
            this.container.id = 'offlineStatusIndicator';
            this.container.className = 'offline-status-indicator';
            this.container.setAttribute('role', 'status');
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-label', 'Network connectivity status');
            document.body.appendChild(this.container);
        }

        this.container.classList.remove('online');
        if (this.isExpanded) {
            this.container.classList.add('expanded');
        } else {
            this.container.classList.remove('expanded');
        }

        const report = this.currentReport || {
            isCached: true,
            sections: { academics: true, faq: true, prospectus: true, campusMap: true },
        };

        const academicsCached = report.sections.academics;
        const faqCached = report.sections.faq;
        const prospectusCached = report.sections.prospectus;
        const mapCached = report.sections.campusMap;

        // High-level summary text for the compact pill
        let summaryText = 'Academics & FAQ available from cache';
        if (academicsCached && faqCached) {
            summaryText = 'Academics & FAQ cached';
        } else if (academicsCached) {
            summaryText = 'Academics section cached';
        } else if (faqCached) {
            summaryText = 'FAQ section cached';
        }

        this.container.innerHTML = `
            <div class="offline-card-panel" id="offlineCardPanel" aria-hidden="${!this.isExpanded}">
                <div class="offline-card-header">
                    <span class="offline-card-title">
                        <i class="bi bi-cloud-slash"></i> Offline Mode · Cached Content
                    </span>
                    <button class="offline-card-close" id="offlineCardClose" aria-label="Close offline details" title="Collapse">
                        <i class="bi bi-dash-lg"></i>
                    </button>
                </div>
                <ul class="offline-sections-list">
                    <li class="offline-section-item">
                        <span class="offline-section-name">
                            <i class="bi bi-mortarboard-fill"></i>
                            <a href="#academics">Academics Curriculum</a>
                        </span>
                        <span class="offline-section-badge ${academicsCached ? 'cached' : 'network-only'}">
                            ${academicsCached ? '✓ Cached' : 'Network required'}
                        </span>
                    </li>
                    <li class="offline-section-item">
                        <span class="offline-section-name">
                            <i class="bi bi-award-fill"></i>
                            <a href="#results">2026 GCE Results</a>
                        </span>
                        <span class="offline-section-badge ${academicsCached ? 'cached' : 'network-only'}">
                            ${academicsCached ? '✓ Cached' : 'Network required'}
                        </span>
                    </li>
                    <li class="offline-section-item">
                        <span class="offline-section-name">
                            <i class="bi bi-question-circle-fill"></i>
                            <a href="#faq">Admissions &amp; Fees FAQ</a>
                        </span>
                        <span class="offline-section-badge ${faqCached ? 'cached' : 'network-only'}">
                            ${faqCached ? '✓ Cached' : 'Network required'}
                        </span>
                    </li>
                    <li class="offline-section-item">
                        <span class="offline-section-name">
                            <i class="bi bi-geo-alt-fill"></i>
                            <a href="#campusMapSection">Campus Map &amp; Zones</a>
                        </span>
                        <span class="offline-section-badge ${mapCached ? 'cached' : 'network-only'}">
                            ${mapCached ? '✓ Cached' : 'Network required'}
                        </span>
                    </li>
                    <li class="offline-section-item">
                        <span class="offline-section-name">
                            <i class="bi bi-file-earmark-pdf-fill"></i>
                            <a href="/prospectus.html">Student Prospectus</a>
                        </span>
                        <span class="offline-section-badge ${prospectusCached ? 'cached' : 'network-only'}">
                            ${prospectusCached ? '✓ Cached' : 'Network required'}
                        </span>
                    </li>
                    <li class="offline-section-item">
                        <span class="offline-section-name" style="opacity:0.75;">
                            <i class="bi bi-envelope-fill"></i>
                            <span>Online Form Enquiry</span>
                        </span>
                        <span class="offline-section-badge network-only">
                            Requires internet
                        </span>
                    </li>
                </ul>
                <div class="offline-card-footer">
                    <span class="offline-card-footer-info">Powered by SJCCC Service Worker</span>
                    <button class="offline-recheck-btn" id="offlineRecheckBtn" type="button" title="Query Service Worker cache">
                        <i class="bi bi-arrow-clockwise"></i> Re-check
                    </button>
                </div>
            </div>

            <div class="offline-indicator-pill" id="offlineIndicatorPill" role="button" tabindex="0"
                aria-expanded="${this.isExpanded}" aria-controls="offlineCardPanel" title="Click to view cached sections">
                <span class="offline-indicator-dot" aria-hidden="true"></span>
                <div class="offline-indicator-summary">
                    <span class="offline-indicator-title">Offline Mode</span>
                    <span class="offline-indicator-text">· ${summaryText}</span>
                </div>
                <i class="bi bi-chevron-up offline-toggle-icon" aria-hidden="true"></i>
            </div>
        `;

        this.bindEvents();

        // Reveal with smooth entry animation
        requestAnimationFrame(() => {
            this.container?.classList.add('visible');
        });
    }

    private bindEvents(): void {
        if (!this.container) return;

        const pill = this.container.querySelector('#offlineIndicatorPill');
        const closeBtn = this.container.querySelector('#offlineCardClose');
        const recheckBtn = this.container.querySelector('#offlineRecheckBtn');

        pill?.addEventListener('click', (e) => {
            // Prevent close button from double triggering
            if ((e.target as HTMLElement).closest('#offlineCardClose')) return;
            this.toggleExpanded();
        });

        pill?.addEventListener('keydown', (e: Event) => {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                keyEvent.preventDefault();
                this.toggleExpanded();
            }
        });

        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setExpanded(false);
        });

        recheckBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget as HTMLButtonElement;
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-arrow-clockwise bi-spin"></i> Checking...';
            this.currentReport = await checkCacheAvailability();
            this.render();
        });
    }

    public toggleExpanded(): void {
        this.setExpanded(!this.isExpanded);
    }

    public setExpanded(expanded: boolean): void {
        this.isExpanded = expanded;
        if (this.container) {
            if (this.isExpanded) {
                this.container.classList.add('expanded');
            } else {
                this.container.classList.remove('expanded');
            }
            const pill = this.container.querySelector('#offlineIndicatorPill');
            const card = this.container.querySelector('#offlineCardPanel');
            if (pill) pill.setAttribute('aria-expanded', String(this.isExpanded));
            if (card) card.setAttribute('aria-hidden', String(!this.isExpanded));
        }
    }

    public hide(): void {
        if (!this.container) return;
        this.container.classList.remove('visible');
        setTimeout(() => {
            if (this.container && !this.container.classList.contains('visible')) {
                this.container.remove();
                this.container = null;
            }
        }, 400);
    }

    public destroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.onlineHandler);
            window.removeEventListener('offline', this.offlineHandler);
        }
        if (this.onlineDismissTimer) {
            clearTimeout(this.onlineDismissTimer);
            this.onlineDismissTimer = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
