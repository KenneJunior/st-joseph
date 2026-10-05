/**
 * ============================================================================
 * SJCCC – Hero Title Typing Animation Controller
 * Applies an elegant, subtle typing animation to the main school heading
 * on initial page load, emphasizing the institution's name with an authentic
 * typewriter cadence and an ambient golden cursor caret.
 * ============================================================================
 */

export class HeroTitleTyping {
    private heading: HTMLElement | null;
    private hasAnimated: boolean = false;

    constructor(selector: string = 'main#main-content section#heroSection .school-name') {
        this.heading = document.querySelector(selector);
        this.init();
    }

    private init(): void {
        if (!this.heading) return;

        // Preserve full heading string for accessibility and screen readers
        if (!this.heading.getAttribute('aria-label')) {
            this.heading.setAttribute('aria-label', "St. Joseph's Catholic Comprehensive College Mbengwi");
        }

        // Accessibility: bypass typing effect if user prefers reduced motion
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const preloader = document.getElementById('preloader');
        const isPreloaderActive = preloader &&
            preloader.style.display !== 'none' &&
            !preloader.classList.contains('fade-out');

        if (isPreloaderActive) {
            // Synchronize with preloader exit event
            const onPreloaderDone = () => {
                document.removeEventListener('preloaderComplete', onPreloaderDone);
                setTimeout(() => this.startTyping(), 220);
            };
            document.addEventListener('preloaderComplete', onPreloaderDone);

            // Safety fallback: if preloader dismisses without event or was already cached
            setTimeout(() => {
                if (!this.hasAnimated) {
                    this.startTyping();
                }
            }, 2600);
        } else {
            // Immediate gentle entrance delay on initial load
            setTimeout(() => this.startTyping(), 280);
        }
    }

    public startTyping(): void {
        if (this.hasAnimated || !this.heading) return;
        this.hasAnimated = true;

        const part1 = "St. Joseph's ";
        const part2 = "Catholic";
        const part3 = "Comprehensive College Mbengwi";

        // Clear existing text for typewriter sequence
        this.heading.innerHTML = '';

        const textSpan1 = document.createElement('span');
        const shimmerSpan = document.createElement('span');
        shimmerSpan.className = 'gold-shimmer';
        const br = document.createElement('br');
        const textSpan2 = document.createElement('span');
        const caret = document.createElement('span');
        caret.className = 'hero-typing-caret';
        caret.setAttribute('aria-hidden', 'true');

        this.heading.appendChild(textSpan1);
        this.heading.appendChild(shimmerSpan);
        this.heading.appendChild(br);
        this.heading.appendChild(textSpan2);
        this.heading.appendChild(caret);

        let p1Idx = 0;
        let p2Idx = 0;
        let p3Idx = 0;

        // Subtle, rhythmic typing cadence (~36ms per character with micro-jitter)
        const typeNext = () => {
            if (p1Idx < part1.length) {
                textSpan1.textContent += part1[p1Idx];
                p1Idx++;
                const jitter = (p1Idx === part1.length) ? 80 : 34 + Math.random() * 12;
                setTimeout(typeNext, jitter);
            } else if (p2Idx < part2.length) {
                shimmerSpan.textContent += part2[p2Idx];
                p2Idx++;
                const jitter = (p2Idx === part2.length) ? 90 : 36 + Math.random() * 14;
                setTimeout(typeNext, jitter);
            } else if (p3Idx < part3.length) {
                textSpan2.textContent += part3[p3Idx];
                p3Idx++;
                const jitter = 32 + Math.random() * 10;
                setTimeout(typeNext, jitter);
            } else {
                // Typing complete: let golden caret pulse 3 times before fading out
                setTimeout(() => {
                    caret.classList.add('fade-out');
                    setTimeout(() => {
                        caret.remove();
                    }, 900);
                }, 1600);
            }
        };

        typeNext();
    }
}
