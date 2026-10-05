/**
 * ============================================================================
 * SJCCC – Virtual Campus Map Interactive Controller
 * Coordinates map hotspots, image previews, area descriptions, and keyboard navigation
 * for the campus exploration feature.
 * ============================================================================
 */

import { HOME_SELECTORS } from '../../core/config/selectors.ts';

import { type CampusZone, CAMPUS_ZONES } from '../../data/campusZones.ts';

export type { CampusZone };
export { CAMPUS_ZONES };

export class VirtualCampusMap {
    private readonly container: HTMLElement | null;
    private readonly markers: NodeListOf<HTMLButtonElement>;
    private readonly listButtons: NodeListOf<HTMLButtonElement>;
    private currentZoneId: string = 'chapel';

    // Detail elements
    private readonly detailCard: HTMLElement | null;
    private readonly detailImage: HTMLImageElement | null;
    private readonly detailCategory: HTMLElement | null;
    private readonly detailTitle: HTMLElement | null;
    private readonly detailTagline: HTMLElement | null;
    private readonly detailDesc: HTMLElement | null;
    private readonly detailAmenities: HTMLElement | null;
    private readonly detailHours: HTMLElement | null;
    private readonly detailHead: HTMLElement | null;
    private readonly prevBtn: HTMLButtonElement | null;
    private readonly nextBtn: HTMLButtonElement | null;
    private readonly announcer: HTMLElement | null;

    // Viewport & Zoom elements
    private readonly canvasWrap: HTMLElement | null;
    private readonly mapContent: HTMLElement | null;
    private readonly zoomInBtn: HTMLButtonElement | null;
    private readonly zoomOutBtn: HTMLButtonElement | null;
    private readonly zoomLevelBtn: HTMLButtonElement | null;
    private readonly zoomLevelText: HTMLElement | null;
    private readonly zoomResetBtn: HTMLButtonElement | null;
    private readonly panHint: HTMLElement | null;

    // Guided Tour State & Elements
    private readonly tourToggleBtn: HTMLButtonElement | null;
    private readonly tourIcon: HTMLElement | null;
    private readonly tourBtnText: HTMLElement | null;
    private readonly tourBadge: HTMLElement | null;
    private readonly tourTimerBar: HTMLElement | null;
    private readonly tourStatusText: HTMLElement | null;

    private readonly tourIntervalMs: number = 5000;
    private isTourPlaying: boolean = true;
    private tourTimerId: number | null = null;
    private tourProgressStartTime: number = 0;
    private tourRafId: number | null = null;
    private isTourHoverPaused: boolean = false;
    private tourRemainingMs: number = 5000;

    // Zoom and Pan state
    private zoomLevel: number = 1.0;
    private readonly minZoom: number = 1.0;
    private readonly maxZoom: number = 2.5;
    private readonly zoomStep: number = 0.35;
    private panX: number = 0;
    private panY: number = 0;
    private isPanning: boolean = false;
    private startPointerX: number = 0;
    private startPointerY: number = 0;
    private startPanX: number = 0;
    private startPanY: number = 0;
    private hasMovedDuringDrag: boolean = false;

    private isInitial: boolean = true;
    private updateTimeoutId: number | null = null;
    private animationTimeoutId: number | null = null;
    private transitionEndHandler: ((e: TransitionEvent) => void) | null = null;

    constructor(
        containerId: string = 'campusMapContainer',
        announcerId: string = HOME_SELECTORS.a11yAnnouncer
    ) {
        this.container = document.getElementById(containerId);
        this.markers = document.querySelectorAll<HTMLButtonElement>('.map-hotspot-pin');
        this.listButtons = document.querySelectorAll<HTMLButtonElement>('.map-zone-btn');

        this.detailCard = document.getElementById('mapDetailCard');
        this.detailImage = document.getElementById('mapDetailImage') as HTMLImageElement | null;
        this.detailCategory = document.getElementById('mapDetailCategory');
        this.detailTitle = document.getElementById('mapDetailTitle');
        this.detailTagline = document.getElementById('mapDetailTagline');
        this.detailDesc = document.getElementById('mapDetailDesc');
        this.detailAmenities = document.getElementById('mapDetailAmenities');
        this.detailHours = document.getElementById('mapDetailHours');
        this.detailHead = document.getElementById('mapDetailHead');
        this.prevBtn = document.getElementById('mapPrevZoneBtn') as HTMLButtonElement | null;
        this.nextBtn = document.getElementById('mapNextZoneBtn') as HTMLButtonElement | null;
        this.announcer = document.getElementById(announcerId) || document.getElementById('a11y-announcer');

        // Viewport and Zoom controls
        this.canvasWrap = document.getElementById('campusMapCanvasWrap');
        this.mapContent = document.getElementById('campusMapContent');
        this.zoomInBtn = document.getElementById('mapZoomInBtn') as HTMLButtonElement | null;
        this.zoomOutBtn = document.getElementById('mapZoomOutBtn') as HTMLButtonElement | null;
        this.zoomLevelBtn = document.getElementById('mapZoomLevelBtn') as HTMLButtonElement | null;
        this.zoomLevelText = document.getElementById('mapZoomLevel');
        this.zoomResetBtn = document.getElementById('mapZoomResetBtn') as HTMLButtonElement | null;
        this.panHint = document.getElementById('campusMapPanHint');

        // Guided Tour elements
        this.tourToggleBtn = document.getElementById('mapTourToggleBtn') as HTMLButtonElement | null;
        this.tourIcon = document.getElementById('mapTourIcon');
        this.tourBtnText = document.getElementById('mapTourBtnText');
        this.tourBadge = document.getElementById('mapTourBadge');
        this.tourTimerBar = document.getElementById('mapTourTimerBar');
        this.tourStatusText = document.getElementById('mapTourStatusText');

        if (!this.container) return;

        this.init();
    }

    private init(): void {
        this.bindMarkerClicks();
        this.bindListClicks();
        this.bindNavButtons();
        this.bindKeyboardNavigation();
        this.bindZoomControls();
        this.bindTourControls();

        // Select initial zone (without transition fade-in flash on initial page load)
        this.selectZone('chapel');

        // Start 5-second guided tour auto-cycle
        this.startTour();
    }

    private bindMarkerClicks(): void {
        this.markers.forEach((marker) => {
            marker.addEventListener('click', (e) => {
                if (this.hasMovedDuringDrag) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                const zoneId = marker.dataset.zoneId;
                if (zoneId) this.selectZone(zoneId);
            });
        });
    }

    private bindListClicks(): void {
        this.listButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const zoneId = btn.dataset.zoneId;
                if (zoneId) this.selectZone(zoneId);
            });
        });
    }

    private bindNavButtons(): void {
        this.prevBtn?.addEventListener('click', () => this.navigateStep(-1));
        this.nextBtn?.addEventListener('click', () => this.navigateStep(1));
    }

    private navigateStep(step: number, shouldFocus: boolean = false): void {
        const currentIndex = CAMPUS_ZONES.findIndex((z) => z.id === this.currentZoneId);
        if (currentIndex === -1) return;

        const nextIndex = (currentIndex + step + CAMPUS_ZONES.length) % CAMPUS_ZONES.length;
        this.selectZone(CAMPUS_ZONES[nextIndex].id, shouldFocus);
    }

    /**
     * Traps keyboard focus within #campusMapContainer while focus is inside it.
     * Tab: wraps from last focusable element to first.
     * Shift+Tab: wraps from first focusable element (or container) to last.
     */
    private getFocusableElements(): HTMLElement[] {
        if (!this.container) return [];
        const selector = [
            'button:not([disabled])',
            'a[href]:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(', ');

        return Array.from(this.container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
            if (el === this.container) return false;
            return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
        });
    }

    private handleFocusTrap(e: KeyboardEvent): void {
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
            // Shift + Tab: if on first element or container itself, wrap to last
            if (activeElement === firstElement || activeElement === this.container) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: if on last element, wrap to first
            if (activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Releases focus trap when Escape is pressed.
     */
    private releaseFocusTrap(): void {
        if (!this.container) return;
        this.container.blur();

        const selector = [
            'button:not([disabled])',
            'a[href]:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(', ');

        const allFocusables = Array.from(document.querySelectorAll<HTMLElement>(selector))
            .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);

        const containerElements = this.getFocusableElements();
        const lastInContainer = containerElements[containerElements.length - 1];
        const lastIndex = allFocusables.indexOf(lastInContainer);

        if (lastIndex !== -1 && lastIndex + 1 < allFocusables.length) {
            allFocusables[lastIndex + 1].focus();
        }

        const announcerEl = this.announcer ?? document.getElementById(HOME_SELECTORS.a11yAnnouncer);
        if (announcerEl) {
            announcerEl.textContent = 'Exited virtual campus map navigation.';
        }
    }

    /**
     * Shifts focus to the currently active zone tab or pin if focus is active on a control.
     */
    private focusActiveZoneElement(zoneId: string): void {
        const isTabFocused = Array.from(this.listButtons).some((btn) => btn === document.activeElement);
        if (isTabFocused) {
            const activeBtn = Array.from(this.listButtons).find((btn) => btn.dataset.zoneId === zoneId);
            activeBtn?.focus();
            return;
        }

        const isPinFocused = Array.from(this.markers).some((pin) => pin === document.activeElement);
        if (isPinFocused) {
            const activePin = Array.from(this.markers).find((pin) => pin.dataset.zoneId === zoneId);
            activePin?.focus();
            return;
        }

        if (document.activeElement === this.container) {
            const activeBtn = Array.from(this.listButtons).find((btn) => btn.dataset.zoneId === zoneId);
            activeBtn?.focus();
        }
    }

    private bindKeyboardNavigation(): void {
        if (!this.container) return;

        // When container itself gains focus, delegate focus to the active zone tab
        this.container.addEventListener('focus', (e: FocusEvent) => {
            if (e.target === this.container) {
                const activeBtn = this.container?.querySelector<HTMLElement>('.map-zone-btn.active') ?? this.getFocusableElements()[0];
                activeBtn?.focus();
            }
        });

        this.container.addEventListener('keydown', (e: KeyboardEvent) => {
            // 1. Focus trap: Tab and Shift+Tab
            if (e.key === 'Tab') {
                this.handleFocusTrap(e);
                return;
            }

            // 2. Escape: release focus trap
            if (e.key === 'Escape') {
                this.releaseFocusTrap();
                return;
            }

            // 3. Arrow keys: cycle facilities with active focus management
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateStep(1, true);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateStep(-1, true);
            } else if (e.key === 'Home') {
                e.preventDefault();
                if (CAMPUS_ZONES.length > 0) {
                    this.selectZone(CAMPUS_ZONES[0].id, true);
                }
            } else if (e.key === 'End') {
                e.preventDefault();
                if (CAMPUS_ZONES.length > 0) {
                    this.selectZone(CAMPUS_ZONES[CAMPUS_ZONES.length - 1].id, true);
                }
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomBy(this.zoomStep);
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomBy(-this.zoomStep);
            } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.resetZoom();
            } else if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
                if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                    e.preventDefault();
                    this.toggleTour();
                }
            }
        });
    }

    private bindZoomControls(): void {
        this.zoomInBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.zoomBy(this.zoomStep);
        });

        this.zoomOutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.zoomBy(-this.zoomStep);
        });

        this.zoomResetBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.resetZoom();
        });

        this.zoomLevelBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.cycleZoom();
        });

        // Wheel Zoom on canvas wrap
        this.canvasWrap?.addEventListener(
            'wheel',
            (e: WheelEvent) => {
                if (!this.canvasWrap) return;
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.25 : -0.25;
                const rect = this.canvasWrap.getBoundingClientRect();
                const offsetX = e.clientX - rect.left - rect.width / 2;
                const offsetY = e.clientY - rect.top - rect.height / 2;
                this.zoomAtPoint(delta, offsetX, offsetY);
            },
            { passive: false }
        );

        // Pointer Drag-to-Pan (unified mouse & touch gesture support with strict viewport boundary constraints)
        this.canvasWrap?.addEventListener('pointerdown', (e: PointerEvent) => {
            if (e.button !== 0 || !this.canvasWrap) return;
            if (this.zoomLevel <= 1.001) return;

            this.isPanning = true;
            this.hasMovedDuringDrag = false;
            this.startPointerX = e.clientX;
            this.startPointerY = e.clientY;
            this.startPanX = this.panX;
            this.startPanY = this.panY;

            try {
                this.canvasWrap.setPointerCapture(e.pointerId);
            } catch (_) {}

            this.canvasWrap.classList.add('is-dragging');
            if (this.mapContent) {
                this.mapContent.style.transition = 'none';
            }
        });

        this.canvasWrap?.addEventListener('pointermove', (e: PointerEvent) => {
            if (!this.isPanning || !this.canvasWrap) return;

            const dx = e.clientX - this.startPointerX;
            const dy = e.clientY - this.startPointerY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.hasMovedDuringDrag = true;
            }

            const rawPanX = this.startPanX + dx;
            const rawPanY = this.startPanY + dy;
            const bounds = this.getMaxPanBounds();

            // Strict boundary constraint: never allow image boundaries to pull inside viewport
            if (rawPanX > bounds.x) {
                this.panX = bounds.x;
                this.startPointerX = e.clientX;
                this.startPanX = bounds.x;
            } else if (rawPanX < -bounds.x) {
                this.panX = -bounds.x;
                this.startPointerX = e.clientX;
                this.startPanX = -bounds.x;
            } else {
                this.panX = rawPanX;
            }

            if (rawPanY > bounds.y) {
                this.panY = bounds.y;
                this.startPointerY = e.clientY;
                this.startPanY = bounds.y;
            } else if (rawPanY < -bounds.y) {
                this.panY = -bounds.y;
                this.startPointerY = e.clientY;
                this.startPanY = -bounds.y;
            } else {
                this.panY = rawPanY;
            }

            this.applyTransform(false);
        });

        const endPointerDrag = (e: PointerEvent) => {
            if (!this.isPanning || !this.canvasWrap) return;
            this.isPanning = false;

            try {
                this.canvasWrap.releasePointerCapture(e.pointerId);
            } catch (_) {}

            this.canvasWrap.classList.remove('is-dragging');
            this.clampPan();
            if (this.mapContent) {
                this.mapContent.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
            }
            this.applyTransform(true);
        };

        this.canvasWrap?.addEventListener('pointerup', endPointerDrag);
        this.canvasWrap?.addEventListener('pointercancel', endPointerDrag);

        // Window resize: re-clamp boundaries to ensure map area stays inside viewport
        window.addEventListener('resize', () => {
            if (this.zoomLevel > 1.001) {
                this.clampPan();
                this.applyTransform(false);
            }
        });

        // Double-click to zoom in / toggle reset
        this.canvasWrap?.addEventListener('dblclick', (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.map-hotspot-pin')) return;
            if (!this.canvasWrap) return;

            if (this.zoomLevel > 1.1) {
                this.resetZoom();
            } else {
                const rect = this.canvasWrap.getBoundingClientRect();
                const offsetX = e.clientX - rect.left - rect.width / 2;
                const offsetY = e.clientY - rect.top - rect.height / 2;
                this.zoomAtPoint(0.7, offsetX, offsetY);
            }
        });

        // Initialize UI state
        this.updateZoomControlsUI();
    }

    public zoomBy(delta: number): void {
        this.setZoom(this.zoomLevel + delta);
    }

    public setZoom(level: number, animate: boolean = true): void {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(level * 100) / 100));

        if (this.zoomLevel <= 1.01) {
            this.panX = 0;
            this.panY = 0;
        } else if (oldZoom > 1.01) {
            const scale = (this.zoomLevel - 1) / (oldZoom - 1);
            this.panX *= scale;
            this.panY *= scale;
        }

        this.clampPan();
        this.applyTransform(animate);

        const announcerEl = this.announcer ?? document.getElementById(HOME_SELECTORS.a11yAnnouncer);
        if (announcerEl) {
            announcerEl.textContent = `Map zoom level set to ${Math.round(this.zoomLevel * 100)} percent.`;
        }
    }

    public resetZoom(): void {
        this.setZoom(1.0);
    }

    public cycleZoom(): void {
        const presets = [1.0, 1.4, 1.8, 2.2];
        const nextPreset = presets.find((p) => p > this.zoomLevel + 0.05) ?? 1.0;
        this.setZoom(nextPreset);
    }

    private zoomAtPoint(delta: number, offsetX: number, offsetY: number): void {
        const prevZoom = this.zoomLevel;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, prevZoom + delta));
        if (Math.abs(newZoom - prevZoom) < 0.01) return;

        if (newZoom > 1.01) {
            const zoomRatio = (newZoom - 1) / (prevZoom > 1.01 ? prevZoom - 1 : 1);
            this.panX = (this.panX - offsetX * 0.3) * zoomRatio;
            this.panY = (this.panY - offsetY * 0.3) * zoomRatio;
        } else {
            this.panX = 0;
            this.panY = 0;
        }

        this.zoomLevel = Math.round(newZoom * 100) / 100;
        this.clampPan();
        this.applyTransform(true);
    }

    /**
     * Calculates the strict maximum allowable pan displacement from center.
     * With transform-origin at center center:
     * When content is scaled by zoomLevel, the extra image margin overflowing each edge is:
     * (renderedDimension * zoomLevel - renderedDimension) / 2 = renderedDimension * (zoomLevel - 1) / 2.
     * Clamping pan displacement to [-maxPan, +maxPan] guarantees that no image boundary
     * can ever be pulled inside the viewport, keeping the map area within the viewport at all times.
     */
    private getMaxPanBounds(): { x: number; y: number } {
        if (!this.canvasWrap || this.zoomLevel <= 1.001) {
            return { x: 0, y: 0 };
        }
        const rect = this.canvasWrap.getBoundingClientRect();
        const maxX = Math.max(0, (rect.width * (this.zoomLevel - 1)) / 2);
        const maxY = Math.max(0, (rect.height * (this.zoomLevel - 1)) / 2);
        return { x: maxX, y: maxY };
    }

    private clampPan(): void {
        const bounds = this.getMaxPanBounds();
        this.panX = Math.max(-bounds.x, Math.min(bounds.x, this.panX));
        this.panY = Math.max(-bounds.y, Math.min(bounds.y, this.panY));
    }

    private applyTransform(animate: boolean = true): void {
        if (!this.mapContent) return;
        if (!animate) {
            this.mapContent.style.transition = 'none';
        } else {
            this.mapContent.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
        }

        this.mapContent.style.transform = `translate(${this.panX.toFixed(1)}px, ${this.panY.toFixed(1)}px) scale(${this.zoomLevel.toFixed(2)})`;
        this.updateZoomControlsUI();
    }

    private updateZoomControlsUI(): void {
        const percent = Math.round(this.zoomLevel * 100);
        if (this.zoomLevelText) {
            this.zoomLevelText.textContent = `${percent}%`;
        }
        if (this.zoomLevelBtn) {
            this.zoomLevelBtn.setAttribute(
                'aria-label',
                `Current zoom: ${percent}%. Click to cycle zoom level.`
            );
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.disabled = this.zoomLevel <= this.minZoom + 0.01;
        }
        if (this.zoomInBtn) {
            this.zoomInBtn.disabled = this.zoomLevel >= this.maxZoom - 0.01;
        }
        if (this.canvasWrap) {
            this.canvasWrap.classList.toggle('is-zoomed', this.zoomLevel > 1.01);
        }
        if (this.panHint) {
            this.panHint.setAttribute('aria-hidden', String(this.zoomLevel <= 1.01));
        }
    }

    private bindTourControls(): void {
        this.tourToggleBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTour();
        });

        // Pause countdown while cursor hovers over map canvas or detail card
        const pauseOnHoverTargets = [this.canvasWrap, this.detailCard];
        pauseOnHoverTargets.forEach((el) => {
            if (!el) return;
            el.addEventListener('mouseenter', () => {
                if (this.isTourPlaying) {
                    this.isTourHoverPaused = true;
                    const elapsed = performance.now() - this.tourProgressStartTime;
                    this.tourRemainingMs = Math.max(800, this.tourIntervalMs - elapsed);
                    if (this.tourTimerId !== null) {
                        window.clearTimeout(this.tourTimerId);
                        this.tourTimerId = null;
                    }
                    if (this.tourRafId !== null) {
                        cancelAnimationFrame(this.tourRafId);
                        this.tourRafId = null;
                    }
                }
            });

            el.addEventListener('mouseleave', () => {
                if (this.isTourPlaying && this.isTourHoverPaused) {
                    this.isTourHoverPaused = false;
                    this.resumeTourCountdown(this.tourRemainingMs);
                }
            });
        });

        // Pause tour if page is hidden to conserve performance/battery
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.isTourPlaying) {
                    this.pauseTour(false);
                }
            } else {
                if (!this.isTourPlaying) {
                    this.startTour();
                }
            }
        });
    }

    public toggleTour(): void {
        if (this.isTourPlaying) {
            this.pauseTour(true);
        } else {
            this.startTour();
        }
    }

    public startTour(): void {
        this.isTourPlaying = true;
        this.isTourHoverPaused = false;
        this.updateTourButtonUI();
        this.resetTourInterval();

        const announcerEl = this.announcer ?? document.getElementById(HOME_SELECTORS.a11yAnnouncer);
        if (announcerEl) {
            announcerEl.textContent = 'Guided tour started. Highlighting campus facilities every 5 seconds.';
        }
    }

    public pauseTour(userInitiated: boolean = true): void {
        this.isTourPlaying = false;
        this.isTourHoverPaused = false;

        if (this.tourTimerId !== null) {
            window.clearTimeout(this.tourTimerId);
            this.tourTimerId = null;
        }
        if (this.tourRafId !== null) {
            cancelAnimationFrame(this.tourRafId);
            this.tourRafId = null;
        }

        if (this.tourTimerBar) {
            this.tourTimerBar.style.width = '0%';
        }

        this.updateTourButtonUI();

        if (userInitiated) {
            const announcerEl = this.announcer ?? document.getElementById(HOME_SELECTORS.a11yAnnouncer);
            if (announcerEl) {
                announcerEl.textContent = 'Guided tour paused.';
            }
        }
    }

    private resetTourInterval(): void {
        this.resumeTourCountdown(this.tourIntervalMs);
    }

    private resumeTourCountdown(durationMs: number): void {
        if (this.tourTimerId !== null) {
            window.clearTimeout(this.tourTimerId);
            this.tourTimerId = null;
        }
        if (this.tourRafId !== null) {
            cancelAnimationFrame(this.tourRafId);
            this.tourRafId = null;
        }

        if (!this.isTourPlaying) return;

        this.tourProgressStartTime = performance.now();
        const effectiveDuration = Math.max(600, durationMs);

        this.tourTimerId = window.setTimeout(() => {
            this.advanceTour();
        }, effectiveDuration);

        const animateBar = (now: number) => {
            if (!this.isTourPlaying || this.isTourHoverPaused) return;
            const elapsed = now - this.tourProgressStartTime;
            const progress = Math.min(100, (elapsed / effectiveDuration) * 100);

            if (this.tourTimerBar) {
                this.tourTimerBar.style.width = `${progress.toFixed(1)}%`;
            }

            if (elapsed < effectiveDuration) {
                this.tourRafId = requestAnimationFrame(animateBar);
            }
        };

        this.tourRafId = requestAnimationFrame(animateBar);
    }

    private advanceTour(): void {
        if (!this.isTourPlaying) return;

        const currentIndex = CAMPUS_ZONES.findIndex((z) => z.id === this.currentZoneId);
        const nextIndex = (currentIndex + 1) % CAMPUS_ZONES.length;
        const nextZone = CAMPUS_ZONES[nextIndex];

        this.selectZone(nextZone.id, false);

        const announcerEl = this.announcer ?? document.getElementById(HOME_SELECTORS.a11yAnnouncer);
        if (announcerEl) {
            announcerEl.textContent = `Guided Tour Stop ${nextIndex + 1} of ${CAMPUS_ZONES.length}: ${nextZone.title}. ${nextZone.tagline}`;
        }
    }

    private updateTourButtonUI(): void {
        if (!this.tourToggleBtn) return;

        if (this.isTourPlaying) {
            this.tourToggleBtn.classList.add('is-playing');
            this.tourToggleBtn.setAttribute('aria-label', 'Pause auto guided tour of campus highlights');
            this.tourToggleBtn.setAttribute('title', 'Pause guided campus tour (5s interval)');
            if (this.tourIcon) {
                this.tourIcon.className = 'bi bi-pause-fill map-tour-icon';
            }
            if (this.tourBtnText) {
                this.tourBtnText.textContent = 'Guided Tour';
            }
        } else {
            this.tourToggleBtn.classList.remove('is-playing');
            this.tourToggleBtn.setAttribute('aria-label', 'Resume auto guided tour of campus highlights');
            this.tourToggleBtn.setAttribute('title', 'Resume guided campus tour (5s interval)');
            if (this.tourIcon) {
                this.tourIcon.className = 'bi bi-play-fill map-tour-icon';
            }
            if (this.tourBtnText) {
                this.tourBtnText.textContent = 'Resume Tour';
            }
            if (this.tourTimerBar) {
                this.tourTimerBar.style.width = '0%';
            }
        }
    }

    /**
     * Announces the selected zone description to screen readers using #a11y-announcer
     */
    private announceZone(zone: CampusZone): void {
        const announcerEl = this.announcer ?? document.getElementById(HOME_SELECTORS.a11yAnnouncer) ?? document.getElementById('a11y-announcer');
        if (!announcerEl) return;

        announcerEl.textContent = zone.description;
    }

    public selectZone(zoneId: string, shouldFocus: boolean = false): void {
        const zone = CAMPUS_ZONES.find((z) => z.id === zoneId);
        if (!zone) return;

        this.currentZoneId = zoneId;

        // 1. Update hotspot marker active states
        this.markers.forEach((marker) => {
            const isActive = marker.dataset.zoneId === zoneId;
            marker.classList.toggle('active', isActive);
            marker.setAttribute('aria-selected', String(isActive));
        });

        // 2. Update list button active states
        this.listButtons.forEach((btn) => {
            const isActive = btn.dataset.zoneId === zoneId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        // 3. Update preview details panel with smooth fade-in animation
        this.renderZoneDetails(zone, !this.isInitial);

        // 4. Center map view onto selected zone if zoomed in
        if (this.zoomLevel > 1.05 && this.canvasWrap) {
            const activeMarker = Array.from(this.markers).find((m) => m.dataset.zoneId === zoneId);
            if (activeMarker) {
                const styleLeft = parseFloat(activeMarker.style.left) || 50;
                const styleTop = parseFloat(activeMarker.style.top) || 50;
                const rect = this.canvasWrap.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;

                // Bring hotspot toward center
                const targetPanX = (50 - styleLeft) * (width / 100) * (this.zoomLevel - 1);
                const targetPanY = (50 - styleTop) * (height / 100) * (this.zoomLevel - 1);

                this.panX = targetPanX;
                this.panY = targetPanY;
                this.clampPan();
                this.applyTransform(true);
            }
        }

        // 5. Announce selected zone description to screen readers via #a11y-announcer
        this.announceZone(zone);

        // 6. Shift keyboard focus if requested
        if (shouldFocus) {
            this.focusActiveZoneElement(zoneId);
        }

        // 7. Update tour badge and status footnote
        const currentIndex = CAMPUS_ZONES.findIndex((z) => z.id === zoneId);
        if (this.tourBadge && currentIndex !== -1) {
            this.tourBadge.textContent = `Stop ${currentIndex + 1}/${CAMPUS_ZONES.length}`;
        }
        if (this.tourStatusText && currentIndex !== -1) {
            this.tourStatusText.innerHTML = `Guided Tour: <strong>${zone.title}</strong> (Stop ${currentIndex + 1} of ${CAMPUS_ZONES.length}) · Next highlight in 5s`;
        }

        // 8. Refresh the 5s interval countdown for this active zone
        if (this.isTourPlaying && !this.isTourHoverPaused) {
            this.resetTourInterval();
        }

        this.isInitial = false;
    }

    private populateZoneData(zone: CampusZone): void {
        if (this.detailImage) {
            this.detailImage.onerror = () => {
                if (this.detailImage && !this.detailImage.src.endsWith('/assets/Error-Image.jpeg')) {
                    this.detailImage.src = '/assets/Error-Image.jpeg';
                }
            };
            this.detailImage.src = zone.imageSrc;
            this.detailImage.alt = zone.imageAlt;
        }
        if (this.detailCategory) {
            this.detailCategory.textContent = zone.category;
        }
        if (this.detailTitle) {
            this.detailTitle.textContent = zone.title;
        }
        if (this.detailTagline) {
            this.detailTagline.textContent = zone.tagline;
        }
        if (this.detailDesc) {
            this.detailDesc.textContent = zone.description;
        }
        if (this.detailHours) {
            this.detailHours.textContent = zone.hours;
        }
        if (this.detailHead) {
            this.detailHead.textContent = zone.headOfArea;
        }

        if (this.detailAmenities) {
            this.detailAmenities.innerHTML = zone.amenities
                .map((item) => `<li><i class="bi bi-check2-circle text-accent"></i> <span>${item}</span></li>`)
                .join('');
        }
    }

    private renderZoneDetails(zone: CampusZone, animate: boolean = true): void {
        const detailCard = this.detailCard ?? document.getElementById('mapDetailCard');

        if (!detailCard || !animate) {
            this.populateZoneData(zone);
            return;
        }

        if (this.updateTimeoutId !== null) {
            window.clearTimeout(this.updateTimeoutId);
            this.updateTimeoutId = null;
        }

        if (this.animationTimeoutId !== null) {
            window.clearTimeout(this.animationTimeoutId);
            this.animationTimeoutId = null;
        }

        if (this.transitionEndHandler && detailCard) {
            detailCard.removeEventListener('transitionend', this.transitionEndHandler);
            this.transitionEndHandler = null;
        }

        // 1. Temporarily apply 'animating' class and updating state to trigger subtle transition
        detailCard.classList.add('animating');
        detailCard.classList.add('map-detail-card--updating');
        detailCard.classList.remove('map-detail-card--fade-in');
        detailCard.classList.remove('map-detail-card--slide-in');
        detailCard.classList.remove('slide-in');

        // 2. Populate updated zone data and toggle classes to trigger subtle slide-in CSS animation & transition
        this.updateTimeoutId = window.setTimeout(() => {
            this.populateZoneData(zone);
            detailCard.classList.remove('map-detail-card--updating');
            detailCard.classList.add('map-detail-card--fade-in');
            detailCard.classList.add('map-detail-card--slide-in');
            detailCard.classList.add('slide-in');

            // 3. Remove 'animating' class once transition completes
            this.transitionEndHandler = (e: TransitionEvent) => {
                if (e.target === detailCard && (e.propertyName === 'transform' || e.propertyName === 'opacity')) {
                    detailCard.classList.remove('animating');
                    if (this.transitionEndHandler) {
                        detailCard.removeEventListener('transitionend', this.transitionEndHandler);
                        this.transitionEndHandler = null;
                    }
                }
            };
            detailCard.addEventListener('transitionend', this.transitionEndHandler);

            // Fallback timeout to ensure 'animating' class is removed even if transitionend is skipped
            this.animationTimeoutId = window.setTimeout(() => {
                detailCard.classList.remove('animating');
                if (this.transitionEndHandler) {
                    detailCard.removeEventListener('transitionend', this.transitionEndHandler);
                    this.transitionEndHandler = null;
                }
            }, 420);
        }, 80);
    }
}
