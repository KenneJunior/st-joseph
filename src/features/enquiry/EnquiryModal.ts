/**
 * ============================================================================
 * SJCCC – Enquiry Modal Controller
 * Handles book-page enquiry modal opening/closing, body scroll locking,
 * scrollbar width compensation, and auto-focusing inputs
 * ============================================================================
 */

import { motionSuspension } from '../../core/physics/MotionSuspension.ts';

export class EnquiryModal {
    private fabElements: HTMLElement[];
    private modal: HTMLElement | null;
    private closeBtn: HTMLButtonElement | null;
    private isOpen: boolean = false;

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
        this.fabElements.forEach((fab) => {
            fab.addEventListener('click', () => this.open());
        });

        this.closeBtn?.addEventListener('click', () => this.close());

        this.modal?.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        this.modal?.addEventListener('wheel', (e: WheelEvent) => {
            const content = this.modal?.querySelector('.modal-content');
            if (this.isOpen && content && !content.contains(e.target as Node)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    public open(): void {
        if (!this.modal || this.isOpen) return;

        this.isOpen = true;
        this.modal.removeAttribute('hidden');

        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${this.getScrollbarWidth()}px`;

        // Suspend background animations (ScrollEngine, ParticleSystem, VirtualCampusMap, DOM particles)
        motionSuspension.suspendAll('modal');

        setTimeout(() => {
            const firstInput = this.modal?.querySelector<HTMLInputElement>('input');
            firstInput?.focus();
        }, 400);
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

            this.fabElements[0]?.focus();
        }, 500);
    }

    private getScrollbarWidth(): number {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    public isModalOpen(): boolean {
        return this.isOpen;
    }
}
