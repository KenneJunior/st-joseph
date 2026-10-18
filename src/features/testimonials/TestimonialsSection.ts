/**
 * ============================================================================
 * SJCCC – Interactive Testimonials Section Controller
 * Powers dynamic spotlight lighting, category filtering with animated glider,
 * story drawer expansion, and clipboard quote sharing.
 * ============================================================================
 */

export class TestimonialsSection {
    private sectionEl: HTMLElement | null;
    private filterButtons: NodeListOf<HTMLButtonElement>;
    private cards: NodeListOf<HTMLElement>;
    private glider: HTMLElement | null;
    private activeFilter: string = 'all';

    constructor(sectionSelector: string = '#testimonials') {
        this.sectionEl = document.querySelector<HTMLElement>(sectionSelector);
        this.filterButtons = document.querySelectorAll<HTMLButtonElement>('.testimonial-filter-btn');
        this.cards = document.querySelectorAll<HTMLElement>('.testimonial-card');
        this.glider = document.getElementById('testimonialsFilterGlider');

        if (!this.sectionEl) return;
        this.init();
    }

    public getActiveFilter(): string {
        return this.activeFilter;
    }

    private init(): void {
        this.initSpotlightEffects();
        this.initFilterTabs();
        this.initExpansionDrawers();
        this.initCopyButtons();
        this.updateGliderPosition();

        window.addEventListener('resize', () => this.updateGliderPosition(), { passive: true });
    }

    /**
     * Mouse & Touch Dynamic Spotlight:
     * Calculates relative coordinates on each card for radial metallic sheen
     */
    private initSpotlightEffects(): void {
        this.cards.forEach((card) => {
            card.addEventListener('pointermove', (e: PointerEvent) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                card.style.setProperty('--spotlight-x', `${x}px`);
                card.style.setProperty('--spotlight-y', `${y}px`);
                card.style.setProperty('--spotlight-opacity', '1');
            });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--spotlight-opacity', '0');
            });

            // Focus states for accessibility
            card.addEventListener('focus', () => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--spotlight-x', `${rect.width / 2}px`);
                card.style.setProperty('--spotlight-y', `${rect.height / 3}px`);
                card.style.setProperty('--spotlight-opacity', '0.75');
            });

            card.addEventListener('blur', () => {
                card.style.setProperty('--spotlight-opacity', '0');
            });
        });
    }

    /**
     * Role-based filter tabs with keyboard navigation
     */
    private initFilterTabs(): void {
        const tabsArray = Array.from(this.filterButtons);

        tabsArray.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.setActiveFilter(btn.getAttribute('data-filter') || 'all', btn);
            });

            // Keyboard navigation (ARIA tablist standard)
            btn.addEventListener('keydown', (e: KeyboardEvent) => {
                let targetIndex = -1;
                if (e.key === 'ArrowRight') {
                    targetIndex = (index + 1) % tabsArray.length;
                } else if (e.key === 'ArrowLeft') {
                    targetIndex = (index - 1 + tabsArray.length) % tabsArray.length;
                } else if (e.key === 'Home') {
                    targetIndex = 0;
                } else if (e.key === 'End') {
                    targetIndex = tabsArray.length - 1;
                }

                if (targetIndex !== -1) {
                    e.preventDefault();
                    const targetBtn = tabsArray[targetIndex];
                    targetBtn.focus();
                    this.setActiveFilter(targetBtn.getAttribute('data-filter') || 'all', targetBtn);
                }
            });
        });
    }

    /**
     * Updates active filter tab, ARIA attributes, and filters the card grid
     */
    public setActiveFilter(filterId: string, triggerBtn?: HTMLButtonElement): void {
        this.activeFilter = filterId;

        this.filterButtons.forEach((btn) => {
            const isMatch = btn.getAttribute('data-filter') === filterId;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            btn.setAttribute('tabindex', isMatch ? '0' : '-1');
            if (isMatch && !triggerBtn) {
                triggerBtn = btn;
            }
        });

        if (triggerBtn) {
            this.updateGliderPosition(triggerBtn);
        }

        // Filter cards with smooth entrance
        this.cards.forEach((card) => {
            const cardCat = card.getAttribute('data-category');
            const shouldShow = filterId === 'all' || cardCat === filterId;

            if (shouldShow) {
                card.hidden = false;
                card.style.display = '';
                requestAnimationFrame(() => {
                    card.classList.remove('is-hidden');
                    card.classList.add('is-visible');
                });
            } else {
                card.classList.remove('is-visible');
                card.classList.add('is-hidden');
                setTimeout(() => {
                    if (card.classList.contains('is-hidden')) {
                        card.hidden = true;
                        card.style.display = 'none';
                    }
                }, 240);
            }
        });
    }

    /**
     * Positions the sliding indicator glider beneath the active tab
     */
    private updateGliderPosition(activeBtn?: HTMLElement): void {
        if (!this.glider) return;
        const target = activeBtn || this.sectionEl?.querySelector<HTMLElement>('.testimonial-filter-btn.active');
        if (!target) {
            this.glider.style.opacity = '0';
            return;
        }

        const offsetLeft = target.offsetLeft;
        const offsetWidth = target.offsetWidth;

        this.glider.style.width = `${offsetWidth}px`;
        this.glider.style.transform = `translateX(${offsetLeft}px)`;
        this.glider.style.opacity = '1';
    }

    /**
     * Handles "Full Perspective" context drawer expansion
     */
    private initExpansionDrawers(): void {
        const expandBtns = this.sectionEl?.querySelectorAll<HTMLButtonElement>('.testimonial-expand-btn');
        expandBtns?.forEach((btn) => {
            btn.addEventListener('click', (e: MouseEvent) => {
                e.stopPropagation();
                const targetId = btn.getAttribute('data-target');
                if (!targetId) return;

                const drawer = document.getElementById(targetId);
                if (!drawer) return;

                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                const nextState = !isExpanded;

                btn.setAttribute('aria-expanded', String(nextState));
                const textSpan = btn.querySelector<HTMLElement>('.btn-text');

                if (nextState) {
                    drawer.hidden = false;
                    drawer.classList.add('is-open');
                    if (textSpan) textSpan.textContent = 'Less Context';
                } else {
                    drawer.classList.remove('is-open');
                    drawer.hidden = true;
                    if (textSpan) textSpan.textContent = 'Full Perspective';
                }
            });
        });
    }

    /**
     * Handles clipboard copy action for quote sharing
     */
    private initCopyButtons(): void {
        const copyBtns = this.sectionEl?.querySelectorAll<HTMLButtonElement>('.testimonial-copy-btn');
        copyBtns?.forEach((btn) => {
            btn.addEventListener('click', async (e: MouseEvent) => {
                e.stopPropagation();
                const quoteText = btn.getAttribute('data-quote');
                if (!quoteText) return;

                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(quoteText);
                    } else {
                        // Fallback textarea method
                        const textarea = document.createElement('textarea');
                        textarea.value = quoteText;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    }

                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.classList.remove('copied');
                    }, 2200);
                } catch {
                    // Clipboard permissions failure fallback
                }
            });
        });
    }
}
