/* ==========================================================================
   ConfirmDialog v3 —  Promise‑based Modal · TypeScript
   ========================================================================== */

// ─── Type definitions ──────────────────────────────────────────────────────

export type DialogType = 'danger' | 'warning' | 'info' | 'success';

export interface DialogOptions {
    title?: string;
    message?: string;
    detail?: string;
    type?: DialogType;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    showClose?: boolean;                 // show a close (X) button in the top-right
    persist?: boolean;                   // prevent backdrop/Escape from closing
    timeoutMs?: number;                  // auto‑resolve after N ms
    timeoutConfirm?: boolean;            // true = auto‑confirm, false = auto‑cancel
    loading?: boolean;                   // show a spinner on the confirm button
    beforeClose?: (result: boolean) => boolean | Promise<boolean>; // cancelable close
    onOpen?: () => void;
    onClose?: (result: boolean) => void; // after animation
    onConfirm?: () => void;              // shorthand, legacy
    onCancel?: () => void;               // shorthand, legacy
    // Custom render hooks (advanced)
    render?: (defaultTemplate: string) => string;
}

interface TypeConfig {
    accent: string;
    accentFocus: string;
    iconBg: string;
    iconColor: string;
    icon: string;
    stripColor: string;
}

interface GlobalOptions {
    defaultTitle?: string;
    defaultMessage?: string;
    defaultConfirmText?: string;
    defaultCancelText?: string;
    defaultType?: DialogType;
    zIndex?: number;
    transitionDuration?: number;
    blurBackdrop?: boolean;
    fontFamily?: string;
}

// ─── CSS helpers ───────────────────────────────────────────────────────────

const STYLE_ID = 'cd-styles';
const DIALOG_CSS = `/* ==========================================================================
   ConfirmDialog — Premium Modern Stylesheet
   ========================================================================== */

/* ─── Layout ─────────────────────────────────── */
.cd-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: var(--cd-z, 9999);
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  transition: 
    background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    backdrop-filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cd-overlay.cd-visible {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Optional blur class (can be toggled via JS) */
.cd-overlay.cd-blur.cd-visible {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* ─── Card ────────────────────────────────────── */
.cd-card {
  --cd-card-bg: #ffffff;
  --cd-card-border: rgba(0,0,0,0.06);
  --cd-card-text: #111827;
  --cd-card-muted: #6b7280;
  --cd-card-surface: #f9fafb;
  --cd-card-hover: #f3f4f6;
  --cd-cancel-text: #374151;
  
  background: var(--cd-card-bg);
  border: 1px solid var(--cd-card-border);
  border-radius: 20px;
  width: min(460px, 100%);
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.08),
    0 24px 56px rgba(0,0,0,0.12);
  transform: scale(0.9) translateY(20px);
  opacity: 0;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.3, 0.64, 1),
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--cd-font, "Inter", system-ui, -apple-system, sans-serif);
  overflow: hidden;
  color: var(--cd-card-text);
  position: relative;
}

/* subtle inner glow border on the card itself */
.cd-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: radial-gradient(circle at 30% 0%, var(--cd-accent, #6366f1) 0%, transparent 80%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.cd-card.cd-visible {
  transform: scale(1) translateY(0);
  opacity: 1;
  box-shadow:
    0 4px 8px rgba(0,0,0,0.06),
    0 12px 32px rgba(0,0,0,0.12),
    0 32px 64px rgba(0,0,0,0.18);
}

.cd-card.cd-visible::before {
  opacity: 1;
}

/* ─── Icon strip ──────────────────────────────── */
.cd-strip {
  height: 5px;
  width: 100%;
  background: var(--cd-accent, #6366f1);
  transition: height 0.3s ease;
}

/* ─── Body ────────────────────────────────────── */
.cd-body {
  padding: 28px 28px 0;
}

.cd-icon-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.cd-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: var(--cd-accent-bg, rgba(99,102,241,0.12));
  color: var(--cd-accent, #6366f1);
  transition: transform 0.3s cubic-bezier(0.34, 1.3, 0.64, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.cd-card.cd-visible .cd-icon {
  animation: cd-icon-pop 0.4s cubic-bezier(0.34, 1.3, 0.64, 1) 0.1s both;
}

@keyframes cd-icon-pop {
  0% { transform: scale(0.8); opacity: 0.6; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.cd-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: var(--cd-card-text);
  opacity: 0;
  transform: translateY(6px);
  transition: 
    opacity 0.35s ease 0.15s,
    transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) 0.15s;
}

.cd-card.cd-visible .cd-title {
  opacity: 1;
  transform: translateY(0);
}

.cd-message {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--cd-card-muted);
  padding: 0;
  opacity: 0;
  transform: translateY(8px);
  transition: 
    opacity 0.35s ease 0.25s,
    transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) 0.25s;
}

.cd-card.cd-visible .cd-message {
  opacity: 1;
  transform: translateY(0);
}

.cd-detail {
  margin: 10px 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--cd-card-muted);
  background: var(--cd-card-surface);
  border-radius: 12px;
  padding: 12px 14px;
  border-left: 3px solid var(--cd-accent, #6366f1);
  opacity: 0;
  transform: translateY(8px);
  transition: 
    opacity 0.35s ease 0.35s,
    transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) 0.35s;
}

.cd-card.cd-visible .cd-detail {
  opacity: 1;
  transform: translateY(0);
}

/* ─── Progress bar (timeout) ──────────────────── */
.cd-progress-wrap {
  padding: 18px 28px 0;
}

.cd-progress-track {
  height: 4px;
  background: var(--cd-card-surface);
  border-radius: 99px;
  overflow: hidden;
}

.cd-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--cd-accent, #6366f1), var(--cd-accent-light, #818cf8));
  border-radius: 99px;
  width: 100%;
  transition: width var(--cd-timeout-duration, 3s) linear;
  position: relative;
}

/* subtle shimmer on the progress bar */
.cd-progress-bar::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.4) 50%,
    transparent 100%
  );
  animation: cd-shimmer 2s infinite;
}

@keyframes cd-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

/* ─── Actions ─────────────────────────────────── */
.cd-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px 28px 24px;
  flex-wrap: wrap;
}

.cd-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
  transition: 
    background 0.2s ease,
    transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1),
    box-shadow 0.2s ease,
    opacity 0.2s ease;
  outline: none;
  position: relative;
  overflow: hidden;
}

.cd-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cd-btn:active::after {
  opacity: 1;
}

.cd-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--cd-accent-focus, rgba(99,102,241,0.35));
}

.cd-btn:active {
  transform: scale(0.94);
}

/* Cancel button */
.cd-btn-cancel {
  background: var(--cd-card-surface);
  color: var(--cd-cancel-text);
  border: 1px solid rgba(0,0,0,0.06);
}

.cd-btn-cancel:hover {
  background: var(--cd-card-hover);
  border-color: rgba(0,0,0,0.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

/* Confirm button */
.cd-btn-confirm {
  background: var(--cd-accent, #6366f1);
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  font-weight: 600;
}

.cd-btn-confirm:hover {
  filter: brightness(1.08);
  box-shadow: 0 4px 14px rgba(99,102,241,0.3);
  transform: translateY(-2px);
}

.cd-btn-confirm[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
  filter: none;
  transform: none;
  box-shadow: none;
}

/* ─── Dark mode auto (prefers-color-scheme) ────────────────── */
@media (prefers-color-scheme: dark) {
  .cd-card {
    --cd-card-bg: #1c1c1e;
    --cd-card-border: rgba(255,255,255,0.06);
    --cd-card-text: #f1f5f9;
    --cd-card-muted: #8e8e93;
    --cd-card-surface: #2c2c2e;
    --cd-card-hover: #3a3a3c;
    --cd-cancel-text: #d1d5db;
    box-shadow:
      0 1px 2px rgba(0,0,0,0.2),
      0 8px 24px rgba(0,0,0,0.4),
      0 24px 56px rgba(0,0,0,0.5);
  }
  .cd-card.cd-visible {
    box-shadow:
      0 4px 8px rgba(0,0,0,0.3),
      0 12px 32px rgba(0,0,0,0.5),
      0 32px 64px rgba(0,0,0,0.6);
  }
  .cd-overlay.cd-visible {
    background: rgba(0, 0, 0, 0.75);
  }
  .cd-btn-cancel {
    border-color: rgba(255,255,255,0.1);
  }
}

/* ─── Explicit theme classes ──────────────────── */
[data-theme="dark"] .cd-card {
  --cd-card-bg: #1c1c1e;
  --cd-card-border: rgba(255,255,255,0.06);
  --cd-card-text: #f1f5f9;
  --cd-card-muted: #8e8e93;
  --cd-card-surface: #2c2c2e;
  --cd-card-hover: #3a3a3c;
  --cd-cancel-text: #d1d5db;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.2),
    0 8px 24px rgba(0,0,0,0.4),
    0 24px 56px rgba(0,0,0,0.5);
}
[data-theme="dark"] .cd-card.cd-visible {
  box-shadow:
    0 4px 8px rgba(0,0,0,0.3),
    0 12px 32px rgba(0,0,0,0.5),
    0 32px 64px rgba(0,0,0,0.6);
}
[data-theme="dark"] .cd-overlay.cd-visible {
  background: rgba(0, 0, 0, 0.75);
}
[data-theme="dark"] .cd-btn-cancel {
  border-color: rgba(255,255,255,0.1);
}

[data-theme="light"] .cd-card {
  --cd-card-bg: #ffffff;
  --cd-card-border: rgba(0,0,0,0.06);
  --cd-card-text: #111827;
  --cd-card-muted: #6b7280;
  --cd-card-surface: #f9fafb;
  --cd-card-hover: #f3f4f6;
  --cd-cancel-text: #374151;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.08),
    0 24px 56px rgba(0,0,0,0.12);
}
[data-theme="light"] .cd-card.cd-visible {
  box-shadow:
    0 4px 8px rgba(0,0,0,0.06),
    0 12px 32px rgba(0,0,0,0.12),
    0 32px 64px rgba(0,0,0,0.18);
}
[data-theme="light"] .cd-overlay.cd-visible {
  background: rgba(0, 0, 0, 0.6);
}

/* ─── Accessibility: Reduced motion ─────────────── */
@media (prefers-reduced-motion: reduce) {
  .cd-card,
  .cd-overlay,
  .cd-title,
  .cd-message,
  .cd-detail,
  .cd-icon {
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
  }
}`;

function injectStyle(id: string, css: string): void {
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
}

// ─── Type config ───────────────────────────────────────────────────────────

const TYPE_MAP: Record<DialogType, TypeConfig> = {
    danger: {
        accent: '#ef4444', accentFocus: 'rgba(239,68,68,0.35)',
        iconBg: 'rgba(239,68,68,0.12)', iconColor: '#ef4444',
        icon: '🗑️', stripColor: '#ef4444',
    },
    warning: {
        accent: '#f59e0b', accentFocus: 'rgba(245,158,11,0.35)',
        iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b',
        icon: '⚠️', stripColor: '#f59e0b',
    },
    info: {
        accent: '#6366f1', accentFocus: 'rgba(99,102,241,0.35)',
        iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1',
        icon: 'ℹ️', stripColor: '#6366f1',
    },
    success: {
        accent: '#10b981', accentFocus: 'rgba(16,185,129,0.35)',
        iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981',
        icon: '✅', stripColor: '#10b981',
    },
};

// ─── ConfirmDialog class ───────────────────────────────────────────────────

export class ConfirmDialog {
    // ── Configuration ────────────────────────────────────────────────────────
    #cfg: Required<GlobalOptions>;

    // ── DOM ───────────────────────────────────────────────────────────────────
    #overlay: HTMLElement | null = null;
    #card: HTMLElement | null = null;
    #progressBar: HTMLElement | null = null;
    #confirmBtn: HTMLButtonElement | null = null;
    //@ts-ignore
    #closeBtn: HTMLButtonElement | null = null;

    // ── State ─────────────────────────────────────────────────────────────────
    #isOpen = false;
    #lastOpts: MergedDialogOptions | null = null;

    // ── Promise handling ──────────────────────────────────────────────────────
    #resolve: ((v: boolean) => void) | null = null;
    #reject: ((e: Error) => void) | null = null;

    // ── Event cleanup ─────────────────────────────────────────────────────────
    #abortController: AbortController | null = null;
    #originalActiveElement: Element | null = null;

    // ── Timeout / progress ────────────────────────────────────────────────────
    #timeoutId: ReturnType<typeof setTimeout> | null = null;
    #remainingMs: number | null = null;
    #pauseStart: number | null = null;

    // ── A11y ──────────────────────────────────────────────────────────────────
    #liveRegion: HTMLElement | null = null;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(globalOptions: GlobalOptions = {}) {
        this.#cfg = {
            defaultTitle: globalOptions.defaultTitle ?? 'Confirm',
            defaultMessage: globalOptions.defaultMessage ?? 'Are you sure?',
            defaultConfirmText: globalOptions.defaultConfirmText ?? 'Confirm',
            defaultCancelText: globalOptions.defaultCancelText ?? 'Cancel',
            defaultType: globalOptions.defaultType ?? 'info',
            zIndex: globalOptions.zIndex ?? 9999,
            transitionDuration: globalOptions.transitionDuration ?? 220,
            blurBackdrop: globalOptions.blurBackdrop ?? true,
            fontFamily: globalOptions.fontFamily ?? '',
        };
        injectStyle(STYLE_ID, DIALOG_CSS);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Show the dialog and return a Promise<boolean>.  Overwrites a previous open dialog. */
    show(options: DialogOptions = {}): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            // If already open, resolve previous as false
            if (this.#isOpen && this.#resolve) this.#resolve(false);

            this.#resolve = resolve;
            this.#reject = reject;

            const opts = this.#mergeOptions(options);

            if (this.#overlay && this.#card) {
                // Update existing dialog without rebuilding DOM
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

    /**
     * Programmatically update title, message, detail, or timeout while the dialog is open.
     * Returns false if the dialog isn't open.
     */
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

    /** Resolve the dialog with a result. Plays exit animation. */
    async close(result: boolean = false): Promise<void> {
        if (!this.#isOpen) return;

        const opts = this.#lastOpts;
        // Allow beforeClose to cancel
        if (opts?.beforeClose) {
            const allow = await opts.beforeClose(result);
            if (!allow) return;
        }

        this.#clearTimeouts();
        this.#isOpen = false;
        this.#cleanupEvents();
        this.#animateClose();

        const resolve = this.#resolve;
        const onClose = opts?.onClose;

        this.#resolve = null;
        this.#reject = null;

        setTimeout(() => {
            resolve?.(result);
            onClose?.(result);
            // legacy callbacks
            if (result && opts?.onConfirm) opts.onConfirm();
            if (!result && opts?.onCancel) opts.onCancel();
            // return focus
            (this.#originalActiveElement as HTMLElement)?.focus();
            this.#originalActiveElement = null;
        }, this.#cfg.transitionDuration);
    }

    /** Destroy the dialog immediately, rejecting any pending promise. */
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

    // ── Static helpers ───────────────────────────────────────────────────────

    static alert(messageOrOptions: string | DialogOptions = {}): Promise<void> {
        const opts = typeof messageOrOptions === 'string'
            ? { message: messageOrOptions }
            : messageOrOptions;
        return getConfirmDialog().show({ ...opts, showCancel: false, confirmText: 'OK', type: 'info' }).then(() => {});
    }

    // ── Private: Options merging ─────────────────────────────────────────────

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

    // ── Private: DOM construction ────────────────────────────────────────────

    #buildDialog(opts: MergedDialogOptions): void {
        // Live region
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

        // Overlay
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

        // Card
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
      <div class="cd-strip" style="background:${opts.stripColor};"></div>
      ${closeBtnHtml}
      <div class="cd-body">
        <div class="cd-icon-wrap">
          <div class="cd-icon" style="background:${opts.iconBg};color:${opts.iconColor};" aria-hidden="true">${opts.icon}</div>
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
    `;

        if (opts.render) {
            template = opts.render(template);
        }

        this.#card.innerHTML = template;

        // Cache interactive elements
        this.#progressBar = this.#card.querySelector('#cd-progress');
        this.#confirmBtn = this.#card.querySelector('[data-action="confirm"]');
        this.#closeBtn = this.#card.querySelector('[data-action="close"]');

        if (opts.loading) this.#setLoading(true);
        else this.#setLoading(false);
    }

    // ── Private: Animations ──────────────────────────────────────────────────

    #open(opts: MergedDialogOptions): void {
        this.#isOpen = true;
        this.#originalActiveElement = document.activeElement;
        void this.#overlay!.offsetHeight; // reflow
        this.#overlay!.classList.add('cd-visible');
        this.#card!.classList.add('cd-visible');
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

    // ── Private: Events ──────────────────────────────────────────────────────

    #attachEvents(opts: MergedDialogOptions): void {
        const controller = new AbortController();
        this.#abortController = controller;
        const signal = controller.signal;

        this.#card?.addEventListener('click', this.#onCardClick, { signal });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !opts.persist) {
                e.preventDefault();
                this.close(false);
            }
        }, { signal });

        this.#overlay?.addEventListener('click', (e) => {
            if (e.target === this.#overlay && !opts.persist) {
                this.close(false);
            }
        }, { signal });

        // Focus trap
        this.#card?.addEventListener('keydown', this.#focusTrap, { signal });

        // Pause timeout on hover over card
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
        e.preventDefault();
        switch (action.dataset.action) {
            case 'confirm': this.close(true); break;
            case 'cancel': this.close(false); break;
            case 'close': this.close(false); break; // close button behaves like cancel
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

    // ── Private: Timeout & Progress ──────────────────────────────────────────

    #setupTimeout(opts: MergedDialogOptions): void {
        if (!opts.timeoutMs) return;
        this.#remainingMs = opts.timeoutMs;
        this.#setProgress(100);
        this.#startCountdown(opts);
    }

    #startCountdown(opts: MergedDialogOptions): void {
        this.#clearTimeouts();
        const step = 50; // update every 50ms for smooth animation
        this.#timeoutId = setInterval(() => {
            if (this.#remainingMs === null) return;
            this.#remainingMs -= step;
            if (this.#remainingMs <= 0) {
                this.#clearTimeouts();
                this.close(opts.timeoutConfirm);
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

    // ── Private: Loading state ───────────────────────────────────────────────

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

    // ── Private: A11y ────────────────────────────────────────────────────────

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

    // ── Private: Utility ─────────────────────────────────────────────────────

    #escape(str: string): string {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    }
}

// ─── Merged type ───────────────────────────────────────────────────────────

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

// ─── Singleton ─────────────────────────────────────────────────────────────

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