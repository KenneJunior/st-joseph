/**
 * ============================================================================
 * SJCCC – Campus Location & Google Map Interactive Facade
 * Provides high-performance static rendering, privacy protection,
 * 100% offline usability, and on-demand interactive Google Maps loading.
 * ============================================================================
 */

export interface LocationMapFacadeOptions {
    wrapperId?: string;
    facadeId?: string;
    buttonId?: string;
    iframeSrc?: string;
    title?: string;
}

export class LocationMapFacade {
    private wrapper: HTMLElement | null;
    private facade: HTMLElement | null;
    private loadBtn: HTMLButtonElement | null;
    private iframeContainer: HTMLElement | null = null;
    private iframeSrc: string;
    private title: string;

    constructor(options: LocationMapFacadeOptions = {}) {
        const wrapperId = options.wrapperId || 'locationMapWrapper';
        const facadeId = options.facadeId || 'locationFacade';
        const buttonId = options.buttonId || 'loadGoogleMapBtn';

        this.wrapper = document.getElementById(wrapperId);
        this.facade = document.getElementById(facadeId);
        this.loadBtn = document.getElementById(buttonId) as HTMLButtonElement | null;
        this.iframeSrc = options.iframeSrc || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3895.40328761124!2d10.015436059246833!3d6.031508591668883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x105f23b91aaaaaab%3A0x3d97a1d6fe5673b0!2sSt%20Joseph%20Secondary%20School!5e1!3m2!1sen!2scm!4v1781468634874!5m2!1sen!2scm';
        this.title = options.title || 'Saint Joseph Catholic Comprehensive College Mbengwi on Google Maps';

        this.init();
    }

    private init(): void {
        if (!this.loadBtn || !this.wrapper) return;

        this.loadBtn.addEventListener('click', () => this.loadLiveMap());
    }

    public loadLiveMap(): void {
        if (!this.wrapper) return;

        // If user is currently offline, show informative fallback feedback
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            this.handleOfflineAttempt();
            return;
        }

        if (!this.iframeContainer) {
            const container = document.createElement('div');
            container.className = 'location-iframe-container';
            container.setAttribute('role', 'region');
            container.setAttribute('aria-label', 'Interactive Google Map');

            const iframe = document.createElement('iframe');
            iframe.src = this.iframeSrc;
            iframe.title = this.title;
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.style.border = '0';
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('loading', 'lazy');
            iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'location-iframe-close-btn';
            closeBtn.setAttribute('aria-label', 'Close interactive map and return to campus facade');
            closeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i> <span>Close Map</span>';
            closeBtn.addEventListener('click', () => this.unloadLiveMap());

            container.appendChild(iframe);
            container.appendChild(closeBtn);
            this.iframeContainer = container;
        }

        if (this.facade) {
            this.facade.style.display = 'none';
        }
        this.wrapper.appendChild(this.iframeContainer);

        // A11y notification
        const announcer = document.getElementById('a11y-announcer');
        if (announcer) {
            announcer.textContent = 'Interactive Google Map loaded.';
        }
    }

    public unloadLiveMap(): void {
        if (this.iframeContainer && this.iframeContainer.parentNode) {
            this.iframeContainer.parentNode.removeChild(this.iframeContainer);
        }
        if (this.facade) {
            this.facade.style.display = 'flex';
        }
        if (this.loadBtn) {
            this.loadBtn.focus();
        }

        const announcer = document.getElementById('a11y-announcer');
        if (announcer) {
            announcer.textContent = 'Returned to campus overview facade.';
        }
    }

    private handleOfflineAttempt(): void {
        const hint = this.wrapper?.querySelector('.location-facade__hint');
        if (hint) {
            hint.innerHTML = '<i class="bi bi-wifi-off" aria-hidden="true"></i> Internet connection required for live map. You can still use the 6 Campus Zones offline explorer below.';
            (hint as HTMLElement).style.color = 'var(--gold-light, #F3D779)';
        }
    }
}
