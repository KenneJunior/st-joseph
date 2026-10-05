/**
 * ============================================================================
 * SJCCC – Card Splitter Visual Feedback Controller
 * Enhances card splitters and dividers with interactive visual feedback,
 * directional hover awareness, keyboard accessibility, and tactile focus states.
 * ============================================================================
 */

export interface CardSplitterOptions {
    selector?: string;
    activeClass?: string;
    adjacentActiveClass?: string;
}

export class CardSplitter {
    private cleanups: Array<() => void> = [];
    private isDestroyed = false;

    constructor(options: CardSplitterOptions = {}) {
        if (typeof window === 'undefined') return;
        this.init(options);
    }

    private init(options: CardSplitterOptions): void {
        const selector = options.selector || '.card-splitter';
        const activeClass = options.activeClass || 'is-active';
        const adjacentClass = options.adjacentActiveClass || 'card-adjacent-active';

        const splitters = document.querySelectorAll<HTMLElement>(selector);
        if (!splitters.length) return;

        splitters.forEach((splitter) => {
            // Find adjacent cards
            const prevCard = splitter.previousElementSibling as HTMLElement | null;
            const nextCard = splitter.nextElementSibling as HTMLElement | null;

            // Ensure keyboard accessibility
            if (!splitter.hasAttribute('tabindex')) {
                splitter.setAttribute('tabindex', '0');
            }
            if (!splitter.hasAttribute('role')) {
                splitter.setAttribute('role', 'separator');
            }

            // Directional feedback on previous card interaction
            if (prevCard) {
                const handlePrevEnter = () => {
                    splitter.setAttribute('data-active-side', 'prev');
                    splitter.classList.add(activeClass);
                    prevCard.classList.add(adjacentClass);
                };
                const handlePrevLeave = () => {
                    splitter.removeAttribute('data-active-side');
                    splitter.classList.remove(activeClass);
                    prevCard.classList.remove(adjacentClass);
                };

                prevCard.addEventListener('pointerenter', handlePrevEnter);
                prevCard.addEventListener('pointerleave', handlePrevLeave);
                prevCard.addEventListener('focusin', handlePrevEnter);
                prevCard.addEventListener('focusout', handlePrevLeave);

                this.cleanups.push(() => {
                    prevCard.removeEventListener('pointerenter', handlePrevEnter);
                    prevCard.removeEventListener('pointerleave', handlePrevLeave);
                    prevCard.removeEventListener('focusin', handlePrevEnter);
                    prevCard.removeEventListener('focusout', handlePrevLeave);
                });
            }

            // Directional feedback on next card interaction
            if (nextCard) {
                const handleNextEnter = () => {
                    splitter.setAttribute('data-active-side', 'next');
                    splitter.classList.add(activeClass);
                    nextCard.classList.add(adjacentClass);
                };
                const handleNextLeave = () => {
                    splitter.removeAttribute('data-active-side');
                    splitter.classList.remove(activeClass);
                    nextCard.classList.remove(adjacentClass);
                };

                nextCard.addEventListener('pointerenter', handleNextEnter);
                nextCard.addEventListener('pointerleave', handleNextLeave);
                nextCard.addEventListener('focusin', handleNextEnter);
                nextCard.addEventListener('focusout', handleNextLeave);

                this.cleanups.push(() => {
                    nextCard.removeEventListener('pointerenter', handleNextEnter);
                    nextCard.removeEventListener('pointerleave', handleNextLeave);
                    nextCard.removeEventListener('focusin', handleNextEnter);
                    nextCard.removeEventListener('focusout', handleNextLeave);
                });
            }

            // Splitter click/keyboard activation to pulse visual separation feedback
            const handleActivation = () => {
                splitter.classList.add(activeClass);
                if (prevCard) prevCard.classList.add(adjacentClass);
                if (nextCard) nextCard.classList.add(adjacentClass);

                setTimeout(() => {
                    if (this.isDestroyed) return;
                    splitter.classList.remove(activeClass);
                    if (prevCard) prevCard.classList.remove(adjacentClass);
                    if (nextCard) nextCard.classList.remove(adjacentClass);
                }, 800);
            };

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActivation();
                }
            };

            splitter.addEventListener('click', handleActivation);
            splitter.addEventListener('keydown', handleKeyDown);

            this.cleanups.push(() => {
                splitter.removeEventListener('click', handleActivation);
                splitter.removeEventListener('keydown', handleKeyDown);
            });
        });
    }

    public destroy(): void {
        this.isDestroyed = true;
        this.cleanups.forEach((cleanup) => {
            try {
                cleanup();
            } catch {
                // Ignore teardown error
            }
        });
        this.cleanups = [];
    }
}
