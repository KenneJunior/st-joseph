/**
 * ============================================================================
 * SJCCC – Institutional PWA Install Card Controller
 * Handles deferred browser install prompts, user engagement detection,
 * non-modal theme-responsive card presentation, 14-day persistence cooldowns,
 * iOS/Safari guided installation fallback, and collision-free coordination.
 * ============================================================================
 */

import '../../css/components/pwa-install-card.css';
import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';
import { LiquidGlassAdapter } from '../../ui/effects/LiquidGlassAdapter.ts';

export interface PwaPromptOptions {
    /** Card title */
    title?: string;
    /** Card message / description */
    message?: string;
    /** Install button text */
    confirmText?: string;
    /** Cancel / Later button text */
    cancelText?: string;
    /** Icon type */
    type?: 'info' | 'success' | 'warning' | 'danger';
    /** Auto‑show after this many milliseconds (default: 3000) */
    delay?: number;
    /** Show only after user engagement (scroll or dwell time)? */
    afterInteraction?: boolean;
    /** LocalStorage key for dismissal tracking */
    storageKey?: string;
    /** How many days before prompting again after dismissal (default: 14) */
    dismissDays?: number;
    /** Optional dialog options retained for backwards compatibility */
    dialogOptions?: Record<string, unknown>;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export class PwaInstallPrompt {
    readonly #options: Required<Omit<PwaPromptOptions, 'dialogOptions'>> & { dialogOptions: Record<string, unknown> };
    #deferredPrompt: BeforeInstallPromptEvent | null = null;
    #interactionDetected: boolean = false;
    #cardVisible: boolean = false;
    #cardEl: HTMLElement | null = null;
    #interactionHandler: (() => void) | null = null;
    #dwellTimeoutId: ReturnType<typeof setTimeout> | null = null;
    #previousFocusedElement: HTMLElement | null = null;

    constructor(options: PwaPromptOptions = {}) {
        this.#options = {
            title: options.title ?? 'Install SJCCC Academic Portal',
            message: options.message ?? 'Access the college prospectus, academic calendar, and campus handbook anytime — even without internet.',
            confirmText: options.confirmText ?? 'Install App',
            cancelText: options.cancelText ?? 'Later',
            type: options.type ?? 'info',
            delay: options.delay ?? 2500,
            afterInteraction: options.afterInteraction ?? true,
            storageKey: options.storageKey ?? STORAGE_KEYS.PWA_PROMPT,
            dismissDays: options.dismissDays ?? 14,
            dialogOptions: options.dialogOptions ?? {},
        };

        this.init();
    }

    async init(): Promise<void> {
        if (typeof window === 'undefined') return;

        // Do nothing if already running in standalone mode (already installed)
        if (this.#isStandalone()) {
            return;
        }

        // Capture the beforeinstallprompt event on supporting Chromium browsers
        window.addEventListener('beforeinstallprompt', async (e: Event) => {
            e.preventDefault();
            this.#deferredPrompt = e as BeforeInstallPromptEvent;

            if (!this.#isDismissedRecently()) {
                await this.#schedulePrompt();
            }
        });

        // Clear stored dismissal upon successful installation
        window.addEventListener('appinstalled', () => {
            this.#clearDismissal();
            this.hide();
            console.log('SJCCC PWA installed successfully');
        });

        // Listen for update notification to avoid concurrent floating cards
        window.addEventListener('sjccc-update-banner-visible', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.visible && this.#cardVisible) {
                this.hide();
            } else if (!detail?.visible && !this.#cardVisible && !this.#isDismissedRecently() && !this.#isStandalone()) {
                // When update notification is postponed, automatic installation card may become eligible again
                window.setTimeout(() => {
                    if (!this.#cardVisible && !document.getElementById('sw-update-banner') && !this.#isModalActive()) {
                        void this.trigger(false);
                    }
                }, 1500);
            }
        });

        // Set up engagement triggers if configured
        if (this.#options.afterInteraction) {
            this.#listenForEngagement();
        } else {
            this.#interactionDetected = true;
        }

        await this.handleManualTrigger();
    }

    #isModalActive(): boolean {
        if (typeof document === 'undefined') return false;
        const pastModal = document.getElementById('pastAnnouncementsModal');
        const isPastModalOpen = pastModal && !pastModal.hasAttribute('hidden') && pastModal.style.display !== 'none';
        const enquiryModal = document.getElementById('enquiryModal');
        const isEnquiryModalOpen = enquiryModal && (enquiryModal.classList.contains('is-active') || (!enquiryModal.hasAttribute('hidden') && enquiryModal.style.display !== 'none'));
        const hasOverlay = !!document.querySelector('.cd-overlay, .modal-overlay:not([hidden])');
        return Boolean(isPastModalOpen || isEnquiryModalOpen || hasOverlay);
    }

    /**
     * Binds manual install button triggers (e.g. #installApp in header or drawer)
     */
    async handleManualTrigger(): Promise<void> {
        if (typeof document === 'undefined') return;

        const manualButtons = document.querySelectorAll<HTMLElement>('#installApp, [data-install-app]');
        manualButtons.forEach((btn) => {
            btn.addEventListener('click', async (event: MouseEvent) => {
                event.preventDefault();
                await this.trigger(true);
            }, true);
        });
    }

    /**
     * Explicitly displays the installation card. If isManualTrigger is true,
     * it bypasses dismissal cooldowns and provides guidance if native prompt is unavailable.
     */
    async trigger(isManualTrigger: boolean = false): Promise<void> {
        if (this.#isStandalone()) {
            return;
        }

        if (this.#cardVisible) {
            this.#cardEl?.focus();
            return;
        }

        // Check for active update banner collision
        if (document.getElementById('sw-update-banner')) {
            return;
        }

        // Automatic prompt should not open over active modals
        if (!isManualTrigger && this.#isModalActive()) {
            return;
        }

        // If automatic and within cooldown, do not show
        if (!isManualTrigger && this.#isDismissedRecently()) {
            return;
        }

        this.#showCard(isManualTrigger);
    }

    /**
     * Removes and hides the installation card
     */
    hide(permanent: boolean = false): void {
        if (!this.#cardEl) return;

        this.#cardEl.classList.add('pwa-card--dismissing');
        window.setTimeout(() => {
            this.#cardEl?.remove();
            this.#cardEl = null;
            this.#cardVisible = false;

            // Return focus gracefully
            if (this.#previousFocusedElement && typeof this.#previousFocusedElement.focus === 'function') {
                this.#previousFocusedElement.focus();
                this.#previousFocusedElement = null;
            }
        }, 220);

        if (permanent) {
            this.#recordDismissal();
        }
    }

    /**
     * Cleans up all listeners and DOM references
     */
    destroy(): void {
        this.#removeEngagementListeners();
        if (this.#dwellTimeoutId) {
            clearTimeout(this.#dwellTimeoutId);
            this.#dwellTimeoutId = null;
        }
        this.hide(false);
    }

    #isStandalone(): boolean {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(display-mode: standalone)').matches ||
               (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    }

    #isDismissedRecently(): boolean {
        try {
            const raw = localStorage.getItem(this.#options.storageKey);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data.ts) return false;
            const expiry = data.ts + this.#options.dismissDays * 24 * 60 * 60 * 1000;
            return Date.now() < expiry;
        } catch {
            return false;
        }
    }

    #recordDismissal(): void {
        try {
            localStorage.setItem(this.#options.storageKey, JSON.stringify({
                ts: Date.now(),
                cooldownDays: this.#options.dismissDays,
                date: new Date().toISOString(),
            }));
        } catch (e) {
            console.warn('Unable to write PWA prompt dismissal to localStorage', e);
        }
    }

    #clearDismissal(): void {
        try {
            localStorage.removeItem(this.#options.storageKey);
        } catch (e) {
            console.warn('Unable to clear PWA prompt dismissal from localStorage', e);
        }
    }

    async #schedulePrompt(): Promise<void> {
        if (this.#cardVisible || this.#isStandalone()) return;

        const tryShow = async () => {
            if (this.#options.afterInteraction && !this.#interactionDetected) return;
            if (document.getElementById('sw-update-banner')) return;
            if (this.#isDismissedRecently()) return;
            await this.trigger(false);
        };

        if (this.#options.delay > 0) {
            window.setTimeout(tryShow, this.#options.delay);
        } else {
            await tryShow();
        }
    }

    #listenForEngagement(): void {
        const mark = async () => {
            if (!this.#interactionDetected) {
                this.#interactionDetected = true;
                this.#removeEngagementListeners();
                if (this.#deferredPrompt) {
                    await this.#schedulePrompt();
                }
            }
        };

        this.#interactionHandler = mark;

        // Engagement criteria: 25% scroll depth or 20s dwell time
        const checkScrollDepth = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight > 0 && (scrollTop / docHeight) >= 0.25) {
                mark();
            }
        };

        window.addEventListener('scroll', checkScrollDepth, { passive: true });

        // Dwell time fallback
        this.#dwellTimeoutId = setTimeout(() => {
            mark();
        }, 20_000);
    }

    #removeEngagementListeners(): void {
        if (this.#interactionHandler) {
            window.removeEventListener('scroll', this.#interactionHandler);
            this.#interactionHandler = null;
        }
        if (this.#dwellTimeoutId) {
            clearTimeout(this.#dwellTimeoutId);
            this.#dwellTimeoutId = null;
        }
    }

    #showCard(isManual: boolean): void {
        if (this.#cardVisible || document.getElementById('pwaInstallCard')) return;

        this.#previousFocusedElement = document.activeElement as HTMLElement | null;

        const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        const hasNativePrompt = !!this.#deferredPrompt;

        const card = document.createElement('aside');
        card.id = 'pwaInstallCard';
        card.className = 'pwa-install-card';
        card.setAttribute('role', 'region');
        card.setAttribute('aria-label', 'SJCCC Application Installation');
        card.setAttribute('aria-describedby', 'pwaCardDesc');
        card.tabIndex = -1;

        card.innerHTML = `
            <div class="pwa-card__header">
                <div class="pwa-card__identity">
                    <div class="pwa-card__crest" aria-hidden="true">SJCCC</div>
                    <div class="pwa-card__titles">
                        <span class="pwa-card__institution">SJCCC Mbengwi</span>
                        <h3 class="pwa-card__title">${this.#options.title}</h3>
                    </div>
                </div>
                <button type="button" class="pwa-card__close-btn" id="pwaCardCloseBtn" aria-label="Dismiss installation prompt for 14 days" title="Dismiss">
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>
            </div>

            <p class="pwa-card__desc" id="pwaCardDesc">${this.#options.message}</p>

            <div class="pwa-card__tags" aria-hidden="true">
                <span class="pwa-card__tag"><i class="bi bi-wifi-off"></i> Offline Access</span>
                <span class="pwa-card__tag"><i class="bi bi-calendar-check"></i> Academic Dates</span>
                <span class="pwa-card__tag"><i class="bi bi-file-earmark-pdf"></i> Prospectus</span>
            </div>

            <div class="pwa-card__actions">
                <button type="button" class="pwa-btn pwa-btn--primary" id="pwaCardInstallBtn">
                    <i class="bi bi-download" aria-hidden="true"></i>
                    <span class="pwa-btn-text">${this.#options.confirmText}</span>
                </button>
                <button type="button" class="pwa-btn pwa-btn--ghost" id="pwaCardDismissBtn">
                    ${this.#options.cancelText}
                </button>
            </div>

            <div id="pwaCardGuide" class="pwa-card__guide" style="display: none;" role="status"></div>
        `;

        document.body.appendChild(card);
        this.#cardEl = card;
        this.#cardVisible = true;

        // Apply physical LiquidGlass optical refraction and tactile ripple to the install card
        LiquidGlassAdapter.enhancePopup(card);

        const installBtn = card.querySelector<HTMLButtonElement>('#pwaCardInstallBtn');
        const dismissBtn = card.querySelector<HTMLButtonElement>('#pwaCardDismissBtn');
        const closeBtn = card.querySelector<HTMLButtonElement>('#pwaCardCloseBtn');
        const guideEl = card.querySelector<HTMLElement>('#pwaCardGuide');

        // Close and Dismiss handlers
        const dismissAction = () => {
            this.#recordDismissal();
            this.hide();
        };

        closeBtn?.addEventListener('click', dismissAction);
        dismissBtn?.addEventListener('click', dismissAction);

        // Keyboard navigation: Escape key closes card
        card.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                dismissAction();
            }
        });

        // Install button handler
        installBtn?.addEventListener('click', async () => {
            if (hasNativePrompt && this.#deferredPrompt) {
                installBtn.disabled = true;
                const promptEvent = this.#deferredPrompt;
                this.#deferredPrompt = null;

                try {
                    await promptEvent.prompt();
                    const choice = await Promise.race([
                        promptEvent.userChoice,
                        new Promise<{ outcome: string }>((res) => setTimeout(() => res({ outcome: 'dismissed' }), 10000)),
                    ]);

                    if (choice?.outcome === 'accepted') {
                        this.#clearDismissal();
                        this.hide();
                    } else {
                        this.#recordDismissal();
                        this.hide();
                    }
                } catch (err) {
                    console.error('Error triggering native PWA prompt:', err);
                    this.hide();
                }
            } else if (isIOS) {
                // Show platform-accurate iOS Add to Home Screen instructions
                if (guideEl) {
                    guideEl.style.display = 'block';
                    guideEl.innerHTML = `
                        <strong>Install on iPhone / iPad:</strong>
                        <ol class="pwa-card__guide-steps">
                            <li>Tap the <strong>Share</strong> button <i class="bi bi-box-arrow-up"></i> in Safari's bottom toolbar.</li>
                            <li>Scroll down and tap <strong>Add to Home Screen</strong> <i class="bi bi-plus-square"></i>.</li>
                            <li>Tap <strong>Add</strong> in the top right to install.</li>
                        </ol>
                    `;
                    installBtn.style.display = 'none';
                }
            } else {
                // Other browsers without native prompt
                if (guideEl) {
                    guideEl.style.display = 'block';
                    guideEl.innerHTML = `
                        To install this app on your device, open your browser menu (<i class="bi bi-three-dots-vertical"></i> or <i class="bi bi-gear"></i>) and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                    `;
                    installBtn.style.display = 'none';
                }
            }
        });

        // If manual trigger on iOS and no native prompt, display the instructions immediately
        if (isManual && !hasNativePrompt && isIOS && guideEl) {
            guideEl.style.display = 'block';
            guideEl.innerHTML = `
                <strong>Install on iPhone / iPad:</strong>
                <ol class="pwa-card__guide-steps">
                    <li>Tap the <strong>Share</strong> button <i class="bi bi-box-arrow-up"></i> in Safari's bottom toolbar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong> <i class="bi bi-plus-square"></i>.</li>
                    <li>Tap <strong>Add</strong> in the top right to install.</li>
                </ol>
            `;
            if (installBtn) installBtn.style.display = 'none';
        }
    }
}
