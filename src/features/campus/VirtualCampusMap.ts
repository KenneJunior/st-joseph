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

        if (!this.container) return;

        this.init();
    }

    private init(): void {
        this.bindMarkerClicks();
        this.bindListClicks();
        this.bindNavButtons();
        this.bindKeyboardNavigation();

        // Select initial zone (without transition fade-in flash on initial page load)
        this.selectZone('chapel');
    }

    private bindMarkerClicks(): void {
        this.markers.forEach((marker) => {
            marker.addEventListener('click', (e) => {
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
            }
        });
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

        // 4. Announce selected zone description to screen readers via #a11y-announcer
        this.announceZone(zone);

        // 5. Shift keyboard focus if requested
        if (shouldFocus) {
            this.focusActiveZoneElement(zoneId);
        }

        this.isInitial = false;
    }

    private populateZoneData(zone: CampusZone): void {
        if (this.detailImage) {
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

        // 1. Temporarily apply 'animating' class and updating state to trigger slide-down and fade-out
        detailCard.classList.add('animating');
        detailCard.classList.add('map-detail-card--updating');
        detailCard.classList.remove('map-detail-card--fade-in');

        // 2. Populate updated zone data and toggle classes to trigger smooth fade-in & slide-up CSS transition
        this.updateTimeoutId = window.setTimeout(() => {
            this.populateZoneData(zone);
            detailCard.classList.remove('map-detail-card--updating');
            detailCard.classList.add('map-detail-card--fade-in');

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
            }, 400);
        }, 80);
    }
}
