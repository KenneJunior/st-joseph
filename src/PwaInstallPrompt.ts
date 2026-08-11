/* ==========================================================================
   PwaInstallPrompt — Uses ConfirmDialog to offer PWA installation
   ========================================================================== */

import { ConfirmDialog, getConfirmDialog, type DialogOptions } from './DialogBox.ts'; // adjust path

export interface PwaPromptOptions {
    /** Dialog title */
    title?: string;
    /** Dialog message */
    message?: string;
    /** Confirm button text */
    confirmText?: string;
    /** Cancel button text */
    cancelText?: string;
    /** Icon type (maps to ConfirmDialog types) */
    type?: 'info' | 'success' | 'warning' | 'danger';
    /** Auto‑show after this many milliseconds (default: 3000) */
    delay?: number;
    /** Show only after the user has interacted with the page (click, scroll, etc.)? */
    afterInteraction?: boolean;
    /** LocalStorage key for dismissal tracking (default: 'pwa-install-prompt') */
    storageKey?: string;
    /** How many days before prompting again after dismissal (default: 7) */
    dismissDays?: number;
    /** Additional ConfirmDialog options to merge */
    dialogOptions?: Partial<DialogOptions>;
}

export class PwaInstallPrompt {
    #options: Required<PwaPromptOptions>;
    #deferredPrompt: any = null;               // the beforeinstallprompt event
    #interactionDetected: boolean = false;
    #dialogShown: boolean = false;
    #confirmDialog: ConfirmDialog;

    constructor(options: PwaPromptOptions = {}) {
        this.#options = {
            title: options.title ?? 'Add to Home Screen',
            message: options.message ?? 'Install this app on your device for quick access and a better experience.',
            confirmText: options.confirmText ?? 'Install',
            cancelText: options.cancelText ?? 'Not now',
            type: options.type ?? 'info',
            delay: options.delay ?? 3000,
            afterInteraction: options.afterInteraction ?? true,
            storageKey: options.storageKey ?? 'pwa-install-prompt',
            dismissDays: options.dismissDays ?? 7,
            dialogOptions: options.dialogOptions ?? {},
        };

        this.#confirmDialog = getConfirmDialog();  // reuse singleton or create new? Use singleton.
    this.init();
    }

    /** Start listening for the install prompt and schedule display. */
    init(): void {
        // Do nothing if already installed (standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Check if user previously dismissed the prompt
        if (this.#isDismissedRecently()) {
            return;
        }

        // Capture the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e: Event) => {
            e.preventDefault();                          // block the default mini‑infobar
            this.#deferredPrompt = e;

            // Schedule the custom dialog
            this.#schedulePrompt();
        });

        // Also handle appinstalled event to clear any stored dismissal
        window.addEventListener('appinstalled', () => {
            this.#clearDismissal();
            console.log('PWA installed successfully');
        });

        // Optional: interaction detection
        if (this.#options.afterInteraction) {
            this.#listenForInteraction();
        } else {
            this.#interactionDetected = true;           // skip interaction check
        }
    }

    /** Manually trigger the install prompt (if available and not previously shown). */
    async trigger(): Promise<void> {
        if (this.#dialogShown) return;
        await this.#showInstallDialog();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    #schedulePrompt(): void {
        if (this.#dialogShown || !this.#deferredPrompt) return;

        const tryShow = () => {
            if (this.#options.afterInteraction && !this.#interactionDetected) return;
            this.#showInstallDialog();
        };

        if (this.#options.delay > 0) {
            setTimeout(tryShow, this.#options.delay);
        } else {
            tryShow();
        }
    }

    async #showInstallDialog(): Promise<void> {
        if (this.#dialogShown) return;
        this.#dialogShown = true;

        const result = await this.#confirmDialog.show({
            title: this.#options.title,
            message: this.#options.message,
            confirmText: this.#options.confirmText,
            cancelText: this.#options.cancelText,
            showCancel: true,
            type: this.#options.type,
            persist: true, // prevent accidental backdrop close
            ...this.#options.dialogOptions,
        });

        if (result) {
            await this.#handleInstall();
        } else {
            this.#recordDismissal();
        }
        this.#dialogShown = false;                    // allow re‑triggering later if needed
    }

    async #handleInstall(): Promise<void> {
        if (!this.#deferredPrompt) return;

        this.#deferredPrompt.prompt();
        const choice = await this.#deferredPrompt.userChoice;

        if (choice.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            this.#clearDismissal();                    // remove any dismissal record
        } else {
            console.log('User dismissed the native install prompt');
            this.#recordDismissal();
        }

        this.#deferredPrompt = null;
    }

    // ── LocalStorage helpers ────────────────────────────────────────────────

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
            localStorage.setItem(this.#options.storageKey, JSON.stringify({ ts: Date.now() }));
        } catch (e) {
            console.warn('Unable to write to localStorage', e);
        }
    }

    #clearDismissal(): void {
        try {
            localStorage.removeItem(this.#options.storageKey);
        } catch (e) {
            console.warn('Unable to clear localStorage', e);
        }
    }

    // ── Interaction detection ────────────────────────────────────────────────

    #listenForInteraction(): void {
        const mark = () => {
            if (!this.#interactionDetected) {
                this.#interactionDetected = true;
                this.#removeInteractionListeners();
                // If we already have the deferred prompt waiting, try showing it now
                if (this.#deferredPrompt) {
                    this.#schedulePrompt();
                }
            }
        };

        this.#interactionHandler = mark;
        const opts = { once: true, passive: true };
        document.addEventListener('click', mark, opts);
        document.addEventListener('scroll', mark, opts);
        document.addEventListener('keydown', mark, opts);
        // touchstart for mobile
        document.addEventListener('touchstart', mark, opts);
    }

    #removeInteractionListeners(): void {
        if (!this.#interactionHandler) return;
        document.removeEventListener('click', this.#interactionHandler);
        document.removeEventListener('scroll', this.#interactionHandler);
        document.removeEventListener('keydown', this.#interactionHandler);
        document.removeEventListener('touchstart', this.#interactionHandler);
    }

    #interactionHandler: (() => void) | null = null;
}