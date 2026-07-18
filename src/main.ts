// ============================================
// SJCCC Mbengwi -  Class Architecture
// ============================================
import './style.css'
import './sw-register.ts'
class Preloader {
    constructor(private element: HTMLElement) {
        this.init();
    }

    private init(): void {
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.element.classList.add('fade-out');
            }, 600);
        });
    }
}

// --------------------------------------------
class ThemeManager {
    private body: HTMLElement;
    private toggle: HTMLAnchorElement | null;
    private readonly STORAGE_KEY = 'sjccc-theme';
    private readonly DARK_CLASS = 'dark-mode';

    constructor(toggleId: string) {
        this.body = document.body;
        this.toggle = document.getElementById(toggleId) as HTMLAnchorElement | null;
        this.init();
    }

    private init(): void {
        this.applyInitialTheme();
        this.bindToggle();
        this.listenForSystemChanges();
    }

    private applyInitialTheme(): void {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            if (saved === 'dark') this.body.classList.add(this.DARK_CLASS);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.body.classList.add(this.DARK_CLASS);
        }
    }

    private bindToggle(): void {
        this.toggle?.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.body.classList.toggle(this.DARK_CLASS);
            localStorage.setItem(
                this.STORAGE_KEY,
                this.isDark() ? 'dark' : 'light'
            );
        });
    }

    private listenForSystemChanges(): void {
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e: MediaQueryListEvent) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    if (e.matches) {
                        this.body.classList.add(this.DARK_CLASS);
                    } else {
                        this.body.classList.remove(this.DARK_CLASS);
                    }
                }
            });
    }

    public isDark(): boolean {
        return this.body.classList.contains(this.DARK_CLASS);
    }
}

// --------------------------------------------
class HeaderScroll {
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
        const y = window.scrollY;
        this.header.classList.toggle('scrolled', y > 60);
        this.backToTopBtn?.classList.toggle('visible', y > 500);
    };
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
    }

    private toggleMenu(): void {
        const isActive = this.navMenu!.classList.toggle('active');
        this.menuToggle!.textContent = isActive ? '✕' : '☰';
        this.menuToggle!.setAttribute('aria-expanded', String(isActive));
    }

    private closeMenu(): void {
        this.navMenu?.classList.remove('active');
        if (this.menuToggle) {
            this.menuToggle.textContent = '☰';
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
    private fab: HTMLButtonElement | null;
    private modal: HTMLElement | null;
    private closeBtn: HTMLButtonElement | null;
    private pMan: HTMLAnchorElement | null;

    constructor(fabId: string, modalId: string, closeBtnId: string, pManId: string) {
        this.fab = document.getElementById(fabId) as HTMLButtonElement | null;
        this.pMan = document.getElementById(pManId) as HTMLAnchorElement | null;
        this.modal = document.getElementById(modalId) as HTMLElement | null;
        this.closeBtn = document.getElementById(closeBtnId) as HTMLButtonElement | null;
        this.init();
    }

    private init(): void {
        this.fab?.addEventListener('click', () => this.open());
        this.pMan?.addEventListener('click', () => this.open());
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
        this.fab?.focus();
    }
}

// --------------------------------------------
// --------------------------------------------
class EnquiryForm { // Fixed missing '{'
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
        const preloaderEl = document.getElementById('preloader');
        if (preloaderEl) new Preloader(preloaderEl);

        // 2. Theme
        new ThemeManager('darkModeToggle');

        // 3. Header scroll & back to top
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
        new EnquiryModal('enquiryFab', 'enquiryModal', 'modalClose', 'pMan');

        // 14. Enquiry form (Formspree)
        new EnquiryForm('enquiryForm', 'formStatus', 'submitBtn', 'whatsappRoutingToggle');
    }
}

// Boot the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});