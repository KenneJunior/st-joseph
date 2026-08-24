/* ==========================================================================
   ConfirmDialog · TypeScript
   ========================================================================== */

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

// ─── CSS helpers ───────────────────────────────────────────────────────────

const STYLE_ID = 'cd-styles';
const DIALOG_CSS =`/* ==========================================================================
   ConfirmDialog — Ultra-Premium Liquid Glass Edition
   ========================================================================== */

:root {
    --cd-accent: #6366f1;
    --cd-accent-glow: #8b5cf6;
    --cd-accent-light: #a5b4fc;
    --cd-surface-glass: rgba(255, 255, 255, 0.03);
    --cd-border-glass: rgba(255, 255, 255, 0.08);
    --cd-text-main: #ffffff;
    --cd-text-muted: #9ca3af;
    --cd-font: "Inter", system-ui, sans-serif;
    --cd-spring: cubic-bezier(0.175, 0.885, 0.32, 1.15); /* Bouncy physics */
}

/* ─── 3D Overlay & Ambient Environment ──────────────── */
.cd-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 9999;
    background: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.4), rgba(0, 0, 0, 0.9));
    perspective: 1200px; /* The secret sauce for the 3D entrance */
    opacity: 0;
    transition: opacity 0.5s ease;
    overflow: hidden;
}

.cd-overlay.cd-visible {
    opacity: 1;
}

/* Floating orb of light behind the modal */
.cd-ambient-light {
    position: absolute;
    width: 60vw;
    height: 60vw;
    max-width: 600px;
    max-height: 600px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 40%, transparent 70%);
    border-radius: 50%;
    filter: blur(60px);
    animation: cd-breathe 8s ease-in-out infinite alternate;
    pointer-events: none;
}

@keyframes cd-breathe {
    0% { transform: scale(0.8) translate(10%, -10%); }
    100% { transform: scale(1.2) translate(-10%, 10%); }
}

/* ─── The Card (Liquid Glass Body) ──────────────────── */
.cd-card {
    width: min(460px, 100%);
    position: relative;
    border-radius: 24px;
    background: var(--cd-surface-glass);
    box-shadow:
    0 40px 80px -20px rgba(0, 0, 0, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 0 20px rgba(255, 255, 255, 0.02);
    font-family: var(--cd-font);
    color: var(--cd-text-main);
    backdrop-filter: blur(15px) saturate(180%);
    /* 3D Entrance Setup */
    transform-style: preserve-3d;
    transform: rotateX(25deg) rotateY(-10deg) translateY(60px) scale(0.85);
    opacity: 0;
    transition:
        transform 0.8s var(--cd-spring),
    opacity 0.6s ease;
}

.cd-card.cd-visible {
    transform: rotateX(0deg) rotateY(0deg) translateY(0) scale(1);
    opacity: 1;
}

/* Animated conic border glow */
@property --cd-glow-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

.cd-card-glow {
    position: absolute;
    inset: -2px;
    border-radius: 26px;
    padding: 2px;
    background: conic-gradient(
        from var(--cd-glow-angle),
        transparent 0%,
        var(--cd-accent) 20%,
        var(--cd-accent-glow) 40%,
        transparent 50%,
        transparent 100%
    );
    z-index: -1;
    mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
    -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: cd-angle-spin 4s linear infinite;
    opacity: 0;
    transition: opacity 1s ease 0.5s;
}

.cd-card.cd-visible .cd-card-glow {
    opacity: 1;
}

@keyframes cd-angle-spin {
    from { --cd-glow-angle: 0deg; }
    to   { --cd-glow-angle: 360deg; }
}

/* Wrapper to enforce border-radius hiding the internal bleeds */
.cd-content-wrapper {
    position: relative;
    background: rgba(15, 23, 42, 0.65); /* Deep dark base */
    border-radius: 24px;
    border: 1px solid var(--cd-border-glass);
    overflow: hidden;
    z-index: 1;
}

.cd-blur{
    backdrop-filter: blur(5px) saturate(180%);
    -webkit-backdrop-filter: blur(5px) saturate(180%);
    }

/* ─── Icon & Header ─────────────────────────────────── */
.cd-strips {
    height: 4px;
    width: 100%;
    background: linear-gradient(90deg, var(--cd-accent), var(--cd-accent-glow), var(--cd-accent));
    background-size: 200% 100%;
    animation: cd-gradient-pan 3s ease infinite;
}

.cd-body {
    padding: 32px 32px 0;
}

.cd-icon-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}

.cd-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1));
    box-shadow:
    0 8px 16px rgba(0,0,0,0.2),
        inset 0 2px 4px rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.05);

    /* Liquid float animation */
    animation: cd-float 3s ease-in-out infinite;
}

@keyframes cd-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

/* Gradient Sheen Text */
.cd-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.5s var(--cd-spring) 0.2s;
}

.cd-card.cd-visible .cd-title {
    opacity: 1;
    transform: translateX(0);
}

.cd-message {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--cd-text-muted);
    margin: 0;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.5s var(--cd-spring) 0.3s;
}

.cd-card.cd-visible .cd-message {
    opacity: 1;
    transform: translateY(0);
}

.cd-detail {
    margin: 16px 0 0;
    font-size: 0.8rem;
    font-family: ui-monospace, monospace;
    color: var(--cd-accent-light);
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.5s var(--cd-spring) 0.4s;
}

.cd-card.cd-visible .cd-detail {
    opacity: 1;
    transform: translateY(0);
}

/* ─── Progress Bar (Glowing Track) ──────────────────── */
.cd-progress-wrap {
    padding: 24px 32px 0;
}

.cd-progress-track {
    height: 6px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 99px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
    overflow: hidden;
}

.cd-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--cd-accent), var(--cd-accent-glow), #d8b4fe);
    background-size: 200% 100%;
    border-radius: 99px;
    width: 100%;
    box-shadow: 0 0 10px var(--cd-accent);
    animation: cd-gradient-pan 2s linear infinite;
    transition: width 0.1s linear; 
}

@keyframes cd-gradient-pan {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
}

/* ─── Magnetic Buttons ──────────────────────────────── */
.cd-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 24px 32px 32px;
}

.cd-btn {
    padding: 12px 24px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
}

.cd-btn-cancel {
    background: transparent;
    color: var(--cd-text-muted);
    border: 1px solid rgba(255,255,255,0.1);
}

.cd-btn-cancel:hover {
    background: rgba(255,255,255,0.05);
    color: var(--cd-text-main);
    border-color: rgba(255,255,255,0.2);
}

.cd-btn-confirm {
    background: linear-gradient(135deg, var(--cd-accent), var(--cd-accent-glow));
    color: #fff;
    border: none;
    box-shadow:
    0 4px 12px rgba(99, 102, 241, 0.3),
        inset 0 1px 1px rgba(255,255,255,0.3);
}

/* The hover glow effect */
.cd-btn-confirm::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--cd-accent-glow), #d8b4fe);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 0;
}

.cd-btn-confirm span {
    position: relative;
    z-index: 1; /* Keeps text above the hover background */
}

.cd-btn-confirm:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow:
    0 10px 20px rgba(99, 102, 241, 0.5),
        inset 0 1px 1px rgba(255,255,255,0.4);
}

.cd-btn-confirm:hover::before {
    opacity: 1;
}

.cd-btn:active {
    transform: scale(0.96) !important;
}`;

/**
 * Injects required stylesheet into document head if not already present.
 */
function injectStyle(id: string, css: string): void {
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
}

// ─── Theme Configurations ───────────────────────────────────────────────

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
        accent: '#6366f1', accentFocus: 'rgba(99,102,241,0.35)',
        iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1',
        icon: 'bi bi-info-circle', stripColor: '#6366f1',
    },
    success: {
        accent: '#10b981', accentFocus: 'rgba(16,185,129,0.35)',
        iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981',
        icon: 'bi bi-check-circle', stripColor: '#10b981',
    },
};

// ─── ConfirmDialog class ───────────────────────────────────────────────────

/**
 * A Promise-based, glassmorphism modal dialog controller built with zero external runtime dependencies.
 */
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

/**
     * Displays the dialog with the provided options and returns a `Promise<boolean>`.
     * Resolves to `true` when confirmed, or `false` when cancelled or dismissed.
     * Overwrites any active open dialog from this instance.
     *
     * @param options Specific configuration options for this invocation.
     */
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
     * Programmatically updates properties of an active dialog without closing it.
     *
     * @param partial Properties to update (`title`, `message`, `detail`, `timeoutMs`, `loading`).
     * @returns `true` if the dialog was successfully updated, `false` if the dialog was not open.
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

/**
     * Closes the open dialog with a specified result and executes closing transitions and callbacks.
     *
     * @param result Resolution result (`true` for confirmed, `false` for cancelled). Defaults to `false`.
     */
        async close(result: boolean = true): Promise<void> {
        if (!this.#isOpen) return;

        const opts = this.#lastOpts;
        this.#lastOpts = opts;
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

/**
     * Immediately removes the dialog from the DOM and rejects any pending Promise.
     */
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

    /**
     * Indicates whether the dialog is currently open and visible.
     */
    get isOpen(): boolean {
        return this.#isOpen;
    }

    // ── Static helpers ───────────────────────────────────────────────────────

    /**
     * Static shorthand helper to display a simple alert (information dialog with no cancel button).
     *
     * @param messageOrOptions String message or detailed options object.
     */
    static async alert(messageOrOptions: string | DialogOptions = {}): Promise<void> {
        const opts = typeof messageOrOptions === 'string'
            ? {message: messageOrOptions}
            : messageOrOptions;
        await getConfirmDialog().show({...opts, showCancel: false, confirmText: 'OK', type: 'info'});
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

        // Ambient light orb
        const ambient = document.createElement('div');
        ambient.className = 'cd-ambient-light';
        this.#overlay.appendChild(ambient);

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
                e.stopPropagation();
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
        e.stopPropagation();
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
        if (this.#timeoutId !== null) {
            clearInterval(this.#timeoutId);
            this.#timeoutId = null;
        }        const step = 50; // update every 50ms
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

/**
 * Retrieves or initializes the shared global `ConfirmDialog` singleton instance.
 *
 * @param options Global options to reconfigure the singleton instance.
 */
export function getConfirmDialog(options?: GlobalOptions): ConfirmDialog {
    if (options) {
        instance?.destroy();
        instance = new ConfirmDialog(options);
    }
    if (!instance) instance = new ConfirmDialog();
    return instance;
}

/**
 * Displays a confirmation dialog using the shared singleton instance.
 *
 * @param messageOrOptions Message string or full `DialogOptions`.
 * @returns Promise resolving to `true` on confirm, `false` on cancel/dismiss.
 */
export async function confirm(messageOrOptions: string | DialogOptions = {}): Promise<boolean> {
    const opts = typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;
    return getConfirmDialog().show(opts);
}

/**
 * Displays an informational alert dialog with an "OK" button using the singleton instance.
 *
 * @param messageOrOptions Message string or full `DialogOptions`.
 */
export async function alert(messageOrOptions: string | DialogOptions = {}): Promise<void> {
    return ConfirmDialog.alert(messageOrOptions);
}

export default ConfirmDialog;