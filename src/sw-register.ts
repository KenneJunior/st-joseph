/* ==========================================================================
   SJCCC – SERVICE WORKER REGISTRATION (TypeScript)
   ========================================================================== */

// Type declarations for the update banner elements
interface UpdateBannerElements {
    updateBtn: HTMLButtonElement | null;
    dismissBtn: HTMLButtonElement | null;
}

// ─── Config ───
const SW_SCRIPT_PATH = '/sw.js';
const BANNER_ID = 'sw-update-banner';
const STYLE_ID = 'sw-update-banner-styles';
const AUTO_DISMISS_MS = 10_000;

const COLORS = {
    deepBlue: '#07182E',
    gold: '#C9A229',
    goldLight: '#F3D779',
} as const;

/**
 * Register the service worker and handle lifecycle events.
 */
const registerServiceWorker = (): void => {
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

                // A worker can already be sitting in `waiting` if it finished
                // installing in a previous session and the page was never
                // refreshed. Without this check, that update would never
                // surface again until a *different* update comes along.
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
            // `controller` only exists once a worker has already taken
            // control of the page, so this condition is what tells apart
            // a genuine update from the very first install.
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log(
                    '%c🔄 New update available!',
                    `color: ${COLORS.goldLight}; font-weight: bold;`
                );
                showUpdateNotification(registration);
            }
        });
    });
};

/**
 * Reload the page once the new worker actually takes control. Guarded
 * against firing more than once, since `controllerchange` can otherwise
 * trigger multiple reloads.
 */
const handleControllerChange = (): void => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', (): void => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
};

/**
 * Ask the browser to check for a new worker. Browsers already do this on
 * navigation, but tabs left open for a long time won't get that check —
 * re-checking whenever the tab regains focus closes that gap.
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
 * Create and display an update notification banner. No-ops if a banner is
 * already showing, so rapid update/visibility events can't stack duplicate
 * banners on top of each other.
 */
const showUpdateNotification = (registration: ServiceWorkerRegistration): void => {
    if (document.getElementById(BANNER_ID)) {
        return;
    }

    const banner = createUpdateBanner();
    document.body.appendChild(banner);

    const elements: UpdateBannerElements = {
        updateBtn: banner.querySelector<HTMLButtonElement>('#updateBtn'),
        dismissBtn: banner.querySelector<HTMLButtonElement>('#dismissBtn'),
    };

    attachBannerEventListeners(elements, banner, registration);

    window.setTimeout((): void => {
        banner.remove();
    }, AUTO_DISMISS_MS);
};

/**
 * Create the update notification banner DOM element.
 */
const createUpdateBanner = (): HTMLDivElement => {
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    banner.innerHTML = `
        <span>🔄 New version available!</span>
        <button id="updateBtn" class="sw-banner-btn sw-banner-btn--primary" type="button">Refresh</button>
        <button id="dismissBtn" class="sw-banner-btn sw-banner-btn--ghost" type="button">Later</button>
    `;

    return banner;
};

/**
 * Attach click handlers to the banner buttons.
 */
const attachBannerEventListeners = (
    elements: UpdateBannerElements,
    banner: HTMLDivElement,
    registration: ServiceWorkerRegistration
): void => {
    elements.updateBtn?.addEventListener('click', (): void => {
        // Tell the *waiting* worker to activate — not the current
        // controller, which is the outgoing worker. The reload itself
        // happens in the `controllerchange` handler once the new worker
        // is actually in control, so we don't race ahead of it here.
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        banner.remove();
    });

    elements.dismissBtn?.addEventListener('click', (): void => {
        banner.remove();
    });
};

/**
 * Inject the banner's styles once per page load. Hover/focus states live in
 * CSS now rather than JS, so keyboard users get the same affordance mouse
 * users do.
 */
const injectBannerStyles = (): void => {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const styleSheet = document.createElement('style');
    styleSheet.id = STYLE_ID;
    styleSheet.textContent = `
        #${BANNER_ID} {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--deep-blue, ${COLORS.deepBlue});
            color: #ffffff;
            padding: 1rem 1.5rem;
            border-radius: 50px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            border: 2px solid ${COLORS.gold};
            animation: sw-banner-slide-up 0.4s ease;
        }

        .sw-banner-btn {
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 25px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            transition: background-color 0.2s ease, color 0.2s ease,
                        transform 0.2s ease, border-color 0.2s ease;
        }

        .sw-banner-btn--primary {
            background: ${COLORS.gold};
            color: ${COLORS.deepBlue};
            font-weight: 700;
        }

        .sw-banner-btn--primary:hover,
        .sw-banner-btn--primary:focus-visible {
            background: ${COLORS.goldLight};
            transform: translateY(-2px);
        }

        .sw-banner-btn--ghost {
            background: transparent;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .sw-banner-btn--ghost:hover,
        .sw-banner-btn--ghost:focus-visible {
            border-color: ${COLORS.gold};
            color: ${COLORS.goldLight};
        }

        @keyframes sw-banner-slide-up {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            #${BANNER_ID} {
                animation: none;
            }
        }
    `;
    document.head.appendChild(styleSheet);
};

// ─── Initialize ───
injectBannerStyles();
registerServiceWorker();