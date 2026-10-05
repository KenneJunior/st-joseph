/**
 * ============================================================================
 * SJCCC – Academic Level Toggles
 * Accessible accordion triggers for educational program curriculum sections
 * ============================================================================
 */

export class AcademicLevelToggles {
    constructor(selector: string = '.level__toggle') {
        const toggles = document.querySelectorAll<HTMLButtonElement>(selector);
        toggles.forEach((btn) => this.bindToggle(btn));
    }

    private bindToggle(btn: HTMLButtonElement): void {
        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!expanded));
            const content = btn.nextElementSibling as HTMLElement | null;
            if (content) {
                expanded ? content.setAttribute('hidden', '') : content.removeAttribute('hidden');
            }
        });
    }
}
