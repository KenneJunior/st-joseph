
// =========================================
// 1. TYPES & INTERFACES
// =========================================

interface ScrollEngineConfig {
    messages: string[];
    tension?: number;         // Spring stiffness (default 0.12)
    friction?: number;        // Damping/Air resistance (default 0.8)
    maxSkew?: number;         // Asymptotic limit for skew (default 12)
    maxZPush?: number;        // Max pixels pushed into Z-space (default -200)
    canvasId?: string;        // Optional particle canvas
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
    targetScroll: number;
    currentScroll: number;
    velocity: number;
    lastTime: number;
    scrollDir: 'up' | 'down';
    isSnapping: boolean;
    snapTimer: number | null;
}

interface Particle {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    speedY: number;
    speedX: number;
}

// =========================================
// 2. TEXT SPLITTER UTILITY
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
// 3. PARTICLE SYSTEM
// =========================================

class ParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private particles: Particle[] = [];
    private width: number = 0;
    private height: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.init();
    }

    private init(): void {
        if (!this.ctx) return;
        this.resize();
        window.addEventListener('resize', this.resize.bind(this), { passive: true });

        this.particles = Array.from({ length: 45 }, () => this.createParticle());
        this.animate();
    }

    private createParticle(): Particle {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.4 + 0.1,
            speedY: -(Math.random() * 0.3 + 0.1),
            speedX: (Math.random() - 0.5) * 0.2
        };
    }

    private resize(): void {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight*2;
    }

    private animate = (): void => {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;

            if (p.y < 0) p.y = this.height;
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;

            this.ctx!.beginPath();
            this.ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx!.fillStyle = `rgba(212, 168, 83, ${p.alpha})`;
            this.ctx!.fill();
        });

        requestAnimationFrame(this.animate);
    };
}

// =========================================
// 4. CORE SCROLL ENGINE
// =========================================

export class ScrollEngine {
    private config: Required<Pick<ScrollEngineConfig, 'tension' | 'friction' | 'maxSkew' | 'maxZPush'>> & ScrollEngineConfig;
    private state: ScrollState;
    // @ts-ignore
    private particleSystem?: ParticleSystem;

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
            tension: 0.12,
            friction: 0.82,
            maxSkew: 12,
            maxZPush: -800,
            ...config
        };

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
            targetScroll: window.scrollY,
            currentScroll: window.scrollY,
            velocity: 0,
            lastTime: performance.now(),
            scrollDir: 'down',
            isSnapping: false,
            snapTimer: null,
        };
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
        const startBuffer = wh * 0.2 ;
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
        requestAnimationFrame(this.renderLoop);
    }

    private renderLoop(time: number): void {
        let dt = (time - this.state.lastTime) / (1000 / 60);
        this.state.lastTime = time;

        if (dt > 2.5) dt = 2.5;
        if (dt < 0.1) dt = 1.0;

        this.state.targetScroll = window.scrollY;

        const delta = this.state.targetScroll - this.state.currentScroll;
        const springForce = delta * this.config.tension;
        const dampingForce = -this.state.velocity * this.config.friction;
        const acceleration = springForce + dampingForce;

        this.state.velocity += (acceleration * dt);
        this.state.currentScroll += (this.state.velocity * dt);

        if (Math.abs(this.state.velocity) > 0.5) {
            const newDir = this.state.velocity >= 0 ? 'down' : 'up';
            if (this.state.scrollDir !== newDir) {
                this.state.scrollDir = newDir;
                this.refs.container.dataset.dir = newDir;
            }
        }

        const normalizedVelocity = this.state.velocity * 0.012;
        const boundedCurve = Math.tanh(normalizedVelocity);

        const skewAngle = boundedCurve * this.config.maxSkew;
        const pitchAngle = boundedCurve * 4;

        const speed = Math.abs(this.state.velocity);
        const depthCurve = 1 - Math.exp(-speed * 0.04);
        const zPush = depthCurve * this.config.maxZPush;
        const scale = 1 - (depthCurve * 0.08);

        this.refs.container.style.setProperty('--velocity-skew', `${skewAngle.toFixed(3)}deg`);
        this.refs.container.style.setProperty('--velocity-pitch', `${pitchAngle.toFixed(3)}deg`);
        this.refs.container.style.setProperty('--inertial-z', `${zPush.toFixed(2)}px`);
        this.refs.container.style.setProperty('--inertial-scale', scale.toFixed(4));

        this.updatePhysics();
        requestAnimationFrame(this.renderLoop);
    }

    private updatePhysics(): void {
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

    public scrollToSlide(idx: number): void {
        const { heroTopAbs, startBuffer, activeDistance } = this.getGeometry();

        const targetY = heroTopAbs + startBuffer +
            (activeDistance * (idx / this.config.messages.length)) +
            (activeDistance / this.config.messages.length / 2);

        this.state.isSnapping = true;
        window.scrollTo({ top: targetY, behavior: 'smooth' });

        setTimeout(() => { this.state.isSnapping = false; }, 800);
    }

    private setupSnapListeners(): void {
        const interruptEvents = ['wheel', 'touchmove', 'keydown', 'mousedown'];
        interruptEvents.forEach(evt => {
            window.addEventListener(evt, () => { this.state.isSnapping = false; }, { passive: true });
        });

        window.addEventListener('scroll', () => {
            if (this.state.isSnapping) return;
            if (this.state.snapTimer !== null) window.clearTimeout(this.state.snapTimer);
            this.state.snapTimer = window.setTimeout(this.triggerElasticSnap, 250);
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
                    this.state.isSnapping = true;
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                    setTimeout(() => { this.state.isSnapping = false; }, 800);
                }
            }
        }
    }
}