
// =========================================
// 1. TYPES & INTERFACES
// =========================================

interface ScrollEngineConfig {
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

interface Particle {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    speedX: number;
    speedY: number;
}

interface ParticleConfig {
    count: number;
    colorRGB: string; // Format: 'R, G, B'
    /** px/s, terminal speed as r -> 0**/
    stokesBaseDrift: number;
    /**   px/s, additional terminal speed at r = 1*/
    stokesTerminalCoeff: number;
    /** Stokes, relaxation time constant at r = 1 */
    stokesRelaxTime: number;
    /** // Ornstein-Uhlenbeck jitter: dv = -λ(v - mean)dt + σ√dt · N(0,1) — Brownian motion with a restoring force, so velocity wanders but stays bounded, unlike an unweighted random walk. */
    ouLambda: number;
    ouSigma: number;
    heightMultiplier: number; 
}

// =========================================
// 2. SHARED PHYSICS PRIMITIVES
// =========================================

/**
 * ω such that a critically damped spring settles to ~2% of its initial
 * error after `responseTime` seconds (4 time-constants; e^-4 ≈ 0.018).
 */
function omegaFromResponseTime(responseTimeSeconds: number): number {
    return 4 / Math.max(responseTimeSeconds, 0.001);
}

/**
 * Exact closed-form step of a critically damped harmonic oscillator
 * (damping ratio ζ = 1) with natural frequency ω, tracking `target`:
 *
 *   ẍ = -ω²(x - target) - 2ω·ẋ
 *
 * The characteristic equation r² + 2ωr + ω² = (r+ω)² = 0 has a repeated
 * root r = -ω, so with y = x - target the general solution is
 * y(t) = (C1 + C2·t)e^(-ωt). Matching y(0) = y0 and y'(0) = v0 gives
 * C1 = y0, C2 = v0 + ωy0, and therefore:
 *
 *   y(t) = (y0 + (v0 + ωy0)·t)·e^(-ωt)
 *   v(t) = (v0 - ω(v0 + ωy0)·t)·e^(-ωt)
 *
 * (v(t) = y'(t), differentiate and simplify; check: y(0)=y0, v(0)=v0, and
 * substituting both back into the ODE above satisfies it identically for
 * all t.) This is exact for any t ≥ 0 — no discretization error, no
 * instability at large dt.
 */
function springStep(x: number, v: number, target: number, omega: number, dt: number): [number, number] {
    const y0 = x - target;
    const expTerm = Math.exp(-omega * dt);
    const temp = v + omega * y0;
    const y = (y0 + temp * dt) * expTerm;
    const newV = (v - omega * temp * dt) * expTerm;
    return [target + y, newV];
}

/** Box–Muller transform: one standard-normal sample from two uniform ones. */
function gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// =========================================
// 3. TEXT SPLITTER UTILITY 
// =========================================

class TextSplitter {
    static wrapWords(htmlStr: string): string {
        const temp = document.createElement('div');
        temp.innerHTML = htmlStr;
        let wordIndex = 0;

        function traverse(node: Node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue || '';
                const words = text.split(/(\s+)/);
                const fragment = document.createDocumentFragment();

                words.forEach(word => {
                    if (word.trim().length > 0) {
                        const span = document.createElement('span');
                        span.className = 'word';
                        span.style.setProperty('--word-index', wordIndex.toString());
                        span.textContent = word;
                        fragment.appendChild(span);
                        wordIndex++;
                    } else {
                        fragment.appendChild(document.createTextNode(word));
                    }
                });
                (node as ChildNode).replaceWith(fragment);
            } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'BR') {
                Array.from(node.childNodes).forEach(traverse);
            }
        }

        Array.from(temp.childNodes).forEach(traverse);
        return temp.innerHTML;
    }
}

// =========================================
// 4. PARTICLE SYSTEM — Stokes drag + Brownian jitter
// =========================================

class ParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private particles: Particle[] = [];
    private width = 0;
    private height = 0;
    private lastTime = 0;
    private config: ParticleConfig;

    private animationFrameId: number = 0;
    private readonly boundResize: () => void;
    isPlaying: boolean = true;

    constructor(canvas: HTMLCanvasElement, partialConfig: Partial<ParticleConfig> = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Default configuration
        this.config = {
            count:80,
            colorRGB: '212, 168, 83',
            stokesBaseDrift: 20,
            stokesTerminalCoeff: 10,
            stokesRelaxTime: 0.2,
            ouLambda: 1.5,
            ouSigma: 25,
            heightMultiplier: 2, 
            ...partialConfig
        };

        this.boundResize = this.resize.bind(this);
        this.init();
    }

    private init(): void {
        if (!this.ctx) return;
        this.resize();
        window.addEventListener('resize', this.resize.bind(this), { passive: true });
        this.particles = Array.from({ length: this.config.count }, () => this.createParticle());
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    // --- Lifecycle & Playback Methods ---

    public play(): void {
        if (!this.isPlaying || this.animationFrameId === 0) {
            this.isPlaying = true;
            this.lastTime = 0; // Reset to prevent massive dt jump on resume
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    public pause(): void {
        this.isPlaying = false;
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = 0;
    }

    public destroy(): void {
        this.pause();
        window.removeEventListener('resize', this.boundResize);
        this.particles = [];
        this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }


    private terminalVelocity(r: number): number {
        return this.config.stokesBaseDrift + this.config.stokesTerminalCoeff * r * r;
    }

    private updateParticlePhysics(p: Particle, dt: number): void {
        // Vertical: exact relaxation toward Stokes terminal velocity.
        // dv/dt = -k(v - vTerm)  =>  v(t) = vTerm + (v0-vTerm)e^(-kt).
        const vTerm = this.terminalVelocity(p.radius);
        const k = this.dragRate(p.radius);
        const decay = Math.exp(-k * dt);
        p.speedY = vTerm + (p.speedY - vTerm) * decay;

        // Both axes: mean-reverting Brownian jitter on top of the drift.
        const sqrtDt = Math.sqrt(dt);
        p.speedX += -this.config.ouLambda * p.speedX * dt + this.config.ouSigma * sqrtDt * gaussianRandom();
        p.speedY += this.config.ouSigma * 0.4 * sqrtDt * gaussianRandom();

        p.x += p.speedX * dt;
        p.y += p.speedY * dt;
    }

    private wrapParticlePosition(p: Particle): void {
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
    }

    private drawParticle(p: Particle): void {
        if (!this.ctx) return;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${this.config.colorRGB}, ${p.alpha})`;
        this.ctx.fill();
    }

    private readonly animate = (time: number): void => {
        if (!this.ctx || !this.isPlaying) return;

        if (this.lastTime === 0) this.lastTime = time;
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        // Clamped for visual sanity on a huge gap, not for stability — the
        // exponential decay below is exact for any dt.
        dt = Math.min(dt, 0.1);

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            this.updateParticlePhysics(p, dt);
            this.wrapParticlePosition(p);
            this.drawParticle(p);
        });

        this.animationFrameId = requestAnimationFrame(this.animate);
    };

    private dragRate(r: number): number {
        return 1 / (this.config.stokesRelaxTime * r * r);
    }

    private createParticle(): Particle {
        const radius = Math.random() * 1.5 + 0.5;
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius,
            alpha: Math.random() * 0.4 + 0.1,
            speedX: 0,
            speedY: this.terminalVelocity(radius)
        };
    }

private resize(): void {
        if (!this.ctx) return;
        
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Logical layout dimensions
        this.width = window.innerWidth;
        this.height = window.innerHeight * this.config.heightMultiplier;

        // Actual internal canvas resolution
        this.canvas.width = this.width * pixelRatio;
        this.canvas.height = this.height * pixelRatio;
        
        // CSS display size
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        // Scale context to match pixel ratio
        this.ctx.scale(pixelRatio, pixelRatio);
    }
}

// =========================================
// 5. CORE SCROLL ENGINE
// =========================================

const FIXED_DT = 1 / 120;        // physics step, seconds — above any common display refresh
const MAX_FRAME_TIME = 0.25;     // seconds — clamp huge gaps (tab switch) against a spiral of death
const SNAP_POSITION_EPSILON = 0.5; // px
const SNAP_VELOCITY_EPSILON = 1;   // px/s

export class ScrollEngine {
    private config: Required<Pick<ScrollEngineConfig, 'scrollResponse' | 'snapResponse' | 'maxSkew' | 'maxZPush'>> & ScrollEngineConfig;
    private readonly scrollOmega: number;
    private readonly snapOmega: number;
    private readonly pitchOmega: number; // deliberately slower than scrollOmega
    private state: ScrollState;
    private accumulator = 0;

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
            ...config
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
        const wh = window.innerHeight * 1.5;
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
            const canvasEl = this.getEl(this.config.canvasId) as HTMLCanvasElement;
            if (canvasEl) {
                new ParticleSystem(canvasEl);
            }
        }

        this.setupSnapListeners();
        requestAnimationFrame(this.renderLoop);
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
            const [x, v] = springStep(this.state.currentScroll, this.state.scrollVelocity, window.scrollY, this.scrollOmega, dt);
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

        // Pitch chases the same tanh-bounded target as skew (see
        // applyVisualTransforms) but through its own spring, so it visibly
        // lags rather than tracking skew's curve at a different scale.
        const pitchTarget = Math.tanh(this.state.scrollVelocity * 0.0002) * 4;
        const [pitch, pitchV] = springStep(this.state.pitchAngle, this.state.pitchVelocity, pitchTarget, this.pitchOmega, dt);
        this.state.pitchAngle = pitch;
        this.state.pitchVelocity = pitchV;
    }

    private stepSnap(dt: number): void {
        const [y, v] = springStep(window.scrollY, this.state.snapVelocity, this.state.snapTarget, this.snapOmega, dt);
        window.scrollTo({ top: y, behavior: 'auto' });
        this.state.snapVelocity = v;

        const settled = Math.abs(y - this.state.snapTarget) < SNAP_POSITION_EPSILON
            && Math.abs(v) < SNAP_VELOCITY_EPSILON;
        if (settled) this.state.isSnapping = false;
    }

    private applyVisualTransforms(): void {
        // velocity is now px/s (was px/frame pre-refactor) — coefficients
        // below are the old ones divided by ~60 to land on the same curve.
        const skewAngle = Math.tanh(this.state.scrollVelocity * 0.0002) * this.config.maxSkew;

        const speed = Math.abs(this.state.scrollVelocity);
        const depthCurve = 1 - Math.exp(-speed * 0.00067); // exponential saturation, asymptotic as speed -> ∞
        const zPush = depthCurve * this.config.maxZPush;
        const scale = 1 - (depthCurve * 0.08);

        this.refs.container.style.setProperty('--velocity-skew', `${skewAngle.toFixed(3)}deg`);
        this.refs.container.style.setProperty('--velocity-pitch', `${this.state.pitchAngle.toFixed(3)}deg`);
        this.refs.container.style.setProperty('--inertial-z', `${zPush.toFixed(2)}px`);
        this.refs.container.style.setProperty('--inertial-scale', scale.toFixed(4));
    }

    private updateSlideTracking(): void {
        const { heroTopAbs, totalScrollable, startBuffer, exitBuffer, activeDistance } = this.getGeometry();
        const scrolledInHero = this.state.currentScroll - heroTopAbs;

        if (scrolledInHero >= 0 && scrolledInHero <= (totalScrollable + exitBuffer)) {
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
        this.state.snapVelocity = this.state.scrollVelocity; // inherit momentum for continuity
    }

    public scrollToSlide(idx: number): void {
        const { heroTopAbs, startBuffer, activeDistance } = this.getGeometry();
        const targetY = heroTopAbs + startBuffer +
            (activeDistance * (idx / this.config.messages.length)) +
            (activeDistance / this.config.messages.length / 2);
        this.beginSnap(targetY);
    }

    private setupSnapListeners(): void {
        const interruptEvents = ['wheel', 'touchmove', 'keydown', 'mousedown'];
        interruptEvents.forEach(evt => {
            window.addEventListener(evt, () => { this.state.isSnapping = false; }, { passive: true });
        });

        window.addEventListener('scroll', () => {
            if (this.state.isSnapping) return;
            if (this.state.idleTimer !== null) window.clearTimeout(this.state.idleTimer);
            // 250ms debounce for "has scrolling gone quiet" — a UX decision
            // about *when* to snap, not a stand-in for the snap animation
            // itself (that part is the exact spring in stepSnap()).
            this.state.idleTimer = window.setTimeout(this.triggerElasticSnap, 250);
        }, { passive: true });
    }

    private triggerElasticSnap = (): void => {
        const { heroTopAbs, totalScrollable, startBuffer, endBuffer, activeDistance } = this.getGeometry();
        const scrolledInHero = window.scrollY - heroTopAbs;

        if (scrolledInHero > startBuffer && scrolledInHero < (totalScrollable - endBuffer)) {
            if (this.state.currentIndex >= 0 && this.state.currentIndex < this.config.messages.length) {
                const targetY = heroTopAbs + startBuffer +
                    (activeDistance * (this.state.currentIndex / this.config.messages.length)) +
                    (activeDistance / this.config.messages.length / 2);

                if (Math.abs(window.scrollY - targetY) > 10) {
                    this.beginSnap(targetY);
                }
            }
        }
    };
}