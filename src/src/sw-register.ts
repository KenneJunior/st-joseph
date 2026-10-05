/**
 * ============================================================================
 * SJCCC – Service Worker Client Registration Flow
 * Provides standard SW registration, update detection, SKIP_WAITING signaling,
 * and controller change reload mechanics.
 * ============================================================================
 */

export {
    registerServiceWorker,
    initServiceWorker,
    checkCacheAvailability,
    fallbackCacheCheck,
    injectBannerStyles,
    type CacheAvailabilityReport
} from './services/serviceWorker.ts';
