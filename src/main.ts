// ============================================
// SJCCC Mbengwi - Class Architecture
// ============================================
import './style.css'
import './sw-register.ts'

// ============================================
// PILLAR PRELOADER WITH MULTIPLE ANIMATIONS
// ============================================
class Preloader {
    private preloader: HTMLElement;
    private topHalf: HTMLElement | null;
    private bottomHalf: HTMLElement | null;
    private content: HTMLElement | null;
    private progressBar: HTMLElement | null;
    private percentageText: HTMLElement | null;
    private particlesContainer: HTMLElement | null;

    private topPillars: HTMLElement[] = [];
    private bottomPillars: HTMLElement[] = [];
    private pillarCount: number = 12;
    private animatedCount: number = 0;
    private totalPillars: number = 0;
    private isAnimating: boolean = false;

    private readonly STORAGE_KEY = 'lastPreloaderAnimation';

    // Available animation types
    private readonly ANIMATIONS = [
        'Center',
        'LeftToRight',
        'RightToLeft',
        'Checkerboard',
        'EdgeInward',
        'Wave',
        'DoubleDoor'
    ];

    constructor() {
        this.preloader = document.getElementById('preloader') as HTMLElement;
        this.topHalf = document.getElementById('preloaderTopHalf');
        this.bottomHalf = document.getElementById('preloaderBottomHalf');
        this.content = document.getElementById('preloaderContent');
        this.progressBar = document.getElementById('preloaderProgressBar');
        this.percentageText = document.getElementById('preloaderPercentage');
        this.particlesContainer = document.getElementById('preloaderParticles');

        if (this.preloader) {
            this.init();
        }
    }

    private init(): void {
        this.adjustPillarCount();
        this.createPillars();
        this.createParticles();
        this.startLoading();

        window.addEventListener('resize', () => {
            if (!this.isAnimating && !this.preloader.classList.contains('fade-out')) {
                this.adjustPillarCount();
                this.recreatePillars();
            }
        });
    }

    private adjustPillarCount(): void {
        const width = window.innerWidth;
        if (width <= 480) this.pillarCount = 10;
        else if (width <= 768) this.pillarCount = 14;
        else if (width <= 1024) this.pillarCount = 18
        else this.pillarCount = 24;
    }

    private createParticles(): void {
        if (!this.particlesContainer) return;
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'preloader-particle';
            const size = Math.random() * 3 + 1.5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${35 + Math.random() * 30}%`;
            particle.style.animationDelay = `${Math.random() * 4}s`;
            particle.style.animationDuration = `${3 + Math.random() * 5}s`;
            this.particlesContainer.appendChild(particle);
        }
    }

    private recreatePillars(): void {
        if (!this.topHalf || !this.bottomHalf) return;
        this.topHalf.innerHTML = '';
        this.bottomHalf.innerHTML = '';
        this.topPillars = [];
        this.bottomPillars = [];
        this.animatedCount = 0;
        this.createPillars();
    }

    private createPillars(): void {
        if (!this.topHalf || !this.bottomHalf) return;
        this.totalPillars = this.pillarCount * 2;

        for (let i = 0; i < this.pillarCount; i++) {
            const pillar = document.createElement('div');
            pillar.className = 'preloader-pillar';
            pillar.setAttribute('data-index', String(i));
            pillar.style.backgroundColor = 'var(--primary-dark)';
            this.topHalf.appendChild(pillar);
            this.topPillars.push(pillar);
        }

        for (let i = 0; i < this.pillarCount; i++) {
            const pillar = document.createElement('div');
            pillar.className = 'preloader-pillar';
            pillar.setAttribute('data-index', String(i));
            pillar.style.backgroundColor = 'var(--primary-dark)';
            this.bottomHalf.appendChild(pillar);
            this.bottomPillars.push(pillar);
        }
    }

    private startLoading(): void {
        let progress = 0;
        const startTime = performance.now();
        const minDuration = 1500;

        const updateLoading = (): void => {
            const elapsed = performance.now() - startTime;
            if (progress < 90) {
                progress += (Math.random() * 8 + 3) * (1 - progress / 100);
            } else if (progress < 100) {
                progress += 0.3;
            }
            progress = Math.min(progress, 100);
            this.updateProgress(progress);

            if (progress < 100) {
                requestAnimationFrame(updateLoading);
            } else {
                const remainingTime = Math.max(0, minDuration - elapsed);
                setTimeout(() => this.startPillarAnimation(), remainingTime + 200);
            }
        };

        requestAnimationFrame(updateLoading);

        window.addEventListener('load', () => {
            if (progress < 100) {
                progress = 100;
                this.updateProgress(100);
                setTimeout(() => {
                    if (!this.isAnimating) this.startPillarAnimation();
                }, 300);
            }
        });
    }

    private updateProgress(progress: number): void {
        const rounded = Math.round(progress);
        if (this.progressBar) this.progressBar.style.width = `${rounded}%`;
        if (this.percentageText) this.percentageText.textContent = `${rounded}%`;
    }

    /**
     * Cycles through all available animations in order
     */
    private animatePillar(): void {
        const lastAnimation = localStorage.getItem(this.STORAGE_KEY);
        let nextIndex = 0;

        if (lastAnimation) {
            const currentIndex = this.ANIMATIONS.indexOf(lastAnimation);
            nextIndex = (currentIndex + 1) % this.ANIMATIONS.length;
        }

        const nextAnimation = this.ANIMATIONS[nextIndex];
        localStorage.setItem(this.STORAGE_KEY, nextAnimation);

        // Execute the selected animation
        switch (nextAnimation) {
            case 'Center':
                this.pillarAnimationCenter();
                break;
            case 'LeftToRight':
                this.pillarAnimationLeftToRight();
                break;
            case 'RightToLeft':
                this.pillarAnimationRightToLeft();
                break;
            case 'Checkerboard':
                this.pillarAnimationCheckerboard();
                break;
            case 'EdgeInward':
                this.pillarAnimationEdgeInward();
                break;
            case 'Wave':
                this.pillarAnimationWave();
                break;
            case 'DoubleDoor':
                this.pillarAnimationDoubleDoor();
                break;
            default:
                this.pillarAnimationCenter();
        }
    }

    // ============================================
    // ANIMATION 1: CENTER OUTWARD
    // ============================================
    private pillarAnimationCenter(): void {
        const centerIndex = Math.floor(this.pillarCount / 2);
        const sequence: number[] = [];
        const visited = new Set<number>();

        for (let offset = 0; offset <= centerIndex; offset++) {
            const leftIndex = centerIndex - offset;
            const rightIndex = centerIndex + offset;
            if (leftIndex >= 0 && !visited.has(leftIndex)) {
                visited.add(leftIndex);
                sequence.push(leftIndex);
            }
            if (rightIndex < this.pillarCount && !visited.has(rightIndex)) {
                visited.add(rightIndex);
                sequence.push(rightIndex);
            }
        }

        this.executeAnimation(sequence, 80);
    }

    // ============================================
    // ANIMATION 2: LEFT TO RIGHT
    // ============================================
    private pillarAnimationLeftToRight(): void {
        const sequence: number[] = [];
        for (let i = 0; i < this.pillarCount; i++) {
            sequence.push(i);
        }
        this.executeAnimation(sequence, 80);
    }

    // ============================================
    // ANIMATION 3: RIGHT TO LEFT
    // ============================================
    private pillarAnimationRightToLeft(): void {
        const sequence: number[] = [];
        for (let i = this.pillarCount - 1; i >= 0; i--) {
            sequence.push(i);
        }
        this.executeAnimation(sequence, 80);
    }

    // ============================================
    // ANIMATION 4: CHECKERBOARD / ALTERNATING
    // ============================================
    private pillarAnimationCheckerboard(): void {
        const sequence: number[] = [];

        // First pass: even indices
        for (let i = 0; i < this.pillarCount; i += 2) {
            sequence.push(i);
        }
        // Second pass: odd indices
        for (let i = 1; i < this.pillarCount; i += 2) {
            sequence.push(i);
        }

        this.executeAnimation(sequence, 60);
    }

    // ============================================
    // ANIMATION 5: EDGE INWARD (Both ends toward center)
    // ============================================
    private pillarAnimationEdgeInward(): void {
        const sequence: number[] = [];
        const visited = new Set<number>();

        for (let offset = 0; offset < Math.ceil(this.pillarCount / 2); offset++) {
            const leftIndex = offset;
            const rightIndex = this.pillarCount - 1 - offset;

            if (!visited.has(leftIndex)) {
                visited.add(leftIndex);
                sequence.push(leftIndex);
            }
            if (rightIndex !== leftIndex && !visited.has(rightIndex)) {
                visited.add(rightIndex);
                sequence.push(rightIndex);
            }
        }

        this.executeAnimation(sequence, 70);
    }

    // ============================================
    // ANIMATION 6: WAVE PATTERN
    // ============================================
    private pillarAnimationWave(): void {
        const sequence: number[] = [];

        // Create a wave pattern: 0, 2, 4, 1, 3, 5, 6, 8, 10, 7, 9, 11
        const evenForward: number[] = [];
        const oddForward: number[] = [];

        for (let i = 0; i < this.pillarCount; i++) {
            if (i % 2 === 0) evenForward.push(i);
            else oddForward.push(i);
        }

        sequence.push(...evenForward, ...oddForward);
        this.executeAnimation(sequence, 65);
    }

    // ============================================
    // ANIMATION 7: DOUBLE DOOR (Center splits outward)
    // ============================================
    private pillarAnimationDoubleDoor(): void {
        const sequence: number[] = [];
        const centerIndex = Math.floor(this.pillarCount / 2);

        // Start from center, move outward
        for (let offset = 0; offset <= centerIndex; offset++) {
            // Left side moving left
            const leftDoor = centerIndex - offset;
            if (leftDoor >= 0) sequence.push(leftDoor);

            // Right side moving right
            const rightDoor = centerIndex + 1 + offset;
            if (rightDoor < this.pillarCount) sequence.push(rightDoor);
        }

        this.executeAnimation(sequence, 75);
    }

    // ============================================
    // EXECUTE ANIMATION
    // ============================================
    private executeAnimation(sequence: number[], staggerDelay: number): void {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Fade out center content first
        if (this.content) {
            this.content.classList.add('fade-out');
        }

        sequence.forEach((index, position) => {
            setTimeout(() => {
                if (this.topPillars[index]) {
                    this.topPillars[index].classList.add('animate-out');
                }
                if (this.bottomPillars[index]) {
                    this.bottomPillars[index].classList.add('animate-out');
                }

                this.animatedCount += 2;

                if (this.animatedCount >= this.totalPillars) {
                    setTimeout(() => this.onComplete(), 900);
                }
            }, position * staggerDelay);
        });
    }

    private startPillarAnimation(): void {
        this.animatePillar();
    }

    private onComplete(): void {
        this.preloader.classList.add('fade-out');
        setTimeout(() => {
            this.preloader.style.display = 'none';
        }, 1000);
    }
}

// ============================================
// THEME MANAGER WITH ANIMATED TRANSITIONS (FIXED)
// ============================================

type AnimationStyle =
    | 'circle-center'
    | 'circle-top-left'
    | 'circle-top-right'
    | 'rect-top-down'
    | 'rect-bottom-up'
    | 'rect-left-right'
    | 'rect-right-left'
    | 'blur';

class ThemeManager {
    private body: HTMLElement;
    private toggle: HTMLAnchorElement | null;
    private transitionOverlay: HTMLElement | null;
    private readonly STORAGE_KEY = 'sjccc-theme';
    private readonly ANIM_STORAGE_KEY = 'sjccc-theme-animation';
    private readonly DARK_CLASS = 'dark-mode';
    private isDark: boolean = false;
    private isAnimating: boolean = false;

    // Timing constants (in milliseconds) - Increased for smoother feel
    private readonly EXPAND_DURATION = 800;   // Overlay expands (was 500)
    private readonly THEME_SWITCH_DELAY = 650; // Switch theme just before fully expanded (was 400)
    private readonly HOLD_DURATION = 150;     // Brief pause at full expansion (was 100)
    private readonly SHRINK_DURATION = 600;   // Overlay shrinks back (was 400)
    private readonly TOTAL_DURATION = 1600;   // Total animation time (was 1000)

    private readonly animations: AnimationStyle[] = [
        'circle-center',
        'circle-top-left',
        'circle-top-right',
        'rect-top-down',
        'rect-bottom-up',
        'rect-left-right',
        'rect-right-left',
        'blur'
    ];

    private currentAnimation: AnimationStyle = 'circle-center';

    constructor(toggleId: string) {
        this.body = document.body;
        this.toggle = document.getElementById(toggleId) as HTMLAnchorElement | null;
        this.transitionOverlay = document.getElementById('themeTransitionOverlay');

        // Create overlay if it doesn't exist
        if (!this.transitionOverlay) {
            this.transitionOverlay = document.createElement('div');
            this.transitionOverlay.id = 'themeTransitionOverlay';
            this.transitionOverlay.className = 'theme-transition-overlay';
            // Insert as first child so it's behind all content
            document.body.insertBefore(this.transitionOverlay, document.body.firstChild);
        }

        this.init();
    }

    private init(): void {
        this.loadSavedAnimation();
        this.applyInitialTheme();
        this.bindToggle();
        this.listenForSystemChanges();
    }

    private loadSavedAnimation(): void {
        const saved = localStorage.getItem(this.ANIM_STORAGE_KEY);

        if (saved && this.animations.includes(saved as AnimationStyle)) {
            this.currentAnimation = saved as AnimationStyle;
        } else {
            this.currentAnimation = 'circle-center';
            localStorage.setItem(this.ANIM_STORAGE_KEY, 'circle-center');
        }
    }

    private cycleAnimation(): void {
        const currentIndex = this.animations.indexOf(this.currentAnimation);
        const nextIndex = (currentIndex + 1) % this.animations.length;
        this.currentAnimation = this.animations[nextIndex];
        localStorage.setItem(this.ANIM_STORAGE_KEY, this.currentAnimation);
    }

    private applyInitialTheme(): void {
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (saved === 'dark') {
            this.applyTheme(true);
        } else if (saved === 'light') {
            this.applyTheme(false);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.applyTheme(true);
        } else {
            this.applyTheme(false);
        }
    }

    private bindToggle(): void {
        this.toggle?.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();

            if (!this.isAnimating) {
                this.toggleTheme();
            }
        });
    }

    private listenForSystemChanges(): void {
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e: MediaQueryListEvent) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.applyTheme(e.matches);
                }
            });
    }

    /**
     * Toggle theme with smooth, long animation:
     * 1. Overlay expands to cover old theme (800ms) - smooth ease-out
     * 2. Theme switches underneath while fully covered (at 650ms)
     * 3. Brief hold at full expansion (150ms)
     * 4. Overlay shrinks to reveal new theme (600ms) - smooth ease-in
     */
    public toggleTheme(): void {
        if (this.isAnimating) return;

        const goingDark = !this.isDark;
        this.isAnimating = true;

        // Step 1: Expand overlay to cover the current theme
        this.expandOverlay(goingDark);

        // Step 2: Switch the theme UNDER the overlay (before it shrinks)
        setTimeout(() => {
            this.applyTheme(goingDark);
        }, this.THEME_SWITCH_DELAY);

        // Step 3: Start shrinking overlay to reveal new theme
        setTimeout(() => {
            this.shrinkOverlay();
        }, this.EXPAND_DURATION + this.HOLD_DURATION);

        // Step 4: Clean up everything
        setTimeout(() => {
            this.cleanupOverlay();
            this.cycleAnimation();
            this.isAnimating = false;
        }, this.TOTAL_DURATION);
    }

    /**
     * Apply theme instantly (no animation)
     */
    private applyTheme(dark: boolean): void {
        this.isDark = dark;

        // Disable transitions temporarily to prevent flash
        this.body.style.transition = 'none';

        if (dark) {
            this.body.classList.add(this.DARK_CLASS);
        } else {
            this.body.classList.remove(this.DARK_CLASS);
        }

        // Force reflow
        void this.body.offsetWidth;

        // Re-enable transitions after a tiny delay
        setTimeout(() => {
            this.body.style.transition = '';
        }, 50);

        localStorage.setItem(this.STORAGE_KEY, dark ? 'dark' : 'light');
    }

    /**
     * Expand overlay from start position to full screen (smooth ease-out)
     */
    private expandOverlay(goingDark: boolean): void {
        const overlay = this.transitionOverlay;
        if (!overlay) return;

        // The overlay shows the NEW theme color
        const newBg = goingDark ? '#121a2a' : '#ffffff';

        // Reset overlay to start position
        overlay.style.transition = 'none';
        overlay.style.clipPath = this.getStartClipPath();
        overlay.style.background = newBg;
        overlay.style.opacity = '1';
        overlay.style.filter = 'none';
        overlay.classList.add('animating');

        // Force reflow
        void overlay.offsetWidth;

        // Smooth ease-out for expansion - starts fast, ends slow
        const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1.0)'; // Smooth deceleration
        overlay.style.transition = `clip-path ${this.EXPAND_DURATION}ms ${easing}`;

        requestAnimationFrame(() => {
            overlay.style.clipPath = this.getFullScreenClipPath();

            // Handle blur - subtle blur during expansion
            if (this.currentAnimation === 'blur') {
                overlay.style.transition = `clip-path ${this.EXPAND_DURATION}ms ${easing}, filter 0.6s ease`;
                overlay.style.filter = 'blur(8px)';
            }
        });
    }

    /**
     * Shrink overlay from full screen back to start position (smooth ease-in)
     */
    private shrinkOverlay(): void {
        const overlay = this.transitionOverlay;
        if (!overlay) return;

        // Clear any blur before shrinking
        if (this.currentAnimation === 'blur') {
            overlay.style.filter = 'blur(0px)';
        }

        // Smooth ease-in for shrinking - starts slow, ends fast
        const easing = 'cubic-bezier(0.55, 0.0, 0.45, 1.0)'; // Smooth acceleration
        overlay.style.transition = `clip-path ${this.SHRINK_DURATION}ms ${easing}`;

        requestAnimationFrame(() => {
            overlay.style.clipPath = this.getStartClipPath();
        });
    }

    /**
     * Clean up overlay after animation completes
     */
    private cleanupOverlay(): void {
        const overlay = this.transitionOverlay;
        if (!overlay) return;

        overlay.classList.remove('animating');
        overlay.style.opacity = '0';
        overlay.style.clipPath = 'none';
        overlay.style.filter = 'none';
        overlay.style.background = 'transparent';
        overlay.style.transition = 'none';
    }

    private getStartClipPath(): string {
        switch (this.currentAnimation) {
            case 'circle-center':
                return 'circle(0% at 50% 50%)';
            case 'circle-top-left':
                return 'circle(0% at 0% 0%)';
            case 'circle-top-right':
                return 'circle(0% at 100% 0%)';
            case 'rect-top-down':
                return 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';
            case 'rect-bottom-up':
                return 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)';
            case 'rect-left-right':
                return 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)';
            case 'rect-right-left':
                return 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)';
            case 'blur':
                return 'circle(0% at 50% 50%)';
            default:
                return 'circle(0% at 50% 50%)';
        }
    }

    private getFullScreenClipPath(): string {
        if (this.currentAnimation.startsWith('rect-')) {
            return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
        }
        return 'circle(150% at 50% 50%)';
    }

    public isDarkMode(): boolean {
        return this.body.classList.contains(this.DARK_CLASS);
    }
}

// --------------------------------------------
class HeaderScroll {
    private ticking: boolean = false;
    private lastScrollY: number = 0;

    constructor(
        private header: HTMLElement,
        private backToTopBtn: HTMLElement | null
    ) {
        this.init();
    }

    private init(): void {
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.onScroll();
        this.backToTopBtn?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    private onScroll = (): void => {
        this.lastScrollY = window.scrollY;

        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                // Progressive blur - add/remove scrolled class
                this.header.classList.toggle('scrolled', this.lastScrollY > 60);

                // Dynamic blur intensity based on scroll position
                const blurIntensity = Math.min(25, 20 + (this.lastScrollY / 50));
                this.header.style.setProperty('--blur-intensity', `${blurIntensity}px`);

                // Back to top button visibility
                this.backToTopBtn?.classList.toggle('visible', this.lastScrollY > 500);

                this.ticking = false;
            });
            this.ticking = true;
        }

        // Update header height CSS variable for layout calculations
        this.updateHeaderHeight();
    };

    private updateHeaderHeight(): void {
        const headerHeight = this.header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
}

// --------------------------------------------
class MobileNavigation {
    private readonly menuToggle: HTMLButtonElement | null;
    private readonly navMenu: HTMLElement | null;
    private readonly header: HTMLElement | null;

    constructor(menuToggleId: string, navMenuId: string, headerId: string) {
        this.menuToggle = document.getElementById(menuToggleId) as HTMLButtonElement | null;
        this.navMenu = document.getElementById(navMenuId) as HTMLElement | null;
        this.header = document.getElementById(headerId) as HTMLElement | null;
        this.init();
    }

    private init(): void {
        if (!this.menuToggle || !this.navMenu) return;

        this.menuToggle.addEventListener('click', () => this.toggleMenu());
        this.bindLinkClicks();
        this.bindOutsideClick();

        // Update header height when menu toggles (for mobile layout changes)
        this.menuToggle.addEventListener('click', () => {
            setTimeout(() => this.updateHeaderHeight(), 350);
        });
    }

    private toggleMenu(): void {
        const isActive = this.navMenu!.classList.toggle('active');
        const icon = this.menuToggle!.querySelector('i');
        if (icon) {
            icon.className = isActive ? 'bi bi-x-lg' : 'bi bi-list';
        }
        this.menuToggle!.setAttribute('aria-expanded', String(isActive));
    }

    private closeMenu(): void {
        this.navMenu?.classList.remove('active');
        if (this.menuToggle) {
            const icon = this.menuToggle.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-list';
            }
            this.menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    private bindLinkClicks(): void {
        this.navMenu?.querySelectorAll<HTMLAnchorElement>('a:not(#darkModeToggle)')
            .forEach((link) => {
                link.addEventListener('click', () => this.closeMenu());
            });
    }

    private bindOutsideClick(): void {
        document.addEventListener('click', (e: MouseEvent) => {
            if (
                this.header &&
                !this.header.contains(e.target as Node) &&
                this.navMenu?.classList.contains('active')
            ) {
                this.closeMenu();
            }
        });
    }

    private updateHeaderHeight(): void {
        const headerHeight = this.header?.offsetHeight || 80;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
}

// --------------------------------------------
class AnnouncementBar {
    private bar: HTMLElement | null;
    private closeBtn: HTMLButtonElement | null;
    private readonly STORAGE_KEY = 'announcementDismissed';

    constructor(barId: string, closeBtnId: string) {
        this.bar = document.getElementById(barId) as HTMLElement | null;
        this.closeBtn = document.getElementById(closeBtnId) as HTMLButtonElement | null;
        this.init();
    }

    private init(): void {
        this.observeSizeChanges();
        this.updateLayout();
        window.addEventListener('load', () => this.updateLayout());
        window.addEventListener('resize', () => this.updateLayout());

        if (!this.closeBtn || !this.bar) return;

        if (localStorage.getItem(this.STORAGE_KEY) === 'true') {
            this.bar.classList.add('dismissed');
            this.updateLayout();
        }

        this.closeBtn.addEventListener('click', () => this.dismiss());
    }

    private dismiss(): void {
        this.bar?.classList.add('dismissed');
        localStorage.setItem(this.STORAGE_KEY, 'true');
        this.updateLayout();
    }

    private updateLayout(): void {
        const root = document.documentElement;
        const header = document.getElementById('mainHeader') as HTMLElement | null;
        if (header) {
            root.style.setProperty('--header-height', `${header.offsetHeight}px`);
        }
        if (this.bar && !this.bar.classList.contains('dismissed')) {
            root.style.setProperty('--bar-height', `${this.bar.offsetHeight}px`);
        } else {
            root.style.setProperty('--bar-height', '0px');
        }
    }

    private observeSizeChanges(): void {
        const header = document.getElementById('mainHeader') as HTMLElement | null;
        if (header) new ResizeObserver(() => this.updateLayout()).observe(header);
        if (this.bar) new ResizeObserver(() => this.updateLayout()).observe(this.bar);
    }
}

// --------------------------------------------
class Carousel {
    private slides: NodeListOf<HTMLElement>;
    private dotsContainer: HTMLElement | null;
    private prevBtn: HTMLButtonElement | null;
    private nextBtn: HTMLButtonElement | null;
    private container: HTMLElement | null;
    private dots: NodeListOf<HTMLElement> = document.querySelectorAll('.carousel-dot');
    private currentSlide = 0;
    private autoPlay!: ReturnType<typeof setInterval>;
    private readonly DELAY = 5000;

    constructor(
        slidesSelector: string,
        dotsContainerId: string,
        prevBtnId: string,
        nextBtnId: string,
        containerSelector: string
    ) {
        this.slides = document.querySelectorAll<HTMLElement>(slidesSelector);
        this.dotsContainer = document.getElementById(dotsContainerId) as HTMLElement | null;
        this.prevBtn = document.getElementById(prevBtnId) as HTMLButtonElement | null;
        this.nextBtn = document.getElementById(nextBtnId) as HTMLButtonElement | null;
        this.container = document.querySelector<HTMLElement>(containerSelector);
        this.init();
    }

    private init(): void {
        if (!this.slides.length || !this.dotsContainer) return;

        this.generateDots();
        this.dots = document.querySelectorAll<HTMLElement>('.carousel-dot');
        this.prevBtn?.addEventListener('click', () => this.prevSlide());
        this.nextBtn?.addEventListener('click', () => this.nextSlide());
        this.resetAutoPlay();
        this.bindHover();
        this.bindTouch();
    }

    private generateDots(): void {
        this.slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            if (i === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => this.goToSlide(i));
            this.dotsContainer?.appendChild(dot);
        });
    }

    private goToSlide(index: number): void {
        this.slides[this.currentSlide].classList.remove('active');
        this.dots[this.currentSlide]?.classList.remove('active');
        this.currentSlide = (index + this.slides.length) % this.slides.length;
        this.slides[this.currentSlide].classList.add('active');
        this.dots[this.currentSlide]?.classList.add('active');
        this.resetAutoPlay();
    }

    private nextSlide = (): void => this.goToSlide(this.currentSlide + 1);
    private prevSlide = (): void => this.goToSlide(this.currentSlide - 1);

    private resetAutoPlay(): void {
        clearInterval(this.autoPlay);
        this.autoPlay = setInterval(() => this.nextSlide(), this.DELAY);
    }

    private bindHover(): void {
        this.container?.addEventListener('mouseenter', () => clearInterval(this.autoPlay));
        this.container?.addEventListener('mouseleave', () => this.resetAutoPlay());
    }

    private bindTouch(): void {
        let touchStartX = 0;
        this.container?.addEventListener('touchstart', (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.container?.addEventListener('touchend', (e: TouchEvent) => {
            const diff = touchStartX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) {
                diff > 0 ? this.nextSlide() : this.prevSlide();
            }
        });
    }
}

// --------------------------------------------
class CounterAnimation {
    private elements: NodeListOf<HTMLElement>;
    private animated = false;

    constructor(selector: string) {
        this.elements = document.querySelectorAll<HTMLElement>(selector);
        this.init();
    }

    private init(): void {
        window.addEventListener('scroll', () => this.animate(), { passive: true });
        this.animate();
    }

    private animate(): void {
        if (this.animated || !this.elements.length) return;
        const first = this.elements[0];
        if (first.getBoundingClientRect().top < window.innerHeight - 80) {
            this.animated = true;
            this.elements.forEach((el) => this.runCounter(el));
        }
    }

    private runCounter(el: HTMLElement): void {
        const target = parseInt(el.getAttribute('data-target') ?? '0', 10);
        const duration = 1800;
        const start = performance.now();

        const update = (now: number): void => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = String(Math.floor(eased * target));
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = String(target);
            }
        };
        requestAnimationFrame(update);
    }
}

// --------------------------------------------
class ScrollReveal {
    constructor(selector: string) {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -20px 0px' }
        );

        elements.forEach((el) => observer.observe(el));
    }
}

// --------------------------------------------
class SmoothScroll {
    private header: HTMLElement | null;

    constructor(headerId: string) {
        this.header = document.getElementById(headerId) as HTMLElement | null;
        this.init();
    }

    private init(): void {
        document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (e: MouseEvent) => this.handleClick(e, anchor));
        });
    }

    private handleClick(e: MouseEvent, anchor: HTMLAnchorElement): void {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const target = document.querySelector(targetId) as HTMLElement | null;
        if (!target) return;

        e.preventDefault();
        const headerHeight = this.header ? this.header.offsetHeight + 16 : 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

// --------------------------------------------
class HeroParticles {
    constructor(containerId: string, count = 40) {
        const container = document.getElementById(containerId) as HTMLElement | null;
        if (!container) return;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'hero-particle';
            const size = Math.random() * 4 + 1.5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${Math.random() * 8 + 6}s`;
            particle.style.animationDelay = `${Math.random() * 6}s`;
            container.appendChild(particle);
        }
    }
}

// --------------------------------------------
class AcademicLevelToggles {
    constructor(selector: string) {
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

// --------------------------------------------
class ScrollSpy {
    private navLinks: NodeListOf<HTMLAnchorElement>;
    private sections: Array<{
        link: HTMLAnchorElement;
        section: HTMLElement & { _navLink?: HTMLAnchorElement };
    }> = [];

    constructor(navLinkSelector: string) {
        this.navLinks = document.querySelectorAll<HTMLAnchorElement>(navLinkSelector);
        this.init();
    }

    private init(): void {
        this.gatherSections();
        if (!this.sections.length) return;

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    const target = entry.target as HTMLElement & { _navLink?: HTMLAnchorElement };
                    if (entry.isIntersecting && target._navLink) {
                        this.navLinks.forEach((l) => l.classList.remove('active'));
                        target._navLink.classList.add('active');
                    }
                });
            },
            { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0 }
        );

        this.sections.forEach(({ section }) => observer.observe(section));
    }

    private gatherSections(): void {
        this.navLinks.forEach((link) => {
            const targetId = link.getAttribute('href');
            if (targetId?.startsWith('#')) {
                const section = document.querySelector(targetId) as
                    | (HTMLElement & { _navLink?: HTMLAnchorElement })
                    | null;
                if (section) {
                    section._navLink = link;
                    this.sections.push({ link, section });
                }
            }
        });
    }
}

// --------------------------------------------
class EnquiryModal {
    private fabElement: HTMLElement[];
    private modal: HTMLElement | null;
    private closeBtn: HTMLButtonElement | null;

    constructor(fabIds: string[], modalId: string, closeBtnId: string) {
        this.fabElement = fabIds.map((id) => document.getElementById(id)).filter((v): v is HTMLElement => !!v);
        this.modal = document.getElementById(modalId) as HTMLElement | null;
        this.closeBtn = document.getElementById(closeBtnId) as HTMLButtonElement | null;
        this.init();
    }

    private init(): void {
        this.fabElement?.forEach((fab) => {
            fab.addEventListener('click', () => this.open());
        });
        this.closeBtn?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modal) this.close();
        });
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.modal && !this.modal.hasAttribute('hidden')) {
                this.close();
            }
        });
    }

    private open(): void {
        if (!this.modal) return;
        this.modal.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
        this.modal.querySelector<HTMLInputElement>('input')?.focus();
    }

    private close(): void {
        if (!this.modal) return;
        this.modal.setAttribute('hidden', '');
        document.body.style.overflow = '';
        this.fabElement[0]?.focus();
    }
}

// --------------------------------------------
class EnquiryForm {
    private readonly form: HTMLFormElement | null;
    private readonly status: HTMLElement | null;
    private readonly submitBtn: HTMLButtonElement | null;
    private whatsappToggle: HTMLInputElement | null;

    constructor(formId: string, statusId: string, submitBtnId: string, whatsappToggleId: string) {
        this.form = document.getElementById(formId) as HTMLFormElement | null;
        this.status = document.getElementById(statusId) as HTMLElement | null;
        this.submitBtn = document.getElementById(submitBtnId) as HTMLButtonElement | null;
        this.whatsappToggle = document.getElementById(whatsappToggleId) as HTMLInputElement | null;
        this.init();
    }

    private init(): void {
        this.form?.addEventListener('submit', (e: SubmitEvent) => this.handleSubmit(e));
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        if (!this.status || !this.submitBtn || !this.form) return;

        this.status.textContent = '';
        this.status.className = 'form-note';
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Processing…';

        // 1. ROUTE VIA WHATSAPP IF TOGGLE IS TRUE
        if (this.whatsappToggle?.checked) {
            try {
                const formData = new FormData(this.form);

                // Pull fields explicitly so the toggle button state doesn't leak into the message
                const clientName = formData.get('name') as string || 'Not provided';
                const clientEmail = formData.get('email') as string || 'Not provided';
                const clientMessage = formData.get('message') as string || '';

                // Construct a beautifully formatted multi-line template
                let textMessage = "✨ *SJCCC Mbengwi - New Website Enquiry* ✨\n\n";
                textMessage += `👤 *Name:* ${clientName}\n`;
                textMessage += `✉️ *Email:* ${clientEmail}\n\n`;
                textMessage += `📝 *Message:*\n${clientMessage}`;

                // Pull phone from data attribute or fallback securely
                const phoneNumber = this.form.getAttribute('data-whatsapp-phone') || '237670000000';
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(textMessage)}`;

                window.open(whatsappUrl, '_blank');

                this.status.textContent = '✅ Opening WhatsApp to send your message...';
                this.status.className = 'form-note success';
                this.form.reset();
            } catch (err) {
                this.status.textContent = '⚠️ Could not generate WhatsApp link. Please try standard email.';
                this.status.className = 'form-note error';
            } finally {
                this.submitBtn.disabled = false;
                this.submitBtn.textContent = 'Send Message';
            }
            return;
        }
        // 2. FALLBACK TO FORMSPREE IF TOGGLE IS FALSE
        try {
            const response = await fetch(this.form.action, {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(this.form),
            });

            if (response.ok) {
                this.status.textContent =
                    '✅ Thank you! Your message has been sent. We will reply within 48 hours.';
                this.status.className = 'form-note success';
                this.form.reset();
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch {
            this.status.textContent =
                '⚠️ Sorry, something went wrong. Please email us directly at info@sjcccmbengwi.org.';
            this.status.className = 'form-note error';
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Send Message';
        }
    }

}

// ============================================
// APPLICATION BOOTSTRAP
// ============================================
class App {
    constructor() {
        this.init();
    }

    private init(): void {
        // 1. Preloader
        new Preloader();


        // 2. Theme
        new ThemeManager('themeToggle');

        // 3. Header scroll & back to top with progressive blur
        const headerEl = document.getElementById('mainHeader');
        const backToTopEl = document.getElementById('backToTop');
        if (headerEl) new HeaderScroll(headerEl, backToTopEl);

        // 4. Mobile navigation
        new MobileNavigation('menuToggle', 'navMenu', 'mainHeader');

        // 5. Announcement bar
        new AnnouncementBar('announcementBar', 'announcementClose');

        // 6. Carousel
        new Carousel('.carousel-slide', 'carouselDots', 'prevBtn', 'nextBtn', '.carousel-container');

        // 7. Counters
        new CounterAnimation('.stat-number[data-target]');

        // 8. Scroll reveal
        new ScrollReveal('.reveal');

        // 9. Smooth scroll
        new SmoothScroll('mainHeader');

        // 10. Hero particles
        new HeroParticles('heroParticles', 40);

        // 11. Academic toggles
        new AcademicLevelToggles('.level__toggle');

        // 12. Scroll spy
        new ScrollSpy('#navMenu a.nav-link');

        // 13. Enquiry modal
        new EnquiryModal(['enquiryFab','enquire-btn', 'pMan', 'getInTouchBtn'],
            'enquiryModal',
            'modalClose');

        // 14. Enquiry form (Formspree)
        new EnquiryForm('enquiryForm', 'formStatus', 'submitBtn', 'whatsappRoutingToggle');
    }
}

// Boot the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});