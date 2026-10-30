/**
 * ============================================================================
 * SJCCC – Hero Title Typing Animation Controller
 * Applies an elegant, subtle typing animation to the main school heading
 * on initial page load, emphasizing the institution's name with an authentic
 * typewriter cadence and an ambient golden cursor caret.
 * ============================================================================
 */

export class HeroTitleTyping {
    private readonly heading: HTMLElement | null;
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

        // Accessibility & Lite Mode: bypass typing effect if user prefers reduced motion or lite mode
        const isLiteMode = typeof document !== 'undefined' && Boolean(
            document.documentElement.getAttribute('data-performance-mode') === 'lite' ||
            document.documentElement.classList.contains('lite-mode') ||
            document.documentElement.classList.contains('perf-mode-lite')
        );
        if (isLiteMode || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
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

        // To eliminate layout shifts (CLS = 0) and prevent heading collapse,
        // pre-populate the heading structure with all characters present in layout
        // set to opacity: 0, then progressively reveal them to opacity: 1.
        this.heading.style.position = 'relative';
        this.heading.innerHTML = '';

        const textSpan1 = document.createElement('span');
        const shimmerSpan = document.createElement('span');
        shimmerSpan.className = 'gold-shimmer';
        const br = document.createElement('br');
        const textSpan2 = document.createElement('span');

        const caret = document.createElement('span');
        caret.className = 'hero-typing-caret';
        caret.setAttribute('aria-hidden', 'true');

        const charSpans: HTMLElement[] = [];

        const appendChars = (container: HTMLElement, text: string) => {
            for (let i = 0; i < text.length; i++) {
                const charSpan = document.createElement('span');
                charSpan.className = 'hero-type-char';
                charSpan.style.opacity = '0';
                charSpan.style.transition = 'opacity 0.08s ease';
                charSpan.textContent = text[i];
                container.appendChild(charSpan);
                charSpans.push(charSpan);
            }
        };

        appendChars(textSpan1, part1);
        appendChars(shimmerSpan, part2);
        appendChars(textSpan2, part3);

        this.heading.appendChild(textSpan1);
        this.heading.appendChild(shimmerSpan);
        this.heading.appendChild(br);
        this.heading.appendChild(textSpan2);
        this.heading.appendChild(caret);

        let currentCharIdx = 0;

        const updateCaretPosition = (span: HTMLElement) => {
            if (!this.heading) return;
            const headingRect = this.heading.getBoundingClientRect();
            const charRect = span.getBoundingClientRect();
            if (charRect.width > 0 && charRect.height > 0) {
                const left = charRect.right - headingRect.left;
                const top = charRect.top - headingRect.top;
                caret.style.transform = `translate3d(${left}px, ${top}px, 0)`;
            }
        };

        const typeNext = () => {
            if (currentCharIdx < charSpans.length) {
                const span = charSpans[currentCharIdx];
                span.style.opacity = '1';
                updateCaretPosition(span);
                currentCharIdx++;

                const jitter = (currentCharIdx === part1.length || currentCharIdx === part1.length + part2.length)
                    ? 80
                    : 30 + Math.random() * 12;
                setTimeout(typeNext, jitter);
            } else {
                // Typing complete: let golden caret pulse before fading out
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
