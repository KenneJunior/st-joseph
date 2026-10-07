/**
 * ============================================================================
 * SJCCC – Enquiry Modal Controller
 * Handles book-page enquiry modal opening/closing, body scroll locking,
 * scrollbar width compensation, focus restoration, and accessibility
 * ============================================================================
 */

import { motionSuspension } from '../../core/physics/MotionSuspension.ts';

export class EnquiryModal {
    private fabElements: HTMLElement[];
    private modal: HTMLElement | null;
    private closeBtn: HTMLButtonElement | null;
    private isOpen: boolean = false;
    private lastActiveElement: HTMLElement | null = null;
    private abortController: AbortController = new AbortController();

    constructor(
        fabSelectors: string[] = ['#enquiryFab', '#enquire-btn', '#pMan', '.announcement-bar__link', '#getInTouchBtn', '#faqEnquiryBtn'],
        modalId: string = 'enquiryModal',
        closeBtnId: string = 'modalClose'
    ) {
        this.fabElements = fabSelectors
            .map((selector) => document.querySelector(selector))
            .filter((v): v is HTMLElement => !!v);
        this.modal = document.getElementById(modalId);
        this.closeBtn = document.getElementById(closeBtnId) as HTMLButtonElement | null;
        this.init();
    }

    private init(): void {
        const { signal } = this.abortController;

        this.fabElements.forEach((fab) => {
            fab.addEventListener('click', () => this.open(fab), { signal });
        });

        this.closeBtn?.addEventListener('click', () => this.close(), { signal });

        this.modal?.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modal) {
                this.close();
            }
        }, { signal });

        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        }, { signal });

        this.modal?.addEventListener('wheel', (e: WheelEvent) => {
            const content = this.modal?.querySelector('.modal-content');
            if (this.isOpen && content && !content.contains(e.target as Node)) {
                e.preventDefault();
            }
        }, { passive: false, signal });
    }

    public open(triggerEl?: HTMLElement): void {
        if (!this.modal || this.isOpen) return;

        this.lastActiveElement = triggerEl || (document.activeElement as HTMLElement | null);
        this.isOpen = true;
        this.modal.removeAttribute('hidden');

        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${this.getScrollbarWidth()}px`;

        // Suspend background animations (ScrollEngine, ParticleSystem, VirtualCampusMap, DOM particles)
        motionSuspension.suspendAll('modal');

        setTimeout(() => {
            const firstInput = this.modal?.querySelector<HTMLInputElement>('input:not([type="checkbox"])');
            firstInput?.focus();
        }, 220);
    }

    public close(): void {
        if (!this.modal || !this.isOpen) return;

        this.isOpen = false;

        // Resume background animations if no other suspension reason is active
        motionSuspension.resumeAll('modal');

        const content = this.modal.querySelector('.modal-content');
        content?.classList.add('closing');

        setTimeout(() => {
            this.modal?.setAttribute('hidden', '');
            content?.classList.remove('closing');

            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            const returnTarget = this.lastActiveElement || this.fabElements[0];
            returnTarget?.focus();
        }, 400);
    }

    private getScrollbarWidth(): number {
        if (typeof document === 'undefined' || !document.documentElement) return 0;
        return window.innerWidth - document.documentElement.clientWidth;
    }

    public isModalOpen(): boolean {
        return this.isOpen;
    }

    public destroy(): void {
        this.abortController.abort();
    }
}
