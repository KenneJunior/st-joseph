/**
 * ============================================================================
 * SJCCC – ConfirmDialog & Glass Modal System
 * Standalone, Promise-based liquid glass modal dialog controller
 * ============================================================================
 */

// ─── Stylesheet import ───────────────────────────────────────────────────

import '../../css/components/dialog.css';
import { motionSuspension } from '../../core/physics/MotionSuspension.ts';

// ─── Type definitions ──────────────────────────────────────────────────────

/**
 * Supported dialog severity levels and visual themes.
 */
export type DialogType = 'danger' | 'warning' | 'info' | 'success';

/**
 * Options for configuring an individual `ConfirmDialog` instance display.
 */
export interface DialogOptions {
    /** The main title heading displayed at the top of the dialog. */
    title?: string;
    /** Primary body message or description. */
    message?: string;
    /** Optional secondary code/monospace or diagnostic details block. */
    detail?: string;
    /** Visual theme type influencing accent colors and icons. */
    type?: DialogType;
    /** Label text for the primary action button. Defaults to 'Confirm'. */
    confirmText?: string;
    /** Label text for the secondary/dismiss action button. Defaults to 'Cancel'. */
    cancelText?: string;
    /** Whether to display the cancel button. Defaults to `true`. */
    showCancel?: boolean;
    /** Whether to show a close (X) button in the top-right corner. Defaults to `false`. */
    showClose?: boolean;
    /** Prevent backdrop clicks and the `Escape` key from closing the dialog. */
    persist?: boolean;
    /** Auto-resolve time limit in milliseconds. */
    timeoutMs?: number;
    /** Resolution state on timeout expiry: `true` to auto-confirm, `false` to auto-cancel. */
    timeoutConfirm?: boolean;
    /** Displays a visual loading spinner on the confirm button and disables interactions. */
    loading?: boolean;
    /** Pre-close hook allowing cancellation or async verification. Return `false` to abort closing. */
    beforeClose?: (result: boolean) => boolean | Promise<boolean>;
    /** Lifecycle hook executed when the dialog entrance animation completes. */
    onOpen?: () => void;
    /** Lifecycle hook executed after the exit animation completes. */
    onClose?: (result: boolean) => void;
    /** Legacy callback executed upon user confirmation. */
    onConfirm?: () => void;
    /** Legacy callback executed upon user cancellation. */
    onCancel?: () => void;
    /** Custom render interceptor for advanced template modification. */
    render?: (defaultTemplate: string) => string;
}

/**
 * Internal configuration mapping visual tokens per dialog type.
 */
interface TypeConfig {
    accent: string;
    accentFocus: string;
    iconBg: string;
    iconColor: string;
    icon: string;
    stripColor: string;
}

/**
 * Global default options applied across all dialogs managed by an instance.
 */
export interface GlobalOptions {
    /** Default title when none is provided in `DialogOptions`. */
    defaultTitle?: string;
    /** Default message when none is provided in `DialogOptions`. */
    defaultMessage?: string;
    /** Default confirm button label. */
    defaultConfirmText?: string;
    /** Default cancel button label. */
    defaultCancelText?: string;
    /** Default dialog theme type. */
    defaultType?: DialogType;
    /** Base `z-index` depth for overlay rendering. */
    zIndex?: number;
    /** Animation transition duration in milliseconds. */
    transitionDuration?: number;
    /** Applies CSS backdrop blur filter to the backdrop overlay. */
    blurBackdrop?: boolean;
    /** Font family cascade override for the modal instance. */
    fontFamily?: string;
}

const TYPE_MAP: Record<DialogType, TypeConfig> = {
    danger: {
        accent: '#ef4444', accentFocus: 'rgba(239,68,68,0.35)',
        iconBg: 'rgba(239,68,68,0.12)', iconColor: '#ef4444',
        icon: 'bi bi-bug', stripColor: '#ef4444',
    },
    warning: {
        accent: '#f59e0b', accentFocus: 'rgba(245,158,11,0.35)',
        iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b',
        icon: 'bi bi-exclamation-triangle', stripColor: '#f59e0b',
    },
    info: {
        accent: '#c9a229', accentFocus: 'rgba(201,162,41,0.35)',
        iconBg: 'rgba(201,162,41,0.15)', iconColor: '#c9a229',
        icon: 'bi bi-info-circle', stripColor: '#c9a229',
    },
    success: {
        accent: '#10b981', accentFocus: 'rgba(16,185,129,0.35)',
        iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981',
        icon: 'bi bi-check-circle', stripColor: '#10b981',
    },
};

// ─── ConfirmDialog class ───────────────────────────────────────────────────

export class ConfirmDialog {
    #cfg: Required<GlobalOptions>;
    #overlay: HTMLElement | null = null;
    #card: HTMLElement | null = null;
    #progressBar: HTMLElement | null = null;
    #confirmBtn: HTMLButtonElement | null = null;
    //@ts-ignore
    #closeBtn: HTMLButtonElement | null = null;

    #isOpen = false;
    #lastOpts: MergedDialogOptions | null = null;

    #resolve: ((v: boolean) => void) | null = null;
    #reject: ((e: Error) => void) | null = null;

    #abortController: AbortController | null = null;
    #originalActiveElement: Element | null = null;

    #timeoutId: ReturnType<typeof setTimeout> | null = null;
    #remainingMs: number | null = null;
    #pauseStart: number | null = null;

    #liveRegion: HTMLElement | null = null;

    constructor(globalOptions: GlobalOptions = {}) {
        this.#cfg = {
            defaultTitle: globalOptions.defaultTitle ?? 'Confirm',
            defaultMessage: globalOptions.defaultMessage ?? 'Are you sure?',
            defaultConfirmText: globalOptions.defaultConfirmText ?? 'Confirm',
            defaultCancelText: globalOptions.defaultCancelText ?? 'Cancel',
            defaultType: globalOptions.defaultType ?? 'info',
            zIndex: globalOptions.zIndex ?? 6000,
            transitionDuration: globalOptions.transitionDuration ?? 220,
            blurBackdrop: globalOptions.blurBackdrop ?? true,
            fontFamily: globalOptions.fontFamily ?? '',
        };
    }

    show(options: DialogOptions = {}): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (this.#isOpen && this.#resolve) this.#resolve(false);

            this.#resolve = resolve;
            this.#reject = reject;

            const opts = this.#mergeOptions(options);

            if (this.#overlay && this.#card) {
                this.#clearTimeouts();
                this.#cleanupEvents();
                this.#updateCard(opts);
                this.#attachEvents(opts);
                this.#setupTimeout(opts);
                this.#focusFirst();
                return;
            }

            this.#buildDialog(opts);
            this.#attachEvents(opts);
            this.#open(opts);
            this.#setupTimeout(opts);
            this.#focusFirst();
            this.#announce(opts.title);
        });
    }

    update(partial: Partial<Pick<DialogOptions, 'title'|'message'|'detail'|'timeoutMs'|'loading'>>): boolean {
        if (!this.#isOpen || !this.#card || !this.#lastOpts) return false;
        const merged = { ...this.#lastOpts, ...partial };
        this.#lastOpts = merged;
        this.#updateCard(merged);
        if (partial.timeoutMs !== undefined) {
            this.#clearTimeouts();
            this.#setupTimeout(merged);
        }
        if (partial.loading !== undefined) {
            this.#setLoading(merged.loading ?? false);
        }
        this.#announce(merged.title);
        return true;
    }

    async close(result: boolean = true): Promise<void> {
        if (!this.#isOpen) return;

        const opts = this.#lastOpts;
        this.#lastOpts = opts;
        if (opts?.beforeClose) {
            const allow = await opts.beforeClose(result);
            if (!allow) return;
        }

        this.#clearTimeouts();
        this.#isOpen = false;
        motionSuspension.resumeAll('modal');
        this.#cleanupEvents();
        this.#animateClose();

        const resolve = this.#resolve;
        const onClose = opts?.onClose;

        this.#resolve = null;
        this.#reject = null;

        setTimeout(() => {
            resolve?.(result);
            onClose?.(result);
            if (result && opts?.onConfirm) opts.onConfirm();
            if (!result && opts?.onCancel) opts.onCancel();
            (this.#originalActiveElement as HTMLElement)?.focus();
            this.#originalActiveElement = null;
        }, this.#cfg.transitionDuration);
    }

    destroy(): void {
        this.#clearTimeouts();
        this.#cleanupEvents();
        this.#reject?.(new Error('ConfirmDialog destroyed'));
        this.#resolve = null;
        this.#reject = null;
        this.#overlay?.remove();
        this.#liveRegion?.remove();
        this.#overlay = null;
        this.#card = null;
        this.#liveRegion = null;
        this.#isOpen = false;
    }

    get isOpen(): boolean {
        return this.#isOpen;
    }

    static async alert(messageOrOptions: string | DialogOptions = {}): Promise<void> {
        const opts = typeof messageOrOptions === 'string'
            ? { message: messageOrOptions }
            : messageOrOptions;
        await getConfirmDialog().show({ ...opts, showCancel: false, confirmText: 'OK', type: 'info' });
    }

    #mergeOptions(raw: DialogOptions): MergedDialogOptions {
        const type = raw.type ?? this.#cfg.defaultType;
        const tc = TYPE_MAP[type] ?? TYPE_MAP.info;
        return {
            title: raw.title ?? this.#cfg.defaultTitle,
            message: raw.message ?? this.#cfg.defaultMessage,
            detail: raw.detail ?? null,
            type,
            confirmText: raw.confirmText ?? this.#cfg.defaultConfirmText,
            cancelText: raw.cancelText ?? this.#cfg.defaultCancelText,
            showCancel: raw.showCancel ?? true,
            showClose: raw.showClose ?? false,
            persist: raw.persist ?? false,
            timeoutMs: raw.timeoutMs ?? null,
            timeoutConfirm: raw.timeoutConfirm ?? true,
            loading: raw.loading ?? false,
            beforeClose: raw.beforeClose ?? null,
            onOpen: raw.onOpen ?? null,
            onClose: raw.onClose ?? null,
            onConfirm: raw.onConfirm ?? null,
            onCancel: raw.onCancel ?? null,
            render: raw.render ?? null,
            ...tc,
        };
    }

    #buildDialog(opts: MergedDialogOptions): void {
        if (!this.#liveRegion) {
            this.#liveRegion = document.createElement('div');
            this.#liveRegion.setAttribute('aria-live', 'assertive');
            this.#liveRegion.setAttribute('aria-atomic', 'true');
            Object.assign(this.#liveRegion.style, {
                position: 'absolute', width: '1px', height: '1px',
                overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
            });
            document.body.appendChild(this.#liveRegion);
        }

        this.#overlay = document.createElement('div');
        this.#overlay.className = 'cd-overlay';
        if (this.#cfg.blurBackdrop) this.#overlay.classList.add('cd-blur');
        this.#overlay.setAttribute('role', 'dialog');
        this.#overlay.setAttribute('aria-modal', 'true');
        this.#overlay.setAttribute('aria-labelledby', 'cd-title');
        this.#overlay.setAttribute('aria-describedby', 'cd-message');
        this.#overlay.style.setProperty('--cd-z', String(this.#cfg.zIndex));
        this.#overlay.style.setProperty('--cd-dur', `${this.#cfg.transitionDuration}ms`);
        if (this.#cfg.fontFamily) {
            this.#overlay.style.setProperty('--cd-font', this.#cfg.fontFamily);
        }

        const ambient = document.createElement('div');
        ambient.className = 'cd-ambient-light';
        this.#overlay.appendChild(ambient);

        this.#card = document.createElement('div');
        this.#card.className = 'cd-card';

        this.#updateCard(opts);
        this.#overlay.appendChild(this.#card);
        document.body.appendChild(this.#overlay);
    }

    #updateCard(opts: MergedDialogOptions): void {
        if (!this.#card) return;

        this.#card.style.setProperty('--cd-accent', opts.accent);
        this.#card.style.setProperty('--cd-accent-focus', opts.accentFocus);

        const detailHtml = opts.detail
            ? `<p class="cd-detail">${this.#escape(opts.detail)}</p>`
            : '';

        const progressHtml = opts.timeoutMs
            ? `<div class="cd-progress-wrap">
           <div class="cd-progress-track">
             <div class="cd-progress-bar" id="cd-progress"></div>
           </div>
         </div>`
            : '';

        const closeBtnHtml = opts.showClose
            ? `<button class="cd-close-btn" data-action="close" aria-label="Close">✕</button>`
            : '';

        const cancelHtml = opts.showCancel
            ? `<button class="cd-btn cd-btn-cancel" data-action="cancel" aria-label="${this.#escape(opts.cancelText)}">
             ${this.#escape(opts.cancelText)}
           </button>`
            : '';

        let template = `
      <div class="cd-card-glow"></div>
      <div class="cd-content-wrapper">
        <div class="cd-strip"></div>
        ${closeBtnHtml}
        <div class="cd-body">
          <div class="cd-icon-wrap">
            <i class="cd-icon ${opts.icon}" style="background:${opts.iconBg};color:${opts.iconColor};" aria-hidden="true"></i>
            <h3 class="cd-title" id="cd-title">${this.#escape(opts.title)}</h3>
          </div>
          <p class="cd-message" id="cd-message">${this.#escape(opts.message)}</p>
          ${detailHtml}
        </div>
        ${progressHtml}
        <div class="cd-actions">
          ${cancelHtml}
          <button class="cd-btn cd-btn-confirm" data-action="confirm" aria-label="${this.#escape(opts.confirmText)}">
            <span class="cd-btn-text">${this.#escape(opts.confirmText)}</span>
            <span class="cd-btn-spinner" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    `;

        if (opts.render) {
            template = opts.render(template);
        }

        this.#card.innerHTML = template;

        this.#progressBar = this.#card.querySelector('#cd-progress');
        this.#confirmBtn = this.#card.querySelector('[data-action="confirm"]');
        this.#closeBtn = this.#card.querySelector('[data-action="close"]');

        if (opts.loading) this.#setLoading(true);
        else this.#setLoading(false);
    }

    #open(opts: MergedDialogOptions): void {
        this.#isOpen = true;
        this.#originalActiveElement = document.activeElement;
        void this.#overlay!.offsetHeight;
        this.#overlay!.classList.add('cd-visible');
        this.#card!.classList.add('cd-visible');
        motionSuspension.suspendAll('modal');
        opts.onOpen?.();
    }

    #animateClose(): void {
        this.#overlay?.classList.remove('cd-visible');
        this.#card?.classList.remove('cd-visible');
        const overlay = this.#overlay;
        setTimeout(() => overlay?.remove(), this.#cfg.transitionDuration);
        this.#overlay = null;
        this.#card = null;
    }

    #attachEvents(opts: MergedDialogOptions): void {
        const controller = new AbortController();
        this.#abortController = controller;
        const signal = controller.signal;

        this.#card?.addEventListener('click', this.#onCardClick, { signal });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !opts.persist) {
                e.stopPropagation();
                this.close(false);
            }
        }, { signal });

        this.#overlay?.addEventListener('click', (e) => {
            if (e.target === this.#overlay && !opts.persist) {
                this.close(false);
            }
        }, { signal });

        this.#card?.addEventListener('keydown', this.#focusTrap, { signal });
        this.#card?.addEventListener('mouseenter', this.#pauseTimeout, { signal });
        this.#card?.addEventListener('mouseleave', this.#resumeTimeout, { signal });
    }

    #cleanupEvents(): void {
        this.#abortController?.abort();
        this.#abortController = null;
    }

    readonly #onCardClick = (e: MouseEvent): void => {
        const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!action) return;
        e.stopPropagation();
        switch (action.dataset.action) {
            case 'confirm': this.close(true); break;
            case 'cancel': this.close(false); break;
            case 'close': this.close(false); break;
        }
    };

    #focusTrap = (e: KeyboardEvent): void => {
        if (e.key !== 'Tab') return;
        const sel = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const nodes = [...this.#card!.querySelectorAll<HTMLElement>(sel)];
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };

    #setupTimeout(opts: MergedDialogOptions): void {
        if (!opts.timeoutMs) return;
        this.#remainingMs = opts.timeoutMs;
        this.#setProgress(100);
        this.#startCountdown(opts);
    }

    #startCountdown(opts: MergedDialogOptions): void {
        if (this.#timeoutId !== null) {
            clearInterval(this.#timeoutId);
            this.#timeoutId = null;
        }
        const step = 50;
        this.#timeoutId = setInterval(async () => {
            if (this.#remainingMs === null) return;
            this.#remainingMs -= step;
            if (this.#remainingMs <= 0) {
                this.#setProgress(0);
                this.#clearTimeouts();
                await this.close(opts.timeoutConfirm);
                return;
            }
            this.#setProgress((this.#remainingMs / opts.timeoutMs!) * 100);
        }, step);
    }

    #pauseTimeout = (): void => {
        if (this.#timeoutId) {
            clearInterval(this.#timeoutId);
            this.#timeoutId = null;
            this.#pauseStart = Date.now();
        }
    };

    #resumeTimeout = (): void => {
        if (this.#remainingMs !== null && this.#pauseStart) {
            const pausedDuration = Date.now() - this.#pauseStart;
            this.#remainingMs = Math.max(0, this.#remainingMs - pausedDuration);
            this.#pauseStart = null;
            this.#startCountdown({ timeoutMs: this.#remainingMs } as MergedDialogOptions);
        }
    };

    #clearTimeouts(): void {
        if (this.#timeoutId) {
            clearInterval(this.#timeoutId);
            this.#timeoutId = null;
        }
        this.#remainingMs = null;
        this.#pauseStart = null;
    }

    #setProgress(percent: number): void {
        if (!this.#progressBar) return;
        this.#progressBar.style.width = `${percent}%`;
    }

    #setLoading(loading: boolean): void {
        if (!this.#confirmBtn) return;
        const spinner = this.#confirmBtn.querySelector<HTMLElement>('.cd-btn-spinner');
        if (!spinner) return;
        const text = this.#confirmBtn.querySelector<HTMLElement>('.cd-btn-text');
        if (loading) {
            this.#confirmBtn.disabled = true;
            spinner.style.display = 'inline-block';
            if (text) text.style.opacity = '0.5';
        } else {
            this.#confirmBtn.disabled = false;
            spinner.style.display = 'none';
            if (text) text.style.opacity = '1';
        }
    }

    #focusFirst(): void {
        requestAnimationFrame(() => {
            (this.#confirmBtn ?? this.#card?.querySelector('button'))?.focus();
        });
    }

    #announce(text: string): void {
        if (!this.#liveRegion) return;
        this.#liveRegion.textContent = '';
        requestAnimationFrame(() => { this.#liveRegion!.textContent = text; });
    }

    #escape(str: string): string {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    }
}

interface MergedDialogOptions extends Required<Omit<DialogOptions, 'detail'|'timeoutMs'|'timeoutConfirm'|'beforeClose'|'onOpen'|'onClose'|'onConfirm'|'onCancel'|'render'>>, TypeConfig {
    detail: string | null;
    timeoutMs: number | null;
    timeoutConfirm: boolean;
    beforeClose: ((result: boolean) => boolean | Promise<boolean>) | null;
    onOpen: (() => void) | null;
    onClose: ((result: boolean) => void) | null;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
    render: ((template: string) => string) | null;
}

let instance: ConfirmDialog | null = null;

export function getConfirmDialog(options?: GlobalOptions): ConfirmDialog {
    if (options) {
        instance?.destroy();
        instance = new ConfirmDialog(options);
    }
    if (!instance) instance = new ConfirmDialog();
    return instance;
}

export async function confirm(messageOrOptions: string | DialogOptions = {}): Promise<boolean> {
    const opts = typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;
    return getConfirmDialog().show(opts);
}

export async function alert(messageOrOptions: string | DialogOptions = {}): Promise<void> {
    return ConfirmDialog.alert(messageOrOptions);
}

export default ConfirmDialog;
