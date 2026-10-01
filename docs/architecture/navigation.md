# Navigation Architecture

## 1. Overview

The navigation system provides clear orientation across both the interactive multi-section landing page (`/index.html`) and the dense official handbook (`/prospectus.html`). It utilizes a unified canonical navigation model, native HTML anchor semantics, responsive CSS layout rules, and synchronized TypeScript controllers.

```text
              CANONICAL NAVIGATION MODEL (src/core/config/navigation.ts)
                                  │
                   ┌──────────────┴──────────────┐
                   ↓                             ↓
               Bottom Dock                  Drawer Menu
                   │                             │
                   └──────────────┬──────────────┘
                                  ↓
                         Navigation Targets
                                  ↓
                             Page Sections
                                  ↓
                   Active Section Detection (ScrollSpy.ts)
                                  ↓
                   Active Dock & Nav State (aria-current="location")
```

---

## 2. Navigation Matrix by Responsibility Layer

| Navigation Component | Implementation Layer | Primary File | Behavior |
| :--- | :--- | :--- | :--- |
| **Canonical Navigation Model** | TypeScript Config | `src/core/config/navigation.ts` | Defines the single source of truth for nav items, targets, labels, icons, and canonical dock ordering. |
| **Cross-Page Links** | Native HTML | `index.html`, `prospectus.html` | Standard `<a>` tags with absolute root paths (`/` and `/prospectus.html`). |
| **In-Page Anchor Scrolling** | Native HTML + Shared TS | `SmoothScroll.ts` | Intercepts internal `#hash` clicks, computes offset for sticky header height, and smoothly scrolls to targets. |
| **Sticky Header Surface** | CSS + Shared TS | `src/css/layout/header.css`<br>`HeaderScroll.ts` | `position: sticky; top: 0;` with dynamic backdrop-blur intensity linked to scroll distance. |
| **Mobile Navigation Drawer** | Shared TypeScript + CSS | `MobileNavigation.ts`<br>`navigation-mobile.css` | Off-canvas drawer sliding in from the right, with backdrop dismissal, `Escape` key trapping, and link auto-close. |
| **Section Active Tracking** | Shared TypeScript | `ScrollSpy.ts` | Evaluates viewport reading zone via `IntersectionObserver` and applies `.active` class and `aria-current="location"`. |
| **Mobile Bottom Tab Dock** | TypeScript + CSS | `navigation.ts`<br>`navigation-mobile.css` | Fixed thumb-friendly navigation bar on viewports `< 768px` with canonical ordering and responsive capacity tiers. |
| **Skip Navigation Link** | Native HTML + CSS | `src/css/core/accessibility.css` | Visually hidden `<a href="#main-content">` that appears on focus, bypassing header chrome. |
| **Scroll-to-Top Button** | Page-Specific TS + CSS | `HeaderScroll.ts`<br>`src/css/ui/back-to-top.css` | Floating circular button fading in past 400px scroll depth to return to page top. |

---

## 3. Mobile Bottom Dock Architecture

### A. Canonical Ordering Model
The mobile bottom navigation dock (`#mobileBottomBar`) reflects the exact content hierarchy of the site's information architecture, rather than arbitrary JavaScript insertion order.

Canonical Item Sequence:
1. **Theme Toggle** (`#bottomThemeToggle`, `.mobile-bottom-item--theme`) — Always 1st (far left thumb position).
2. **Home** (`#heroSection`, `.mobile-bottom-item--home`) — Primary landing & overview.
3. **Academics** (`#academics`, `.mobile-bottom-item--academics`) — Curriculum pathways.
4. **Dates** (`#schoolDatesSection`, `.mobile-bottom-item--dates`) — Resumption dates & milestone calendar.
5. **Results** (`#results`, `.mobile-bottom-item--results`) — GCE examination performance.
6. **Map** (`#campusMapSection`, `.mobile-bottom-item--map`) — Interactive virtual campus tour.
7. **Menu** (`#bottomNavMenuToggle`, `.mobile-bottom-item--menu`) — Always last (opens full drawer).

DOM ordering is strictly verified on startup via `enforceDockOrder()` in `src/core/config/navigation.ts`.

### B. Responsive Capacity Tiers
As viewport width changes, lower-priority items are cleanly hidden from the dock without altering the visual order of remaining items. All hidden items remain directly accessible inside the full drawer Menu:

- **`< 360px` (Very compact mobile)**: 4 items -> Theme, Home, Academics, Menu.
- **`360px – 413px` (Standard mobile phones)**: 5 items -> Theme, Home, Academics, Dates, Menu.
- **`414px – 599px` (Large mobile phones)**: 6 items -> Theme, Home, Academics, Dates, Results, Menu.
- **`600px – 768px` (Phablets / Small tablets)**: All 7 items -> Theme, Home, Academics, Dates, Results, Map, Menu.
- **`>= 769px` (Desktop)**: Dock is hidden; full horizontal navigation bar is active.

---

## 4. Active Section Detection (`ScrollSpy.ts`)

Active section detection is governed by `ScrollSpy.ts` using modern `IntersectionObserver` APIs without attaching unthrottled global scroll listeners:

1. **Sticky Header Offset & Active Reading Band**:
   - `rootMargin` is set to `-${headerHeight}px 0px -50% 0px`, placing the active evaluation band between the bottom of the sticky header and the vertical midpoint of the viewport.
2. **Deterministic Selection Rule**:
   - When scrolling quickly, multiple sections may intersect simultaneously.
   - Selection prioritizes:
     1. The section that directly spans the active reading anchor line (`headerHeight + 24px`).
     2. The section whose top edge is closest to the anchor line.
     3. The section with highest intersection ratio.
     4. Document order tie-breaker.
3. **Boundary Safeguards**:
   - `window.scrollY <= 50`: Forces `Home` (`#heroSection`) active.
   - At page bottom: Forces the final section active.
4. **Sub-Section Mapping**:
   - Intermediate sections that lack dedicated dock buttons (e.g. `#about` following `#heroSection`, or `#campus` preceding `#campusMapSection`) are mapped to their parent canonical targets via `getCanonicalTargetForSection()`.
   - Sections entirely outside the dock scope (e.g. `#faq`, `#contact`) clear the dock highlight to prevent falsely highlighting unrelated icons.
5. **Programmatic Scroll Flicker Prevention**:
   - When a user taps a navigation link, `ScrollSpy.lockActiveTarget(targetId, 850)` immediately highlights the destination and suppresses observer updates during the smooth scroll transit.

---

## 5. Accessibility & State Synchronization

- **`aria-current="location"`**: Dynamically applied to the active anchor in `#navMenu` and `#mobileBottomBar`. Automatically removed from all inactive links.
- **Visual Highlighting**: Active bottom items display a gold glow accent (`#c9a229` in light mode, `#fbe3a1` in dark mode) with an active pill indicator (`::after`) and elevated icon scale (`scale(1.12)`).
- **Focus Rings**: Standard `:focus-visible` outline enforced across all interactive buttons and anchors.
- **Drawer Focus Trap**: The mobile drawer manages `aria-hidden` and `aria-expanded` and restores focus on `Escape`.

---

## 6. Cross-Links

- [System Overview](overview.md)
- [Shared Infrastructure](shared-infrastructure.md)
- [Accessibility Architecture](accessibility.md)
- [Homepage Architecture](homepage.md)
- [Prospectus Architecture](prospectus.md)
