/**
 * ============================================================================
 * SJCCC – Announcement Bar Controller
 * Dismissible top notice bar with persistence timer and dynamic layout calculations
 * ============================================================================
 */

import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';

export interface AnnouncementBarOptions {
    barSelector: string;
    closeBtnSelector: string;
    headerSelector?: string;
    storageKey?: string;
    /**
     * Number of days before the bar shows up again.
     * Use decimals for shorter times (e.g., 0.5 for 12 hours)
     */
    dismissForDays?: number;
}

export class AnnouncementBar {
    private readonly bar: HTMLElement | null;
    private readonly closeBtn: HTMLButtonElement | null;
    private readonly header: HTMLElement | null;
    private readonly storageKey: string;
    private readonly dismissDurationMs: number;

    private resizeObserver: ResizeObserver | null = null;
    private rAFId: number | null = null;

    private readonly boundUpdateLayout = this.updateLayout.bind(this);
    private readonly boundDismiss = this.dismiss.bind(this);

    constructor(options: AnnouncementBarOptions) {
        this.bar = document.querySelector(options.barSelector);
        this.closeBtn = document.querySelector(options.closeBtnSelector);
        this.header = options.headerSelector ? document.querySelector(options.headerSelector) : null;

        this.storageKey = options.storageKey ?? STORAGE_KEYS.ANNOUNCEMENT_DISMISSED;

        // Convert days to milliseconds (Default: 30 days if not provided)
        const days = options.dismissForDays ?? 30;
        this.dismissDurationMs = days * 24 * 60 * 60 * 1000;

        if (!this.bar) return;

        this.init();
    }

    private init(): void {
        const isDismissed = this.checkIfDismissed();

        if (isDismissed) {
            this.hideBar();
        } else {
            this.closeBtn?.addEventListener('click', this.boundDismiss);
        }

        this.observeSizeChanges();
        this.scheduleLayoutUpdate();
        window.addEventListener('load', this.boundUpdateLayout);
    }

    /**
     * Checks localStorage to see if the dismissal timer has expired.
     */
    private checkIfDismissed(): boolean {
        const hiddenUntilStr = localStorage.getItem(this.storageKey);

        if (!hiddenUntilStr) return false;

        const hiddenUntil = parseInt(hiddenUntilStr, 10);

        if (!isNaN(hiddenUntil) && Date.now() < hiddenUntil) {
            return true;
        }

        // Timer expired! Clean up localStorage so the bar shows again
        localStorage.removeItem(this.storageKey);
        return false;
    }

    private dismiss(): void {
        if (!this.bar) return;

        this.hideBar();

        const hiddenUntil = Date.now() + this.dismissDurationMs;
        localStorage.setItem(this.storageKey, hiddenUntil.toString());

        this.scheduleLayoutUpdate();
        this.closeBtn?.removeEventListener('click', this.boundDismiss);
    }

    private hideBar(): void {
        this.bar!.classList.add('dismissed');
        this.bar!.setAttribute('aria-hidden', 'true');
    }

    private scheduleLayoutUpdate(): void {
        if (this.rAFId) cancelAnimationFrame(this.rAFId);
        this.rAFId = requestAnimationFrame(() => this.boundUpdateLayout());
    }

    private updateLayout(): void {
        const root = document.documentElement;

        const headerHeight = this.header?.offsetHeight ?? 0;
        const isDismissed = this.bar?.classList.contains('dismissed');
        const barHeight = isDismissed || !this.bar ? 0 : this.bar.offsetHeight;

        if (this.header) {
            root.style.setProperty('--header-height', `${headerHeight}px`);
        }
        root.style.setProperty('--bar-height', `${barHeight}px`);
    }

    private observeSizeChanges(): void {
        this.resizeObserver = new ResizeObserver(() => this.scheduleLayoutUpdate());
        if (this.header) this.resizeObserver.observe(this.header);
        if (this.bar) this.resizeObserver.observe(this.bar);
    }

    public destroy(): void {
        this.resizeObserver?.disconnect();
        window.removeEventListener('load', this.boundUpdateLayout);
        this.closeBtn?.removeEventListener('click', this.boundDismiss);
        if (this.rAFId) cancelAnimationFrame(this.rAFId);
    }
}
