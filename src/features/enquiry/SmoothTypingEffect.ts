/**
 * ============================================================================
 * SJCCC – Smooth Typing Effect
 * Clean character counting and typing state management for form inputs
 * Zero layout thrashing, zero continuous RAF, zero inline scale mutations
 * ============================================================================
 */

export class SmoothTypingEffect {
    private inputs: NodeListOf<HTMLInputElement | HTMLTextAreaElement>;
    private abortController: AbortController = new AbortController();

    constructor(selector: string = '.form-group input, .form-group textarea') {
        this.inputs = document.querySelectorAll(selector);
        this.init();
    }

    private init(): void {
        const { signal } = this.abortController;
        const observedForms = new Set<HTMLFormElement>();

        this.inputs.forEach((input) => {
            if ((input as HTMLInputElement).type === 'checkbox') return;

            input.classList.add('typewriter-input');

            input.addEventListener('input', () => this.handleInput(input), { signal });
            input.addEventListener('change', () => this.handleInput(input), { signal });
            input.addEventListener('animationstart', (e: Event) => {
                if ((e as AnimationEvent).animationName === 'sjcccAutofillStart') {
                    this.handleInput(input);
                }
            }, { signal });
            input.addEventListener('focus', () => this.handleFocus(input), { signal });
            input.addEventListener('blur', () => this.handleBlur(input), { signal });

            this.syncFloatingState(input);
            this.updateCharCount(input);

            const parentForm = typeof input.closest === 'function' ? input.closest('form') as HTMLFormElement | null : null;
            if (parentForm && !observedForms.has(parentForm)) {
                observedForms.add(parentForm);
                parentForm.addEventListener('reset', () => {
                    queueMicrotask(() => {
                        this.inputs.forEach((field) => {
                            if ((field as HTMLInputElement).type === 'checkbox') return;
                            this.syncFloatingState(field);
                            this.updateCharCount(field);
                        });
                    });
                }, { signal });
            }
        });
    }

    private handleInput(input: HTMLInputElement | HTMLTextAreaElement): void {
        this.syncFloatingState(input);
        this.updateCharCount(input);
    }

    private handleFocus(input: HTMLInputElement | HTMLTextAreaElement): void {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('is-focused');
            const indicator = formGroup.querySelector('.typing-indicator') as HTMLElement | null;
            if (indicator) {
                indicator.classList.add('active');
            }
        }
    }

    private handleBlur(input: HTMLInputElement | HTMLTextAreaElement): void {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('is-focused');
            this.syncFloatingState(input);
            const indicator = formGroup.querySelector('.typing-indicator') as HTMLElement | null;
            if (indicator) {
                indicator.classList.remove('active');
            }
        }
    }

    private syncFloatingState(input: HTMLInputElement | HTMLTextAreaElement): void {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        const hasContent = (input.value ?? '').length > 0;
        formGroup.classList.toggle('has-value', hasContent);
    }

    private updateCharCount(input: HTMLInputElement | HTMLTextAreaElement): void {
        const maxLength = input.getAttribute('maxlength');
        if (!maxLength) return;

        const formGroup = input.closest('.form-group');
        const charCount = formGroup?.querySelector('.char-count');
        if (!charCount) return;

        const current = input.value.length;
        const max = parseInt(maxLength, 10);

        charCount.textContent = `${current}/${max}`;
        charCount.classList.toggle('near-limit', current >= max * 0.8 && current < max);
        charCount.classList.toggle('at-limit', current >= max);
    }

    public destroy(): void {
        this.abortController.abort();
    }
}
