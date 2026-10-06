/**
 * ============================================================================
 * SJCCC – Home Page Bootstrap Orchestrator
 * Coordinates all UI components, features, and interactions for the landing page
 * ============================================================================
 */

import { HOME_SELECTORS } from '../../core/config/selectors.ts';
import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';
import { ThemeManager } from '../../core/theme/ThemeManager.ts';
import { HeaderScroll } from '../../ui/navigation/HeaderScroll.ts';
import { MobileNavigation } from '../../ui/navigation/MobileNavigation.ts';
import { ScrollSpy } from '../../ui/navigation/ScrollSpy.ts';
import { SmoothScroll } from '../../ui/utils/SmoothScroll.ts';
import { ScrollReveal } from '../../ui/utils/ScrollReveal.ts';
import { CounterAnimation } from '../../ui/utils/CounterAnimation.ts';
import { HeroParticles } from '../../features/hero/HeroParticles.ts';
import { HeroTitleTyping } from '../../features/hero/HeroTitleTyping.ts';
import { ScrollEngine } from '../../features/hero/ScrollEngine.ts';
import { Carousel } from '../../features/carousel/Carousel.ts';
import { renderCarouselSlides } from '../../features/carousel/CarouselRenderer.ts';
import { AnnouncementBar } from '../../features/announcement/AnnouncementBar.ts';
import { Preloader } from '../../features/preloader/Preloader.ts';
import { AcademicLevelToggles } from '../../features/academic/AcademicLevelToggles.ts';
import { FaqSection } from '../../features/faq/FaqSection.ts';
import { renderFaqItems } from '../../features/faq/FaqRenderer.ts';
import { SchoolDatesTimeline } from '../../features/calendar/SchoolDatesTimeline.ts';
import { renderTimelineMilestones } from '../../features/calendar/TimelineRenderer.ts';
import { VirtualCampusMap } from '../../features/campus/VirtualCampusMap.ts';
import { LocationMapFacade } from '../../features/location/LocationMapFacade.ts';
import { renderNewsStories } from '../../features/news/NewsStoriesRenderer.ts';
import { EnquiryModal } from '../../features/enquiry/EnquiryModal.ts';
import { EnquiryForm } from '../../features/enquiry/EnquiryForm.ts';
import { SmoothTypingEffect } from '../../features/enquiry/SmoothTypingEffect.ts';
import { PwaInstallPrompt } from '../../features/pwa/PwaInstallPrompt.ts';
import { OfflineIndicator } from '../../features/offline/OfflineIndicator.ts';
import { LiquidGlassAdapter } from '../../ui/effects/LiquidGlassAdapter.ts';
import { CardSplitter } from '../../ui/utils/CardSplitter.ts';
import { initAllBlurredImages } from '../../ui/utils/BlurredImageLoader.ts';

export class HomeApp {
    constructor() {
        this.init();
    }

    private init(): void {
        // 0. Image Fallback Safety Guard
        this.initImageFallbackGuards();

        // 1. Preloader
        new Preloader();

        // 2. Theme Manager (Animated multi-shape overlay)
        new ThemeManager(HOME_SELECTORS.themeToggle);

        // 3. Header scroll & back to top with progressive blur
        const headerEl = document.getElementById(HOME_SELECTORS.mainHeader);
        const backToTopEl = document.getElementById(HOME_SELECTORS.backToTop);
        if (headerEl) new HeaderScroll(headerEl, backToTopEl);

        // 4. Mobile navigation
        new MobileNavigation(
            HOME_SELECTORS.menuToggle,
            HOME_SELECTORS.navMenu,
            HOME_SELECTORS.mainHeader
        );

        // Clear legacy dismissal storage so user can immediately test the new announcement implementation
        try {
            localStorage.removeItem('announcement_dismissed');
            localStorage.removeItem('Interview_announcement_dismissed');
            localStorage.removeItem(STORAGE_KEYS.INTERVIEW_ANNOUNCEMENT_DISMISSED);
            localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENT_DISMISSED);
        } catch {
            // Storage access fallback
        }

        // 5. Announcement bar
        new AnnouncementBar({
            barSelector: HOME_SELECTORS.announcementBar,
            closeBtnSelector: HOME_SELECTORS.announcementClose,
            storageKey: STORAGE_KEYS.ANNOUNCEMENT_DISMISSED,
            headerSelector: `#${HOME_SELECTORS.mainHeader}`,
            dismissForDays: 3,
            announcementId: 'school-resumption-2026',
            priority: 'urgent',
            publishedAt: '2026-08-21T08:00:00Z',
            enableNewNoticePulse: true,
        });

        // 6. Carousel (Synchronously render slides, then initialize controller)
        renderCarouselSlides(document.getElementById('carouselTrack'));
        new Carousel(
            HOME_SELECTORS.carouselSlide,
            HOME_SELECTORS.prevBtn,
            HOME_SELECTORS.nextBtn,
            HOME_SELECTORS.carouselContainer
        );

        // 7. Counters
        new CounterAnimation(HOME_SELECTORS.statNumbers);

        // 8. Scroll reveal & Staggered Section Entrances
        const scrollReveal = new ScrollReveal(HOME_SELECTORS.reveal);

        // Staggered entrance for Academics header (label, title, subtitle)
        scrollReveal.initStaggerGroup({
            container: HOME_SELECTORS.academicsSection,
            itemSelector: '.section-label, .section-title, .section-subtitle',
            baseDelay: 90,
            initialDelay: 0,
            threshold: 0.1,
            rootMargin: '0px 0px -30px 0px',
        });

        // Staggered entrance for Academic Pillars (cards)
        scrollReveal.initStaggerGroup({
            container: HOME_SELECTORS.academicsPillars,
            itemSelector: '.pillar',
            baseDelay: 140,
            initialDelay: 60,
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px',
        });

        // Staggered entrance for News & Events header (label, title, divider)
        renderNewsStories(document.getElementById('newsEventsGrid'), undefined, { scrollReveal });
        scrollReveal.initStaggerGroup({
            container: HOME_SELECTORS.newsEventsSection,
            itemSelector: '.section-label, .section-title, .section-divider',
            baseDelay: 90,
            initialDelay: 0,
            threshold: 0.1,
            rootMargin: '0px 0px -30px 0px',
        });

        // Staggered entrance for Event Cards
        scrollReveal.initStaggerGroup({
            container: HOME_SELECTORS.newsEventsGrid,
            itemSelector: '.event-card',
            baseDelay: 150,
            initialDelay: 60,
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px',
        });

        // 9. Scroll spy & Active Section Tracker (Synchronizes Desktop Nav & Mobile Bottom Dock)
        new ScrollSpy(HOME_SELECTORS.navLinks);

        // 10. Smooth scroll
        new SmoothScroll(HOME_SELECTORS.mainHeader, HOME_SELECTORS.smoothScrollLinks);

        // 10b. Hero school heading typing animation
        new HeroTitleTyping();

        // 10c. Hero particles
        new HeroParticles(HOME_SELECTORS.heroParticles, 60);

        // 11. Academic toggles
        new AcademicLevelToggles(HOME_SELECTORS.levelToggle);

        // 12. Upcoming School Dates & Milestones Timeline
        renderTimelineMilestones(document.getElementById('timelineMilestonesList'));
        new SchoolDatesTimeline(HOME_SELECTORS.schoolDates);

        // 13. Virtual Campus Map interactive explorer
        new VirtualCampusMap(HOME_SELECTORS.campusMapContainer);

        // 14. Campus Location & Google Map Interactive Facade
        new LocationMapFacade();

        // 15. FAQ Accordion & Filtering
        renderFaqItems(document.getElementById('faqAccordion'));
        new FaqSection();

        // 16. Enquiry modal
        new EnquiryModal(
            [...HOME_SELECTORS.enquiryFabSelectors],
            HOME_SELECTORS.enquiryModal,
            HOME_SELECTORS.modalClose
        );

        // 15. Enquiry form (Formspree & WhatsApp)
        new EnquiryForm(
            HOME_SELECTORS.enquiryForm,
            HOME_SELECTORS.formStatus,
            HOME_SELECTORS.submitBtn,
            HOME_SELECTORS.whatsappRoutingToggle
        );

        // 16. Smooth typing micro-interactions
        new SmoothTypingEffect(HOME_SELECTORS.formInputs);

        // 17. Kinetic ScrollEngine messages
        const messages = [
            'Nurturing <span class="message-highlight">MINDS</span> & <span class="message-highlight">HANDS</span><br>for a better future',
            'Where <span class="message-highlight">FAITH</span> meets<br><span class="message-highlight">EXCELLENCE</span> in education',
            'Rigorous <span class="message-highlight">ACADEMICS</span><br>& industrial training',
            'Building <span class="message-highlight">CHARACTER</span><br>since 6th SEPT 1999',
            'Empowering students to<br><span class="message-highlight">LEAD</span> & <span class="message-highlight">SERVE</span>',
            'A community of<br><span class="message-highlight">DISCIPLINE</span> & integrity',
            'Your journey to<br><span class="message-highlight">SUCCESS</span> starts here',
        ];

        new ScrollEngine({
            heroId: HOME_SELECTORS.heroSection,
            containerId: HOME_SELECTORS.messageContainer,
            navId: HOME_SELECTORS.scrollProgress,
            fillId: HOME_SELECTORS.progressFill,
            counterId: HOME_SELECTORS.hudCounter,
            a11yId: HOME_SELECTORS.a11yAnnouncer,
            canvasId: HOME_SELECTORS.dustCanvas,
            dustConfig: {
                density: 0.65,
                speed: 0.55,
                opacity: 0.42,
                minOpacity: 0.08,
                maxOpacity: 0.48,
                scrollReactive: true,
            },
            messages,
            scrollResponse: 0.1,
            snapResponse: 0.1,
        });

        // 18. PWA installation prompt
        new PwaInstallPrompt({
            title: 'Install SJCCC Mbengwi App',
            message: 'Add this app to your home screen for quick access and a better experience.',
            confirmText: 'Yes, Install',
            cancelText: 'Not now',
            type: 'info',
            afterInteraction: true,
            storageKey: 'pwa-install-prompt',
            dismissDays: 7,
            dialogOptions: {
                timeoutMs: 10000,
                loading: true,
            },
        });

        // 19. Offline connectivity status indicator with Service Worker cache validation
        new OfflineIndicator();

        // 20. External LiquidGlass integration (Targeted focal surfaces: FAB, Back to Top, Hero CTA)
        const liquidGlass = new LiquidGlassAdapter();
        liquidGlass.initHomepageSurfaces();

        // 21. Interactive card splitters & visual feedback boundaries
        new CardSplitter();

        // 22. Progressive blurred-image placeholders initialization
        initAllBlurredImages();
    }

    /**
     * Installs global capture-phase error listeners to automatically redirect
     * any broken image request to the canonical fallback image.
     */
    private initImageFallbackGuards(): void {
        const DEFAULT_IMG = '/assets/Error-Image.jpeg';
        const AVATAR_FALLBACK = '/assets/icons/icon.svg';

        const applyFallback = (img: HTMLImageElement): void => {
            const fallback = img.classList.contains('testimonial-avatar') ? AVATAR_FALLBACK : DEFAULT_IMG;
            if (!img.dataset.fallbackApplied && img.src !== fallback) {
                img.dataset.fallbackApplied = 'true';
                img.src = fallback;
            }
        };

        // Capture phase catches errors on non-bubbling resource elements (<img>)
        window.addEventListener(
            'error',
            (event: Event) => {
                const target = event.target as HTMLElement | null;
                if (target && target.tagName === 'IMG') {
                    applyFallback(target as HTMLImageElement);
                }
            },
            true
        );

        // Immediate check for any images that failed before hydration
        document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
            if (img.complete && img.naturalWidth === 0) {
                applyFallback(img);
            }
        });
    }
}

export function initHomePage(): void {
    new HomeApp();
}
