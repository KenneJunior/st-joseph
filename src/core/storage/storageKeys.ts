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
    /** LocalStorage key for persistent AI Guidance Assistant chat history */
    AI_CHAT_HISTORY: 'sjccc-ai-chat-history',
    /** LocalStorage key for milestone 24-hour reminders */
    MILESTONE_REMINDERS: 'sjccc-milestone-reminders',
    /** LocalStorage key for milestone reminder chime preference */
    MILESTONE_CHIME: 'sjccc-milestone-chime',
    /** LocalStorage key for user milestone push notifications enabled preference */
    MILESTONE_PUSH_ENABLED: 'sjccc-milestone-push-enabled',
    /** LocalStorage key for locally muting notifications */
    NOTIFICATIONS_MUTED: 'sjccc-notifications-muted',
    /** LocalStorage key for sent notification history (last 5 sent notifications) */
    NOTIFICATION_HISTORY: 'sjccc-notification-history',
    /** LocalStorage key for user performance preference ('auto' | 'full' | 'balanced' | 'lite') */
    PERFORMANCE_PREFERENCE: 'sjccc-performance-preference',
    /** LocalStorage key for resolved runtime performance profile hint ('full' | 'balanced' | 'lite') */
    PERFORMANCE_PROFILE: 'sjccc-performance-profile',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
