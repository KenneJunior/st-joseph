/**
 * ============================================================================
 * SJCCC – Smooth Typing Effect
 * Dynamic micro-transform spring bounce and character counting for form inputs
 * ============================================================================
 */

export class SmoothTypingEffect {
    private inputs: NodeListOf<HTMLInputElement | HTMLTextAreaElement>;

    constructor(selector: string = '.form-group input, .form-group textarea') {
        this.inputs = document.querySelectorAll(selector);
        this.init();
    }

    private init(): void {
        this.inputs.forEach((input) => {
            input.classList.add('typewriter-input');
            input.style.willChange = 'transform';

            input.addEventListener('input', (e) => this.handleInput(e));
            input.addEventListener('keydown', (e) => this.handleKeyDown(e as KeyboardEvent));
            input.addEventListener('focus', () => this.handleFocus(input));
            input.addEventListener('blur', () => this.handleBlur(input));

            this.updateCharCount(input);
        });
    }

    private handleInput(e: Event): void {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;

        input.style.transition = 'none';
        input.style.transform = 'scale(1.005)';

        void input.offsetWidth;

        requestAnimationFrame(() => {
            input.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
            input.style.transform = 'scale(1)';
        });

        this.updateCharCount(input);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;

        if (e.key === 'Backspace' || e.key === 'Delete') {
            input.style.transition = 'none';
            input.style.transform = 'scale(0.995)';

            void input.offsetWidth;

            requestAnimationFrame(() => {
                input.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
                input.style.transform = 'scale(1)';
            });
        }
    }

    private handleFocus(input: HTMLInputElement | HTMLTextAreaElement): void {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            const indicator = formGroup.querySelector('.typing-indicator') as HTMLElement;
            if (indicator) {
                indicator.classList.add('active');
            }
        }
    }

    private handleBlur(input: HTMLInputElement | HTMLTextAreaElement): void {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            const indicator = formGroup.querySelector('.typing-indicator') as HTMLElement;
            if (indicator) {
                indicator.classList.remove('active');
            }
        }
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
}
