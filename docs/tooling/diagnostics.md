# Developer Diagnostics & System Inspector

## 1. Overview & Purpose

`SystemDiagnostics` (`src/core/diagnostics/SystemDiagnostics.ts`) is an in-browser runtime inspection utility designed for rapid troubleshooting during development, field QA, and production support.

It queries browser capabilities, active viewport dimensions, Service Worker registration, CacheStorage state, and persistence flags, formatting them into an accessible diagnostic summary.

---

## 2. Using the Inspector in DevTools

To inspect the application state, open Developer Tools on any SJCCC page and execute:

```javascript
window.sjcccDiagnostics();
```

### Sample Output:

```text
[SJCCC] System Diagnostics Report
  Environment:    production (Dev: false)
  Viewport:       1440x900 @ 2x (landscape)
  Theming:        Active: dark | System: dark | Reduced-Motion: false
  Network:        Online: true (4g)
  ServiceWorker:  Supported: true | Controller: true | State: active
  Caches:         sjccc-precache-v2.0.0, sjccc-images-v2.0.0
  Prospectus:     Zoom: 0.94
```

---

## 3. Programmatic API

```typescript
import { systemDiagnostics } from './core/diagnostics/index.ts';

// Obtain structured JSON diagnostic object
const report = await systemDiagnostics.collect();
console.log(report.viewport.dpr);
console.log(report.serviceWorker.cacheNames);

// Print formatted console card
await systemDiagnostics.printReport();
```

---

## 4. Inspected Parameters

| Category | Parameters Monitored |
| :--- | :--- |
| **Environment** | Bundler mode (`import.meta.env.MODE`), user-agent, client language, OS platform. |
| **Viewport** | Window inner width/height, device pixel ratio, screen orientation. |
| **Preferences** | `prefers-reduced-motion`, `prefers-color-scheme`, active theme class, stored localStorage theme. |
| **Connectivity** | `navigator.onLine`, connection effective type (e.g. 4g, 3g), estimated downlink bandwidth. |
| **Storage & PWA** | `localStorage` accessibility, PWA banner dismissal flags, announcement state. |
| **Service Worker** | Registration status, controller activity, registration scope, active CacheStorage keys. |
| **Document State** | Page pathname, document title, and current `--prospectus-zoom` density factor on `/prospectus.html`. |
