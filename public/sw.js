 self.logger = {
    withContext: () => self.logger,
    debug: (...a) => console.debug(...a),
    info: (...a) => console.info(...a),
    warn: (...a) => console.warn(...a),
    error: (...a) => console.error(...a),
    time: (l) => console.time(l),
    timeEnd: (l) => console.timeEnd(l),
  };

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------

const CACHE_VERSION = "v1.1";
const STATIC_CACHE   = `stjoseph-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE  = `stjoseph-dynamic-${CACHE_VERSION}`;   // fixed typo: "gradutation"
const CSS_JS_CACHE   = `stjoseph-css_js-${CACHE_VERSION}`;

// Per-cache item limits.  Oldest entries (by insertion order) are evicted first.
const CACHE_LIMITS = {
  [STATIC_CACHE]:  150,   // pre-cached essentials rarely exceed this
  [DYNAMIC_CACHE]: 100,   // HTML pages + redirects
  [CSS_JS_CACHE]:  200,   // JS / CSS / external CDN resources
};

// Create a module-level logger with service-worker context
const logger = self.logger;
const swLogger = logger.withContext({
  module: "ServiceWorker",
  cacheVersion: CACHE_VERSION,
  scope: self.registration?.scope ?? "unknown",
});

// ---------------------------------------------------------------------------
// 2. External CDN allow-lists
// ---------------------------------------------------------------------------

const EXTERNAL_CDN_HOSTS = new Set([
  "cdnjs.cloudflare.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "code.jquery.com",
  "maxcdn.bootstrapcdn.com",
]);

// Regex patterns that identify well-known library bundles (belt-and-suspenders
// check for CDN resources that might come from unexpected hostnames).
const EXTERNAL_LIBRARY_PATTERNS = [
  /bootstrap.*\.min\.(css|js)/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
];

// ---------------------------------------------------------------------------
// 3. Essential URLs pre-cached on install
// ---------------------------------------------------------------------------

const ESSENTIAL_URLS = [
    "/", "/index.html", "/prospectus.html",
];

/** Extensions we will dynamically cache when seen in the wild */
const CACHEABLE_EXTENSIONS = new Set([
  ".html", ".css", ".js", ".json",
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
  ".mp3", ".webm", ".ogg", ".wav",
  ".woff", ".woff2", ".ttf", ".eot",
  ".txt", ".xml", ".webmanifest",
]);

/** Directory prefixes that must never be cached (source/dev artefacts) */
const EXCLUDED_PATH_PREFIXES = [
  "/node_modules/", "/.vscode/", "/.github/", "/.idea/", "/.git/",
  "/test/", "/tests/", "/spec/", "/coverage/", "/build/", "/src/utils/",
];

const OFFLINE_HTML = `<!doctype html><html lang=en><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>SJCCC - You're Offline</title><link rel=preconnect href=https://fonts.googleapis.com><link rel=preconnect href=https://fonts.gstatic.com crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap" rel=stylesheet><style>:root{--deep-blue:#07182E;--royal-blue:#0E2746;--gold:#C9A229;--gold-light:#F3D779;--white:#ffffff;--text-muted:#a0aec0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,sans-serif;background:linear-gradient(165deg,var(--deep-blue) 0,#0a1c38 40%,#040d1a 100%);min-height:100vh;min-height:100dvh;display:flex;justify-content:center;align-items:center;color:var(--white);text-align:center;padding:1.5rem;overflow:hidden;position:relative}.particles{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0}.particle{position:absolute;background:var(--gold);border-radius:50%;opacity:0;animation:floatUp 6s infinite ease-in}.particle:first-child{left:10%;width:2px;height:2px;animation-delay:0s}.particle:nth-child(2){left:25%;width:3px;height:3px;animation-delay:1s;animation-duration:7s}.particle:nth-child(3){left:40%;width:1.5px;height:1.5px;animation-delay:2s;animation-duration:5.5s}.particle:nth-child(4){left:55%;width:2.5px;height:2.5px;animation-delay:.5s;animation-duration:8s}.particle:nth-child(5){left:70%;width:2px;height:2px;animation-delay:3s;animation-duration:6.5s}.particle:nth-child(6){left:85%;width:3px;height:3px;animation-delay:1.5s;animation-duration:7.5s}.particle:nth-child(7){left:15%;width:1.5px;height:1.5px;animation-delay:2.5s}.particle:nth-child(8){left:60%;width:2px;height:2px;animation-delay:4s;animation-duration:9s}@keyframes floatUp{0%{opacity:0;transform:translateY(100vh) scale(0)}10%{opacity:.6}90%{opacity:.2}100%{opacity:0;transform:translateY(-10vh) scale(1.5)}}.glow-orb{position:fixed;border-radius:50%;filter:blur(80px);opacity:.08;pointer-events:none;z-index:0;animation:orbPulse 8s infinite ease-in-out}.glow-orb.orb-1{width:300px;height:300px;background:var(--gold);top:-100px;right:-50px;animation-delay:0s}.glow-orb.orb-2{width:250px;height:250px;background:var(--royal-blue);bottom:-80px;left:-60px;animation-delay:4s}@keyframes orbPulse{0%,100%{transform:scale(1);opacity:.08}50%{transform:scale(1.3);opacity:.15}}.container{position:relative;z-index:1;max-width:480px;width:100%;animation:fadeInUp .8s cubic-bezier(.16,1,.3,1) forwards}@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}.card{background:rgba(255,255,255,.03);border:1px solid rgba(201,162,41,.2);border-radius:24px;padding:2.5rem 2rem;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 25px 50px -12px rgba(0,0,0,.4)}.cross-wrapper{position:relative;display:inline-block;margin-bottom:.5rem}.cross{color:var(--gold-light);font-size:4rem;display:block;animation:crossGlow 3s infinite ease-in-out;filter:drop-shadow(0 0 20px rgba(243, 215, 121, .4))}@keyframes crossGlow{0%,100%{filter:drop-shadow(0 0 15px rgba(243, 215, 121, .3));transform:scale(1)}50%{filter:drop-shadow(0 0 30px rgba(243, 215, 121, .7));transform:scale(1.08)}}.connection-icon{display:block;margin:0 auto .5rem;animation:wifiPulse 2s infinite ease-in-out}.connection-icon svg{width:60px;height:60px}@keyframes wifiPulse{0%,100%{opacity:.5}50%{opacity:1}}h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:2.2rem;font-weight:700;color:var(--gold);margin-bottom:.3rem;letter-spacing:1px}.subtitle{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;color:var(--text-muted);font-size:1rem;margin-bottom:1.5rem}.status-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(199,54,54,.15);border:1px solid rgba(199,54,54,.3);color:#f87171;padding:.5rem 1rem;border-radius:50px;font-size:.85rem;font-weight:500;margin-bottom:1.5rem}.status-dot{width:8px;height:8px;background:#f87171;border-radius:50%;animation:dotBlink 1.5s infinite}@keyframes dotBlink{0%,100%{opacity:1}50%{opacity:.3}}.status-badge.online{background:rgba(46,160,67,.15);border-color:rgba(46,160,67,.3);color:#4ade80}.status-badge.online .status-dot{background:#4ade80;animation:none}p{opacity:.85;line-height:1.7;margin-bottom:1.8rem;color:#cbd5e1;font-size:.95rem}.btn-group{display:flex;flex-direction:column;gap:.75rem;align-items:center}.retry-btn{background:linear-gradient(135deg,var(--gold) 0,#e0b83b 100%);color:var(--deep-blue);border:none;padding:.85rem 2.2rem;border-radius:50px;font-weight:700;font-size:1rem;cursor:pointer;transition:all .3s cubic-bezier(.34, 1.56, .64, 1);border:2px solid var(--gold);letter-spacing:.3px;width:100%;max-width:280px}.retry-btn:hover{background:linear-gradient(135deg,var(--gold-light) 0,#f5e186 100%);transform:translateY(-3px);box-shadow:0 12px 30px rgba(201,162,41,.35)}.retry-btn:active{transform:translateY(-1px) scale(.98)}.home-btn{background:0 0;color:var(--white);border:1px solid rgba(255,255,255,.2);padding:.75rem 2rem;border-radius:50px;font-weight:500;font-size:.9rem;cursor:pointer;transition:all .3s ease;width:100%;max-width:280px}.home-btn:hover{border-color:var(--gold);color:var(--gold-light);background:rgba(201,162,41,.05)}.motto{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;color:var(--gold-light);margin-top:1.8rem;font-size:.9rem;opacity:.8}.footer-info{margin-top:1rem;font-size:.7rem;color:var(--text-muted);opacity:.5}@media (max-width:480px){.card{padding:2rem 1.5rem;border-radius:20px}.cross{font-size:3rem}h1{font-size:1.8rem}p{font-size:.88rem}.retry-btn{padding:.75rem 1.8rem;font-size:.95rem}}@media (prefers-color-scheme:light){body{background:linear-gradient(165deg,#f8f6f0 0,#eae5d9 100%)}.card{background:rgba(255,255,255,.8);border-color:rgba(201,162,41,.3);box-shadow:0 25px 50px -12px rgba(0,0,0,.1)}.subtitle{color:#6b7280}p{color:#4b5563}.home-btn{color:#1a1e2b;border-color:rgba(0,0,0,.15)}.home-btn:hover{border-color:var(--gold);color:#07182e}.glow-orb{opacity:.05}.footer-info{color:#6b7280}}</style><div class=particles><div class=particle></div><div class=particle></div><div class=particle></div><div class=particle></div><div class=particle></div><div class=particle></div><div class=particle></div><div class=particle></div></div><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class=container><div class=card><div class=cross-wrapper><span class=cross>✟</span></div><h1>SJCCC</h1><p class=subtitle>St. Joseph Catholic Comprehensive College Mbengwi<div class=status-badge id=statusBadge><span class=status-dot></span> <span id=statusText>No Internet Connection</span></div><p>It appears you're currently offline. The prospectus and all its features will be available once you reconnect to the internet.<div class=btn-group><button class=retry-btn onclick=retryConnection()><span id=btnText>Try Again</span></button> <button class=home-btn onclick='window.location.href="/"'>← Back to Home</button></div><p class=motto>"Edificamus Regnum Dei — Let us build the Kingdom of God"</div><p class=footer-info>Archdiocese of Bamenda &nbsp;|&nbsp; Catholic Education</div><script>const statusBadge=document.getElementById("statusBadge"),statusText=document.getElementById("statusText"),btnText=document.getElementById("btnText");function updateOnlineStatus(){navigator.onLine?(statusBadge.classList.add("online"),statusText.textContent="Connection Restored",btnText.textContent="Go to Prospectus"):(statusBadge.classList.remove("online"),statusText.textContent="No Internet Connection",btnText.textContent="Try Again")}function retryConnection(){if(navigator.onLine)window.location.href="/";else{const t=document.querySelector(".retry-btn");btnText.textContent="Checking...",t.disabled=!0,t.style.opacity="0.7",t.style.cursor="not-allowed",setTimeout(()=>{window.location.reload()},500)}}window.addEventListener("online",updateOnlineStatus),window.addEventListener("offline",updateOnlineStatus),updateOnlineStatus(),document.addEventListener("keydown",t=>{"Enter"===t.key&&retryConnection()}),setInterval(updateOnlineStatus,3e3)</script>\``;

// ---------------------------------------------------------------------------
// 7. Utility helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a URL string.  Returns null on failure rather than throwing.
 * Only accepts http/https schemes to guard against chrome-extension://, blob:, etc.
 */
function safeURL(urlStr) {
  if (!urlStr || urlStr.startsWith("data:") || urlStr.startsWith("blob:")) {
    return null;
  }
  try {
    const url = new URL(urlStr, self.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    swLogger.warn("Invalid URL encountered", { url: urlStr });
    return null;
  }
}

function isKnownCDNHost(hostname) {
  return EXTERNAL_CDN_HOSTS.has(hostname);
}

function matchesLibraryPattern(urlStr) {
  return EXTERNAL_LIBRARY_PATTERNS.some((rx) => rx.test(urlStr));
}

/**
 * Decides whether a given URL's response should ever enter a cache.
 * Returns false for data:, blob:, non-http(s), excluded dirs, API/auth, etc.
 */
function shouldCache(urlStr) {
  const urlObj = safeURL(urlStr);
  if (!urlObj) return false;

  const { pathname, hostname } = urlObj;

  // Always cache well-known CDN hosts and matched library patterns
  if (isKnownCDNHost(hostname) || matchesLibraryPattern(urlStr)) return true;

  // Block cross-origin URLs that aren't on the CDN allow-list
  if (urlObj.origin !== self.location.origin) return false;

  // Block excluded source/dev directories
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  // Block API and auth endpoints — never cache these
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return false;
  }

  // Root and HTML files are always cacheable
  if (pathname === "/" || pathname.endsWith(".html")) return true;

  // Cache by allowed extension
  const dotIdx = pathname.lastIndexOf(".");
  if (dotIdx !== -1) {
    const ext = pathname.slice(dotIdx).toLowerCase();
    if (CACHEABLE_EXTENSIONS.has(ext)) return true;
  }

  return false;
}

/**
 * Generates a short unique ID for request tracing.
 * Prefers crypto.randomUUID() when available (modern browsers / Node 19+).
 */
function generateRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `req_${crypto.randomUUID().slice(0, 13)}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// 8. Cache trimming
// ---------------------------------------------------------------------------

/**
 * Trims a named cache to its configured item limit by evicting the oldest
 * entries (caches.keys() preserves insertion order).
 */
async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  try {
    const cache = await caches.open(cacheName);
    const keys  = await cache.keys();

    if (keys.length <= limit) return;

    const toDelete = keys.slice(0, keys.length - limit);
    await Promise.all(toDelete.map((key) => cache.delete(key)));

    swLogger.debug("Cache trimmed", {
      cache: cacheName,
      removed: toDelete.length,
      remaining: limit,
    });
  } catch (err) {
    swLogger.error("Cache trim failed", { cache: cacheName, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// 9. Install event
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  swLogger.info("🛠 Service Worker installing", {
    cacheVersion: CACHE_VERSION,
    essentialCount: ESSENTIAL_URLS.length,
  });

  event.waitUntil(
    cacheEssentialResources()
      .then(() => {
        swLogger.info("✅ Installation complete — skipping waiting");
        return self.skipWaiting();
      })
      .catch((err) => {
        // Don't abort installation on a cache failure — SW still activates.
        swLogger.error("⚠️ Installation cache step failed", { error: err.message });
        return self.skipWaiting();
      })
  );
});

async function cacheEssentialResources() {
  swLogger.time("EssentialCaching");
  const cache = await caches.open(STATIC_CACHE);

  const results = await Promise.allSettled(
    ESSENTIAL_URLS.map((url) =>
      cache.add(new Request(url, { credentials: "same-origin" })).catch((err) => {
        // Individual URL failures are logged but don't abort the batch.
        swLogger.warn("Essential URL cache failure", { url, error: err.message });
      })
    )
  );

  const ok   = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  swLogger.info("Essential caching done", { ok, fail, total: results.length });
  swLogger.timeEnd("EssentialCaching");
}

// ---------------------------------------------------------------------------
// 10. Activate event
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  swLogger.info("🚀 Service Worker activating");

  event.waitUntil(
    cleanupOldCaches()
      .then(() => self.clients.claim())
      .then(() => swLogger.info("✅ Service Worker active and controlling all clients"))
      .catch((err) => swLogger.error("❌ Activation error", { error: err.message }))
  );
});

async function cleanupOldCaches() {
  const currentCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, CSS_JS_CACHE]);
  const allKeys = await caches.keys();
  const stale  = allKeys.filter((k) => !currentCaches.has(k));

  await Promise.all(stale.map((k) => caches.delete(k)));

  if (stale.length) {
    swLogger.info("Old caches removed", { removed: stale });
  }
}

// ---------------------------------------------------------------------------
// 11. Fetch event
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const reqLogger = swLogger.withContext({
    requestId: generateRequestId(),
    url: event.request.url,
    mode: event.request.mode,
  });

  event.respondWith(
    handleFetch(event.request, reqLogger).catch((err) => {
      // Last-resort catch: log and return a generic error response so the
      // browser doesn't display an opaque "Failed to fetch" error.
      reqLogger.error("Unhandled fetch error", {
        url: event.request.url,   // ← was "url.request.url" in original (bug fixed)
        error: err.message,
        stack: err.stack,
      });
      return new Response("Service Worker error", { status: 500 });
    })
  );
});

/**
 * Central routing function: picks the right caching strategy for each request.
 *
 * Routing table (in priority order):
 *  1. Navigation / HTML accept header  → htmlDocumentsStrategy (network-first)
 *  2. Not cacheable                    → network pass-through
 *  3. Invalid URL                      → network pass-through
 *  4. Images / fonts / media           → staticAssetsStrategy  (cache-first)
 *  5. CSS or external CDN resource     → cssAndExternalStrategy (cache-first)
 *  6. HTML (caught inside non-navigate)→ htmlDocumentsStrategy
 *  7. Everything else (JS, JSON, …)    → staleWhileRevalidateStrategy
 */
async function handleFetch(request, log = swLogger) {
  // Detect navigation requests — Safari may not set mode="navigate" so we
  // additionally inspect the Accept header.
  const isNavigation =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isNavigation) {
    return htmlDocumentsStrategy(request, log);
  }

  if (!shouldCache(request.url)) {
    return fetch(request);
  }

  const urlObj = safeURL(request.url);
  if (!urlObj) return fetch(request);

  const isExternal = urlObj.origin !== self.location.origin;
  const { pathname } = urlObj;

  if (/\.(jpe?g|png|gif|svg|webp|ico|mp3|webm|ogg|wav|woff2?|ttf|eot)$/i.test(pathname)) {
    return staticAssetsStrategy(request, isExternal, log);
  }

  if (/\.css$/i.test(pathname) || isExternal) {
    return cssAndExternalStrategy(request, isExternal, log);
  }

  if (pathname === "/" || /\.html$/i.test(pathname)) {
    return htmlDocumentsStrategy(request, log);
  }

  return staleWhileRevalidateStrategy(request, isExternal, log);
}

// ---------------------------------------------------------------------------
// 12. Caching strategies
// ---------------------------------------------------------------------------

/**
 * CACHE-FIRST for static assets (images, fonts, media).
 * Falls back to an SVG placeholder when a binary asset is unavailable offline.
 */
async function staticAssetsStrategy(request, isExternal = false, log = swLogger) {

  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;
  const sLog = log.withContext({ strategy: "staticAssets", cache: cacheName });

  sLog.time("StaticAsset");
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      sLog.debug("Cache hit", { url: request.url });
      return cached;
    }

    const response = await fetch(request);
    if (response && (response.ok || (response.type === "opaque" && isExternal))) {
      await cache.put(request, response.clone());
      trimCache(cacheName);   // fire-and-forget
    }


    return response;
  } catch (err) {
    sLog.info("Offline — returning placeholder", { url: request.url });

    const isImage =
      request.destination === "image" ||
      /\.(jpe?g|png|gif|svg|webp)$/i.test(request.url);

    if (isImage) return createImagePlaceholder();

    return new Response("Asset unavailable offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  } finally {
    sLog.timeEnd("StaticAsset");
  }
}

/**
 * CACHE-FIRST for CSS and external (CDN) resources.
 * Returns an empty stylesheet on failure so the page doesn't hard-error.
 */
async function cssAndExternalStrategy(request, isExternal = false, log = swLogger) {
  const cacheName = isExternal ? DYNAMIC_CACHE : CSS_JS_CACHE;
  const sLog = log.withContext({ strategy: "cssAndExternal", cache: cacheName });

  sLog.time("CSSExternal");
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      sLog.debug("Cache hit", { url: request.url });
      return cached;
    }

    const response = await fetch(request);

    if (response && (response.ok || (response.type === "opaque" && isExternal))) {
      await cache.put(request, response.clone());
      trimCache(cacheName);
    }

    return response;
  } catch (err) {
    sLog.warn("Offline — returning empty CSS/JS stub", { url: request.url });

    const isCss = request.url.endsWith(".css") ||
                  request.headers.get("accept")?.includes("text/css");

    // Return a valid empty document so the browser doesn't treat it as an error
    return new Response(isCss ? "/* offline */" : "/* offline */", {
      status: 503,
      headers: {
        "Content-Type": isCss ? "text/css" : "application/javascript",
      },
    });
  } finally {
    sLog.timeEnd("CSSExternal");
  }
}

/**
 * NETWORK-FIRST for HTML documents.
 * Tries the network; on failure checks multiple cache patterns; final fallback
 * is the generated offline page.
 */
async function htmlDocumentsStrategy(request, log = swLogger) {
  const sLog = log.withContext({ strategy: "htmlDocuments" });
  sLog.time("HTMLDoc");

  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);

    // Handle server-side redirects gracefully
    if (networkResponse.redirected) {
      sLog.debug("Following redirect", {
        from: request.url,
        to: networkResponse.url,
      });
      // Cache under the original request key so offline lookups still work
      if (networkResponse.ok) {
        const cacheableResponse = new Response(networkResponse.body, {
          status: networkResponse.status,
          statusText: networkResponse.statusText,
          headers: networkResponse.headers,
        });
        await cache.put(request, cacheableResponse);
        trimCache(DYNAMIC_CACHE);
      }
      return networkResponse;
    }

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      trimCache(DYNAMIC_CACHE);
    }

    return networkResponse;
  } catch {
    sLog.debug("Network failed — searching caches", { url: request.url });

    // Try progressively looser cache keys
    const candidates = [
      request,
      !request.url.endsWith(".html") ? request.url + ".html"  : null,
       request.url.endsWith(".html") ? request.url.replace(/\.html$/, "") : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const cached = await caches.match(candidate);
      if (cached) {
        sLog.info("Serving from cache", { key: typeof candidate === "string" ? candidate : candidate.url });
        return cached;
      }
    }

    sLog.warn("Nothing in cache — serving offline page", { url: request.url });
    return createOfflinePage();
  } finally {
    sLog.timeEnd("HTMLDoc");
  }
}

/**
 * STALE-WHILE-REVALIDATE for JS, JSON, and other cacheable files.
 * Returns cached version immediately (if available) and refreshes in background.
 */
async function staleWhileRevalidateStrategy(request, isExternal = false, log = swLogger) {
  const cacheName = isExternal ? DYNAMIC_CACHE : CSS_JS_CACHE;
  const sLog = log.withContext({ strategy: "SWR", cache: cacheName });

  sLog.time("SWR");
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Kick off background refresh regardless of cache state
    const networkUpdate = fetch(request)
      .then(async (response) => {
        if (response && (response.ok || (response.type === "opaque" && isExternal))) {
          await cache.put(request, response.clone());
          await trimCache(cacheName);
        }
      })
      .catch((err) => {
        sLog.debug("Background SWR update failed", { url: request.url, error: err.message });
      });

    if (cached) {
      sLog.debug("Serving stale, revalidating in background", { url: request.url });
      // Let the background update complete even if client navigates away
      // (waitUntil is not available here outside event scope; the detached
      // promise is the correct pattern for SWR background updates)
      networkUpdate.catch(() => {});
      return cached;
    }

    // No cache entry — wait for network
    sLog.debug("Cache miss — awaiting network", { url: request.url });
    return await fetch(request).then(async (response) => {
      if (response && (response.ok || (response.type === "opaque" && isExternal))) {
        await cache.put(request, response.clone());
        trimCache(cacheName);
      }
      return response;
    });
  } catch {
    sLog.warn("Offline — no SWR fallback", { url: request.url });
    return createOfflinePage();
  } finally {
    sLog.timeEnd("SWR");
  }
}

// ---------------------------------------------------------------------------
// 13. Response factories
// ---------------------------------------------------------------------------

function createImagePlaceholder() {
  return new Response(IMAGE_PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

function createOfflinePage() {
  // OFFLINE_HTML is either from offline-template.js or our built-in fallback
  const html = typeof OFFLINE_HTML !== "undefined" ? OFFLINE_HTML : self.OFFLINE_HTML;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Offline-Page": "true",
    },
  });
}

// ---------------------------------------------------------------------------
// 14. Message handler
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  const { data } = event;
  if (!data) return;

  if (data.type === "SKIP_WAITING") {
    swLogger.info("Skipping waiting phase by client request");
    self.skipWaiting();
  }

  if (data.type === "SET_GRADUATION_LOG_LEVEL") {
    self.clients.matchAll().then((clients) =>
      clients.forEach((client) =>
        client.postMessage({
          type: "GRADUATION_LOG_LEVEL",
          level: data.level,
          persist: !!data.persist,
        })
      )
    );
  }
});

// ---------------------------------------------------------------------------
// 15. Background sync
// ---------------------------------------------------------------------------

self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    swLogger.info("Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    swLogger.info("Background sync completed");
    return true;
  } catch (err) {
    swLogger.error("Background sync failed", { error: err.message });
    return false;
  }
}

// ---------------------------------------------------------------------------
// 16. Global error handlers
// ---------------------------------------------------------------------------

self.addEventListener("error", (event) => {
  swLogger.error("SW runtime error", {
    message: event.error?.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

self.addEventListener("unhandledrejection", (event) => {
  swLogger.error("SW unhandled promise rejection", {
    reason: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
  });
});

// ---------------------------------------------------------------------------
// 17. Periodic health check
// ---------------------------------------------------------------------------

async function performHealthCheck() {
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, CSS_JS_CACHE];
  const stats = {};

  try {
    await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys  = await cache.keys();
        stats[name] = { size: keys.length, limit: CACHE_LIMITS[name] };
      })
    );
    swLogger.info("Health check", { caches: stats, timestamp: new Date().toISOString() });
  } catch (err) {
    swLogger.error("Health check failed", { error: err.message });
  }
}

// Run every 5 minutes; only when logging is enabled to avoid idle overhead
setInterval(() => {
  if (self.shouldLog) performHealthCheck();
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// 18. Startup log
// ---------------------------------------------------------------------------

swLogger.info("🎯 Service Worker script evaluated", {
  version: CACHE_VERSION,
  caches: { STATIC_CACHE, DYNAMIC_CACHE, CSS_JS_CACHE },
  limits: CACHE_LIMITS,
  essentialUrls: ESSENTIAL_URLS.length,
  timestamp: new Date().toISOString(),
});

const IMAGE_PLACEHOLDER_SVG =`<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="224.532 123.986 285.177 239.029" width="285.177px" height="239.029px">
  <defs>
    <pattern id="gridSquare" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="matrix(0.14853, 0, 0, 0.227214, 224.531715, 123.987251)">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#788291" stroke-width="1" stroke-opacity="0.12"/>
    </pattern>
    <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0b1320" flood-opacity="0.25"/>
    </filter>
    <filter id="drop-shadow-filter-2" color-interpolation-filters="sRGB" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="10" dy="10"/>
      <feComponentTransfer result="offsetblur">
        <feFuncA id="spread-ctrl-2" type="linear" slope="1"/>
      </feComponentTransfer>
      <feFlood flood-color="rgba(0,0,0,0.3)"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0" stop-color="#475569"/>
      <stop offset="0.5" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="metalChrome" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="0.25" stop-color="#cbd5e1"/>
      <stop offset="0.5" stop-color="#94a3b8"/>
      <stop offset="0.75" stop-color="#cbd5e1"/>
      <stop offset="1" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="bodyBrushed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0" stop-color="#d8dce2"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#d8dce2" stop-opacity="0.8"/>
    </linearGradient>
    <radialGradient id="amberFlash" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fef08a"/>
      <stop offset="0.6" stop-color="#f59e0b" stop-opacity="0.8"/>
      <stop offset="1" stop-color="#78350f" stop-opacity="0.4"/>
    </radialGradient>
    <filter id="lensGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="drop-shadow-filter-0" color-interpolation-filters="sRGB" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="10" dy="10"/>
      <feComponentTransfer result="offsetblur">
        <feFuncA id="spread-ctrl-0" type="linear" slope="2"/>
      </feComponentTransfer>
      <feFlood flood-color="rgba(0,0,0,0.3)"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="opticReflect1" cx="30%" cy="30%" r="70%">
      <stop offset="0" stop-color="#fef08a" stop-opacity="0.7"/>
      <stop offset="0.4" stop-color="#f59e0b" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#78350f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="opticReflect2" cx="70%" cy="70%" r="60%">
      <stop offset="0" stop-color="#f87171" stop-opacity="0.6"/>
      <stop offset="0.5" stop-color="#dc2626" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#7f1d1d" stop-opacity="0"/>
    </radialGradient>
    <filter id="laserGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComponentTransfer in="blur" result="glow">
        <feFuncA type="linear" slope="2"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="scannerBeam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" stop-color="#121418" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#121418" stop-opacity="0.8"/>
      <stop offset="1" stop-color="#121418" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glassShield" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.0"/>
    </linearGradient>
    <filter id="drop-shadow-filter-1" color-interpolation-filters="sRGB" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="10" dy="10"/>
      <feComponentTransfer result="offsetblur">
        <feFuncA id="spread-ctrl-1" type="linear" slope="0.98"/>
      </feComponentTransfer>
      <feFlood flood-color="rgba(0,0,0,0.3)"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="285.177" height="239.029" fill="url(#gridSquare)" style="" x="224.532" y="123.986"/>
  <g transform="matrix(1, 0, 0, 1, 124.7716293334961, 80.01747131347656)">
    <g>
      <g transform="matrix(0.500293, 0, 0, 0.507292, -0.075691, 26.177963)" style="filter: url(&quot;#softShadow&quot;) url(&quot;#drop-shadow-filter-2&quot;);">
        <rect x="360" y="103" width="42" height="15" rx="3" fill="url(#dialGrad)" stroke="#1e293b" stroke-width="1.5"/>
        <line x1="362" y1="104" x2="362" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="366.5" y1="104" x2="366.5" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="371" y1="104" x2="371" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="375.5" y1="104" x2="375.5" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="380" y1="104" x2="380" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="384.5" y1="104" x2="384.5" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="389" y1="104" x2="389" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="393.5" y1="104" x2="393.5" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="398" y1="104" x2="398" y2="117" stroke="#0f172a" stroke-width="1.5"/>
        <rect x="558" y="97" width="34" height="22" rx="2" fill="url(#metalChrome)" stroke="#334155" stroke-width="1"/>
        <path d="M 555 99 L 595 99 L 591 92 L 559 92 Z" fill="url(#dialGrad)"/>
        <path d="M 455 115 L 505 115 L 498 99 L 462 99 Z" fill="url(#metalChrome)" stroke="#1e293b" stroke-width="1.5"/>
        <rect x="468" y="102" width="24" height="4" fill="#334155"/>
        <rect x="310" y="115" width="340" height="230" rx="24" fill="#1c1e22" stroke="#101726" stroke-width="5"/>
        <path d="M 312 139 L 648 139 L 648 185 Q 648 117 624 117 L 336 117 Q 312 117 312 185 Z" fill="url(#bodyBrushed)" stroke="#788291" stroke-width="1.5" stroke-opacity="0.8"/>
        <rect x="313" y="200" width="334" height="142" rx="12" fill="#000000" fill-opacity="0.14"/>
        <g opacity="0.15">
          <line x1="325" y1="205" x2="325" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="332.5" y1="205" x2="332.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="340" y1="205" x2="340" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="347.5" y1="205" x2="347.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="355" y1="205" x2="355" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="362.5" y1="205" x2="362.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="370" y1="205" x2="370" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="377.5" y1="205" x2="377.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="385" y1="205" x2="385" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="392.5" y1="205" x2="392.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="400" y1="205" x2="400" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="407.5" y1="205" x2="407.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="415" y1="205" x2="415" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="422.5" y1="205" x2="422.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="430" y1="205" x2="430" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="437.5" y1="205" x2="437.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="445" y1="205" x2="445" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="452.5" y1="205" x2="452.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="460" y1="205" x2="460" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="467.5" y1="205" x2="467.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="475" y1="205" x2="475" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="482.5" y1="205" x2="482.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="490" y1="205" x2="490" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="497.5" y1="205" x2="497.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="505" y1="205" x2="505" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="512.5" y1="205" x2="512.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="520" y1="205" x2="520" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="527.5" y1="205" x2="527.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="535" y1="205" x2="535" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="542.5" y1="205" x2="542.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="550" y1="205" x2="550" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="557.5" y1="205" x2="557.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="565" y1="205" x2="565" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="572.5" y1="205" x2="572.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="580" y1="205" x2="580" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="587.5" y1="205" x2="587.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="595" y1="205" x2="595" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="602.5" y1="205" x2="602.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="610" y1="205" x2="610" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="617.5" y1="205" x2="617.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="625" y1="205" x2="625" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
          <line x1="632.5" y1="205" x2="632.5" y2="337" stroke="#ffffff" stroke-dasharray="1,4" stroke-width="1.5"/>
        </g>
        <rect x="332.313" y="342.857" width="296.775" height="5.059" fill="url(#bodyBrushed)" stroke="#788291" stroke-width="1" style=""/>
        <g transform="translate(348, 145)">
          <rect x="0" y="0" width="70" height="32" rx="6" fill="#111827" stroke="#788291" stroke-width="1.5"/>
          <rect x="3" y="3" width="64" height="26" rx="3" fill="url(#amberFlash)"/>
          <path d="M 8 3 L 8 29 M 18 3 L 18 29 M 28 3 L 28 29 M 38 3 L 38 29 M 48 3 L 48 29 M 58 3 L 58 29" stroke="#ffffff" stroke-width="1" stroke-opacity="0.4"/>
          <path d="M 3 10 L 67 10 M 3 20 L 67 20" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.3"/>
          <circle cx="35" cy="16" r="6" fill="#fef08a" filter="url(#lensGlow)">
            <animate attributeName="opacity" values="1; 1" begin="128.3s" dur="2s" fill="freeze"/>
          </circle>
        </g>
        <circle cx="595" cy="155" r="15" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/>
        <text x="595" y="160" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5" style="white-space: pre;">SJCC</text>
        <g transform="translate(334, 131)">
          <circle cx="0" cy="0" r="4.5" fill="#1e293b" stroke="#64748b" stroke-width="0.8"/>
          <line x1="-3" y1="-1" x2="3" y2="1" stroke="#475569" stroke-width="1"/>
        </g>
        <g transform="translate(626, 131)">
          <circle cx="0" cy="0" r="4.5" fill="#1e293b" stroke="#64748b" stroke-width="0.8"/>
          <line x1="-2" y1="2.5" x2="2" y2="-2.5" stroke="#475569" stroke-width="1"/>
        </g>
        <g transform="translate(332, 321)">
          <circle cx="0" cy="0" r="4.5" fill="#0f172a" stroke="#475569" stroke-width="0.8"/>
          <line x1="-3" y1="0" x2="3" y2="0" stroke="#1e293b" stroke-width="1.2"/>
        </g>
        <g transform="translate(628, 321)">
          <circle cx="0" cy="0" r="4.5" fill="#0f172a" stroke="#475569" stroke-width="0.8"/>
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#1e293b" stroke-width="1.2"/>
        </g>
        <g transform="matrix(1.014263, 0, 0, 1.015651, 488.336304, 268.418884)" style="">
          <circle cx="0" cy="0" r="110" fill="#000000" fill-opacity="0.38"/>
          <circle cx="0" cy="0" r="102" fill="url(#metalChrome)" stroke="#788291" stroke-width="1.5" style="filter: url(&quot;#drop-shadow-filter-0&quot;);"/>
          <g opacity="0.6">
            <line x1="94" y1="0" x2="101" y2="0" stroke="#0f172a" stroke-width="2"/>
            <line x1="81.40638795573724" y1="46.99999999999999" x2="87.46856578222831" y2="50.49999999999999" stroke="#0f172a" stroke-width="2"/>
            <line x1="47.00000000000001" y1="81.40638795573723" x2="50.500000000000014" y2="87.4685657822283" stroke="#0f172a" stroke-width="2"/>
            <line x1="5.75583995599256e-15" y1="94" x2="6.184466335694134e-15" y2="101" stroke="#0f172a" stroke-width="2"/>
            <line x1="-46.99999999999998" y1="81.40638795573724" x2="-50.49999999999998" y2="87.46856578222831" stroke="#0f172a" stroke-width="2"/>
            <line x1="-81.40638795573724" y1="46.99999999999999" x2="-87.46856578222831" y2="50.49999999999999" stroke="#0f172a" stroke-width="2"/>
            <line x1="-94" y1="1.151167991198512e-14" x2="-101" y2="1.2368932671388267e-14" stroke="#0f172a" stroke-width="2"/>
            <line x1="-81.40638795573723" y1="-47.00000000000001" x2="-87.4685657822283" y2="-50.500000000000014" stroke="#0f172a" stroke-width="2"/>
            <line x1="-47.00000000000004" y1="-81.4063879557372" x2="-50.50000000000004" y2="-87.46856578222828" stroke="#0f172a" stroke-width="2"/>
            <line x1="-1.7267519867977678e-14" y1="-94" x2="-1.85533990070824e-14" y2="-101" stroke="#0f172a" stroke-width="2"/>
            <line x1="47.00000000000001" y1="-81.40638795573723" x2="50.500000000000014" y2="-87.4685657822283" stroke="#0f172a" stroke-width="2"/>
            <line x1="81.4063879557372" y1="-47.00000000000004" x2="87.46856578222828" y2="-50.50000000000004" stroke="#0f172a" stroke-width="2"/>
          </g>
          <circle cx="0" cy="0" r="88" fill="#111827" stroke="#374151" stroke-width="1.5"/>
          <circle cx="0" cy="0" r="82" fill="#1f2937"/>
          <g opacity="0.35">
            <circle cx="85" cy="0" r="1.5" fill="#ffffff"/>
            <circle cx="83.70865900603768" cy="14.760095101689078" r="1.5" fill="#ffffff"/>
            <circle cx="79.87387276680222" cy="29.07171218268184" r="1.5" fill="#ffffff"/>
            <circle cx="73.6121593216773" cy="42.49999999999999" r="1.5" fill="#ffffff"/>
            <circle cx="65.11377766511313" cy="54.636946823355835" r="1.5" fill="#ffffff"/>
            <circle cx="54.63694682335585" cy="65.11377766511313" r="1.5" fill="#ffffff"/>
            <circle cx="42.50000000000001" cy="73.61215932167728" r="1.5" fill="#ffffff"/>
            <circle cx="29.07171218268185" cy="79.87387276680221" r="1.5" fill="#ffffff"/>
            <circle cx="14.760095101689085" cy="83.70865900603768" r="1.5" fill="#ffffff"/>
            <circle cx="5.204748896376251e-15" cy="85" r="1.5" fill="#ffffff"/>
            <circle cx="-14.760095101689076" cy="83.70865900603768" r="1.5" fill="#ffffff"/>
            <circle cx="-29.07171218268184" cy="79.87387276680222" r="1.5" fill="#ffffff"/>
            <circle cx="-42.49999999999998" cy="73.6121593216773" r="1.5" fill="#ffffff"/>
            <circle cx="-54.63694682335585" cy="65.11377766511313" r="1.5" fill="#ffffff"/>
            <circle cx="-65.11377766511312" cy="54.636946823355856" r="1.5" fill="#ffffff"/>
            <circle cx="-73.6121593216773" cy="42.49999999999999" r="1.5" fill="#ffffff"/>
            <circle cx="-79.87387276680221" cy="29.071712182681853" r="1.5" fill="#ffffff"/>
            <circle cx="-83.70865900603768" cy="14.760095101689073" r="1.5" fill="#ffffff"/>
            <circle cx="-85" cy="1.0409497792752502e-14" r="1.5" fill="#ffffff"/>
            <circle cx="-83.70865900603768" cy="-14.76009510168909" r="1.5" fill="#ffffff"/>
            <circle cx="-79.87387276680222" cy="-29.071712182681836" r="1.5" fill="#ffffff"/>
            <circle cx="-73.61215932167728" cy="-42.50000000000001" r="1.5" fill="#ffffff"/>
            <circle cx="-65.11377766511313" cy="-54.636946823355835" r="1.5" fill="#ffffff"/>
            <circle cx="-54.636946823355856" cy="-65.11377766511312" r="1.5" fill="#ffffff"/>
            <circle cx="-42.500000000000036" cy="-73.61215932167727" r="1.5" fill="#ffffff"/>
            <circle cx="-29.071712182681896" cy="-79.8738727668022" r="1.5" fill="#ffffff"/>
            <circle cx="-14.760095101689078" cy="-83.70865900603768" r="1.5" fill="#ffffff"/>
            <circle cx="-1.5614246689128753e-14" cy="-85" r="1.5" fill="#ffffff"/>
            <circle cx="14.760095101689048" cy="-83.70865900603769" r="1.5" fill="#ffffff"/>
            <circle cx="29.071712182681793" cy="-79.87387276680222" r="1.5" fill="#ffffff"/>
            <circle cx="42.50000000000001" cy="-73.61215932167728" r="1.5" fill="#ffffff"/>
            <circle cx="54.636946823355835" cy="-65.11377766511315" r="1.5" fill="#ffffff"/>
            <circle cx="65.11377766511312" cy="-54.63694682335586" r="1.5" fill="#ffffff"/>
            <circle cx="73.61215932167727" cy="-42.500000000000036" r="1.5" fill="#ffffff"/>
            <circle cx="79.87387276680222" cy="-29.071712182681832" r="1.5" fill="#ffffff"/>
            <circle cx="83.70865900603768" cy="-14.760095101689158" r="1.5" fill="#ffffff"/>
          </g>
          <circle cx="0" cy="0" r="72" fill="url(#metalChrome)" stroke="#111827" stroke-width="1"/>
          <path id="lensLabelPath" d="M -54 -24 A 59 59 0 0 1 54 -24" fill="none" stroke="none"/>
          <text font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="6.8" font-weight="700" fill="#f8fafc" letter-spacing="1" style="white-space: pre;">
        <textPath href="#lensLabelPath" startOffset="50%" text-anchor="middle">
          VECTOR STUDIO CO.  f=50mm  1:1.2  N° 402685
        </textPath>
      </text>
          <circle cx="0" cy="0" r="58" fill="#090d16" stroke="#1e293b" stroke-width="3"/>
          <circle cx="0" cy="0" r="54" fill="#121418"/>
          <circle cx="-12" cy="-12" r="42" fill="url(#opticReflect1)"/>
          <circle cx="14" cy="14" r="34" fill="url(#opticReflect2)"/>
          <ellipse cx="-20" cy="-22" rx="14" ry="7" transform="rotate(-40, -20, -22)" fill="#ffffff" fill-opacity="0.6000000000000001"/>
          <ellipse cx="-15" cy="-18" rx="6" ry="3" transform="rotate(-40, -15, -18)" fill="#ffffff" fill-opacity="0.7200000000000001"/>
          <ellipse cx="24" cy="24" rx="20" ry="4" transform="rotate(45, 24, 24)" fill="#ffffff" fill-opacity="0.12"/>
          <circle cx="32" cy="-12" r="2.5" fill="#ffffff" fill-opacity="0.48"/>
          <g filter="url(#laserGlow)">
            <circle cx="0" cy="0" r="44" fill="none" stroke="#121418" stroke-width="1" stroke-dasharray="14,10" opacity="0.85"/>
            <line x1="-48" y1="0" x2="-38" y2="0" stroke="#121418" stroke-width="1.5"/>
            <line x1="38" y1="0" x2="48" y2="0" stroke="#121418" stroke-width="1.5"/>
            <line x1="0" y1="-48" x2="0" y2="-38" stroke="#121418" stroke-width="1.5"/>
            <line x1="0" y1="38" x2="0" y2="48" stroke="#121418" stroke-width="1.5"/>
            <rect x="-44" y="-2" width="88" height="4" fill="url(#scannerBeam)" opacity="0.9">
              <animate attributeName="y" values="-35;35;-35" dur="3.5s" repeatCount="indefinite"/>
            </rect>
            <circle cx="0" cy="0" r="3" fill="#121418" opacity="0.9"/>
          </g>
        </g>
      </g>
      <g transform="matrix(0.500293, 0, 0, 0.507292, 243.895111, 239.212067)" filter="url(#softShadow)" style="">
        <rect x="-180" y="-38" width="360" height="76" rx="18" fill="#131924" fill-opacity="0.84" stroke="#788291" stroke-width="1.5"/>
        <rect x="-179" y="-37" width="358" height="32" rx="15" fill="url(#glassShield)"/>
        <g transform="translate(-142, 0)">
          <circle cx="0" cy="0" r="11" fill="#dc2626" fill-opacity="0.25">
            <animate attributeName="r" values="7;15;7" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="6" fill="#dc2626" filter="url(#lensGlow)">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </g>
        <text x="-120" y="-6" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="15" font-weight="800" fill="#f8fafc" letter-spacing="1.5" text-anchor="start" style="white-space: pre;">
      SYSTEM OFFLINE
    </text>
        <text x="-154.19" y="11.437" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="600" fill="#70839e" letter-spacing="0.8" text-anchor="start" style="white-space: pre; font-size: 9px;" transform="matrix(1, 0, 0, 1.101696, 0, -1.46124)">
      SYSTEM PROTOCOL STATUS // ERROR 0x503
    </text>
        <text x="-188.69" y="27.796" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="8.5" font-weight="500" fill="#94a3b8" text-anchor="start" opacity="0.85" style="white-space: pre; font-size: 8.5px;" transform="matrix(0.884436, 0, 0, 1.293624, 33.929802, -17.922548)"><tspan x="-188.69000244140625" dy="1em">​</tspan>      The requested image is currently unavailable. Check your local connection </text>
        <g transform="matrix(1, 0, 0, 1, 81.823593, -11.819873)" opacity="0.6">
          <rect x="-8" y="-2" width="16" height="12" rx="2" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
          <path d="M -5 -2 L -5 -6 A 5 5 0 0 1 5 -6 L 5 -2" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
          <circle cx="0" cy="3" r="1.5" fill="#94a3b8"/>
        </g>
        <text style="white-space: pre; fill: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 28px;" x="34.199" y="3.028"> </text>
      </g>
    </g>
    <g opacity="0.65" transform="matrix(0.500293, 0, 0, 0.507292, 2.052746, 11.312571)" style="">
      <path d="M 264.803 317 L 384.53 317 L 402.489 287 L 420.449 337 L 438.407 257 L 456.366 327 L 468.339 297 M 492.284 297 L 510.244 327 L 528.203 277 L 546.161 342 L 564.12 292 L 582.08 322 C 582.08 322 619.993 322 695.82 322" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="">
        <animate attributeName="stroke-dasharray" values="8,8; 4,16; 8,8" dur="3s" repeatCount="indefinite"/>
      </path>
      <g transform="translate(480, 295)">
        <circle cx="0" cy="0" r="18" fill="#11151d" stroke="#dc2626" stroke-width="2"/>
        <path d="M -8 -8 L 8 8 M 8 -8 L -8 8" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
      </g>
    </g>
    <g class="search-lens" transform="matrix(0.500293, 0, 0, 0.507292, 206.409973, 17.61874)" style="filter: url(&quot;#drop-shadow-filter-1&quot;);">
      <g transform="matrix(1, 0, 0, 1, 218.234894, 136.255371)">
        <g>
          <path d="M 25.789 29.684 L 61.789 65.684" stroke="#1e293b" stroke-width="7" stroke-linecap="round"/>
          <path d="M 25.789 29.684 L 61.789 65.684" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round"/>
          <rect x="24" y="24" width="22" height="6" fill="#111827" transform="matrix(0.707107, 0.707107, -0.707107, 0.707107, 24, -9.941126)" rx="1"/>
          <line x1="28" y1="23" x2="31" y2="28" stroke="#fef08a" stroke-width="1"/>
          <line x1="32" y1="27" x2="35" y2="32" stroke="#fef08a" stroke-width="1"/>
        </g>
        <g>
          <circle cx="0" cy="0" r="36" fill="#1e293b" fill-opacity="0.1" stroke="url(#metalChrome)" stroke-width="4.5" filter="url(#softShadow)"/>
          <circle cx="0" cy="0" r="33.7" fill="none" stroke="#f59e0b" stroke-width="1.2"/>
          <path d="M -22 -14 A 26 26 0 0 1 -4 -25" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>
          <circle cx="16" cy="18" r="1.5" fill="#ffffff" opacity="0.4"/>
          <circle cx="0" cy="0" r="4.5" fill="none" stroke="#dc2626" stroke-width="1.2"/>
          <line x1="-9" y1="0" x2="-4.5" y2="0" stroke="#dc2626" stroke-width="1.2"/>
          <line x1="4.5" y1="0" x2="9" y2="0" stroke="#dc2626" stroke-width="1.2"/>
          <line x1="0" y1="-9" x2="0" y2="-4.5" stroke="#dc2626" stroke-width="1.2"/>
          <line x1="0" y1="4.5" x2="0" y2="9" stroke="#dc2626" stroke-width="1.2"/>
        </g>
      </g>
      <animateMotion path="M -88.509 92.062 C -217.46 173.204 -141.296 -79.868 -94.596 -0.181 C -51.676 73.056 -58.453 24.934 -44.333 14.388 C 51.935 -57.514 -2.062 174.55 -81.148 90.548" calcMode="linear" dur="12s" repeatCount="indefinite"/>
    </g>
  </g>
</svg>`;