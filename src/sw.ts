/// <reference lib="webworker" />

/**
 * ============================================================================
 * SJCCC – St. Joseph's Catholic Comprehensive College, Mbengwi
 * Production Progressive Web App Service Worker (TypeScript)
 * ============================================================================
 * Scope: /
 * Architectural Contracts:
 *   - Offline-first MPA support for / (Home) and /prospectus.html
 *   - Precache of core HTML, hashed Vite JS/CSS, manifest, and essential graphics
 *   - Network-First HTML navigation with conservative timeout and offline fallback
 *   - Cache-First immutable production JS, CSS, and images
 *   - Bounded runtime caches with deterministic eviction
 *   - Safe lifecycle with SKIP_WAITING update banner preservation
 *   - No caching of POST requests, Formspree, WhatsApp, or Google Maps
 * ============================================================================
 */

import { OFFLINE_HTML, IMAGE_PLACEHOLDER_SVG } from './sw/offlineAssets.ts';

declare const self: ServiceWorkerGlobalScope;
declare const __SW_MANIFEST_ASSETS__: string[] | undefined;

// ---------------------------------------------------------------------------
// 1. Versioning & Cache Namespaces
// ---------------------------------------------------------------------------

export const CACHE_VERSION = 'v2.0.0';
const CACHE_PREFIX = 'sjccc';

export const CACHES = {
    precache: `${CACHE_PREFIX}-precache-${CACHE_VERSION}`,
    runtime: `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`,
    images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
    offline: `${CACHE_PREFIX}-offline-${CACHE_VERSION}`,
} as const;

// Upper boundaries for dynamic caches
const CACHE_LIMITS: Record<string, number> = {
    [CACHES.images]: 60,
    [CACHES.runtime]: 50,
};

// Network timeout for HTML navigation before falling back to cache
const NAVIGATION_TIMEOUT_MS = 3500;

// ---------------------------------------------------------------------------
// 2. Asset Manifest & Essential Precache Sets
// ---------------------------------------------------------------------------

// Automatically injected by vite.sw.config.ts during production build
const BUILT_PRODUCTION_ASSETS: string[] =
    typeof __SW_MANIFEST_ASSETS__ !== 'undefined' && Array.isArray(__SW_MANIFEST_ASSETS__)
        ? __SW_MANIFEST_ASSETS__
        : [];

// Core application HTML documents
const CORE_DOCUMENTS: string[] = [
    '/',
    '/index.html',
    '/prospectus.html',
    '/manifest.json',
];

// Offline & Error fallback graphics (must exist)
const ESSENTIAL_FALLBACKS: string[] = [
    '/assets/Error-Image.jpeg',
    '/assets/offline-image.jpeg',
];

// Combine all required assets for mandatory install step
const REQUIRED_PRECACHE_URLS: string[] = Array.from(
    new Set([...CORE_DOCUMENTS, ...ESSENTIAL_FALLBACKS, ...BUILT_PRODUCTION_ASSETS])
);

// High-value optional assets (icons & key section images)
const OPTIONAL_PRECACHE_URLS: string[] = [
    '/assets/icons/icon.svg',
    '/assets/icons/168X168.svg',
    '/assets/icons/Apple/manifest-icon-192.maskable.png',
    '/assets/icons/Apple/manifest-icon-512.maskable.png',
    '/assets/stJoseph.jpg',
    '/assets/sjccc-campus.jpg',
    '/assets/sjccc-Classroom.jpg',
];

// Approved external CDN hosts (Fonts & Icons only)
const APPROVED_CDN_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
]);

// ---------------------------------------------------------------------------
// 3. Cache Trimming & Eviction Policy
// ---------------------------------------------------------------------------

/**
 * Trims a named cache to its configured item limit by evicting the oldest
 * entries first (insertion order is preserved by caches.keys()).
 */
async function trimCache(cacheName: string, maxEntries?: number): Promise<void> {
    const limit = maxEntries ?? CACHE_LIMITS[cacheName];
    if (!limit) return;

    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        if (keys.length > limit) {
            const countToDelete = keys.length - limit;
            const toDelete = keys.slice(0, countToDelete);
            await Promise.all(toDelete.map((req) => cache.delete(req)));
        }
    } catch (err) {
        console.warn(`[SW] Failed to trim cache ${cacheName}:`, err);
    }
}

// ---------------------------------------------------------------------------
// 4. Request Classification & Filtering
// ---------------------------------------------------------------------------

type RequestClassification =
    | 'navigation'
    | 'static-asset'
    | 'image'
    | 'font'
    | 'approved-cdn'
    | 'network-only'
    | 'pass-through';

function classifyRequest(request: Request, url: URL): RequestClassification {
    // 1. Navigation requests (mode === 'navigate' or HTML accept header)
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        return 'navigation';
    }

    // 2. Dev server artefacts, WebSockets, browser extensions
    const pathname = url.pathname;
    if (
        pathname.startsWith('/@vite/') ||
        pathname.startsWith('/@fs/') ||
        pathname.startsWith('/@id/') ||
        pathname.startsWith('/__vite_ping') ||
        pathname.startsWith('/node_modules/') ||
        url.protocol === 'chrome-extension:' ||
        url.protocol === 'blob:' ||
        url.protocol === 'data:'
    ) {
        return 'pass-through';
    }

    // 3. Sensitive / External dynamic APIs that must NEVER be cached
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/auth/') ||
        url.hostname.includes('formspree.io') ||
        url.hostname.includes('wa.me') ||
        url.hostname.includes('whatsapp.com') ||
        url.hostname.includes('google.com/maps') ||
        url.hostname.includes('maps.googleapis.com') ||
        url.hostname.includes('maps.gstatic.com')
    ) {
        return 'network-only';
    }

    // 4. Cross-origin classification
    if (url.origin !== self.location.origin) {
        if (APPROVED_CDN_HOSTS.has(url.hostname)) {
            return 'approved-cdn';
        }
        return 'network-only';
    }

    // 5. Same-origin images
    if (
        request.destination === 'image' ||
        /\.(jpe?g|png|gif|svg|webp|avif|ico)$/i.test(pathname)
    ) {
        return 'image';
    }

    // 6. Same-origin fonts
    if (
        request.destination === 'font' ||
        /\.(woff2?|ttf|eot|otf)$/i.test(pathname)
    ) {
        return 'font';
    }

    // 7. Same-origin static assets (JS, CSS, JSON, manifest)
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        /\.(js|css|json|webmanifest)$/i.test(pathname)
    ) {
        return 'static-asset';
    }

    return 'pass-through';
}

// ---------------------------------------------------------------------------
// 5. Lifecycle: Install Event
// ---------------------------------------------------------------------------

self.addEventListener('install', (event: ExtendableEvent) => {
    console.info(`[SW] Installing SJCCC Service Worker (${CACHE_VERSION})...`);

    event.waitUntil(
        (async () => {
            const precache = await caches.open(CACHES.precache);
            const offlineCache = await caches.open(CACHES.offline);

            // 1. Precache embedded offline HTML page as virtual /offline.html
            await offlineCache.put(
                new Request('/offline.html'),
                new Response(OFFLINE_HTML, {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'X-Offline-Page': 'true',
                    },
                })
            );

            // 2. Precache required core documents and assets
            for (const url of REQUIRED_PRECACHE_URLS) {
                try {
                    await precache.add(new Request(url, { credentials: 'same-origin' }));
                } catch (err) {
                    console.warn(`[SW] Could not precache required asset "${url}":`, err);
                }
            }

            // 3. Precache optional assets without blocking installation
            await Promise.allSettled(
                OPTIONAL_PRECACHE_URLS.map(async (url) => {
                    try {
                        await precache.add(new Request(url, { credentials: 'same-origin' }));
                    } catch {
                        // Safe to skip optional asset
                    }
                })
            );

            console.info(`[SW] Precache installed successfully (${CACHE_VERSION}).`);
            // Note: self.skipWaiting() is intentionally NOT called here
            // to allow client update banner and manual user acceptance.
        })()
    );
});

// ---------------------------------------------------------------------------
// 6. Lifecycle: Activate Event
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event: ExtendableEvent) => {
    console.info(`[SW] Activating SJCCC Service Worker (${CACHE_VERSION})...`);

    event.waitUntil(
        (async () => {
            const validCaches = new Set<string>(Object.values(CACHES));
            const existingCacheKeys = await caches.keys();

            // Evict old SJCCC caches from prior builds and legacy workers
            const cachesToDelete = existingCacheKeys.filter((key) => {
                const isSJCCC = key.startsWith(`${CACHE_PREFIX}-`) || key.startsWith('stjoseph-');
                return isSJCCC && !validCaches.has(key);
            });

            await Promise.all(
                cachesToDelete.map(async (key) => {
                    console.info(`[SW] Deleting obsolete cache: ${key}`);
                    await caches.delete(key);
                })
            );

            // Claim immediately so uncontrolled clients begin using the service worker
            await self.clients.claim();
            console.info(`[SW] Activated and controlling all clients (${CACHE_VERSION}).`);
        })()
    );
});

// ---------------------------------------------------------------------------
// 7. Lifecycle: Message Event (SKIP_WAITING & Cache Verification)
// ---------------------------------------------------------------------------

self.addEventListener('message', (event: ExtendableMessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Client update acceptance
    if (data.type === 'SKIP_WAITING') {
        console.info('[SW] Received SKIP_WAITING signal from client. Activating worker...');
        void self.skipWaiting();
        return;
    }

    // Section cache readiness check for OfflineIndicator
    if (data.type === 'CHECK_CACHE_AVAILABILITY') {
        event.waitUntil(
            (async () => {
                try {
                    const precache = await caches.open(CACHES.precache);
                    const runtime = await caches.open(CACHES.runtime);

                    const rootMatch =
                        (await precache.match('/')) ||
                        (await precache.match('/index.html')) ||
                        (await runtime.match('/')) ||
                        (await runtime.match('/index.html'));

                    const prospectusMatch =
                        (await precache.match('/prospectus.html')) ||
                        (await runtime.match('/prospectus.html'));

                    const classroomMatch =
                        (await precache.match('/assets/sjccc-Classroom.jpg')) ||
                        (await runtime.match('/assets/sjccc-Classroom.jpg'));

                    const isRootCached = !!rootMatch;
                    const isProspectusCached = !!prospectusMatch;

                    const report = {
                        isCached: isRootCached,
                        sections: {
                            academics: isRootCached,
                            faq: isRootCached,
                            prospectus: isProspectusCached,
                            campusMap: isRootCached,
                        },
                        details: {
                            cacheVersion: CACHE_VERSION,
                            htmlCached: isRootCached,
                            academicsMediaCached: !!classroomMatch,
                            prospectusCached: isProspectusCached,
                        },
                    };

                    const responsePayload = {
                        type: 'CACHE_AVAILABILITY_RESPONSE',
                        status: report,
                    };

                    if (event.ports && event.ports[0]) {
                        event.ports[0].postMessage(responsePayload);
                    } else if (event.source) {
                        event.source.postMessage(responsePayload);
                    }
                } catch (err) {
                    console.warn('[SW] Cache check error:', err);
                }
            })()
        );
    }
});

// ---------------------------------------------------------------------------
// 8. Lifecycle: Fetch Event & Routing
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;

    // Intercept only GET requests
    if (request.method !== 'GET') {
        return;
    }

    let url: URL;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }

    const classification = classifyRequest(request, url);

    if (classification === 'pass-through' || classification === 'network-only') {
        return;
    }

    switch (classification) {
        case 'navigation':
            event.respondWith(handleNavigation(request, url));
            break;
        case 'image':
            event.respondWith(handleImage(request));
            break;
        case 'font':
        case 'approved-cdn':
            event.respondWith(handleFontOrCdn(request));
            break;
        case 'static-asset':
            event.respondWith(handleStaticAsset(request));
            break;
        default:
            break;
    }
});

// ---------------------------------------------------------------------------
// 9. Strategies
// ---------------------------------------------------------------------------

/**
 * Strategy: Network-First for HTML documents with timeout and offline fallback.
 */
async function handleNavigation(request: Request, url: URL): Promise<Response> {
    try {
        // Attempt network fetch with conservative timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Navigation network timeout')), NAVIGATION_TIMEOUT_MS);
        });

        const networkResponse = await Promise.race([fetch(request), timeoutPromise]);

        if (networkResponse && networkResponse.ok) {
            // Update runtime cache with the latest version
            const runtime = await caches.open(CACHES.runtime);
            await runtime.put(request, networkResponse.clone());
            void trimCache(CACHES.runtime);
            return networkResponse;
        }
    } catch {
        // Network failed or timed out — proceed to cache lookups
    }

    // Cache fallback hierarchy:
    // 1. Exact request URL match
    const exactMatch = await caches.match(request);
    if (exactMatch) {
        return exactMatch;
    }

    // 2. Specific page routes
    const pathname = url.pathname;

    if (pathname.includes('prospectus')) {
        const prospectusMatch =
            (await caches.match('/prospectus.html')) ||
            (await caches.match('/prospectus'));
        if (prospectusMatch) return prospectusMatch;
    } else {
        const homeMatch =
            (await caches.match('/')) ||
            (await caches.match('/index.html'));
        if (homeMatch) return homeMatch;
    }

    // 3. Fallback to pre-rendered offline document
    const offlineCache = await caches.open(CACHES.offline);
    const offlineDoc = await offlineCache.match('/offline.html');
    if (offlineDoc) {
        return offlineDoc;
    }

    return new Response(OFFLINE_HTML, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Offline-Page': 'true',
        },
    });
}

/**
 * Strategy: Cache-First for static JS, CSS, and manifest assets.
 * Returns empty stylesheet on CSS network failure to prevent blocking the UI.
 */
async function handleStaticAsset(request: Request): Promise<Response> {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            const runtime = await caches.open(CACHES.runtime);
            await runtime.put(request, networkResponse.clone());
            void trimCache(CACHES.runtime);
        }
        return networkResponse;
    } catch {
        if (request.url.endsWith('.css') || request.headers.get('accept')?.includes('text/css')) {
            return new Response('/* offline stylesheet fallback */', {
                status: 200,
                headers: { 'Content-Type': 'text/css' },
            });
        }

        return new Response('Asset unavailable offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

/**
 * Strategy: Cache-First for local images with fallback on 404 or offline.
 */
async function handleImage(request: Request): Promise<Response> {
    // 1. Check precache and images cache
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    // 2. Try fetching from network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            const imagesCache = await caches.open(CACHES.images);
            await imagesCache.put(request, networkResponse.clone());
            void trimCache(CACHES.images);
            return networkResponse;
        }

        // Image returned 404 or server error
        return await getImageFallback();
    } catch {
        // Offline / network failure
        return await getImageFallback();
    }
}

/**
 * Returns the cached offline/error image or the embedded SVG placeholder.
 */
async function getImageFallback(): Promise<Response> {
    try {
        const offlineImg = await caches.match('/assets/offline-image.jpeg');
        if (offlineImg) return offlineImg;

        const errorImg = await caches.match('/assets/Error-Image.jpeg');
        if (errorImg) return errorImg;
    } catch {
        // Fall through to SVG placeholder
    }

    return new Response(IMAGE_PLACEHOLDER_SVG, {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-store',
        },
    });
}

/**
 * Strategy: Cache-First for fonts and approved external CDNs.
 */
async function handleFontOrCdn(request: Request): Promise<Response> {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const runtime = await caches.open(CACHES.runtime);
            await runtime.put(request, networkResponse.clone());
            void trimCache(CACHES.runtime);
        }
        return networkResponse;
    } catch {
        return new Response('Resource unavailable offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}
