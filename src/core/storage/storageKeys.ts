/**
 * ============================================================================
 * SJCCC – Storage Keys
 * Single source of truth for localStorage keys across the application
 * ============================================================================
 */

export const STORAGE_KEYS = {
    /** Theme preference ('dark' | 'light') */
    THEME: 'sjccc-theme',
    /** Theme transition animation style name */
    THEME_ANIMATION: 'sjccc-theme-animation',
    /** Name of the last played preloader pillar animation */
    PRELOADER_ANIMATION: 'lastPreloaderAnimation',
    /** Timestamp until which the announcement banner remains dismissed */
    ANNOUNCEMENT_DISMISSED: 'announcement_dismissed',
    /** Specific announcement banner key used for interview notice */
    INTERVIEW_ANNOUNCEMENT_DISMISSED: 'Interview_announcement_dismissed',
    /** LocalStorage key for PWA install prompt dismissal record */
    PWA_PROMPT: 'pwa-install-prompt',
    /** LocalStorage key for Academic Dates / Milestones search history */
    DATES_SEARCH_HISTORY: 'sjccc-dates-search-history',
    /** LocalStorage key for Frequently Asked Questions (FAQ) search history */
    FAQ_SEARCH_HISTORY: 'sjccc-faq-search-history',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
