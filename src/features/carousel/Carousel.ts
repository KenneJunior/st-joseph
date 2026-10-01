/**
 * ============================================================================
 * SJCCC – Campus Life Carousel
 * Refined & Hardened Motion Architecture
 *
 * 3D depth-aware, pointer-draggable, velocity-snapping, responsive carousel.
 *
 * Design principles:
 * - Preserves native vertical document scrolling.
 * - Uses touch-action: pan-y with horizontal axis locking.
 * - currentPosition is the authoritative continuous visual coordinate.
 * - No continuously running RAF loop.
 * - Reduced-motion is respected at runtime.
 * - Geometry is measured once and exposed through CSS custom properties.
 * - Physical dragging is finite; button/dot navigation may wrap.
 * - Lifecycle cleanup is explicit and complete.
 * ============================================================================
 */

export interface CarouselMotionConfig {
    /**
     * Autoplay delay in milliseconds.
     * Set to 0 to disable autoplay.
     */
    autoplayDelay: number;

    /**
     * Snap animation duration in milliseconds.
     */
    transitionDuration: number;

    /**
     * Width ratio of the active slide relative to the carousel container.
     */
    activeSlideWidthRatio: number;

    /**
     * Gap between adjacent slides in pixels.
     */
    slideGap: number;

    /**
     * Maximum Y-axis rotation of flanking slides.
     */
    maxRotationDegrees: number;

    /**
     * Scale factor of inactive flanking slides.
     */
    neighborScale: number;

    /**
     * CSS perspective depth in pixels.
     */
    perspective: number;

    /**
     * Pointer deadband before gesture intent is evaluated.
     */
    dragDeadband: number;

    /**
     * Fraction of slide width required to trigger a positional slide change.
     */
    dragThresholdRatio: number;

    /**
     * Horizontal pointer velocity threshold in px/ms for a flick.
     */
    velocityFlickThreshold: number;

    /**
     * Asymptotic rubber-band resistance limit relative to one slide step.
     */
    dragResistance: number;

    /**
     * Internal image/caption parallax multiplier.
     */
    parallaxFactor: number;
}

export const DEFAULT_CAROUSEL_CONFIG: CarouselMotionConfig = {
    autoplayDelay: 5000,
    transitionDuration: 460,
    activeSlideWidthRatio: 0.80,
    slideGap: 18,
    maxRotationDegrees: 28,
    neighborScale: 0.82,
    perspective: 1200,
    dragDeadband: 8,
    dragThresholdRatio: 0.20,
    velocityFlickThreshold: 0.32,
    dragResistance: 0.55,
    parallaxFactor: 0.15,
};

interface PointerSample {
    x: number;
    time: number;
}

export class Carousel {
    private slides: HTMLElement[] = [];
    private prevBtn: HTMLButtonElement | null = null;
    private nextBtn: HTMLButtonElement | null = null;
    private container: HTMLElement | null = null;
    private track: HTMLElement | null = null;
    private thumbnailsContainer: HTMLElement | null = null;
    private thumbnails: HTMLButtonElement[] = [];

    private config: CarouselMotionConfig;

    /**
     * Discrete logical slide index.
     */
    private currentIndex = 0;

    /**
     * Authoritative continuous visual coordinate.
     *
     * Examples:
     *   0     = first slide centered
     *   1     = second slide centered
     *   0.5   = halfway between first and second
     *
     * During physical dragging this may temporarily exceed [0, lastIndex]
     * through the rubber-band region.
     */
    private currentPosition = 0;

    // -------------------------------------------------------------------------
    // Geometry
    // -------------------------------------------------------------------------

    private slideWidth = 0;
    private slideGap = 18;
    private resolvedMaxRotation = 10;

    // -------------------------------------------------------------------------
    // Pointer interaction
    // -------------------------------------------------------------------------

    private isPointerDown = false;
    private isDragging = false;
    private wasDragging = false;

    private dragAxis: 'x' | 'y' | null = null;

    private startX = 0;
    private startY = 0;

    /**
     * Exact continuous position captured at pointerdown.
     * This prevents interrupted snap animations from re-anchoring to
     * currentIndex and visually jumping.
     */
    private startPosition = 0;

    private activePointerId: number | null = null;

    /**
     * Bounded recent pointer samples used for release velocity.
     */
    private pointerSamples: PointerSample[] = [];

    // -------------------------------------------------------------------------
    // Animation / lifecycle
    // -------------------------------------------------------------------------

    private snapRafId: number | null = null;
    private autoPlayTimer: number | null = null;
    private autoplayRemaining = 0;
    private autoplayStartTimestamp = 0;
    private isAutoplayPaused = false;

    private progressBar: HTMLElement | null = null;
    private isTrackHovered = false;
    private focusedSlide: HTMLElement | null = null;

    private isIntersecting = true;

    private resizeObserver: ResizeObserver | null = null;
    private intersectionObserver: IntersectionObserver | null = null;

    private reducedMotionQuery: MediaQueryList | null = null;

    /**
     * Explicitly tracks whether the user currently has focus inside the
     * carousel. Autoplay must not resume simply because focus moved between
     * carousel controls.
     */
    private hasCarouselFocus = false;

    /**
     * Tracks whether the carousel has been explicitly paused by the user.
     *
     * Currently this is reserved for a future visible pause/play control.
     * Keeping the state here prevents lifecycle logic from conflating
     * hover/focus pauses with an intentional user pause.
     */
    private autoplayPausedByUser = false;

    // -------------------------------------------------------------------------
    // Bound listener references
    // -------------------------------------------------------------------------

    private handlePointerDown: ((e: PointerEvent) => void) | null = null;
    private handlePointerMove: ((e: PointerEvent) => void) | null = null;
    private handlePointerUp: ((e: PointerEvent) => void) | null = null;
    private handleClickCapture: ((e: MouseEvent) => void) | null = null;

    // Touch swipe gestures
    private handleTouchStart: ((e: TouchEvent) => void) | null = null;
    private handleTouchMove: ((e: TouchEvent) => void) | null = null;
    private handleTouchEnd: ((e: TouchEvent) => void) | null = null;
    private touchStartX = 0;
    private touchStartY = 0;
    private touchStartPosition = 0;
    private isTouchDragging = false;
    private touchDragAxis: 'x' | 'y' | null = null;
    private touchSamples: PointerSample[] = [];

    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

    private handlePrevClick: ((e: MouseEvent) => void) | null = null;
    private handleNextClick: ((e: MouseEvent) => void) | null = null;

    private thumbScrollPrevBtn: HTMLButtonElement | null = null;
    private thumbScrollNextBtn: HTMLButtonElement | null = null;
    private handleThumbScrollPrevClick: (() => void) | null = null;
    private handleThumbScrollNextClick: (() => void) | null = null;
    private handleThumbWheel: ((e: WheelEvent) => void) | null = null;
    private handleThumbScroll: (() => void) | null = null;
    private handleThumbPointerDown: ((e: PointerEvent) => void) | null = null;
    private handleThumbPointerMove: ((e: PointerEvent) => void) | null = null;
    private handleThumbPointerUp: ((e: PointerEvent) => void) | null = null;
    private isThumbDragging = false;
    private thumbDragStartX = 0;
    private thumbScrollLeftStart = 0;
    private thumbHasDragged = false;

    private handleThumbnailsClick: ((e: MouseEvent) => void) | null = null;

    private handleMouseEnter: (() => void) | null = null;
    private handleMouseLeave: (() => void) | null = null;

    private handleTrackMouseEnter: (() => void) | null = null;
    private handleTrackMouseLeave: (() => void) | null = null;

    private handleSlideFocusIn: ((e: FocusEvent) => void) | null = null;
    private handleSlideFocusOut: ((e: FocusEvent) => void) | null = null;

    private handleFocusIn: (() => void) | null = null;
    private handleFocusOut: ((e: FocusEvent) => void) | null = null;

    private handleVisibilityChange: (() => void) | null = null;
    private handleOrientationChange: (() => void) | null = null;

    private handleReducedMotionChange:
        ((e: MediaQueryListEvent) => void) | null = null;

    // -------------------------------------------------------------------------
    // Construction
    // -------------------------------------------------------------------------

    constructor(
        slidesSelector: string = '.carousel-slide',
        prevBtnId: string = 'prevBtn',
        nextBtnId: string = 'nextBtn',
        containerSelector: string = '.carousel-container',
        options?: Partial<CarouselMotionConfig>
    ) {
        this.config = {
            ...DEFAULT_CAROUSEL_CONFIG,
            ...(options || {}),
        };

        this.container =
            document.querySelector<HTMLElement>('#campus .carousel-container') ||
            document.querySelector<HTMLElement>(containerSelector);

        if (!this.container) return;

        this.track =
            document.querySelector<HTMLElement>('#campus .carousel-track') ||
            this.container.querySelector<HTMLElement>('.carousel-track') ||
            this.container;

        this.slides = Array.from(
            this.container.querySelectorAll<HTMLElement>(slidesSelector)
        );

        this.prevBtn =
            document.getElementById(prevBtnId) as HTMLButtonElement | null;

        this.nextBtn =
            document.getElementById(nextBtnId) as HTMLButtonElement | null;

        if (this.slides.length === 0) return;

        this.init();
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    private init(): void {
        this.setupSemantics();
        this.setupProgressBar();
        this.setupThumbnails();

        this.measureGeometry();
        this.renderPositions();
        this.updateA11y();
        this.updateThumbnails();

        this.bindControls();
        this.bindPointer();
        this.bindTouchGestures();
        this.bindKeyboard();
        this.bindObservers();
        this.bindLifecycle();

        this.resetAutoPlay();
    }

    /**
     * Initializes the slick autoplay loading progress bar.
     */
    private setupProgressBar(): void {
        if (!this.container) return;

        this.progressBar = this.container.querySelector<HTMLElement>(
            '#carouselProgressBar, .carousel-progress-bar'
        );

        if (!this.progressBar) {
            const track = document.createElement('div');
            track.className = 'carousel-progress-track';
            track.setAttribute('aria-hidden', 'true');
            track.title = 'Slide timer';

            const bar = document.createElement('div');
            bar.className = 'carousel-progress-bar';
            bar.id = 'carouselProgressBar';

            track.appendChild(bar);
            this.container.appendChild(track);
            this.progressBar = bar;
        }
    }

    // =========================================================================
    // Accessibility
    // =========================================================================

    /**
     * Establishes carousel and slide semantics.
     */
    private setupSemantics(): void {
        if (!this.container) return;

        this.container.setAttribute('tabindex', '0');
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-roledescription', 'carousel');

        if (!this.container.getAttribute('aria-label')) {
            this.container.setAttribute(
                'aria-label',
                'Campus Life photo carousel. Use Left and Right arrow keys to navigate.'
            );
        }

        this.slides.forEach((slide, i) => {
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');

            const caption =
                slide
                    .querySelector('.carousel-caption')
                    ?.textContent
                    ?.trim();

            const label = caption
                ? caption.slice(0, 60)
                : `Campus photo ${i + 1}`;

            slide.setAttribute(
                'aria-label',
                `${i + 1} of ${this.slides.length}: ${label}`
            );
        });
    }

    /**
     * Updates slide accessibility state.
     *
     * Inactive slides become inert so their interactive descendants cannot
     * receive keyboard focus while hidden from the active visual state.
     *
     * Focus is moved to the carousel container BEFORE inert is applied to
     * the previously focused slide.
     */
    private updateA11y(): void {
        const activeEl = document.activeElement;

        this.slides.forEach((slide, i) => {
            const isActive = i === this.currentIndex;

            slide.setAttribute(
                'aria-hidden',
                isActive ? 'false' : 'true'
            );

            if (isActive) {
                slide.removeAttribute('inert');
                return;
            }

            if (activeEl && slide.contains(activeEl)) {
                this.container?.focus({
                    preventScroll: true,
                });
            }

            slide.setAttribute('inert', '');
        });
    }

    /**
     * Initializes direct navigation thumbnail row.
     */
    private setupThumbnails(): void {
        this.thumbnailsContainer =
            document.getElementById('carouselThumbnails') ||
            document.querySelector<HTMLElement>('.carousel-thumbnails');

        if (!this.thumbnailsContainer) return;

        const existingThumbs = Array.from(
            this.thumbnailsContainer.querySelectorAll<HTMLButtonElement>('.carousel-thumb')
        );

        if (existingThumbs.length === this.slides.length) {
            this.thumbnails = existingThumbs;
            this.thumbnails.forEach((btn) => {
                if (!btn.querySelector('.carousel-thumb-badge')) {
                    const img = btn.querySelector('.carousel-thumb-img');
                    if (img && !btn.querySelector('.carousel-thumb-img-wrap')) {
                        const wrap = document.createElement('div');
                        wrap.className = 'carousel-thumb-img-wrap';
                        img.parentNode?.insertBefore(wrap, img);
                        wrap.appendChild(img);
                        const hoverBadge = document.createElement('span');
                        hoverBadge.className = 'carousel-thumb-badge';
                        hoverBadge.setAttribute('aria-hidden', 'true');
                        hoverBadge.innerHTML = '<i class="bi bi-zoom-in" aria-hidden="true"></i> View Gallery';
                        wrap.appendChild(hoverBadge);
                    }
                }
            });
        } else {
            this.thumbnailsContainer.innerHTML = '';
            this.thumbnails = this.slides.map((slide, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'carousel-thumb';
                btn.setAttribute('data-slide-index', `${i}`);

                const img = slide.querySelector<HTMLImageElement>('.carousel-image');
                const kicker = slide.querySelector('.carousel-kicker')?.textContent?.trim();
                const title = slide.querySelector('.carousel-title, .carousel-caption h3')?.textContent?.trim() || `Slide ${i + 1}`;
                const label = slide.dataset.shortCaption || kicker || title;

                btn.setAttribute('aria-label', `Go to slide ${i + 1}: ${title}`);
                btn.title = `View Gallery: ${title}`;

                const imgWrap = document.createElement('div');
                imgWrap.className = 'carousel-thumb-img-wrap';

                const thumbImg = document.createElement('img');
                thumbImg.src = img?.getAttribute('src') || '';
                thumbImg.alt = `Thumbnail for ${title}`;
                thumbImg.className = 'carousel-thumb-img';
                thumbImg.loading = 'lazy';

                const hoverBadge = document.createElement('span');
                hoverBadge.className = 'carousel-thumb-badge';
                hoverBadge.setAttribute('aria-hidden', 'true');
                hoverBadge.innerHTML = '<i class="bi bi-zoom-in" aria-hidden="true"></i> View Gallery';

                imgWrap.appendChild(thumbImg);
                imgWrap.appendChild(hoverBadge);

                const caption = document.createElement('span');
                caption.className = 'carousel-thumb-caption';
                caption.textContent = label;

                btn.appendChild(imgWrap);
                btn.appendChild(caption);

                this.thumbnailsContainer?.appendChild(btn);
                return btn;
            });
        }

        // Bind direct click listeners to every thumbnail button
        this.thumbnails.forEach((btn, index) => {
            btn.addEventListener('click', (e: MouseEvent) => {
                if (this.thumbHasDragged) return;
                e.preventDefault();
                e.stopPropagation();
                this.goToSlide(index);
                this.resetAutoPlay();
            });
        });

        // Setup optional previous & next chevron scroll buttons
        this.thumbScrollPrevBtn = document.getElementById('thumbScrollPrev') as HTMLButtonElement | null;
        this.thumbScrollNextBtn = document.getElementById('thumbScrollNext') as HTMLButtonElement | null;

        if (this.thumbScrollPrevBtn) {
            this.handleThumbScrollPrevClick = () => {
                this.thumbnailsContainer?.scrollBy({ left: -280, behavior: 'smooth' });
            };
            this.thumbScrollPrevBtn.addEventListener('click', this.handleThumbScrollPrevClick);
        }

        if (this.thumbScrollNextBtn) {
            this.handleThumbScrollNextClick = () => {
                this.thumbnailsContainer?.scrollBy({ left: 280, behavior: 'smooth' });
            };
            this.thumbScrollNextBtn.addEventListener('click', this.handleThumbScrollNextClick);
        }

        // Horizontal mouse wheel scrolling over thumbnails
        this.handleThumbWheel = (e: WheelEvent): void => {
            if (!this.thumbnailsContainer) return;
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.thumbnailsContainer.scrollLeft += e.deltaY;
                this.updateThumbScrollButtons();
            }
        };
        this.thumbnailsContainer.addEventListener('wheel', this.handleThumbWheel, { passive: false });

        // Update scroll arrow buttons on scroll
        this.handleThumbScroll = (): void => {
            this.updateThumbScrollButtons();
        };
        this.thumbnailsContainer.addEventListener('scroll', this.handleThumbScroll, { passive: true });

        // Desktop mouse-drag scrolling (does not interfere with clicking or mobile touch)
        let hasCapturedPointer = false;

        this.handleThumbPointerDown = (e: PointerEvent): void => {
            if (e.pointerType === 'touch') {
                return; // Let touch screen use native touch pan-x scrolling
            }
            if (e.button !== 0 || !this.thumbnailsContainer) return;
            this.isThumbDragging = true;
            this.thumbHasDragged = false;
            hasCapturedPointer = false;
            this.thumbDragStartX = e.clientX;
            this.thumbScrollLeftStart = this.thumbnailsContainer.scrollLeft;
        };

        this.handleThumbPointerMove = (e: PointerEvent): void => {
            if (!this.isThumbDragging || !this.thumbnailsContainer) return;
            const deltaX = e.clientX - this.thumbDragStartX;
            if (Math.abs(deltaX) > 10) {
                this.thumbHasDragged = true;
                if (!hasCapturedPointer) {
                    try {
                        this.thumbnailsContainer.setPointerCapture?.(e.pointerId);
                        hasCapturedPointer = true;
                        this.thumbnailsContainer.classList.add('is-dragging');
                    } catch {
                        // Ignore unsupported
                    }
                }
                this.thumbnailsContainer.scrollLeft = this.thumbScrollLeftStart - deltaX;
                this.updateThumbScrollButtons();
            }
        };

        this.handleThumbPointerUp = (e: PointerEvent): void => {
            if (!this.isThumbDragging || !this.thumbnailsContainer) return;
            this.isThumbDragging = false;
            this.thumbnailsContainer.classList.remove('is-dragging');
            if (hasCapturedPointer) {
                try {
                    this.thumbnailsContainer.releasePointerCapture?.(e.pointerId);
                } catch {
                    // Ignore unsupported
                }
                hasCapturedPointer = false;
            }
            if (this.thumbHasDragged) {
                setTimeout(() => {
                    this.thumbHasDragged = false;
                }, 80);
            }
        };

        this.thumbnailsContainer.addEventListener('pointerdown', this.handleThumbPointerDown);
        this.thumbnailsContainer.addEventListener('pointermove', this.handleThumbPointerMove);
        this.thumbnailsContainer.addEventListener('pointerup', this.handleThumbPointerUp);
        this.thumbnailsContainer.addEventListener('pointercancel', this.handleThumbPointerUp);

        // Delegated fallback click handler
        this.handleThumbnailsClick = (e: MouseEvent): void => {
            if (this.thumbHasDragged) {
                return;
            }
            const target = e.target as HTMLElement | null;
            const thumb = target?.closest<HTMLButtonElement>('.carousel-thumb');

            if (!thumb || !this.thumbnailsContainer?.contains(thumb)) return;

            const indexAttr = thumb.getAttribute('data-slide-index');
            const index = indexAttr !== null ? parseInt(indexAttr, 10) : this.thumbnails.indexOf(thumb);

            if (index >= 0 && index < this.slides.length) {
                e.preventDefault();
                e.stopPropagation();
                this.goToSlide(index);
                this.resetAutoPlay();
            }
        };

        this.thumbnailsContainer.addEventListener('click', this.handleThumbnailsClick);
        this.updateThumbScrollButtons();
    }

    /**
     * Updates previous/next thumbnail scroll buttons disabled state.
     */
    private updateThumbScrollButtons(): void {
        if (!this.thumbnailsContainer) return;
        const { scrollLeft, scrollWidth, clientWidth } = this.thumbnailsContainer;
        if (this.thumbScrollPrevBtn) {
            const atStart = scrollLeft <= 4;
            this.thumbScrollPrevBtn.disabled = atStart;
            this.thumbScrollPrevBtn.setAttribute('aria-disabled', atStart ? 'true' : 'false');
        }
        if (this.thumbScrollNextBtn) {
            const atEnd = scrollLeft + clientWidth >= scrollWidth - 6;
            this.thumbScrollNextBtn.disabled = atEnd;
            this.thumbScrollNextBtn.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
        }
    }

    /**
     * Updates thumbnail active indicator & border and smoothly centers it.
     */
    private updateThumbnails(): void {
        this.thumbnails.forEach((thumb, i) => {
            const isActive = i === this.currentIndex;

            thumb.classList.toggle('active', isActive);
            thumb.classList.toggle('is-active', isActive);

            if (isActive) {
                thumb.setAttribute('aria-current', 'true');
                const container = this.thumbnailsContainer;
                if (container) {
                    const thumbLeft = thumb.offsetLeft;
                    const thumbWidth = thumb.offsetWidth;
                    const containerWidth = container.clientWidth;
                    const targetScrollLeft = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);
                    container.scrollTo({
                        left: Math.max(0, targetScrollLeft),
                        behavior: 'smooth',
                    });
                }
            } else {
                thumb.removeAttribute('aria-current');
            }
        });
        this.updateThumbScrollButtons();
    }

    // =========================================================================
    // Geometry
    // =========================================================================

    /**
     * Computes responsive geometry and writes the authoritative CSS values.
     */
    private measureGeometry(): void {
        if (!this.container) return;

        const containerWidth = this.container.clientWidth;
        const viewportWidth = window.innerWidth;

        let widthRatio = this.config.activeSlideWidthRatio;
        let gap = this.config.slideGap;
        let rotation = this.config.maxRotationDegrees;

        if (viewportWidth <= 480) {
            widthRatio = 0.90;
            gap = 10;
            rotation = 0;
        } else if (viewportWidth <= 768) {
            widthRatio = 0.86;
            gap = 12;
            rotation = 8;
        } else if (viewportWidth <= 1024) {
            widthRatio = 0.82;
            gap = 14;
            rotation = 18;
        }

        if (this.isReducedMotion()) {
            rotation = 0;
        }

        this.slideWidth = Math.max(
            1,
            Math.round(containerWidth * widthRatio)
        );

        this.slideGap = gap;
        this.resolvedMaxRotation = rotation;

        this.container.style.setProperty(
            '--carousel-slide-width',
            `${this.slideWidth}px`
        );

        this.container.style.setProperty(
            '--carousel-slide-gap',
            `${this.slideGap}px`
        );

        this.container.style.setProperty(
            '--carousel-perspective',
            `${this.config.perspective}px`
        );

        if (this.track && this.track !== this.container) {
            this.track.style.setProperty(
                '--carousel-slide-width',
                `${this.slideWidth}px`
            );

            this.track.style.setProperty(
                '--carousel-slide-gap',
                `${this.slideGap}px`
            );
        }

        this.renderPositions();
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    /**
     * Renders all visible slides from currentPosition.
     *
     * No layout reads occur here. Geometry was previously measured and cached.
     */
    private renderPositions(): void {
        const step = this.slideWidth + this.slideGap;

        if (step <= 0) return;

        const isReduced = this.isReducedMotion();
        const N = this.slides.length;
        if (N === 0) return;

        for (let i = 0; i < N; i++) {
            const slide = this.slides[i];

            // Shortest circular signed distance between slide i and currentPosition
            let dist = ((i - this.currentPosition) % N + N) % N;
            if (dist > N / 2) {
                dist -= N;
            }

            const absDist = Math.abs(dist);
            const roundedDist = Math.round(dist);

            // Distance attributes for CSS selectors
            slide.setAttribute('data-distance', `${roundedDist}`);
            slide.setAttribute('data-abs-distance', `${Math.abs(roundedDist)}`);

            // Cull slides outside the useful visual neighborhood.
            if (absDist > 2.4) {
                slide.style.opacity = '0';
                slide.style.visibility = 'hidden';
                slide.style.pointerEvents = 'none';

                slide.classList.remove(
                    'active',
                    'is-active'
                );

                continue;
            }

            slide.style.visibility = 'visible';

            // -------------------------------------------------------------
            // Horizontal position & 3D Z-Depth (translate3d)
            // -------------------------------------------------------------

            const translateX = Math.round(dist * step);
            const maxTranslateZ = 160; // px recession for depth
            const translateZ = isReduced ? 0 : -Math.min(absDist, 2.2) * maxTranslateZ;

            // -------------------------------------------------------------
            // Scale
            // -------------------------------------------------------------

            let scale = 1;

            if (!isReduced) {
                const scaleReduction =
                    Math.min(absDist, 1.8) *
                    (1 - this.config.neighborScale);

                scale = Math.max(
                    0.65,
                    1 - scaleReduction
                );
            }

            // -------------------------------------------------------------
            // Rotation (High 3D inward yaw)
            // -------------------------------------------------------------

            let rotateY = 0;

            if (
                !isReduced &&
                this.resolvedMaxRotation > 0
            ) {
                const rotationFactor =
                    Math.min(absDist, 1.4);

                rotateY =
                    -Math.sign(dist) *
                    rotationFactor *
                    this.resolvedMaxRotation;
            }

            // -------------------------------------------------------------
            // Opacity
            // -------------------------------------------------------------

            let opacity = 1;

            if (absDist > 0.05) {
                opacity = Math.max(
                    0.15,
                    1 -
                        Math.min(absDist, 1.6) *
                            0.32
                );
            }

            // -------------------------------------------------------------
            // Z-index
            // -------------------------------------------------------------

            const zIndex =
                Math.round(100 - absDist * 15);

            // -------------------------------------------------------------
            // Computer-only blur effect
            // -------------------------------------------------------------

            const isComputer =
                typeof window !== 'undefined' &&
                window.innerWidth >= 1025 &&
                window.matchMedia('(hover: hover) and (pointer: fine)').matches;

            let blurPx = 0;
            if (isComputer && !isReduced && absDist > 0.08) {
                blurPx = Math.min(8, absDist * 3.5);
            }

            // -------------------------------------------------------------
            // Expose CSS Custom Properties for stylesheet channels
            // -------------------------------------------------------------

            slide.style.setProperty('--carousel-distance', dist.toFixed(3));
            slide.style.setProperty('--carousel-abs-distance', absDist.toFixed(3));
            slide.style.setProperty('--slide-dist', dist.toFixed(3));
            slide.style.setProperty('--slide-abs-dist', absDist.toFixed(3));
            slide.style.setProperty('--slide-tx', `${translateX}px`);
            slide.style.setProperty('--slide-tz', `${translateZ.toFixed(1)}px`);
            slide.style.setProperty('--slide-scale', scale.toFixed(4));
            slide.style.setProperty('--slide-rotate-y', `${rotateY.toFixed(2)}deg`);
            slide.style.setProperty('--slide-blur', `${blurPx.toFixed(2)}px`);

            // -------------------------------------------------------------
            // Transform & Filter Application
            // -------------------------------------------------------------

            if (isReduced) {
                slide.style.transform =
                    `translate3d(${translateX}px, 0, 0)`;
                slide.style.filter = 'none';
            } else {
                slide.style.transform =
                    `translate3d(${translateX}px, 0, ${translateZ.toFixed(1)}px) ` +
                    `scale(${scale.toFixed(4)}) ` +
                    `rotateY(${rotateY.toFixed(2)}deg)`;

                if (isComputer) {
                    slide.style.filter =
                        blurPx > 0.1
                            ? `blur(${blurPx.toFixed(2)}px)`
                            : 'none';
                } else {
                    slide.style.filter = 'none';
                }
            }

            slide.style.opacity =
                opacity.toFixed(3);

            slide.style.zIndex =
                `${zIndex}`;

            // -------------------------------------------------------------
            // Internal parallax
            // -------------------------------------------------------------

            const img =
                slide.querySelector<HTMLElement>(
                    '.carousel-image'
                );

            const caption =
                slide.querySelector<HTMLElement>(
                    '.carousel-caption'
                );

            if (
                !isReduced &&
                this.config.parallaxFactor > 0
            ) {
                if (img) {
                    const imgOffset =
                        -dist *
                        16 *
                        this.config.parallaxFactor;

                    img.style.transform =
                        `translateX(${imgOffset.toFixed(1)}px) scale(1.04)`;
                }

                if (caption) {
                    if (this.isDragging || this.isTouchDragging) {
                        const captionOffset =
                            dist *
                            16 *
                            this.config.parallaxFactor;

                        const activeProgress =
                            Math.max(0, Math.min(1, 1 - absDist / 0.5));
                        const yOffset =
                            (1 - activeProgress) * 14;

                        caption.style.transform =
                            `translateX(${captionOffset.toFixed(1)}px) translateY(${yOffset.toFixed(1)}px)`;
                        caption.style.opacity =
                            activeProgress.toFixed(2);
                        caption.style.pointerEvents =
                            absDist < 0.45 ? 'auto' : 'none';
                    } else {
                        // Clear inline styles during settling and auto-rotation
                        // so CSS entry keyframes and transitions animate smoothly!
                        caption.style.transform = '';
                        caption.style.opacity = '';
                        caption.style.pointerEvents = '';
                    }
                }
            } else {
                // Explicitly reset runtime transforms when reduced motion
                // becomes active.
                if (img) {
                    img.style.transform = '';
                }

                if (caption) {
                    caption.style.transform = '';
                    caption.style.opacity = '';
                    caption.style.pointerEvents = '';
                }
            }

            // -------------------------------------------------------------
            // Active state
            // -------------------------------------------------------------

            if (absDist < 0.45) {
                slide.classList.add(
                    'active',
                    'is-active'
                );

                slide.style.pointerEvents =
                    'auto';
            } else {
                slide.classList.remove(
                    'active',
                    'is-active'
                );

                slide.style.pointerEvents =
                    'none';
            }
        }
    }

    // =========================================================================
    // Navigation
    // =========================================================================

    /**
     * Navigates to a slide.
     *
     * Round infinite circular navigation: after the last slide,
     * it seamlessly moves to the first slide as if it were the next.
     */
    public goToSlide(
        targetIndex: number,
        immediate = false
    ): void {
        const N = this.slides.length;
        if (N === 0) return;

        const normalizedTarget = ((targetIndex % N) + N) % N;

        this.stopSnapAnimation();

        if (
            immediate ||
            this.isReducedMotion()
        ) {
            this.currentIndex = normalizedTarget;
            this.currentPosition = normalizedTarget;

            this.renderPositions();
            this.updateA11y();
            this.updateThumbnails();
            this.resetAutoPlay();

            return;
        }

        // Calculate shortest circular delta from currentPosition to normalizedTarget
        const currentNormalized = ((this.currentPosition % N) + N) % N;
        let delta = normalizedTarget - currentNormalized;
        if (delta > N / 2) {
            delta -= N;
        } else if (delta < -N / 2) {
            delta += N;
        }

        const targetPosition = this.currentPosition + delta;
        this.snapToSlide(targetPosition);
    }

    public nextSlide(): void {
        this.goToSlide(
            this.currentIndex + 1
        );
    }

    public prevSlide(): void {
        this.goToSlide(
            this.currentIndex - 1
        );
    }

    public getTrack(): HTMLElement | null {
        return this.track;
    }

    public getActiveIndex(): number {
        return this.currentIndex;
    }

    public getConfig(): Readonly<CarouselMotionConfig> {
        return {
            ...this.config,
        };
    }

    public isAutoPlayPaused(): boolean {
        return this.isAutoplayPaused;
    }

    // =========================================================================
    // Snap animation
    // =========================================================================

    /**
     * Smoothly settles currentPosition onto targetIndex.
     */
    private snapToSlide(
        targetIndex: number,
        releaseVelocity = 0
    ): void {
        this.stopSnapAnimation();

        const N = this.slides.length;
        if (N === 0) return;
        const normalizedTarget = ((Math.round(targetIndex) % N) + N) % N;

        if (this.isReducedMotion()) {
            this.currentIndex =
                normalizedTarget;

            this.currentPosition =
                normalizedTarget;

            this.renderPositions();
            this.updateA11y();
            this.updateThumbnails();
            this.resetAutoPlay();

            return;
        }

        this.container?.classList.add(
            'is-animating'
        );

        const startPosition =
            this.currentPosition;

        const targetPosition =
            targetIndex;

        const distance =
            Math.abs(
                targetPosition -
                    startPosition
            );

        let duration =
            this.config.transitionDuration;

        if (distance < 0.3) {
            duration =
                Math.max(
                    220,
                    duration * 0.6
                );
        } else if (
            Math.abs(releaseVelocity) >
            0.8
        ) {
            duration =
                Math.max(
                    260,
                    duration * 0.75
                );
        }

        const startTime =
            performance.now();

        const easeOutCubic = (
            t: number
        ): number =>
            1 -
            Math.pow(
                1 - t,
                3.2
            );

        const tick = (
            now: number
        ): void => {
            const elapsed =
                now - startTime;

            const progress =
                Math.min(
                    1,
                    elapsed / duration
                );

            const eased =
                easeOutCubic(progress);

            this.currentPosition =
                startPosition +
                (
                    targetPosition -
                    startPosition
                ) *
                    eased;

            this.renderPositions();

            if (progress < 1) {
                this.snapRafId =
                    requestAnimationFrame(
                        tick
                    );

                return;
            }

            const normalizedIndex =
                ((Math.round(targetPosition) % N) + N) % N;

            this.currentIndex =
                normalizedIndex;

            this.currentPosition =
                normalizedIndex;

            this.snapRafId = null;

            this.container?.classList.remove(
                'is-animating'
            );

            this.renderPositions();
            this.updateA11y();
            this.updateThumbnails();
            this.resetAutoPlay();
        };

        this.snapRafId =
            requestAnimationFrame(tick);
    }

    private stopSnapAnimation(): void {
        if (this.snapRafId !== null) {
            cancelAnimationFrame(
                this.snapRafId
            );

            this.snapRafId = null;
        }

        this.container?.classList.remove(
            'is-animating'
        );
    }

    // =========================================================================
    // Pointer interaction
    // =========================================================================

    /**
     * Unified Pointer Events implementation.
     *
     * Horizontal gestures are claimed only after:
     * - deadband is exceeded
     * - horizontal movement is at least 1.2× vertical movement
     *
     * Vertical gestures are deliberately yielded to native document scrolling.
     */
    private bindPointer(): void {
        if (!this.container) return;

        this.handlePointerDown = (
            e: PointerEvent
        ): void => {
            if (e.pointerType === 'touch') {
                return; // Handled directly by bindTouchGestures on the track
            }

            if (
                e.pointerType === 'mouse' &&
                e.button !== 0
            ) {
                return;
            }

            const target =
                e.target as HTMLElement | null;

            if (
                target?.closest(
                    '.carousel-btn'
                ) ||
                target?.closest(
                    '.carousel-thumb'
                )
            ) {
                return;
            }

            this.isPointerDown = true;
            this.isDragging = false;
            this.wasDragging = false;
            this.dragAxis = null;

            this.activePointerId =
                e.pointerId;

            this.startX = e.clientX;
            this.startY = e.clientY;

            /**
             * Capture the actual visual coordinate.
             * This is critical when a pointerdown interrupts an active snap.
             */
            this.startPosition =
                this.currentPosition;

            this.pointerSamples = [
                {
                    x: e.clientX,
                    time: performance.now(),
                },
            ];

            this.stopSnapAnimation();
            this.pauseAutoPlay();
        };

        this.handlePointerMove = (
            e: PointerEvent
        ): void => {
            if (
                !this.isPointerDown ||
                e.pointerId !==
                    this.activePointerId
            ) {
                return;
            }

            const dx =
                e.clientX - this.startX;

            const dy =
                e.clientY - this.startY;

            // -------------------------------------------------------------
            // Axis intent
            // -------------------------------------------------------------

            if (
                !this.isDragging &&
                this.dragAxis === null
            ) {
                const distance =
                    Math.hypot(dx, dy);

                if (
                    distance <
                    this.config.dragDeadband
                ) {
                    return;
                }

                const absDx =
                    Math.abs(dx);

                const absDy =
                    Math.abs(dy);

                const dominanceRatio =
                    1.2;

                if (
                    absDy >
                    absDx *
                        dominanceRatio
                ) {
                    // Native vertical scrolling owns this gesture.
                    this.isPointerDown =
                        false;

                    this.isDragging =
                        false;

                    this.dragAxis = 'y';

                    return;
                }

                if (
                    absDx >
                    absDy *
                        dominanceRatio
                ) {
                    // Carousel owns this gesture.
                    this.isDragging =
                        true;

                    this.wasDragging =
                        true;

                    this.dragAxis = 'x';

                    this.container?.classList.add(
                        'is-dragging'
                    );

                    try {
                        this.container?.setPointerCapture(
                            e.pointerId
                        );
                    } catch {
                        // Pointer capture unavailable.
                    }
                } else {
                    // Ambiguous diagonal movement.
                    // Stay undecided and do not prevent scrolling.
                    return;
                }
            }

            if (!this.isDragging) return;

            if (e.cancelable) {
                e.preventDefault();
            }

            // -------------------------------------------------------------
            // Velocity samples
            // -------------------------------------------------------------

            const now =
                performance.now();

            this.pointerSamples.push({
                x: e.clientX,
                time: now,
            });

            if (
                this.pointerSamples.length >
                5
            ) {
                this.pointerSamples.shift();
            }

            // -------------------------------------------------------------
            // Continuous drag position
            // -------------------------------------------------------------

            const step =
                this.slideWidth +
                this.slideGap;

            if (step <= 0) return;

            // In round continuous rotation, physical drag wraps seamlessly without end-stops
            this.currentPosition =
                this.startPosition -
                dx / step;

            this.renderPositions();
        };

        this.handlePointerUp = (
            e: PointerEvent
        ): void => {
            if (
                !this.isPointerDown ||
                e.pointerId !==
                    this.activePointerId
            ) {
                return;
            }

            this.isPointerDown = false;

            this.container?.classList.remove(
                'is-dragging'
            );

            if (
                this.activePointerId !== null
            ) {
                try {
                    this.container?.releasePointerCapture(
                        this.activePointerId
                    );
                } catch {
                    // Ignore unavailable capture release.
                }

                this.activePointerId =
                    null;
            }

            if (!this.isDragging) {
                this.resetAutoPlay();
                return;
            }

            this.isDragging = false;

            // -------------------------------------------------------------
            // Release velocity
            // -------------------------------------------------------------

            const now =
                performance.now();

            const recent =
                this.pointerSamples.filter(
                    sample =>
                        now -
                            sample.time <=
                        120
                );

            let flickVelocity = 0;

            if (
                recent.length >= 2
            ) {
                const oldest =
                    recent[0];

                const newest =
                    recent[
                        recent.length - 1
                    ];

                const dt =
                    newest.time -
                    oldest.time;

                if (
                    dt >= 12 &&
                    dt <= 160
                ) {
                    flickVelocity =
                        (
                            newest.x -
                            oldest.x
                        ) / dt;
                }
            }

            // -------------------------------------------------------------
            // Determine snap target
            // -------------------------------------------------------------

            const deltaFromStart =
                this.currentPosition -
                this.startPosition;

            const step =
                this.slideWidth +
                this.slideGap;

            /**
             * The public configuration is explicitly a fraction of slide
             * width, not slide+gap.
             */
            const displacementPx =
                Math.abs(
                    deltaFromStart *
                    step
                );

            const thresholdPx =
                this.slideWidth *
                this.config.dragThresholdRatio;

            let targetIndex =
                this.currentIndex;

            if (
                Math.abs(flickVelocity) >
                this.config.velocityFlickThreshold
            ) {
                /**
                 * Velocity direction determines the intended next slide.
                 *
                 * Pointer moving left  => negative velocity => next slide.
                 * Pointer moving right => positive velocity => previous slide.
                 */
                targetIndex =
                    flickVelocity < 0
                        ? Math.ceil(
                              this.currentPosition
                          )
                        : Math.floor(
                              this.currentPosition
                          );
            } else if (
                displacementPx >
                thresholdPx
            ) {
                targetIndex =
                    deltaFromStart > 0
                        ? Math.ceil(
                              this.currentPosition
                          )
                        : Math.floor(
                              this.currentPosition
                          );
            } else {
                targetIndex =
                    Math.round(
                        this.currentPosition
                    );
            }

            this.snapToSlide(
                targetIndex,
                flickVelocity
            );
        };

        /**
         * Prevents accidental activation of links/buttons after a drag.
         */
        this.handleClickCapture = (
            e: MouseEvent
        ): void => {
            if (!this.wasDragging) return;

            e.preventDefault();
            e.stopPropagation();

            this.wasDragging = false;
        };

        this.container.addEventListener(
            'pointerdown',
            this.handlePointerDown
        );

        this.container.addEventListener(
            'pointermove',
            this.handlePointerMove
        );

        this.container.addEventListener(
            'pointerup',
            this.handlePointerUp
        );

        this.container.addEventListener(
            'pointercancel',
            this.handlePointerUp
        );

        this.container.addEventListener(
            'click',
            this.handleClickCapture,
            true
        );
    }

    // =========================================================================
    // Touch swipe gestures
    // =========================================================================

    /**
     * Dedicated touch swipe gesture support for #campus .carousel-track.
     * Enables mobile users to swipe left and right between slides,
     * syncing seamlessly with the existing 3D depth and auto-rotate logic.
     */
    private bindTouchGestures(): void {
        const trackElement =
            document.querySelector<HTMLElement>('#campus .carousel-track') ||
            this.track ||
            this.container;

        if (!trackElement) return;

        this.handleTouchStart = (e: TouchEvent): void => {
            if (e.touches.length !== 1) return;

            const target = e.target as HTMLElement | null;
            if (
                target?.closest('.carousel-btn') ||
                target?.closest('.carousel-thumb')
            ) {
                return;
            }

            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartPosition = this.currentPosition;
            this.isTouchDragging = false;
            this.touchDragAxis = null;

            this.touchSamples = [
                {
                    x: touch.clientX,
                    time: performance.now(),
                },
            ];

            this.stopSnapAnimation();
            this.pauseAutoPlay();
        };

        this.handleTouchMove = (e: TouchEvent): void => {
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;

            if (this.touchDragAxis === null) {
                const distance = Math.hypot(dx, dy);
                if (distance < this.config.dragDeadband) {
                    return;
                }

                if (Math.abs(dx) > Math.abs(dy) * 1.2) {
                    this.touchDragAxis = 'x';
                    this.isTouchDragging = true;
                    this.container?.classList.add('is-dragging');
                } else if (Math.abs(dy) > Math.abs(dx) * 1.2) {
                    this.touchDragAxis = 'y';
                    this.isTouchDragging = false;
                    return;
                } else {
                    return;
                }
            }

            if (this.touchDragAxis === 'y') {
                return;
            }

            // Horizontal touch swipe gesture confirmed
            if (e.cancelable) {
                e.preventDefault();
            }

            const now = performance.now();
            this.touchSamples.push({
                x: touch.clientX,
                time: now,
            });

            if (this.touchSamples.length > 5) {
                this.touchSamples.shift();
            }

            const step = this.slideWidth + this.slideGap;
            if (step <= 0) return;

            // In round continuous rotation, physical drag wraps seamlessly without end-stops
            this.currentPosition = this.touchStartPosition - dx / step;
            this.renderPositions();
        };

        this.handleTouchEnd = (_e: TouchEvent): void => {
            if (!this.isTouchDragging) {
                this.touchDragAxis = null;
                this.checkAndResumeAutoPlay();
                return;
            }

            this.isTouchDragging = false;
            this.touchDragAxis = null;
            this.container?.classList.remove('is-dragging');

            const now = performance.now();
            const recent = this.touchSamples.filter(
                sample => now - sample.time <= 140
            );

            let flickVelocity = 0;
            if (recent.length >= 2) {
                const oldest = recent[0];
                const newest = recent[recent.length - 1];
                const dt = newest.time - oldest.time;

                if (dt >= 12 && dt <= 160) {
                    flickVelocity = (newest.x - oldest.x) / dt;
                }
            }

            const deltaFromStart = this.currentPosition - this.touchStartPosition;
            const step = this.slideWidth + this.slideGap;
            const displacementPx = Math.abs(deltaFromStart * step);
            const thresholdPx = this.slideWidth * this.config.dragThresholdRatio;

            let targetIndex: number;

            if (Math.abs(flickVelocity) > this.config.velocityFlickThreshold) {
                targetIndex =
                    flickVelocity < 0
                        ? Math.ceil(this.currentPosition)
                        : Math.floor(this.currentPosition);
            } else if (displacementPx > thresholdPx) {
                targetIndex =
                    deltaFromStart > 0
                        ? Math.ceil(this.currentPosition)
                        : Math.floor(this.currentPosition);
            } else {
                targetIndex = Math.round(this.currentPosition);
            }

            this.snapToSlide(targetIndex, flickVelocity);
        };

        trackElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        trackElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        trackElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        trackElement.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });
    }

    // =========================================================================
    // Keyboard
    // =========================================================================

    private bindKeyboard(): void {
        const targetContainer =
            document.querySelector<HTMLElement>('#campus .carousel-container') ||
            this.container;

        if (!targetContainer) return;

        targetContainer.setAttribute('tabindex', '0');
        targetContainer.setAttribute('role', 'region');
        targetContainer.setAttribute('aria-roledescription', 'carousel');

        this.handleKeyDown = (
            e: KeyboardEvent
        ): void => {
            if (
                e.altKey ||
                e.ctrlKey ||
                e.metaKey
            ) {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    e.stopPropagation();
                    this.prevSlide();
                    this.preserveKeyboardFocus(targetContainer);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextSlide();
                    this.preserveKeyboardFocus(targetContainer);
                    break;

                case 'Home':
                    e.preventDefault();
                    e.stopPropagation();
                    this.goToSlide(0);
                    this.preserveKeyboardFocus(targetContainer);
                    break;

                case 'End':
                    e.preventDefault();
                    e.stopPropagation();
                    this.goToSlide(
                        this.slides.length - 1
                    );
                    this.preserveKeyboardFocus(targetContainer);
                    break;
            }
        };

        targetContainer.addEventListener(
            'keydown',
            this.handleKeyDown
        );

        targetContainer.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target?.closest('button, a, input, textarea')) {
                targetContainer.focus({ preventScroll: true });
            }
        });
    }

    /**
     * Preserves focus on the carousel container or valid active control
     * without causing unexpected scrolling jumps.
     */
    private preserveKeyboardFocus(targetContainer: HTMLElement): void {
        const active = document.activeElement;
        if (!active || active === document.body || (!targetContainer.contains(active) && active !== targetContainer)) {
            targetContainer.focus({ preventScroll: true });
        }
    }

    // =========================================================================
    // Previous / next controls
    // =========================================================================

    private bindControls(): void {
        this.handlePrevClick = (
            e: MouseEvent
        ): void => {
            e.preventDefault();
            this.prevSlide();
        };

        this.handleNextClick = (
            e: MouseEvent
        ): void => {
            e.preventDefault();
            this.nextSlide();
        };

        this.prevBtn?.addEventListener(
            'click',
            this.handlePrevClick
        );

        this.nextBtn?.addEventListener(
            'click',
            this.handleNextClick
        );
    }

    // =========================================================================
    // Observers
    // =========================================================================

    private bindObservers(): void {
        if (!this.container) return;

        // ---------------------------------------------------------------------
        // Resize
        // ---------------------------------------------------------------------

        if (
            typeof ResizeObserver !==
            'undefined'
        ) {
            this.resizeObserver =
                new ResizeObserver(() => {
                    this.measureGeometry();
                });

            this.resizeObserver.observe(
                this.container
            );
        }

        // ---------------------------------------------------------------------
        // Intersection
        // ---------------------------------------------------------------------

        if (
            typeof IntersectionObserver !==
            'undefined'
        ) {
            this.intersectionObserver =
                new IntersectionObserver(
                    entries => {
                        const entry =
                            entries[0];

                        this.isIntersecting =
                            entry
                                ? entry.isIntersecting
                                : true;

                        if (
                            !this.isIntersecting
                        ) {
                            this.pauseAutoPlay();

                            /**
                             * If a snap is interrupted while offscreen,
                             * settle deterministically to the logical slide.
                             */
                            if (
                                this.snapRafId !==
                                null
                            ) {
                                this.stopSnapAnimation();

                                this.currentPosition =
                                    this.currentIndex;

                                this.renderPositions();
                                this.updateA11y();
                                this.updateThumbnails();
                            }
                        } else {
                            this.resetAutoPlay();
                        }
                    },
                    {
                        threshold: 0.15,
                    }
                );

            this.intersectionObserver.observe(
                this.container
            );
        }
    }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    private bindLifecycle(): void {
        if (!this.container) return;

        // ---------------------------------------------------------------------
        // Mouse / Track Hover
        // ---------------------------------------------------------------------

        this.handleMouseEnter = (): void => {
            this.pauseAutoPlay();
        };

        this.handleMouseLeave = (): void => {
            if (!this.hasCarouselFocus && !this.isTrackHovered && !this.focusedSlide) {
                this.resumeAutoPlay();
            }
        };

        this.container.addEventListener(
            'mouseenter',
            this.handleMouseEnter
        );

        this.container.addEventListener(
            'mouseleave',
            this.handleMouseLeave
        );

        if (this.track) {
            this.handleTrackMouseEnter = (): void => {
                this.isTrackHovered = true;
                this.pauseAutoPlay();
            };

            this.handleTrackMouseLeave = (): void => {
                this.isTrackHovered = false;
                this.checkAndResumeAutoPlay();
            };

            this.track.addEventListener(
                'mouseenter',
                this.handleTrackMouseEnter
            );

            this.track.addEventListener(
                'mouseleave',
                this.handleTrackMouseLeave
            );
        }

        // ---------------------------------------------------------------------
        // Focus & Individual Slide Focus
        // ---------------------------------------------------------------------

        this.handleFocusIn = (): void => {
            this.hasCarouselFocus = true;
            this.pauseAutoPlay();
        };

        this.handleSlideFocusIn = (e: FocusEvent): void => {
            const target = e.target as HTMLElement | null;
            const slide = target?.closest<HTMLElement>('.carousel-slide');
            if (slide) {
                this.focusedSlide = slide;
                this.pauseAutoPlay();
            }
        };

        this.handleSlideFocusOut = (e: FocusEvent): void => {
            const related = e.relatedTarget as HTMLElement | null;
            const nextSlide = related?.closest<HTMLElement>('.carousel-slide');
            if (!nextSlide) {
                this.focusedSlide = null;
                this.checkAndResumeAutoPlay();
            } else {
                this.focusedSlide = nextSlide;
            }
        };

        this.container.addEventListener(
            'focusin',
            this.handleSlideFocusIn,
            true
        );

        this.container.addEventListener(
            'focusout',
            this.handleSlideFocusOut,
            true
        );

        this.handleFocusOut = (
            e: FocusEvent
        ): void => {
            const relatedTarget =
                e.relatedTarget as Node | null;

            /**
             * Focus may simply be moving between controls inside the carousel.
             * Do not restart autoplay in that case.
             */
            if (
                relatedTarget &&
                this.container?.contains(
                    relatedTarget
                )
            ) {
                return;
            }

            this.hasCarouselFocus = false;

            /**
             * Once focus leaves the entire carousel, autoplay may resume.
             */
            this.resetAutoPlay();
        };

        this.container.addEventListener(
            'focusin',
            this.handleFocusIn
        );

        this.container.addEventListener(
            'focusout',
            this.handleFocusOut
        );

        // ---------------------------------------------------------------------
        // Document visibility
        // ---------------------------------------------------------------------

        this.handleVisibilityChange =
            (): void => {
                if (document.hidden) {
                    this.pauseAutoPlay();

                    if (
                        this.snapRafId !==
                        null
                    ) {
                        this.stopSnapAnimation();

                        this.currentPosition =
                            this.currentIndex;

                        this.renderPositions();
                    }

                    return;
                }

                this.resetAutoPlay();
            };

        document.addEventListener(
            'visibilitychange',
            this.handleVisibilityChange
        );

        // ---------------------------------------------------------------------
        // Orientation
        // ---------------------------------------------------------------------

        this.handleOrientationChange =
            (): void => {
                window.setTimeout(() => {
                    this.measureGeometry();
                }, 100);
            };

        window.addEventListener(
            'orientationchange',
            this.handleOrientationChange,
            {
                passive: true,
            }
        );

        // ---------------------------------------------------------------------
        // Reduced motion
        // ---------------------------------------------------------------------

        if (
            typeof window !==
                'undefined' &&
            window.matchMedia
        ) {
            this.reducedMotionQuery =
                window.matchMedia(
                    '(prefers-reduced-motion: reduce)'
                );

            this.handleReducedMotionChange =
                (
                    e: MediaQueryListEvent
                ): void => {
                    this.measureGeometry();

                    if (e.matches) {
                        this.pauseAutoPlay();
                        this.stopSnapAnimation();

                        this.currentPosition =
                            this.currentIndex;

                        this.renderPositions();
                        this.updateA11y();
                        this.updateThumbnails();
                    } else {
                        this.resetAutoPlay();
                    }
                };

            this.reducedMotionQuery.addEventListener(
                'change',
                this.handleReducedMotionChange
            );
        }
    }

    // =========================================================================
    // Motion / autoplay
    // =========================================================================

    private isReducedMotion(): boolean {
        return (
            typeof window !==
                'undefined' &&
            window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches
        );
    }

    private pauseAutoPlay(): void {
        if (this.autoPlayTimer !== null) {
            window.clearTimeout(this.autoPlayTimer);
            this.autoPlayTimer = null;

            const elapsed = performance.now() - this.autoplayStartTimestamp;
            this.autoplayRemaining = Math.max(100, this.autoplayRemaining - elapsed);
        }

        this.isAutoplayPaused = true;
        this.container?.classList.add('is-autoplay-paused');
    }

    private resumeAutoPlay(): void {
        if (
            this.isReducedMotion() ||
            !this.isIntersecting ||
            this.hasCarouselFocus ||
            this.isTrackHovered ||
            this.focusedSlide !== null ||
            this.isPointerDown ||
            this.isDragging ||
            this.autoplayPausedByUser ||
            this.config.autoplayDelay <= 0
        ) {
            return;
        }

        this.isAutoplayPaused = false;
        const delay =
            this.autoplayRemaining > 0
                ? this.autoplayRemaining
                : this.config.autoplayDelay;

        this.autoplayRemaining = delay;
        this.autoplayStartTimestamp = performance.now();

        this.container?.style.setProperty(
            '--carousel-autoplay-delay',
            `${delay}ms`
        );
        this.container?.classList.remove('is-autoplay-paused');
        this.container?.classList.add('is-autoplay-active');

        this.autoPlayTimer = window.setTimeout(() => {
            this.autoplayRemaining = 0;
            this.nextSlide();
        }, delay);
    }

    private checkAndResumeAutoPlay(): void {
        this.resumeAutoPlay();
    }

    private resetAutoPlay(): void {
        this.pauseAutoPlay();
        this.autoplayRemaining = this.config.autoplayDelay;

        // Reset progress bar animation
        if (this.container && this.progressBar) {
            this.container.classList.remove(
                'is-autoplay-active',
                'is-autoplay-paused'
            );
            // Force DOM reflow to restart CSS animation cleanly from 0%
            void this.progressBar.offsetWidth;
        }

        this.resumeAutoPlay();
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    /**
     * Completely removes observers, timers, RAF callbacks and listeners.
     */
    public destroy(): void {
        this.stopSnapAnimation();
        this.pauseAutoPlay();

        // ---------------------------------------------------------------------
        // Container listeners
        // ---------------------------------------------------------------------

        if (this.container) {
            if (this.handlePointerDown) {
                this.container.removeEventListener(
                    'pointerdown',
                    this.handlePointerDown
                );
            }

            if (this.handlePointerMove) {
                this.container.removeEventListener(
                    'pointermove',
                    this.handlePointerMove
                );
            }

            if (this.handlePointerUp) {
                this.container.removeEventListener(
                    'pointerup',
                    this.handlePointerUp
                );

                this.container.removeEventListener(
                    'pointercancel',
                    this.handlePointerUp
                );
            }

            if (this.handleClickCapture) {
                this.container.removeEventListener(
                    'click',
                    this.handleClickCapture,
                    true
                );
            }

            if (this.handleKeyDown) {
                this.container.removeEventListener(
                    'keydown',
                    this.handleKeyDown
                );
            }

            if (this.handleMouseEnter) {
                this.container.removeEventListener(
                    'mouseenter',
                    this.handleMouseEnter
                );
            }

            if (this.handleMouseLeave) {
                this.container.removeEventListener(
                    'mouseleave',
                    this.handleMouseLeave
                );
            }

            if (this.handleSlideFocusIn) {
                this.container.removeEventListener(
                    'focusin',
                    this.handleSlideFocusIn,
                    true
                );
            }

            if (this.handleSlideFocusOut) {
                this.container.removeEventListener(
                    'focusout',
                    this.handleSlideFocusOut,
                    true
                );
            }

            if (this.handleFocusIn) {
                this.container.removeEventListener(
                    'focusin',
                    this.handleFocusIn
                );
            }

            if (this.handleFocusOut) {
                this.container.removeEventListener(
                    'focusout',
                    this.handleFocusOut
                );
            }

            this.container.classList.remove(
                'is-dragging',
                'is-animating',
                'is-autoplay-active',
                'is-autoplay-paused'
            );
        }

        if (this.track) {
            if (this.handleTrackMouseEnter) {
                this.track.removeEventListener(
                    'mouseenter',
                    this.handleTrackMouseEnter
                );
            }

            if (this.handleTrackMouseLeave) {
                this.track.removeEventListener(
                    'mouseleave',
                    this.handleTrackMouseLeave
                );
            }

            if (this.handleTouchStart) {
                this.track.removeEventListener(
                    'touchstart',
                    this.handleTouchStart
                );
            }

            if (this.handleTouchMove) {
                this.track.removeEventListener(
                    'touchmove',
                    this.handleTouchMove
                );
            }

            if (this.handleTouchEnd) {
                this.track.removeEventListener(
                    'touchend',
                    this.handleTouchEnd
                );
                this.track.removeEventListener(
                    'touchcancel',
                    this.handleTouchEnd
                );
            }
        }

        // ---------------------------------------------------------------------
        // Previous / next
        // ---------------------------------------------------------------------

        if (
            this.prevBtn &&
            this.handlePrevClick
        ) {
            this.prevBtn.removeEventListener(
                'click',
                this.handlePrevClick
            );
        }

        if (
            this.nextBtn &&
            this.handleNextClick
        ) {
            this.nextBtn.removeEventListener(
                'click',
                this.handleNextClick
            );
        }

        // ---------------------------------------------------------------------
        // Thumbnails
        // ---------------------------------------------------------------------

        if (this.thumbScrollPrevBtn && this.handleThumbScrollPrevClick) {
            this.thumbScrollPrevBtn.removeEventListener('click', this.handleThumbScrollPrevClick);
        }
        if (this.thumbScrollNextBtn && this.handleThumbScrollNextClick) {
            this.thumbScrollNextBtn.removeEventListener('click', this.handleThumbScrollNextClick);
        }

        if (this.thumbnailsContainer) {
            if (this.handleThumbnailsClick) {
                this.thumbnailsContainer.removeEventListener('click', this.handleThumbnailsClick);
            }
            if (this.handleThumbWheel) {
                this.thumbnailsContainer.removeEventListener('wheel', this.handleThumbWheel);
            }
            if (this.handleThumbScroll) {
                this.thumbnailsContainer.removeEventListener('scroll', this.handleThumbScroll);
            }
            if (this.handleThumbPointerDown) {
                this.thumbnailsContainer.removeEventListener('pointerdown', this.handleThumbPointerDown);
            }
            if (this.handleThumbPointerMove) {
                this.thumbnailsContainer.removeEventListener('pointermove', this.handleThumbPointerMove);
            }
            if (this.handleThumbPointerUp) {
                this.thumbnailsContainer.removeEventListener('pointerup', this.handleThumbPointerUp);
                this.thumbnailsContainer.removeEventListener('pointercancel', this.handleThumbPointerUp);
            }
        }

        this.handleThumbnailsClick = null;
        this.handleThumbWheel = null;
        this.handleThumbScroll = null;
        this.handleThumbPointerDown = null;
        this.handleThumbPointerMove = null;
        this.handleThumbPointerUp = null;
        this.handleThumbScrollPrevClick = null;
        this.handleThumbScrollNextClick = null;
        this.thumbnails = [];

        // ---------------------------------------------------------------------
        // Document / window
        // ---------------------------------------------------------------------

        if (
            this.handleVisibilityChange
        ) {
            document.removeEventListener(
                'visibilitychange',
                this.handleVisibilityChange
            );
        }

        if (
            this.handleOrientationChange
        ) {
            window.removeEventListener(
                'orientationchange',
                this.handleOrientationChange
            );
        }

        // ---------------------------------------------------------------------
        // Reduced motion
        // ---------------------------------------------------------------------

        if (
            this.reducedMotionQuery &&
            this.handleReducedMotionChange
        ) {
            this.reducedMotionQuery.removeEventListener(
                'change',
                this.handleReducedMotionChange
            );
        }

        // ---------------------------------------------------------------------
        // Observers
        // ---------------------------------------------------------------------

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (
            this.intersectionObserver
        ) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        // ---------------------------------------------------------------------
        // Reset references
        // ---------------------------------------------------------------------

        this.handlePointerDown = null;
        this.handlePointerMove = null;
        this.handlePointerUp = null;
        this.handleClickCapture = null;

        this.handleKeyDown = null;

        this.handlePrevClick = null;
        this.handleNextClick = null;

        this.handleMouseEnter = null;
        this.handleMouseLeave = null;

        this.handleFocusIn = null;
        this.handleFocusOut = null;

        this.handleVisibilityChange = null;
        this.handleOrientationChange = null;
        this.handleReducedMotionChange = null;

        this.slides.forEach(slide => {
            slide.style.transform = '';
            slide.style.filter = '';
            slide.style.opacity = '';
            slide.removeAttribute('data-distance');
            slide.removeAttribute('data-abs-distance');
            slide.style.removeProperty('--carousel-distance');
            slide.style.removeProperty('--carousel-abs-distance');
            slide.style.removeProperty('--slide-dist');
            slide.style.removeProperty('--slide-abs-dist');
            slide.style.removeProperty('--slide-tx');
            slide.style.removeProperty('--slide-tz');
            slide.style.removeProperty('--slide-scale');
            slide.style.removeProperty('--slide-rotate-y');
            slide.style.removeProperty('--slide-blur');
        });

        this.pointerSamples = [];
    }
}