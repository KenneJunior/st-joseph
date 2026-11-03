/**
 * ============================================================================
 * SJCCC – Dynamic Reading Progress Indicator
 * (src/ui/navigation/ReadingProgressIndicator.ts)
 *
 * Responsibilities:
 * - Dynamically tracks reading progress through the college's long editorial
 *   sections: 'About SJCCC' (#about) and 'Academic Programmes' (#academics).
 * - Smoothly displays a hairline precision progress bar and floating section badge
 *   at the top of the viewport when inside these sections.
 * - Automatically fades out when scrolling outside tracked sections to keep
 *   the interface minimal and distraction-free.
 * - Built for 60fps GPU-composited rendering with passive scroll listeners and
 *   requestAnimationFrame coordination.
 * ============================================================================
 */

export interface TrackedSectionConfig {
    id: string;
    label: string;
}

export interface ReadingProgressOptions {
    sections?: TrackedSectionConfig[];
    containerId?: string;
    threshold?: number;
}

export class ReadingProgressIndicator {
    private containerEl: HTMLElement | null = null;
    private progressBarEl: HTMLElement | null = null;
    private sectionNameEl: HTMLElement | null = null;
    private percentEl: HTMLElement | null = null;
    private activeSectionConfig: TrackedSectionConfig | null = null;
    private currentProgress: number = 0;
    private isActive: boolean = false;
    private scrollListener: (() => void) | null = null;
    private resizeListener: (() => void) | null = null;
    private rafId: number | null = null;

    private readonly sections: TrackedSectionConfig[];

    constructor(options: ReadingProgressOptions = {}) {
        this.sections = options.sections || [
            { id: 'about', label: 'About SJCCC' },
            { id: 'academics', label: 'Academic Pathways' }
        ];

        this.init();
    }

    private init(): void {
        if (typeof document === 'undefined') return;

        this.renderDom();
        this.bindEvents();

        // Initial evaluation
        this.scheduleUpdate();
    }

    /**
     * Injects the reading progress indicator DOM at the top of the body
     */
    private renderDom(): void {
        let container = document.getElementById('readingProgressIndicator');
        if (!container) {
            container = document.createElement('div');
            container.id = 'readingProgressIndicator';
            container.className = 'reading-progress-indicator';
            container.setAttribute('role', 'progressbar');
            container.setAttribute('aria-label', 'Section reading progress');
            container.setAttribute('aria-valuemin', '0');
            container.setAttribute('aria-valuemax', '100');
            container.setAttribute('aria-valuenow', '0');

            container.innerHTML = `
                <div class="reading-progress-track">
                    <div class="reading-progress-bar" id="readingProgressBar"></div>
                </div>
                <div class="reading-progress-badge" id="readingProgressBadge">
                    <span class="reading-badge-icon" aria-hidden="true"><i class="bi bi-book-half"></i></span>
                    <span class="reading-badge-label">Reading: <strong id="readingSectionName">About SJCCC</strong></span>
                    <span class="reading-badge-divider" aria-hidden="true">·</span>
                    <span class="reading-badge-percent" id="readingProgressPercent">0%</span>
                </div>
            `;

            document.body.prepend(container);
        }

        this.containerEl = container;
        this.progressBarEl = container.querySelector('#readingProgressBar');
        this.sectionNameEl = container.querySelector('#readingSectionName');
        this.percentEl = container.querySelector('#readingProgressPercent');
    }

    private bindEvents(): void {
        this.scrollListener = () => this.scheduleUpdate();
        this.resizeListener = () => this.scheduleUpdate();

        window.addEventListener('scroll', this.scrollListener, { passive: true });
        window.addEventListener('resize', this.resizeListener, { passive: true });
    }

    private scheduleUpdate(): void {
        if (this.rafId !== null) return;

        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.update();
        });
    }

    /**
     * Evaluates current scroll position against the configured sections
     */
    public update(): void {
        if (typeof window === 'undefined' || !this.containerEl) return;

        const viewportHeight = window.innerHeight || 800;

        let detectedSection: TrackedSectionConfig | null = null;
        let calculatedProgress = 0;

        for (const config of this.sections) {
            const sectionEl = document.getElementById(config.id);
            if (!sectionEl) continue;

            const rect = sectionEl.getBoundingClientRect();
            const sectionHeight = sectionEl.offsetHeight || rect.height;
            if (sectionHeight <= 0) continue;

            // Reading horizon: active when section enters upper reading zone (45% viewport)
            // and its bottom hasn't scrolled completely past the header (20% viewport)
            const readingHorizon = viewportHeight * 0.45;
            const topPassed = readingHorizon - rect.top;

            if (topPassed >= 0 && rect.bottom >= (viewportHeight * 0.2)) {
                detectedSection = config;
                calculatedProgress = Math.min(Math.max(topPassed / sectionHeight, 0), 1);
                break;
            }
        }

        if (detectedSection) {
            this.activeSectionConfig = detectedSection;
            this.currentProgress = calculatedProgress;
            this.applyProgressState(true);
        } else {
            this.activeSectionConfig = null;
            this.currentProgress = 0;
            this.applyProgressState(false);
        }
    }

    /**
     * Applies the computed progress to the DOM
     */
    private applyProgressState(active: boolean): void {
        if (!this.containerEl) return;

        if (active !== this.isActive) {
            this.isActive = active;
            this.containerEl.classList.toggle('is-active', active);
        }

        if (active && this.activeSectionConfig) {
            const percent = Math.round(this.currentProgress * 100);

            // Update ARIA
            this.containerEl.setAttribute('aria-valuenow', percent.toString());

            // Update progress line using GPU-accelerated scaleX
            if (this.progressBarEl) {
                this.progressBarEl.style.transform = `scaleX(${this.currentProgress})`;
            }

            // Update section title text
            if (this.sectionNameEl && this.sectionNameEl.textContent !== this.activeSectionConfig.label) {
                this.sectionNameEl.textContent = this.activeSectionConfig.label;
            }

            // Update percent text
            if (this.percentEl) {
                this.percentEl.textContent = `${percent}%`;
            }
        }
    }

    public getActiveSection(): TrackedSectionConfig | null {
        return this.activeSectionConfig;
    }

    public getProgress(): number {
        return this.currentProgress;
    }

    public isVisible(): boolean {
        return this.isActive;
    }

    public destroy(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }

        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }

        this.containerEl?.remove();
        this.containerEl = null;
        this.progressBarEl = null;
        this.sectionNameEl = null;
        this.percentEl = null;
    }
}
