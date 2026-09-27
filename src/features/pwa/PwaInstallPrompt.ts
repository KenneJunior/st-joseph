/**
 * ============================================================================
 * SJCCC – PWA Install Prompt Controller
 * Handles deferred browser install prompts, user interaction detection,
 * persistence cooldowns in localStorage, and glass confirm dialog integration
 * ============================================================================
 */

import { ConfirmDialog, getConfirmDialog, type DialogOptions } from '../../ui/dialog/ConfirmDialog.ts';
import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';

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
    /** Show only after the user has interacted with the page? */
    afterInteraction?: boolean;
    /** LocalStorage key for dismissal tracking */
    storageKey?: string;
    /** How many days before prompting again after dismissal */
    dismissDays?: number;
    /** Additional ConfirmDialog options to merge */
    dialogOptions?: Partial<DialogOptions>;
}

export class PwaInstallPrompt {
    #options: Required<PwaPromptOptions>;
    #deferredPrompt: any = null;
    #interactionDetected: boolean = false;
    #dialogShown: boolean = false;
    #confirmDialog: ConfirmDialog;
    #interactionHandler: (() => void) | null = null;

    constructor(options: PwaPromptOptions = {}) {
        this.#options = {
            title: options.title ?? 'Add to Home Screen',
            message: options.message ?? 'Install this app on your device for quick access and a better experience.',
            confirmText: options.confirmText ?? 'Install',
            cancelText: options.cancelText ?? 'Not now',
            type: options.type ?? 'info',
            delay: options.delay ?? 3000,
            afterInteraction: options.afterInteraction ?? true,
            storageKey: options.storageKey ?? STORAGE_KEYS.PWA_PROMPT,
            dismissDays: options.dismissDays ?? 7,
            dialogOptions: options.dialogOptions ?? {},
        };

        this.#confirmDialog = getConfirmDialog();
        this.init();
    }

    async init(): Promise<void> {
        // Do nothing if already installed (standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Check if user previously dismissed the prompt
        if (this.#isDismissedRecently()) {
            return;
        }

        // Capture the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', async (e: Event) => {
            e.preventDefault();
            this.#deferredPrompt = e;
            await this.#schedulePrompt();
        });

        // Clear stored dismissal upon successful installation
        window.addEventListener('appinstalled', () => {
            this.#clearDismissal();
            console.log('PWA installed successfully');
        });

        if (this.#options.afterInteraction) {
            this.#listenForInteraction();
        } else {
            this.#interactionDetected = true;
        }

        await this.HandleManualTrigger();
    }

    async HandleManualTrigger(): Promise<void> {
        const installAppButton = document.getElementById('installApp') as HTMLAnchorElement | null;
        if (installAppButton) {
            installAppButton.addEventListener('click', async (event: MouseEvent) => {
                event.preventDefault();
                await this.trigger();
            }, true);
        }
    }

    async trigger(): Promise<void> {
        if (this.#dialogShown) return;
        if (!this.#deferredPrompt) {
            console.warn('PWA install prompt unavailable: beforeinstallprompt has not fired.');
            return;
        }
        await this.#showInstallDialog();
    }

    async #schedulePrompt(): Promise<void> {
        if (this.#dialogShown || !this.#deferredPrompt) return;

        const tryShow = async () => {
            if (this.#options.afterInteraction && !this.#interactionDetected) return;
            await this.#showInstallDialog();
        };

        if (this.#options.delay > 0) {
            setTimeout(tryShow, this.#options.delay);
        } else {
            await tryShow();
        }
    }

    async #showInstallDialog(): Promise<void> {
        if (this.#dialogShown || !this.#deferredPrompt) return;
        this.#dialogShown = true;

        await this.#confirmDialog.show({
            title: this.#options.title,
            message: this.#options.message,
            confirmText: this.#options.confirmText,
            cancelText: this.#options.cancelText,
            showCancel: true,
            type: this.#options.type,
            persist: false,

            // Bypass click prevention by using pointerdown directly
            onOpen: () => {
                const confirmBtn = document.querySelector<HTMLButtonElement>('.cd-btn-confirm');
                if (!confirmBtn) return;

                confirmBtn.addEventListener('pointerdown', () => {
                    if (this.#deferredPrompt) {
                        try {
                            this.#deferredPrompt.prompt();
                        } catch (err) {
                            console.error('Failed to trigger native PWA prompt:', err);
                        }
                    }
                }, { capture: true, once: true });
            },

            // Synchronous true return prevents custom modal from freezing
            beforeClose: (isConfirm) => {
                if (isConfirm) {
                    this.#handleInstallResult();
                } else {
                    this.#recordDismissal();
                }
                return true;
            },
            ...this.#options.dialogOptions,
        });

        this.#dialogShown = false;
    }

    async #handleInstallResult(): Promise<void> {
        const promptEvent = this.#deferredPrompt;
        this.#deferredPrompt = null;

        if (!promptEvent) return;

        try {
            const choice = await Promise.race([
                promptEvent.userChoice,
                new Promise<{ outcome: string }>((res) => setTimeout(() => res({ outcome: 'dismissed' }), 10000)),
            ]);

            if (choice?.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.#clearDismissal();
            } else {
                console.log('User dismissed the native install prompt');
                this.#recordDismissal();
            }
        } catch (err) {
            console.error('Error resolving PWA install prompt:', err);
            this.#recordDismissal();
        }
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
                day: new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date()),
                time: new Date().toLocaleTimeString(),
            }));
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

    #listenForInteraction(): void {
        const mark = async () => {
            if (!this.#interactionDetected) {
                this.#interactionDetected = true;
                this.#removeInteractionListeners();
                if (this.#deferredPrompt) {
                    await this.#schedulePrompt();
                }
            }
        };

        this.#interactionHandler = mark;
        const opts = { once: true, passive: true };
        document.addEventListener('click', mark, opts);
        document.addEventListener('scroll', mark, opts);
        document.addEventListener('keydown', mark, opts);
        document.addEventListener('touchstart', mark, opts);
    }

    #removeInteractionListeners(): void {
        if (!this.#interactionHandler) return;
        document.removeEventListener('click', this.#interactionHandler);
        document.removeEventListener('scroll', this.#interactionHandler);
        document.removeEventListener('keydown', this.#interactionHandler);
        document.removeEventListener('touchstart', this.#interactionHandler);
    }
}
