/**
 * ============================================================================
 * SJCCC – Centralized DOM Selectors & Element IDs
 * ============================================================================
 */

export const HOME_SELECTORS = {
    // Header & Navigation
    mainHeader: 'mainHeader',
    backToTop: 'backToTop',
    menuToggle: 'menuToggle',
    navMenu: 'navMenu',
    themeToggle: 'themeToggle',
    navLinks: '#navMenu a.nav-link:not(#installApp)',
    smoothScrollLinks: 'a[href^="#"]',

    // Announcement Bar
    announcementBar: '#announcementBar',
    announcementClose: '#announcementClose',

    // Hero & Scroll Engine
    heroSection: 'heroSection',
    messageContainer: 'messageContainer',
    scrollProgress: 'scrollProgress',
    progressFill: 'progressFill',
    hudCounter: 'hudCounter',
    a11yAnnouncer: 'a11y-announcer',
    dustCanvas: 'dustCanvas',
    heroParticles: 'heroParticles',

    // Carousel
    carouselSlide: '.carousel-slide',
    carouselThumbnails: 'carouselThumbnails',
    carouselThumb: '.carousel-thumb',
    prevBtn: 'prevBtn',
    nextBtn: 'nextBtn',
    carouselContainer: '#campus .carousel-container',
    carouselTrack: '#campus .carousel-track',

    // Stats & Scroll reveal
    statNumbers: '.stat-number[data-target]',
    reveal: '.reveal',

    // Staggered Sections
    academicsSection: '#academics',
    academicsPillars: '#academics .academics-pillars',
    newsEventsSection: '#news-events',
    newsEventsGrid: '#news-events .events-grid',

    // Academic levels & School Dates
    levelToggle: '.level__toggle',
    schoolDates: 'schoolDatesSection',
    schoolDatesSection: 'schoolDatesSection',
    campusMapContainer: 'campusMapContainer',

    // Enquiry Modal & Form
    enquiryFabSelectors: [
        '#enquiryFab',
        '#enquire-btn',
        '#pMan',
        '.announcement-bar__link',
        '#getInTouchBtn',
        '#faqEnquiryBtn',
        '#calendarEnquiryBtn',
        '#mapInquireBtn',
    ],
    enquiryModal: 'enquiryModal',
    modalClose: 'modalClose',
    enquiryForm: 'enquiryForm',
    formStatus: 'formStatus',
    submitBtn: 'submitBtn',
    whatsappRoutingToggle: 'whatsappRoutingToggle',
    formInputs: '.form-group input, .form-group textarea',
} as const;

export const PROSPECTUS_SELECTORS = {
    darkModeToggle: 'darkModeToggle',
    menuToggle: 'menuToggle',
    navMenu: 'navMenu',
    downloadPdfBtn: 'downloadPdfBtn',
    downloadActionContainer: '.download-action-container',
    mainHeader: 'mainHeader',
    revealOnScroll: '.reveal-on-scroll',
    logoIcon: '.logo-icon',
    navLink: '.nav-link',
    anchorLink: 'a[href^="#"]',
    highlightableSection: 'section[id], header[id], footer[id]',
} as const;
