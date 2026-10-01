# Accessibility (a11y) Architecture

## 1. Architectural Approach

The SJCCC web platform adopts an inclusive engineering methodology focused on keyboard ergonomics, high-contrast visual cues, screen-reader semantics, and graceful degradation.

Accessibility is implemented at two distinct levels:
1. **Shared Accessibility Infrastructure**: Base styles, focus rings, `.sr-only` utility, ARIA sync, and reduced motion constraints.
2. **Page-Specific Accessibility Implementation**: Heading hierarchies, accessible table markup, dialog focus trapping, and kinetic text live announcers.

*(Note: While these patterns follow WCAG 2.1 AA design best practices, this document describes current architectural capabilities rather than claiming formal external certification).*

---

## 2. Shared Accessibility Infrastructure

### 1. Focus Visibility System
Both pages implement a unified, high-visibility focus ring for keyboard navigators:

```css
:focus-visible {
    outline: 2px solid var(--color-brand-accent, #C9A229);
    outline-offset: 2px;
}
```

Applied uniformly to all `<button>`, `<a>`, and `<input>` elements. Custom component focus outlines must never be suppressed with `outline: none` unless replaced with a visible indicator.

### 2. Screen Reader Utilities (`.sr-only`)
Defined in `src/css/core/accessibility.css`:
```css
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
```

Used to provide descriptive screen-reader text for icon-only buttons (theme toggles, social icons, close buttons).

### 3. Motion & Vestibular Safety
Both stylesheets (`main.css` and `prospectus.css`) respect operating system preferences:
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
    .reveal-on-scroll {
        opacity: 1 !important;
        transform: none !important;
    }
}
```

---

## 3. Page-Specific Implementations

### Homepage Accessibility (`index.html`)
- **Skip Link**: Top-level `<a href="#main-content" class="skip-link">` allows keyboard users to bypass header navigation.
- **Kinetic Text Live Announcer**: The canvas-based kinetic scroll hero (`ScrollEngine.ts`) injects an `aria-live="polite"` element (`#heroA11yAnnouncer`) to read dynamic messages aloud as the user scrolls.
- **Modal Focus Management**: `EnquiryModal.ts` and `ConfirmDialog.ts` implement focus traps, ensuring keyboard `Tab` does not escape the active modal, and restore focus to the trigger upon dismissal.
- **FAQ Semantic Accordion**: `<button aria-expanded="false" aria-controls="faq-answer-N">` updates ARIA attributes dynamically as accordions expand and collapse.

### Prospectus Accessibility (`prospectus.html`)
- **Strict Semantic Landmark Tree**:
  ```text
  <body>
    ├── <header id="mainHeader" role="banner">
    │     └── <nav id="navMenu" aria-label="Prospectus Sections">
    └── <main id="main-content" role="main">
          ├── <header class="main-header"> (Document Masthead)
          ├── <section class="section-card" aria-labelledby="...">
          └── <footer class="prospectus-footer" role="contentinfo">
  ```
- **Accessible Data Tables**:
  All tuition and uniform tables utilize explicit `<thead>`, `<th>` with `scope="col"`, and structured `<tbody>` rows, allowing screen readers to associate table cells with column headers.
- **Zero-JS Resilience**:
  All content cards possess default `opacity: 1; transform: none; display: block;`. If JavaScript is disabled, no institutional text or tables are obscured or hidden.

---

## 4. Cross-Links

- [System Overview](overview.md)
- [CSS Architecture](css-architecture.md)
- [Navigation Architecture](navigation.md)
- [Prospectus Architecture](prospectus.md)
