/**
 * ============================================================================
 * SJCCC – Scroll Engine
 * Kinetic 3D message carousel orchestrator with fixed-timestep physics,
 * spring-settling slide snapping, and Stokes-Brownian particle canvas
 * ============================================================================
 */

import { omegaFromResponseTime, springStep } from '../../core/physics/spring.ts';
import { TextSplitter } from '../../ui/utils/TextSplitter.ts';
import { ParticleSystem } from './ParticleSystem.ts';

export interface ScrollEngineConfig {
    messages: string[];
    scrollResponse?: number;  // seconds to settle the visual-lag spring (default 0.18)
    snapResponse?: number;    // seconds to settle the slide-snap spring (default 0.4)
    maxSkew?: number;         // degrees, asymptotic skew limit (default 12)
    maxZPush?: number;        // px, asymptotic Z-push limit (default -800)
    canvasId?: string;
    heroId: string;
    containerId: string;
    navId: string;
    fillId: string;
    counterId: string;
    a11yId: string;
}

interface ScrollState {
    currentIndex: number;
    faces: HTMLElement[];
    dots: HTMLElement[];
    currentScroll: number;
    scrollVelocity: number;
    pitchAngle: number;
    pitchVelocity: number;
    lastTime: number;
    scrollDir: 'up' | 'down';
    isSnapping: boolean;
    snapTarget: number;
    snapVelocity: number;
    idleTimer: number | null;
}

const FIXED_DT = 1 / 120;
const MAX_FRAME_TIME = 0.25;
const SNAP_POSITION_EPSILON = 0.5;
const SNAP_VELOCITY_EPSILON = 1;

export class ScrollEngine {
    private config: Required<Pick<ScrollEngineConfig, 'scrollResponse' | 'snapResponse' | 'maxSkew' | 'maxZPush'>> & ScrollEngineConfig;
    private readonly scrollOmega: number;
    private readonly snapOmega: number;
    private readonly pitchOmega: number;
    private state: ScrollState;
    private accumulator = 0;
    // @ts-ignore
    private particleSystem?: ParticleSystem;

    private syncRafId: number | null = null;
    private renderRafId: number | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private intersectionObserver: IntersectionObserver | null = null;
    private isNearViewport = false;
    private heroScrollEngaged = false;
    private viewportCleanup: (() => void) | null = null;
    private snapCleanup: (() => void) | null = null;
    private lastComputedHeroHeight = 0;

    private refs: {
        hero: HTMLElement;
        container: HTMLElement;
        nav: HTMLElement;
        fill: HTMLElement;
        counter: HTMLElement;
        a11y: HTMLElement;
    };

    constructor(config: ScrollEngineConfig) {
        this.config = {
            scrollResponse: 0.18,
            snapResponse: 0.4,
            maxSkew: 12,
            maxZPush: -800,
            ...config,
        };

        this.scrollOmega = omegaFromResponseTime(this.config.scrollResponse);
        this.snapOmega = omegaFromResponseTime(this.config.snapResponse);
        this.pitchOmega = omegaFromResponseTime(this.config.scrollResponse * 1.8);

        this.renderLoop = this.renderLoop.bind(this);

        this.refs = {
            hero: this.getEl(config.heroId),
            container: this.getEl(config.containerId),
            nav: this.getEl(config.navId),
            fill: this.getEl(config.fillId),
            counter: this.getEl(config.counterId),
            a11y: this.getEl(config.a11yId),
        };

        this.state = {
            currentIndex: -1,
            faces: [],
            dots: [],
            currentScroll: window.scrollY,
            scrollVelocity: 0,
            pitchAngle: 0,
            pitchVelocity: 0,
            lastTime: 0,
            scrollDir: 'down',
            isSnapping: false,
            snapTarget: 0,
            snapVelocity: 0,
            idleTimer: null,
        };
        this.init();
    }

    private getEl<T extends HTMLElement>(id: string): T {
        const el = document.getElementById(id);
        if (!el) throw new Error(`[ScrollEngine] Missing required DOM element: #${id}`);
        return el as T;
    }

    private getGeometry() {
        const heroTopAbs = this.refs.hero.offsetTop;
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const wh = vh * 1.5;
        const totalScrollable = this.refs.hero.offsetHeight - wh;
        const startBuffer = wh * 0.2;
        const endBuffer = wh * 1.5;
        const exitBuffer = wh * 0.125;
        const activeDistance = Math.max(1, totalScrollable - startBuffer - endBuffer);
        return { heroTopAbs, totalScrollable, startBuffer, endBuffer, exitBuffer, activeDistance };
    }

    public init(): void {
        const trackContainer = this.refs.nav.querySelector('.progress-track-container');
        if (!trackContainer) throw new Error('[ScrollEngine] Missing .progress-track-container in nav');

        this.config.messages.forEach((msg, i) => {
            const face = document.createElement('div');
            face.className = 'message-face';
            face.innerHTML = TextSplitter.wrapWords(msg);
            this.refs.container.appendChild(face);
            this.state.faces.push(face);

            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            dot.onclick = () => this.scrollToSlide(i);
            trackContainer.appendChild(dot);
            this.state.dots.push(dot);
        });

        if (this.config.canvasId) {
            const canvasEl = document.getElementById(this.config.canvasId) as HTMLCanvasElement | null;
            if (canvasEl) {
                this.particleSystem = new ParticleSystem(canvasEl);
            }
        }

        this.setupSnapListeners();
        this.setupAdaptiveListeners();
        this.setupIntersectionObserver();
        this.syncHeroScrollBudget();
        this.renderActiveSlide(0);
        this.renderRafId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * Schedules an adaptive recalculation of the hero scroll budget
     * coalesced via requestAnimationFrame to avoid duplicate layout passes in the same frame.
     */
    public requestHeroBudgetSync(): void {
        if (this.syncRafId !== null) return;
        this.syncRafId = requestAnimationFrame(() => {
            this.syncRafId = null;
            this.syncHeroScrollBudget();
        });
    }

    /**
     * Measures the rendered message layout and viewport height to determine
     * the required scroll distance for all transitions, setting an adaptive
     * min-height on the hero section that preserves original 600vh pacing at
     * normal zoom while expanding only when rendered content demands it.
     */
    private syncHeroScrollBudget(): void {
        const vh = window.visualViewport?.height ?? window.innerHeight;
        if (!vh || vh <= 0) return;

        // 1. Geometry overhead from existing progress formula
        // In getGeometry():
        //   wh = vh * 1.5
        //   totalScrollable = hero.offsetHeight - wh
        //   startBuffer = wh * 0.2
        //   endBuffer = wh * 1.5
        //   activeDistance = totalScrollable - startBuffer - endBuffer = hero.offsetHeight - (wh * 2.7)
        const wh = vh * 1.5;
        const overhead = wh * 2.7;

        // 2. Determine number of transitions
        const transitions = Math.max(this.config.messages.length - 1, 0);

        // 3. Derive original 600vh baseline pacing
        // In legacy design: heroHeight = 600vh (6 * vh)
        // legacyActiveDistance = 6 * vh - overhead = 1.95 * vh
        // baselineStep = legacyActiveDistance / transitions (approx 0.325 * vh for 6 transitions)
        const legacyHeroHeight = 6 * vh;
        const legacyActiveDistance = Math.max(0, legacyHeroHeight - overhead);
        const baselineStep = transitions > 0 ? legacyActiveDistance / transitions : 0;

        // 4. Measure rendered un-transformed layout height of message faces
        let maxMessageHeight = 0;
        for (const face of this.state.faces) {
            // offsetHeight and scrollHeight give un-transformed layout dimensions
            const h = Math.max(face.offsetHeight, face.scrollHeight);
            if (h > maxMessageHeight) {
                maxMessageHeight = h;
            }
        }

        // 5. Determine required step distance:
        // Use baselineStep (preserving original 600vh pacing) unless content demand exceeds it
        const verticalSafetyBuffer = 40;
        const contentDemand = maxMessageHeight + verticalSafetyBuffer;
        const requiredStep = Math.max(baselineStep, contentDemand);

        // 6. Calculate adaptive hero height
        const requiredActiveDistance = transitions * requiredStep;
        const adaptiveHeight = Math.round(requiredActiveDistance + overhead);

        // Only mutate DOM if height has changed (>= 1px) to avoid layout thrashing
        if (Math.abs(adaptiveHeight - this.lastComputedHeroHeight) >= 1) {
            this.lastComputedHeroHeight = adaptiveHeight;
            this.refs.hero.style.height = 'auto';
            this.refs.hero.style.minHeight = `${adaptiveHeight}px`;
        }
    }

    private setupAdaptiveListeners(): void {
        // 1. ResizeObserver for layout changes on message faces & container
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.requestHeroBudgetSync();
            });
            this.resizeObserver.observe(this.refs.container);
            for (const face of this.state.faces) {
                this.resizeObserver.observe(face);
            }
        }

        // 2. Viewport and visualViewport resize listeners for zoom, window resize, orientation
        const onViewportResize = () => {
            this.requestHeroBudgetSync();
        };
        window.addEventListener('resize', onViewportResize, { passive: true });
        window.addEventListener('orientationchange', onViewportResize, { passive: true });
        window.visualViewport?.addEventListener('resize', onViewportResize, { passive: true });

        this.viewportCleanup = () => {
            window.removeEventListener('resize', onViewportResize);
            window.removeEventListener('orientationchange', onViewportResize);
            window.visualViewport?.removeEventListener('resize', onViewportResize);
        };

        // 3. Font loading listener: recalculate once web fonts have fully loaded
        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                this.requestHeroBudgetSync();
            }).catch(() => {
                // Ignore font loading errors gracefully
            });
        }
    }

    private setupIntersectionObserver(): void {
        if (typeof IntersectionObserver === 'undefined') {
            this.isNearViewport = true;
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    this.isNearViewport = entry.isIntersecting;
                    if (!this.isNearViewport && this.heroScrollEngaged) {
                        this.heroScrollEngaged = false;
                    }
                }
            },
            { rootMargin: '200px 0px 200px 0px' }
        );

        this.intersectionObserver.observe(this.refs.container);
    }

    /**
     * Determines whether the kinetic message container is positioned
     * within the viewport's visual center engagement zone, applying hysteresis
     * to prevent boundary flickering.
     *
     * The engagement decision is strictly based on exact geometry:
     * element.getBoundingClientRect() relative to the visual center.
     */
    private updateEngagement(): void {
        const vh = window.visualViewport?.height ?? window.innerHeight;
        if (!vh || vh <= 0) return;

        const { heroTopAbs, totalScrollable, exitBuffer } = this.getGeometry();
        const scrolledInHero = window.scrollY - heroTopAbs;
        const inHeroBounds = scrolledInHero >= 0 && scrolledInHero <= totalScrollable + exitBuffer;

        if (!inHeroBounds) {
            if (this.heroScrollEngaged) {
                this.heroScrollEngaged = false;
            }
            return;
        }

        const headerEl = document.getElementById('mainHeader');
        const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 80;
        const visualCenter = headerHeight + (vh - headerHeight) / 2;

        const rect = this.refs.container.getBoundingClientRect();
        const targetCenter = rect.top + rect.height / 2;
        const distanceFromCenter = Math.abs(targetCenter - visualCenter);

        // Hysteresis thresholds:
        // Engage: distance <= 18% viewport height
        // Disengage: distance >= 28% viewport height
        const engageTolerance = vh * 0.18;
        const disengageTolerance = vh * 0.28;

        if (!this.heroScrollEngaged) {
            if (distanceFromCenter <= engageTolerance) {
                this.heroScrollEngaged = true;
            }
        } else {
            if (distanceFromCenter >= disengageTolerance) {
                this.heroScrollEngaged = false;
            }
        }
    }

    private renderLoop(time: number): void {
        if (this.state.lastTime === 0) this.state.lastTime = time;
        let frameTime = (time - this.state.lastTime) / 1000;
        this.state.lastTime = time;
        if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;

        this.accumulator += frameTime;
        while (this.accumulator >= FIXED_DT) {
            this.stepPhysics(FIXED_DT);
            this.accumulator -= FIXED_DT;
        }

        this.updateEngagement();
        this.applyVisualTransforms();
        this.updateSlideTracking();

        requestAnimationFrame(this.renderLoop);
    }

    private stepPhysics(dt: number): void {
        if (this.state.isSnapping) {
            this.stepSnap(dt);
            this.state.currentScroll = window.scrollY;
            this.state.scrollVelocity = this.state.snapVelocity;
        } else {
            const [x, v] = springStep(
                this.state.currentScroll,
                this.state.scrollVelocity,
                window.scrollY,
                this.scrollOmega,
                dt
            );
            this.state.currentScroll = x;
            this.state.scrollVelocity = v;
        }

        if (Math.abs(this.state.scrollVelocity) > 0.5) {
            const newDir = this.state.scrollVelocity >= 0 ? 'down' : 'up';
            if (this.state.scrollDir !== newDir) {
                this.state.scrollDir = newDir;
                this.refs.container.dataset.dir = newDir;
            }
        }

        const pitchTarget = Math.tanh(this.state.scrollVelocity * 0.0002) * 4;
        const [pitch, pitchV] = springStep(
            this.state.pitchAngle,
            this.state.pitchVelocity,
            pitchTarget,
            this.pitchOmega,
            dt
        );
        this.state.pitchAngle = pitch;
        this.state.pitchVelocity = pitchV;
    }

    private prefersReducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private stepSnap(dt: number): void {
        if (this.prefersReducedMotion()) {
            window.scrollTo({ top: this.state.snapTarget, behavior: 'auto' });
            this.state.isSnapping = false;
            return;
        }

        const [y, v] = springStep(
            window.scrollY,
            this.state.snapVelocity,
            this.state.snapTarget,
            this.snapOmega,
            dt
        );
        window.scrollTo({ top: y, behavior: 'auto' });
        this.state.snapVelocity = v;

        const settled =
            Math.abs(y - this.state.snapTarget) < SNAP_POSITION_EPSILON &&
            Math.abs(v) < SNAP_VELOCITY_EPSILON;
        if (settled) this.state.isSnapping = false;
    }

    private applyVisualTransforms(): void {
        if (this.prefersReducedMotion() || !this.heroScrollEngaged) {
            this.refs.container.style.setProperty('--velocity-skew', '0deg');
            this.refs.container.style.setProperty('--velocity-pitch', '0deg');
            this.refs.container.style.setProperty('--inertial-z', '0px');
            this.refs.container.style.setProperty('--inertial-scale', '1');
            return;
        }

        const skewAngle = Math.tanh(this.state.scrollVelocity * 0.0002) * this.config.maxSkew;
        const speed = Math.abs(this.state.scrollVelocity);
        const depthCurve = 1 - Math.exp(-speed * 0.00067);
        const zPush = depthCurve * this.config.maxZPush;
        const scale = 1 - depthCurve * 0.08;

        this.refs.container.style.setProperty('--velocity-skew', `${skewAngle.toFixed(3)}deg`);
        this.refs.container.style.setProperty('--velocity-pitch', `${this.state.pitchAngle.toFixed(3)}deg`);
        this.refs.container.style.setProperty('--inertial-z', `${zPush.toFixed(2)}px`);
        this.refs.container.style.setProperty('--inertial-scale', scale.toFixed(4));
    }

    private updateSlideTracking(): void {
        const { heroTopAbs, totalScrollable, startBuffer, exitBuffer, activeDistance } = this.getGeometry();
        const scrolledInHero = this.state.currentScroll - heroTopAbs;

        if (this.heroScrollEngaged && scrolledInHero >= 0 && scrolledInHero <= totalScrollable + exitBuffer) {
            this.refs.nav.classList.add('visible');

            const adjustedScroll = scrolledInHero - startBuffer;
            const progress = Math.max(0, Math.min(0.999, adjustedScroll / activeDistance));

            this.refs.fill.style.transform = `scaleX(${progress})`;

            const rawIdx = Math.floor(progress * this.config.messages.length);
            const idx = Math.min(this.config.messages.length - 1, Math.max(0, rawIdx));

            if (idx !== this.state.currentIndex) {
                this.renderActiveSlide(idx);
            }
        } else {
            this.refs.nav.classList.remove('visible');
            this.refs.container.style.setProperty('--velocity-skew', `0deg`);
            this.refs.container.style.setProperty('--velocity-pitch', `0deg`);
        }
    }

    private renderActiveSlide(newIdx: number): void {
        this.state.faces.forEach((face, i) => {
            if (i === newIdx) {
                face.className = 'message-face active';
            } else if (i < newIdx) {
                face.className = 'message-face exit-up';
            } else {
                face.className = 'message-face exit-down';
            }
        });

        this.state.dots.forEach((dot, i) => {
            dot.className = `progress-dot ${i === newIdx ? 'active' : i < newIdx ? 'passed' : ''}`;
        });

        const currentNum = (newIdx + 1).toString().padStart(2, '0');
        const totalNum = this.config.messages.length.toString().padStart(2, '0');
        this.refs.counter.textContent = `${currentNum} / ${totalNum}`;
        this.refs.a11y.textContent = this.config.messages[newIdx].replace(/<[^>]*>?/gm, ' ');

        this.state.currentIndex = newIdx;
    }

    private beginSnap(targetY: number): void {
        this.state.isSnapping = true;
        this.state.snapTarget = targetY;
        this.state.snapVelocity = this.state.scrollVelocity;
    }

    public scrollToSlide(idx: number): void {
        this.heroScrollEngaged = true;
        const { heroTopAbs, startBuffer, activeDistance } = this.getGeometry();
        const targetY =
            heroTopAbs +
            startBuffer +
            activeDistance * (idx / this.config.messages.length) +
            activeDistance / this.config.messages.length / 2;
        this.beginSnap(targetY);
    }

    public isEngaged(): boolean {
        return this.heroScrollEngaged;
    }

    private setupSnapListeners(): void {
        const interruptEvents = ['wheel', 'touchmove', 'keydown', 'mousedown'];
        const onInterrupt = () => {
            this.state.isSnapping = false;
        };
        interruptEvents.forEach((evt) => {
            window.addEventListener(evt, onInterrupt, { passive: true });
        });

        const onScroll = () => {
            if (this.state.isSnapping) return;
            if (this.state.idleTimer !== null) window.clearTimeout(this.state.idleTimer);
            this.state.idleTimer = window.setTimeout(this.triggerElasticSnap, 250);
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        this.snapCleanup = () => {
            interruptEvents.forEach((evt) => {
                window.removeEventListener(evt, onInterrupt);
            });
            window.removeEventListener('scroll', onScroll);
        };
    }

    private triggerElasticSnap = (): void => {
        if (!this.heroScrollEngaged) return;

        const { heroTopAbs, totalScrollable, startBuffer, endBuffer, activeDistance } = this.getGeometry();
        const scrolledInHero = window.scrollY - heroTopAbs;

        if (scrolledInHero > startBuffer && scrolledInHero < totalScrollable - endBuffer) {
            if (this.state.currentIndex >= 0 && this.state.currentIndex < this.config.messages.length) {
                const targetY =
                    heroTopAbs +
                    startBuffer +
                    activeDistance * (this.state.currentIndex / this.config.messages.length) +
                    activeDistance / this.config.messages.length / 2;

                if (Math.abs(window.scrollY - targetY) > 10) {
                    this.beginSnap(targetY);
                }
            }
        }
    };

    /**
     * Cleans up all observers, animation loops, and event listeners.
     */
    public destroy(): void {
        if (this.syncRafId !== null) {
            cancelAnimationFrame(this.syncRafId);
            this.syncRafId = null;
        }
        if (this.renderRafId !== null) {
            cancelAnimationFrame(this.renderRafId);
            this.renderRafId = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        if (this.viewportCleanup) {
            this.viewportCleanup();
            this.viewportCleanup = null;
        }
        if (this.snapCleanup) {
            this.snapCleanup();
            this.snapCleanup = null;
        }
        if (this.state.idleTimer !== null) {
            window.clearTimeout(this.state.idleTimer);
            this.state.idleTimer = null;
        }
    }
}
