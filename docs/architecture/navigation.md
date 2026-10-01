# Navigation Architecture

## 1. Overview

The navigation system provides clear orientation across both the interactive multi-section landing page (`/index.html`) and the dense official handbook (`/prospectus.html`). It utilizes a combination of native HTML anchor semantics, CSS layout rules, and TypeScript event controllers.

---

## 2. Navigation Matrix by Responsibility Layer

| Navigation Component         | Implementation Layer    | Primary File                                      | Behavior                                                                                                          |
|:-----------------------------|:------------------------|:--------------------------------------------------|:------------------------------------------------------------------------------------------------------------------|
| **Cross-Page Links**         | Native HTML             | `index.html`, `prospectus.html`                   | Standard `<a>` tags with absolute root paths (`/` and `/prospectus.html`).                                        |
| **In-Page Anchor Scrolling** | Native HTML + Shared TS | `SmoothScroll.ts`                                 | Intercepts internal `#hash` clicks, computes offset for sticky header height, and smoothly scrolls to targets.    |
| **Sticky Header Surface**    | CSS + Shared TS         | `src/css/layout/header.css`<br>`HeaderScroll.ts`  | `position: sticky; top: 0;` with dynamic backdrop-blur intensity linked to scroll distance.                       |
| **Mobile Navigation Drawer** | Shared TypeScript + CSS | `MobileNavigation.ts`<br>`navigation-mobile.css`  | Off-canvas drawer sliding in from the right, with backdrop dismissal, `Escape` key trapping, and link auto-close. |
| **Section Active Tracking**  | Shared TypeScript       | `ScrollSpy.ts`                                    | Observes section visibility via `IntersectionObserver` and applies `.active` class to matching navigation links.  |
| **Mobile Bottom Tab Dock**   | Pure CSS                | `src/css/layout/navigation-mobile.css`            | Fixed thumb-friendly navigation bar on viewports `< 768px` for one-hand operation.                                |
| **Skip Navigation Link**     | Native HTML + CSS       | `src/css/core/accessibility.css`                  | Visually hidden `<a href="#main-content">` that appears on focus, bypassing header chrome.                        |
| **Scroll-to-Top Button**     | Page-Specific TS + CSS  | `HeaderScroll.ts`<br>`src/css/ui/back-to-top.css` | Floating circular button fading in past 400px scroll depth to return to page top.                                 |

---

## 3. Desktop vs Mobile Ergonomics

### Desktop Navigation (> 1024px)
- **Homepage**: Fixed horizontal navigation bar with icon-first anchors (`Home`, `About`, `Academics`, `Campus Life`, `News`, `FAQ`, `Contact`) and an action button linking to the Prospectus.
- **Prospectus**: Streamlined institutional bar featuring the Latin crest, in-page section links (`About`, `Departments`, `Requirements`, `Uniforms`, `Boarding`, `Fees`, `Resumption`), sun/moon theme toggle, and a link back to the homepage.

### Mobile Navigation (<= 1024px)
- **Hamburger Button**: Accessible button with `aria-label="Toggle navigation menu"`, `aria-expanded="false"`, and `aria-controls="navMenu"`.
- **Drawer Behavior (`MobileNavigation.ts`)**:
  - Clicking hamburger toggles `.active` class on `#navMenu`.
  - Tapping outside the drawer automatically closes it.
  - Pressing `Escape` on the keyboard closes the drawer and restores focus to the hamburger button.
  - Tapping any internal anchor link automatically closes the drawer so the user immediately views the target section.
- **Homepage Dock Bar (<= 768px)**: Fixed iOS-style bottom dock with shortcuts for `Home`, `Academics`, `Map`, and `Enquire`.

---

## 4. Keyboard Navigation & Focus Trapping

1. **Focus Rings (`:focus-visible`)**:
   Enforced in `src/css/core/accessibility.css` and `src/css/prospectus/base.css`:
   ```css
   :focus-visible {
       outline: 2px solid var(--color-brand-accent, #C9A229);
       outline-offset: 2px;
   }
   ```
2. **Tab Flow Order**:
   - `Skip to Main Content` link (1st tab stop).
   - Brand logo / home link.
   - Primary navigation links.
   - Theme toggle button.
   - Page interactive content.
3. **Drawer Focus Trapping**:
   When the mobile drawer opens, `aria-hidden="false"` is set, and keyboard tabs cycle through menu items.

---

## 5. Cross-Links

- [System Overview](overview.md)
- [Shared Infrastructure](shared-infrastructure.md)
- [Accessibility Architecture](accessibility.md)
- [Homepage Architecture](homepage.md)
- [Prospectus Architecture](prospectus.md)
