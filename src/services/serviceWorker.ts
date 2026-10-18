/**
 * ============================================================================
 * SJCCC – Service Worker Service
 * Handles registration, update banner notifications, controller reload logic,
 * and visibility-change update checks
 * ============================================================================
 */

import '../css/features/sw-update.css';

interface UpdateBannerElements {
    updateBtn: HTMLButtonElement | null;
    dismissBtn: HTMLButtonElement | null;
}

const SW_SCRIPT_PATH = '/sw.js';
const BANNER_ID = 'sw-update-banner';
const STORAGE_KEY_UPDATE_POSTPONED = 'sjccc_sw_update_postponed';

const COLORS = {
    deepBlue: '#07182E',
    gold: '#C9A229',
    goldLight: '#F3D779',
} as const;

function isUpdatePostponed(): boolean {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return false;
    try {
        return sessionStorage.getItem(STORAGE_KEY_UPDATE_POSTPONED) === 'true';
    } catch {
        return false;
    }
}

function setUpdatePostponed(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY_UPDATE_POSTPONED, 'true');
    } catch (err) {
        console.warn('Unable to persist update postponement to sessionStorage', err);
    }
}

let isRefreshing = false;

function triggerSafeReload(): void {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
}

/**
 * Register the service worker and handle lifecycle events.
 */
export const registerServiceWorker = (): void => {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported in this browser');
        return;
    }

    window.addEventListener('load', (): void => {
        navigator.serviceWorker
            .register(SW_SCRIPT_PATH)
            .then((registration: ServiceWorkerRegistration): void => {
                console.log(
                    '%c✓ Service Worker Registered',
                    `color: ${COLORS.gold}; font-weight: bold;`
                );
                console.log('Scope:', registration.scope);

                if (registration.waiting && navigator.serviceWorker.controller) {
                    showUpdateNotification(registration);
                }

                handleServiceWorkerUpdates(registration);
                startPeriodicUpdateChecks(registration);
            })
            .catch((error: unknown): void => {
                console.error('Service Worker registration failed:', error);
            });
    });

    handleControllerChange();
};

/**
 * Listen for and handle service worker updates found during this session.
 */
const handleServiceWorkerUpdates = (registration: ServiceWorkerRegistration): void => {
    registration.addEventListener('updatefound', (): void => {
        const newWorker = registration.installing;

        if (!newWorker) {
            console.warn('No installing worker found during update');
            return;
        }

        newWorker.addEventListener('statechange', (): void => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log(
                    '%c🔄 New update available!',
                    `color: ${COLORS.goldLight}; font-weight: bold;`
                );
                // When an even newer service worker version installs, clear the postponement
                // so the visitor is presented with the latest release
                try {
                    sessionStorage.removeItem(STORAGE_KEY_UPDATE_POSTPONED);
                } catch {
                    // Ignore storage access error
                }
                showUpdateNotification(registration);
            }
        });
    });
};

/**
 * Reload the page once the new worker actually takes control.
 */
const handleControllerChange = (): void => {
    navigator.serviceWorker.addEventListener('controllerchange', (): void => {
        triggerSafeReload();
    });
};

/**
 * Ask the browser to check for a new worker when tab regains visibility.
 */
const startPeriodicUpdateChecks = (registration: ServiceWorkerRegistration): void => {
    document.addEventListener('visibilitychange', (): void => {
        if (document.visibilityState !== 'visible') return;

        registration.update().catch((error: unknown): void => {
            console.warn('Service worker update check failed:', error);
        });
    });
};

/**
 * Create and display an update notification banner.
 */
export const showUpdateNotification = (registration: ServiceWorkerRegistration): void => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BANNER_ID)) return;
    if (isUpdatePostponed()) return;

    const banner = createUpdateBanner();
    document.body.appendChild(banner);

    // Coordinate with other floating surfaces (e.g. install prompt card)
    window.dispatchEvent(new CustomEvent('sjccc-update-banner-visible', { detail: { visible: true } }));

    const elements: UpdateBannerElements = {
        updateBtn: banner.querySelector<HTMLButtonElement>('#updateBtn'),
        dismissBtn: banner.querySelector<HTMLButtonElement>('#dismissBtn'),
    };

    attachBannerEventListeners(elements, banner, registration);
};

const createUpdateBanner = (): HTMLDivElement => {
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-atomic', 'true');

    banner.innerHTML = `
        <div class="sw-pill__icon-wrap" aria-hidden="true">
            <svg class="sw-pill__icon" viewBox="0 0 24 24">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
        </div>
        <div class="sw-pill__content">
            <strong class="sw-pill__title">Website update available</strong>
            <span class="sw-pill__meta">A new version of the SJCCC website is ready.</span>
        </div>
        <div class="sw-pill__actions">
            <button id="updateBtn" class="sw-banner-btn sw-banner-btn--primary" type="button">
                <span class="sw-btn-text">Update now</span>
            </button>
            <button id="dismissBtn" class="sw-banner-btn sw-banner-btn--ghost" type="button" aria-label="Postpone website update">
                Later
            </button>
        </div>
    `;

    return banner;
};

const attachBannerEventListeners = (
    elements: UpdateBannerElements,
    banner: HTMLDivElement,
    registration: ServiceWorkerRegistration
): void => {
    let isUpdating = false;

    elements.updateBtn?.addEventListener('click', (): void => {
        if (isUpdating) return;
        isUpdating = true;

        if (elements.updateBtn) {
            elements.updateBtn.disabled = true;
            elements.updateBtn.setAttribute('aria-busy', 'true');
            elements.updateBtn.innerHTML = `
                <span class="sw-spinner" aria-hidden="true"></span>
                <span>Updating...</span>
            `;
        }
        if (elements.dismissBtn) {
            elements.dismissBtn.disabled = true;
        }

        const waitingWorker = registration.waiting;
        if (waitingWorker) {
            try {
                waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            } catch (err) {
                console.warn('Failed to message waiting worker, reloading directly:', err);
                triggerSafeReload();
            }
        } else if (registration.installing) {
            // Worker is still installing, wait for installed state then skip waiting
            registration.installing.addEventListener('statechange', (e) => {
                const target = e.target as ServiceWorker;
                if (target.state === 'installed' && registration.waiting) {
                    try {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    } catch {
                        triggerSafeReload();
                    }
                }
            });
        } else {
            console.warn('No waiting service worker available to activate');
            // If no waiting worker is found, trigger safe reload to pick up active worker
            triggerSafeReload();
        }

        // Safety fallback in case controllerchange event does not fire within 3.5s
        window.setTimeout((): void => {
            triggerSafeReload();
        }, 3500);
    });

    elements.dismissBtn?.addEventListener('click', (): void => {
        setUpdatePostponed();
        banner.classList.add('sw-pill--dismissing');
        window.dispatchEvent(new CustomEvent('sjccc-update-banner-visible', { detail: { visible: false } }));
        window.setTimeout((): void => {
            banner.remove();
        }, 240);
    });
};

/**
 * Retained for backwards compatibility. Styles are now included via src/css/features/sw-update.css.
 */
export const injectBannerStyles = (): void => {
    // No-op: presentation styles now statically compiled in stylesheets
};

export const initServiceWorker = (): void => {
    injectBannerStyles();
    registerServiceWorker();
};

export interface CacheAvailabilityReport {
    isCached: boolean;
    sections: {
        academics: boolean;
        faq: boolean;
        prospectus: boolean;
        campusMap: boolean;
    };
    details?: {
        cacheVersion?: string;
        htmlCached?: boolean;
        academicsMediaCached?: boolean;
        prospectusCached?: boolean;
    };
}

/**
 * Checks cache availability for key sections (Academics, FAQ, Prospectus, etc.)
 * by communicating with the active Service Worker via MessageChannel, with
 * transparent fallback to direct CacheStorage inspection.
 */
export async function checkCacheAvailability(): Promise<CacheAvailabilityReport> {
    if (typeof window === 'undefined') {
        return {
            isCached: false,
            sections: { academics: false, faq: false, prospectus: false, campusMap: false },
        };
    }

    // 1. Try querying the active Service Worker controller
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            const report = await new Promise<CacheAvailabilityReport>((resolve) => {
                const channel = new MessageChannel();
                const timeoutId = setTimeout(() => {
                    resolve(fallbackCacheCheck());
                }, 800);

                channel.port1.onmessage = (event) => {
                    clearTimeout(timeoutId);
                    if (event.data && event.data.type === 'CACHE_AVAILABILITY_RESPONSE') {
                        resolve(event.data.status);
                    } else {
                        resolve(fallbackCacheCheck());
                    }
                };

                navigator.serviceWorker.controller?.postMessage(
                    { type: 'CHECK_CACHE_AVAILABILITY' },
                    [channel.port2]
                );
            });

            if (report) return report;
        } catch {
            // Fall through to fallback check
        }
    }

    return fallbackCacheCheck();
}

/**
 * Direct CacheStorage API check when the Service Worker controller is not yet controlling the client
 */
export async function fallbackCacheCheck(): Promise<CacheAvailabilityReport> {
    if (typeof window === 'undefined' || !('caches' in window)) {
        const isDocPresent = typeof document !== 'undefined' && document.getElementById('academics') !== null;
        return {
            isCached: isDocPresent,
            sections: {
                academics: isDocPresent,
                faq: isDocPresent && document.getElementById('faq') !== null,
                prospectus: false,
                campusMap: isDocPresent && document.getElementById('campusMapSection') !== null,
            },
        };
    }

    try {
        const cacheKeys = await window.caches.keys();
        let htmlCached = false;
        let prospectusCached = false;

        for (const cacheName of cacheKeys) {
            const cache = await window.caches.open(cacheName);
            const rootMatch = (await cache.match('/')) || (await cache.match('/index.html'));
            if (rootMatch) htmlCached = true;

            const prosMatch = await cache.match('/prospectus.html');
            if (prosMatch) prospectusCached = true;

            if (htmlCached && prospectusCached) break;
        }

        const isDocAvailable = htmlCached || (typeof document !== 'undefined' && document.getElementById('academics') !== null);

        return {
            isCached: isDocAvailable,
            sections: {
                academics: isDocAvailable,
                faq: isDocAvailable && (typeof document !== 'undefined' && (document.getElementById('faq') !== null || htmlCached)),
                prospectus: prospectusCached,
                campusMap: isDocAvailable && (typeof document !== 'undefined' && (document.getElementById('campusMapSection') !== null || htmlCached)),
            },
            details: {
                htmlCached,
                prospectusCached,
            },
        };
    } catch {
        const isDocPresent = typeof document !== 'undefined' && document.getElementById('academics') !== null;
        return {
            isCached: isDocPresent,
            sections: {
                academics: isDocPresent,
                faq: isDocPresent,
                prospectus: false,
                campusMap: isDocPresent,
            },
        };
    }
}

