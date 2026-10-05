# Shared Infrastructure Architecture

## 1. Overview

The SJCCC codebase maintains a clean distinction between page-agnostic shared infrastructure and page-specific controllers. Shared infrastructure modules reside in `src/core/`, `src/ui/`, and `src/features/offline/`.

```mermaid
%% Shared Infrastructure Consumer Map
flowchart TD
    subgraph SharedModules["Shared Infrastructure Modules"]
        TM["ThemeManager"]
        MN["MobileNavigation"]
        OI["OfflineIndicator"]
        SW["serviceWorker.ts"]
        CD["ConfirmDialog"]
        LGA["LiquidGlassAdapter<br/>└── @kennejunior/liquidglass"]
    end

    Home["Homepage (HomeApp)"] --> TM
    Home --> MN
    Home --> OI
    Home --> SW
    Home -.-> CD
    Home --> LGA

    Prospectus["Prospectus (ProspectusApp)"] --> TM
    Prospectus --> MN
    Prospectus --> OI
    Prospectus --> SW
    Prospectus --> LGA
```

*Mermaid source: [docs/diagrams/shared-infrastructure.mmd](../diagrams/shared-infrastructure.mmd)*

---

## 2. Shared Modules Specification

### ThemeManager

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/core/theme/ThemeManager.ts` |
| **Primary Responsibility** | Manages application theme (Light vs Dark mode), persistent `localStorage` synchronization, system `prefers-color-scheme` listeners, and synchronized ARIA states across all theme toggle buttons. |
| **Page Agnostic?** | **Yes.** Configurable for both pages. |
| **Public API** | • `constructor(options?: ThemeManagerOptions \| string)`<br>• `getCurrentTheme(): ThemeMode`<br>• `setTheme(theme: ThemeMode): void`<br>• `toggleTheme(): void`<br>• `destroy(): void` |
| **Consumers** | • Homepage (`HomeApp` via `new ThemeManager(HOME_SELECTORS.themeToggle)`)<br>• Prospectus (`ProspectusApp` via `new ThemeManager({ toggleId: PROSPECTUS_SELECTORS.darkModeToggle, mode: 'fade' })`) |
| **Dependencies** | `src/core/theme/themeTypes.ts`, `src/core/storage/storageKeys.ts` (`STORAGE_KEYS.THEME_PREFERENCE`) |
| **Lifecycle & State** | 1. Checks `localStorage.getItem('sjccc_theme')`.<br>2. Falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.<br>3. Adds/removes `dark-mode` CSS class on `document.documentElement` and `document.body`.<br>4. Updates `aria-checked` on toggle buttons. |
| **Events / Observers** | Listens to `click` on toggle buttons, `keydown` (`Enter`/`Space`), and `change` on `prefers-color-scheme` media query list. |

#### Operational Modes:
- **`animated` (Default, Homepage)**: Injects an overlay element with dynamic SVG clip-paths transitioning radially across the screen.
- **`fade` (Prospectus)**: Injects a lightweight overlay element (`.theme-transition-overlay`) with a subtle 300ms gold glow opacity fade, ideal for high-density document reading.

---

### MobileNavigation

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/ui/navigation/MobileNavigation.ts` |
| **Primary Responsibility** | Manages responsive mobile navigation drawer, hamburger button state, backdrop dismissal, `Escape` key trapping, and link-click auto-close. |
| **Page Agnostic?** | **Yes.** Parameterized via selector IDs. |
| **Public API** | • `constructor(menuToggleId: string, navMenuId: string, headerId: string, linkSelector?: string)`<br>• `toggle(): void`<br>• `open(): void`<br>• `close(): void`<br>• `isOpen(): boolean`<br>• `destroy(): void` |
| **Consumers** | • Homepage (`HomeApp`)<br>• Prospectus (`ProspectusApp`) |
| **Dependencies** | Native DOM APIs only. No external library dependencies. |
| **Lifecycle & State** | Toggles `active` class on navigation menu, updates `aria-expanded` on menu toggle button, sets `aria-hidden` on drawer. |
| **Events / Observers** | • `click` on hamburger button.<br>• `click` outside menu container (backdrop click).<br>• `keydown` event on `window` listening for `Escape`.<br>• `click` on child navigation links (automatically closes drawer after anchor selection). |

---

### OfflineIndicator

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/features/offline/OfflineIndicator.ts` |
| **Primary Responsibility** | Real-time monitoring of browser connectivity and Service Worker cache readiness. Displays a non-intrusive floating status badge with accessible announcements. |
| **Page Agnostic?** | **Yes.** Self-mounting DOM element. |
| **Public API** | • `constructor(options?: OfflineIndicatorOptions)`<br>• `showOfflineBadge(): void`<br>• `showOnlineBadge(): void`<br>• `hide(): void`<br>• `destroy(): void` |
| **Consumers** | • Homepage (`HomeApp`)<br>• Prospectus (`ProspectusApp`) |
| **Dependencies** | `src/css/components/offline-indicator.css` |
| **Lifecycle & State** | 1. Injects `#offlineIndicator` container into `document.body` if not present.<br>2. Verifies `navigator.onLine`.<br>3. Inspects Service Worker registration to verify if the active page is cached.<br>4. Displays "Working Offline — Viewing Cached Handbook/Site". |
| **Events / Observers** | • `window.addEventListener('online')`<br>• `window.addEventListener('offline')` |

---

### Service Worker Bootstrap Service

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/services/serviceWorker.ts` |
| **Primary Responsibility** | Bootstraps Service Worker registration, coordinates update detection, and provides reload messaging. |
| **Page Agnostic?** | **Yes.** |
| **Public API** | • `initServiceWorker(): Promise<ServiceWorkerRegistration \| undefined>`<br>• `checkForUpdates(): Promise<void>` |
| **Consumers** | `src/main.ts`, `src/prospectus.ts` |
| **Dependencies** | `src/sw-register.ts` |

---

### ConfirmDialog

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/ui/dialog/ConfirmDialog.ts` |
| **Primary Responsibility** | Reusable glassmorphic accessible confirmation dialog with focus trap and spring animation physics. |
| **Page Agnostic?** | **Yes.** |
| **Public API** | • `ConfirmDialog.show(options: ConfirmDialogOptions): Promise<boolean>` |
| **Consumers** | `src/features/pwa/PwaInstallPrompt.ts` (Homepage) |
| **Dependencies** | `src/css/components/dialog.css`, `src/core/physics/spring.ts` |

---

### LiquidGlassAdapter & External UI Library

```text
External UI Library
└── @kennejunior/liquidglass
```

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/ui/effects/LiquidGlassAdapter.ts` |
| **External Dependency** | [`@kennejunior/liquidglass`](https://github.com/KenneJunior/liquidglass) (Published npm package) |
| **Primary Responsibility** | Architectural adapter coordinating the external `@kennejunior/liquidglass` package across SJCCC pages. Manages performance budgets, accessibility/reduced-motion decisions, device tier detection, and graceful fallback to native CSS. |
| **Page Agnostic?** | **Yes.** Configurable for both Homepage and Prospectus. |
| **Public API** | • `constructor()`<br>• `enhanceSurface(selector: string, config?: LiquidGlassAdapterConfig): void`<br>• `initHomepageSurfaces(): void`<br>• `initProspectusSurfaces(): void`<br>• `destroy(): void`<br>• `static prefersReducedMotion(): boolean`<br>• `static isMobileOrConstrained(): boolean` |
| **Consumers** | • Homepage (`HomeApp` via `new LiquidGlassAdapter().initHomepageSurfaces()`)<br>• Prospectus (`ProspectusApp` via `new LiquidGlassAdapter().initProspectusSurfaces()`) |
| **Targeted Surfaces** | • Homepage: `#enquiryFab` (Floating enquiry FAB), `#backToTop` (Floating back-to-top button), `#getInTouchBtn` (Hero CTA)<br>• Prospectus: `#downloadPdfBtn` (Floating PDF export action button), `.motto-bar` (Header motto banner) |
| **Performance Discipline** | LiquidGlass performs SVG displacement mapping and dynamic refraction calculations. To preserve the 60fps performance budget, the adapter enforces strict targeting: it is **NEVER** initialized on long lists or repeated document cards. Mobile screens clamp tilt and disable continuous gyroscope/orb tracking to conserve CPU and battery. |
| **Reduced-Motion Integration** | Fully integrated with SJCCC's accessibility architecture. When `(prefers-reduced-motion: reduce)` matches, `reducedMotion: true` is passed to the package, tilt angles are clamped to `0`, ambient orbs are disabled, and excessive motion is eliminated. |
| **Fallback Requirement** | Fully non-blocking. If the package cannot run or SVG filters are unsupported, the underlying semantic HTML and native CSS `backdrop-filter: blur(...)` rules remain 100% active with zero visual regression. |

---

### CardSplitter

| Attribute | Details |
| :--- | :--- |
| **Location** | `src/ui/utils/CardSplitter.ts` |
| **Primary Responsibility** | Manages visual feedback boundaries and directional interaction states between adjacent cards, pathways, and grouped content. Delineates where cards separate across desktop (vertical) and mobile (horizontal) viewports. |
| **Page Agnostic?** | **Yes.** Configurable for any `.card-splitter` element. |
| **Public API** | • `constructor(options?: CardSplitterOptions)`<br>• `destroy(): void` |
| **Consumers** | • Homepage (`HomeApp` for Academic Pillars and GCE Results cards)<br>• Prospectus (`ProspectusApp` for Uniform & Apparel gender split cards) |
| **Dependencies** | `src/css/components/card-splitter.css` |
| **Interactive States** | Directional hover/focus tracking (`data-active-side="prev"` / `"next"`), accessible keyboard activation (`Enter`/`Space`), and gold border illumination. |

---

## 3. Configuration & Constants Primitives

1. **`src/core/config/selectors.ts`**:
   - `HOME_SELECTORS`: Centralized DOM element IDs and CSS selectors for the landing page.
   - `PROSPECTUS_SELECTORS`: Centralized DOM element IDs and CSS selectors for the document page.
2. **`src/core/storage/storageKeys.ts`**:
   - `STORAGE_KEYS`: Namespaced keys for `localStorage` (`sjccc_theme`, `announcement_dismissed_until`, `pwa_prompt_dismissed`).

---

## 4. Cross-Links

- [System Overview](overview.md)
- [Homepage Architecture](homepage.md)
- [Prospectus Architecture](prospectus.md)
- [PWA & Offline Subsystem](pwa.md)
