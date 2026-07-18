/* ==========================================================================
   SAJOCO – SERVICE WORKER REGISTRATION (TypeScript)
   ========================================================================== */

// Type declarations for the update banner elements
interface UpdateBannerElements {
    updateBtn: HTMLButtonElement | null;
    dismissBtn: HTMLButtonElement | null;
}

/**
 * Register the service worker and handle lifecycle events
 */
const registerServiceWorker = (): void => {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported in this browser');
        return;
    }

    window.addEventListener('load', (): void => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration: ServiceWorkerRegistration): void => {
                console.log(
                    '%c✓ Service Worker Registered',
                    'color: #C9A229; font-weight: bold;'
                );
                console.log('Scope:', registration.scope);

                // Listen for service worker updates
                handleServiceWorkerUpdates(registration);
            })
            .catch((error: Error): void => {
                console.error('Service Worker registration failed:', error);
            });
    });

    // Handle controller change (new SW taking over)
    handleControllerChange();
};

/**
 * Listen for and handle service worker updates
 */
const handleServiceWorkerUpdates = (registration: ServiceWorkerRegistration): void => {
    registration.addEventListener('updatefound', (): void => {
        const newWorker = registration.installing;

        if (!newWorker) {
            console.warn('No installing worker found during update');
            return;
        }

        newWorker.addEventListener('statechange', (): void => {
            if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
            ) {
                console.log(
                    '%c🔄 New update available!',
                    'color: #F3D779; font-weight: bold;'
                );
                showUpdateNotification();
            }
        });
    });
};

/**
 * Handle the controllerchange event (new SW activated)
 */
const handleControllerChange = (): void => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', (): void => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
};

/**
 * Create and display an update notification banner
 */
const showUpdateNotification = (): void => {
    const updateBanner = createUpdateBanner();
    document.body.appendChild(updateBanner);

    const elements: UpdateBannerElements = {
        updateBtn: document.getElementById('updateBtn') as HTMLButtonElement | null,
        dismissBtn: document.getElementById('dismissBtn') as HTMLButtonElement | null,
    };

    attachBannerEventListeners(elements, updateBanner);

    // Auto-dismiss after 10 seconds
    setTimeout((): void => {
        if (updateBanner.parentNode) {
            updateBanner.remove();
        }
    }, 10000);
};

/**
 * Create the update notification banner DOM element
 */
const createUpdateBanner = (): HTMLDivElement => {
    const updateBanner = document.createElement('div');

    updateBanner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--deep-blue, #07182E);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 50px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        border: 2px solid #C9A229;
        animation: slideUp 0.4s ease;
    `;

    updateBanner.innerHTML = `
        <span>🔄 New version available!</span>
        <button id="updateBtn" style="
            background: #C9A229;
            color: #07182E;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 700;
            font-size: 0.85rem;
            transition: all 0.3s ease;
        ">Refresh</button>
        <button id="dismissBtn" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 0.5rem 1rem;
            border-radius: 25px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.3s ease;
        ">Later</button>
    `;

    return updateBanner;
};

/**
 * Attach click event listeners to the banner buttons
 */
const attachBannerEventListeners = (
    elements: UpdateBannerElements,
    banner: HTMLDivElement
): void => {
    // Refresh button – activate new SW and reload
    elements.updateBtn?.addEventListener('click', (): void => {
        banner.remove();

        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SKIP_WAITING',
            });
        }

        window.location.reload();
    });

    // Dismiss button – just remove the banner
    elements.dismissBtn?.addEventListener('click', (): void => {
        banner.remove();
    });

    // Hover effects for buttons
    elements.updateBtn?.addEventListener('mouseenter', (): void => {
        if (elements.updateBtn) {
            elements.updateBtn.style.background = '#F3D779';
            elements.updateBtn.style.transform = 'translateY(-2px)';
        }
    });

    elements.updateBtn?.addEventListener('mouseleave', (): void => {
        if (elements.updateBtn) {
            elements.updateBtn.style.background = '#C9A229';
            elements.updateBtn.style.transform = 'translateY(0)';
        }
    });

    elements.dismissBtn?.addEventListener('mouseenter', (): void => {
        if (elements.dismissBtn) {
            elements.dismissBtn.style.borderColor = '#C9A229';
            elements.dismissBtn.style.color = '#F3D779';
        }
    });

    elements.dismissBtn?.addEventListener('mouseleave', (): void => {
        if (elements.dismissBtn) {
            elements.dismissBtn.style.borderColor = 'rgba(255,255,255,0.3)';
            elements.dismissBtn.style.color = 'white';
        }
    });
};

/**
 * Inject the slide-up animation keyframes into the document
 */
const injectAnimationStyles = (): void => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `;
    document.head.appendChild(styleSheet);
};

// ─── Initialize ───
injectAnimationStyles();
registerServiceWorker();