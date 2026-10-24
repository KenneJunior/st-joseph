/**
 * ============================================================================
 * SJCCC – Interactive Testimonials Section Controller
 * Mobile-First Carousel Architecture with:
 * - Single featured card on mobile with Prev/Next, Dots & "1 of N" Counter
 * - Prestigious visual hierarchy on desktop with featured card and flanking previews
 * - Interactive role filter tabs with animated glider and dynamic count sync
 * - Natural touch swipe gestures with horizontal axis locking (no vertical interference)
 * - Accessible keyboard navigation (ArrowLeft, ArrowRight, Home, End)
 * - Stable height layout (zero vertical jumps) and prefers-reduced-motion compliance
 * - Dynamic spotlight lighting, expansion context drawers, and clipboard quote sharing.
 * ============================================================================
 */

export class TestimonialsSection {
    private sectionEl: HTMLElement | null;
    private stageEl: HTMLElement | null = null;
    private trackEl: HTMLElement | null = null;
    private allCards: HTMLElement[] = [];
    private visibleCards: HTMLElement[] = [];
    private filterButtons: NodeListOf<HTMLButtonElement>;
    private glider: HTMLElement | null;
    private prevBtn: HTMLButtonElement | null = null;
    private nextBtn: HTMLButtonElement | null = null;
    private currentIndexEl: HTMLElement | null = null;
    private totalCountEl: HTMLElement | null = null;
    private paginationEl: HTMLElement | null = null;
    private paginationGlider: HTMLElement | null = null;
    private activeFilter: string = 'all';
    private currentSlideIndex: number = 0;

    // Gesture tracking state
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;
    private isAxisLocked: boolean = false;
    private isHorizontalSwipe: boolean = false;
    private isGestureActive: boolean = false;
    private hasDragged: boolean = false;
    private activePointerId: number | null = null;

    // Resize debounce RAF
    private resizeRafId: number | null = null;

    constructor(sectionSelector: string = '#testimonials') {
        this.sectionEl = document.querySelector<HTMLElement>(sectionSelector);
        this.filterButtons = document.querySelectorAll<HTMLButtonElement>('.testimonial-filter-btn');
        this.glider = document.getElementById('testimonialsFilterGlider');

        if (!this.sectionEl) return;
        this.init();
    }

    public getActiveFilter(): string {
        return this.activeFilter;
    }

    public getCurrentIndex(): number {
        return this.currentSlideIndex;
    }

    public getVisibleCount(): number {
        return this.visibleCards.length;
    }

    public getPaginationGlider(): HTMLElement | null {
        return this.paginationGlider;
    }

    public getPaginationGliderTargetIndex(): number {
        return Number(this.paginationGlider?.getAttribute('data-target-index') ?? 0);
    }

    private init(): void {
        this.stageEl = this.sectionEl?.querySelector<HTMLElement>('#testimonialsStage') || null;
        this.trackEl = this.sectionEl?.querySelector<HTMLElement>('#testimonialsGrid') || null;
        this.allCards = Array.from(this.sectionEl?.querySelectorAll<HTMLElement>('.testimonial-card') || []);
        this.visibleCards = [...this.allCards];

        this.prevBtn = this.sectionEl?.querySelector<HTMLButtonElement>('#testimonialsPrevBtn') || null;
        this.nextBtn = this.sectionEl?.querySelector<HTMLButtonElement>('#testimonialsNextBtn') || null;
        this.currentIndexEl = this.sectionEl?.querySelector<HTMLElement>('#testimonialsCurrentIndex') || null;
        this.totalCountEl = this.sectionEl?.querySelector<HTMLElement>('#testimonialsTotalCount') || null;
        this.paginationEl = this.sectionEl?.querySelector<HTMLElement>('#testimonialsPagination') || null;
        this.paginationGlider = this.paginationEl?.querySelector<HTMLElement>('#testimonialPaginationGlider') || null;

        this.initSpotlightEffects();
        this.initFilterTabs();
        this.initExpansionDrawers();
        this.initCopyButtons();
        this.initCarouselControls();
        this.initTouchGestures();
        this.initKeyboardNavigation();
        this.initCardClickNavigation();
        this.updateGliderPosition();
        this.updatePaginationDots();
        this.goToSlide(0, { immediate: true });

        window.addEventListener('resize', () => {
            if (this.resizeRafId !== null) cancelAnimationFrame(this.resizeRafId);
            this.resizeRafId = requestAnimationFrame(() => {
                this.updateGliderPosition();
                this.updatePaginationGliderPosition();
                this.updateTrackPosition(true);
            });
        }, { passive: true });
    }

    /**
     * Mouse & Touch Dynamic Spotlight:
     * Calculates relative coordinates on each card for radial metallic sheen
     */
    private initSpotlightEffects(): void {
        this.allCards.forEach((card) => {
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
     * Prev / Next Button Controls
     */
    private initCarouselControls(): void {
        this.prevBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.prev();
        });

        this.nextBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.next();
        });
    }

    /**
     * Flanking Card Click:
     * On desktop and tablet, clicking an adjacent preview card brings it into focus
     */
    private initCardClickNavigation(): void {
        this.allCards.forEach((card) => {
            card.addEventListener('click', (e) => {
                if (this.hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                // If user clicked inside an action button or drawer, ignore card activation
                const target = e.target as HTMLElement | null;
                if (target?.closest('.testimonial-actions') || target?.closest('.testimonial-expansion')) {
                    return;
                }

                if (!card.classList.contains('is-active')) {
                    const idx = this.visibleCards.indexOf(card);
                    if (idx !== -1) {
                        e.preventDefault();
                        this.goToSlide(idx);
                    }
                }
            });
        });
    }

    /**
     * Touch & Pointer Swipe Gestures:
     * - Pure horizontal swipe recognition with deliberate 8px deadband to verify intent
     * - Uninhibited native vertical scrolling when moving vertically (no preventDefault if not horizontal)
     * - Protection against accidental clicks after dragging
     * - Bypasses interactive elements (buttons, links, inputs)
     * - Subtle, stable visual feedback with dampened drag translation during interaction
     * - Safe handling for pointercancel / touchcancel
     */
    private initTouchGestures(): void {
        if (!this.stageEl) return;

        // Prevent accidental clicks after dragging anywhere in the carousel stage
        this.stageEl.addEventListener('click', (e: MouseEvent) => {
            if (this.hasDragged) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true });

        // Touch Events (iOS & Android touch engines)
        this.stageEl.addEventListener('touchstart', (e: TouchEvent) => {
            if (this.activePointerId !== null) return;
            const touch = e.touches[0];
            const target = e.target as HTMLElement | null;
            this.handleGestureStart(touch.clientX, touch.clientY, target);
        }, { passive: true });

        this.stageEl.addEventListener('touchmove', (e: TouchEvent) => {
            if (!this.isGestureActive) return;
            const touch = e.touches[0];
            this.handleGestureMove(touch.clientX, touch.clientY, e);
        }, { passive: false });

        this.stageEl.addEventListener('touchend', (e: TouchEvent) => {
            if (!this.isGestureActive) return;
            const touch = e.changedTouches[0];
            this.handleGestureEnd(touch.clientX, touch.clientY);
        }, { passive: true });

        this.stageEl.addEventListener('touchcancel', () => {
            this.handleGestureCancel();
        }, { passive: true });

        // Pointer Events (Modern browser standard across touch & pointer devices)
        this.stageEl.addEventListener('pointerdown', (e: PointerEvent) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (this.isGestureActive && this.activePointerId === null) return;
            const target = e.target as HTMLElement | null;
            if (this.handleGestureStart(e.clientX, e.clientY, target)) {
                this.activePointerId = e.pointerId;
            }
        });

        this.stageEl.addEventListener('pointermove', (e: PointerEvent) => {
            if (this.activePointerId !== e.pointerId) return;
            this.handleGestureMove(e.clientX, e.clientY, e);
        });

        this.stageEl.addEventListener('pointerup', (e: PointerEvent) => {
            if (this.activePointerId !== e.pointerId) return;
            this.handleGestureEnd(e.clientX, e.clientY);
            this.activePointerId = null;
        });

        this.stageEl.addEventListener('pointercancel', (e: PointerEvent) => {
            if (this.activePointerId !== e.pointerId) return;
            this.handleGestureCancel();
            this.activePointerId = null;
        });
    }

    private handleGestureStart(clientX: number, clientY: number, target: HTMLElement | null): boolean {
        if (this.visibleCards.length <= 1) return false;

        // Ignore gestures originating on interactive elements
        const isInteractive = Boolean(
            target?.closest('button, a, input, textarea, select, [role="button"], [data-action], .testimonial-actions, .testimonial-expand-btn, .testimonial-copy-btn')
        );
        if (isInteractive) return false;

        this.touchStartX = clientX;
        this.touchStartY = clientY;
        this.touchStartTime = Date.now();
        this.isAxisLocked = false;
        this.isHorizontalSwipe = false;
        this.isGestureActive = true;
        this.hasDragged = false;
        return true;
    }

    private handleGestureMove(clientX: number, clientY: number, cancelableEvent?: Event): void {
        if (!this.isGestureActive) return;

        const diffX = clientX - this.touchStartX;
        const diffY = clientY - this.touchStartY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (!this.isAxisLocked) {
            if (absX >= 8 || absY >= 8) {
                this.isAxisLocked = true;
                this.isHorizontalSwipe = absX >= absY;
            }
        }

        if (this.isHorizontalSwipe) {
            // Prevent vertical page scroll interference only during confirmed horizontal swipe
            if (cancelableEvent && cancelableEvent.cancelable) {
                cancelableEvent.preventDefault();
            }

            if (absX > 10) {
                this.hasDragged = true;
            }

            // Subtle, readable feedback: dampened horizontal translation on active card
            const activeCard = this.visibleCards[this.currentSlideIndex];
            if (activeCard) {
                const dampening = 0.35;
                const clampedOffset = Math.max(-50, Math.min(50, diffX * dampening));
                activeCard.style.transition = 'none';
                activeCard.style.transform = `translateX(${clampedOffset}px)`;
            }
        }
    }

    private handleGestureEnd(clientX: number, _clientY?: number): void {
        if (!this.isGestureActive) return;

        const activeCard = this.visibleCards[this.currentSlideIndex];
        if (activeCard) {
            activeCard.style.transition = '';
            activeCard.style.transform = '';
        }

        const wasHorizontal = this.isHorizontalSwipe;
        const diffX = clientX - this.touchStartX;
        const duration = Date.now() - this.touchStartTime;
        const velocity = Math.abs(diffX) / Math.max(1, duration);

        this.isGestureActive = false;
        this.isAxisLocked = false;
        this.isHorizontalSwipe = false;

        if (this.hasDragged) {
            setTimeout(() => {
                this.hasDragged = false;
            }, 80);
        }

        if (!wasHorizontal) return;

        // Deliberate swipe threshold (50px) or quick flick (>25px with velocity >=0.3 px/ms)
        const SWIPE_THRESHOLD = 50;
        const FLICK_DISTANCE = 25;
        const FLICK_VELOCITY = 0.3;

        if (diffX <= -SWIPE_THRESHOLD || (diffX <= -FLICK_DISTANCE && velocity >= FLICK_VELOCITY)) {
            this.next();
        } else if (diffX >= SWIPE_THRESHOLD || (diffX >= FLICK_DISTANCE && velocity >= FLICK_VELOCITY)) {
            this.prev();
        }
    }

    private handleGestureCancel(): void {
        const activeCard = this.visibleCards[this.currentSlideIndex];
        if (activeCard) {
            activeCard.style.transition = '';
            activeCard.style.transform = '';
        }
        this.isGestureActive = false;
        this.isAxisLocked = false;
        this.isHorizontalSwipe = false;
        if (this.hasDragged) {
            setTimeout(() => {
                this.hasDragged = false;
            }, 80);
        }
    }

    /**
     * Programmatic swipe gesture trigger for tests and accessible shortcuts
     */
    public triggerSwipeGesture(diffX: number, velocity: number = 0.4): boolean {
        if (this.visibleCards.length <= 1) return false;
        const SWIPE_THRESHOLD = 50;
        const FLICK_DISTANCE = 25;
        const FLICK_VELOCITY = 0.3;

        if (diffX <= -SWIPE_THRESHOLD || (diffX <= -FLICK_DISTANCE && velocity >= FLICK_VELOCITY)) {
            this.next();
            return true;
        } else if (diffX >= SWIPE_THRESHOLD || (diffX >= FLICK_DISTANCE && velocity >= FLICK_VELOCITY)) {
            this.prev();
            return true;
        }
        return false;
    }

    /**
     * Keyboard Navigation:
     * Arrow keys navigate slides when focused within the section
     */
    private initKeyboardNavigation(): void {
        this.sectionEl?.addEventListener('keydown', (e: KeyboardEvent) => {
            const activeEl = document.activeElement as HTMLElement | null;
            if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

            // Only intercept ArrowLeft/ArrowRight if focus is on carousel elements or cards
            const isInsideCarousel = activeEl && (
                activeEl.closest('.testimonials-carousel') ||
                activeEl.classList.contains('testimonial-card') ||
                activeEl.classList.contains('testimonial-filter-btn')
            );

            if (!isInsideCarousel) return;

            // Don't intercept filter buttons left/right (they have their own tablist handler)
            if (activeEl?.classList.contains('testimonial-filter-btn')) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.next();
            }
        });
    }

    /**
     * Advances to next testimonial
     */
    public next(): void {
        if (this.visibleCards.length <= 1) return;
        this.goToSlide(this.currentSlideIndex + 1);
    }

    /**
     * Regresses to previous testimonial
     */
    public prev(): void {
        if (this.visibleCards.length <= 1) return;
        this.goToSlide(this.currentSlideIndex - 1);
    }

    /**
     * Navigates to a specific slide index with boundary wrap-around
     */
    public goToSlide(index: number, options: { immediate?: boolean } = {}): void {
        const count = this.visibleCards.length;
        if (count === 0) return;

        let targetIndex = index;
        if (targetIndex < 0) {
            targetIndex = count - 1;
        } else if (targetIndex >= count) {
            targetIndex = 0;
        }

        this.currentSlideIndex = targetIndex;

        // Synchronize active states on cards
        this.visibleCards.forEach((card, i) => {
            const isActive = i === targetIndex;
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
            card.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // Update position counter
        if (this.currentIndexEl) {
            this.currentIndexEl.textContent = String(targetIndex + 1);
        }
        if (this.totalCountEl) {
            this.totalCountEl.textContent = String(count);
        }

        // Update pagination dots
        if (this.paginationEl) {
            const dots = this.paginationEl.querySelectorAll<HTMLButtonElement>('.testimonial-dot');
            dots.forEach((dot, i) => {
                const isActive = i === targetIndex;
                dot.classList.toggle('is-active', isActive);
                dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
                dot.setAttribute('tabindex', isActive ? '0' : '-1');
            });
        }

        // Update traveling gold pagination indicator glider
        this.updatePaginationGliderPosition(options.immediate);

        // Prev/Next buttons availability
        const isSingle = count <= 1;
        if (this.prevBtn) this.prevBtn.disabled = isSingle;
        if (this.nextBtn) this.nextBtn.disabled = isSingle;

        // Move track
        this.updateTrackPosition(options.immediate);
    }

    /**
     * Positions the track so the active card is centered in the viewport
     */
    public updateTrackPosition(immediate: boolean = false): void {
        if (!this.trackEl || !this.stageEl) return;
        const activeCard = this.visibleCards[this.currentSlideIndex];
        if (!activeCard) return;

        const prefersReducedMotion = typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (immediate || prefersReducedMotion) {
            this.trackEl.style.transition = 'none';
        } else {
            this.trackEl.style.transition = '';
        }

        const stageWidth = this.stageEl.offsetWidth;
        const cardWidth = activeCard.offsetWidth;
        const cardLeft = activeCard.offsetLeft;

        // When layout is rendered in real browser:
        if (stageWidth > 0 && cardWidth > 0) {
            const translateX = (stageWidth / 2) - (cardLeft + cardWidth / 2);
            this.trackEl.style.transform = `translateX(${Math.round(translateX)}px)`;
        } else {
            // Headless / JSDOM fallback
            this.trackEl.style.transform = `translateX(-${this.currentSlideIndex * 100}%)`;
        }

        this.trackEl.setAttribute('data-active-index', String(this.currentSlideIndex));
        this.trackEl.setAttribute('data-visible-count', String(this.visibleCards.length));

        if (immediate && !prefersReducedMotion) {
            requestAnimationFrame(() => {
                if (this.trackEl) {
                    this.trackEl.style.transition = '';
                }
            });
        }
    }

    /**
     * Renders or updates pagination dots matching current visible cards
     */
    private updatePaginationDots(): void {
        if (!this.paginationEl) return;
        this.paginationEl.innerHTML = '';

        // Glider element for traveling gold indicator
        this.paginationGlider = document.createElement('span');
        this.paginationGlider.className = 'testimonial-pagination-glider';
        this.paginationGlider.id = 'testimonialPaginationGlider';
        this.paginationGlider.setAttribute('aria-hidden', 'true');
        this.paginationGlider.setAttribute('data-target-index', String(this.currentSlideIndex));
        this.paginationEl.appendChild(this.paginationGlider);

        this.visibleCards.forEach((card, index) => {
            const author = card.querySelector('.testimonial-author')?.textContent || `Testimonial ${index + 1}`;
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `testimonial-dot ${index === this.currentSlideIndex ? 'is-active' : ''}`;
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-selected', index === this.currentSlideIndex ? 'true' : 'false');
            dot.setAttribute('aria-label', `Testimonial ${index + 1}: ${author}`);
            dot.setAttribute('tabindex', index === this.currentSlideIndex ? '0' : '-1');
            dot.dataset.index = String(index);

            dot.addEventListener('click', () => {
                this.goToSlide(index);
            });

            dot.addEventListener('keydown', (e: KeyboardEvent) => {
                let targetDotIndex = -1;
                const dots = Array.from(this.paginationEl?.querySelectorAll<HTMLButtonElement>('.testimonial-dot') || []);

                if (e.key === 'ArrowRight') {
                    targetDotIndex = (index + 1) % dots.length;
                } else if (e.key === 'ArrowLeft') {
                    targetDotIndex = (index - 1 + dots.length) % dots.length;
                } else if (e.key === 'Home') {
                    targetDotIndex = 0;
                } else if (e.key === 'End') {
                    targetDotIndex = dots.length - 1;
                }

                if (targetDotIndex !== -1) {
                    e.preventDefault();
                    dots[targetDotIndex].focus();
                    this.goToSlide(targetDotIndex);
                }
            });

            this.paginationEl!.appendChild(dot);
        });

        this.updatePaginationGliderPosition(true);
    }

    /**
     * Smoothly translates the active gold indicator glider horizontally across pagination dots
     */
    public updatePaginationGliderPosition(immediate: boolean = false): void {
        if (!this.paginationEl) return;
        if (!this.paginationGlider) {
            this.paginationGlider = this.paginationEl.querySelector<HTMLElement>('#testimonialPaginationGlider') || null;
        }
        if (!this.paginationGlider) return;

        const dots = this.paginationEl.querySelectorAll<HTMLButtonElement>('.testimonial-dot');
        const activeDot = dots[this.currentSlideIndex];
        if (!activeDot) {
            this.paginationGlider.style.opacity = '0';
            return;
        }

        const prefersReducedMotion = typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (immediate || prefersReducedMotion) {
            this.paginationGlider.style.transition = 'none';
        } else {
            this.paginationGlider.style.transition = '';
        }

        const gliderWidth = 22;
        const dotLeft = activeDot.offsetLeft;
        const dotWidth = activeDot.offsetWidth || 10;

        let targetX = 0;
        if (dotLeft > 0 || activeDot.offsetWidth > 0) {
            targetX = dotLeft + (dotWidth / 2) - (gliderWidth / 2);
        } else {
            // Headless / JSDOM fallback
            // padding-left: 6px, dot: 10px, gap: 10px -> step is 20px
            const paddingLeft = 6;
            const step = 20;
            targetX = paddingLeft + (this.currentSlideIndex * step) + (10 / 2) - (gliderWidth / 2);
        }

        this.paginationGlider.style.transform = `translate(${Math.round(targetX)}px, -50%)`;
        this.paginationGlider.style.width = `${gliderWidth}px`;
        this.paginationGlider.style.opacity = '1';
        this.paginationGlider.setAttribute('data-target-index', String(this.currentSlideIndex));

        if (immediate && !prefersReducedMotion) {
            requestAnimationFrame(() => {
                if (this.paginationGlider) {
                    this.paginationGlider.style.transition = '';
                }
            });
        }
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
     * Updates active filter tab, ARIA attributes, and filters the carousel cards
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

        // Filter cards
        this.visibleCards = [];
        this.allCards.forEach((card) => {
            const cardCat = card.getAttribute('data-category');
            const shouldShow = filterId === 'all' || cardCat === filterId;

            if (shouldShow) {
                card.hidden = false;
                card.style.display = '';
                card.classList.remove('is-hidden');
                card.classList.add('is-visible');
                this.visibleCards.push(card);
            } else {
                card.classList.remove('is-visible', 'is-active');
                card.classList.add('is-hidden');
                card.hidden = true;
                card.style.display = 'none';
            }
        });

        // Reset to first slide of filtered set
        this.currentSlideIndex = 0;
        this.updatePaginationDots();
        this.goToSlide(0, { immediate: true });
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

                // Re-align track position after height transition
                requestAnimationFrame(() => {
                    this.updateTrackPosition(false);
                });
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
                    // Clipboard error fallback
                }
            });
        });
    }
}
