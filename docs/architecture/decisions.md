# Architectural Decision Records (ADRs)

## Overview

This document records the foundational architectural decisions governing the SJCCC codebase. These records serve to preserve technical intent and prevent architectural drift during future iterations.

---

## ADR-001: Document-First Architecture for Official Prospectus

- **Status**: Accepted
- **Context**: The college prospectus is a formal student handbook containing official tuition fees, statutory disciplinary rules, and approved uniform lists. Many visitors access the document from rural or low-bandwidth environments in Cameroon with intermittent mobile data.
- **Decision**: The Prospectus must render all institutional text and tables directly in semantic HTML. Default CSS states must remain `opacity: 1; transform: none; display: block;`. The document must be 100% readable with JavaScript disabled.
- **Consequences**: Avoids client-side loading spinners, improves SEO indexing, and ensures offline PDF generation works reliably without DOM injection delays.

---

## ADR-002: Shared Infrastructure Across Multi-Page Application (MPA)

- **Status**: Accepted
- **Context**: Both the Homepage and the Prospectus require dark/light theming, mobile navigation drawer management, and offline PWA status detection.
- **Decision**: Centralize shared cross-cutting concerns into `src/core/` and `src/ui/`. `ThemeManager`, `MobileNavigation`, and `OfflineIndicator` must be parameterized and reused across both entrypoints. Do not create page-specific copies (`prospectusTheme.ts`, `prospectusNavigation.ts`).
- **Consequences**: Eliminates code duplication, unifies `localStorage` key names, and ensures consistent accessibility behavior across the platform.

---

## ADR-003: Native `window.print()` for PDF Export

- **Status**: Accepted
- **Context**: Parents and alumni require downloadable/printable copies of the prospectus handbook. Generating PDFs server-side or bundling heavy client-side libraries (such as `jspdf` or `html2pdf`) adds hundreds of kilobytes to bundle sizes and introduces layout rendering inconsistencies.
- **Decision**: Use the browser's native `window.print()` API via a lightweight `PdfExporter` click listener. Delegate all layout transformations, web chrome suppression, and A4 portrait pagination to `@media print` in `src/css/prospectus/print.css`.
- **Consequences**: Adds zero runtime JavaScript weight, guarantees vector-quality fonts, and automatically supports mobile "Save as PDF" print drivers.

---

## ADR-004: Two-Stage Build Pipeline for Service Worker Manifest Injection

- **Status**: Accepted
- **Context**: Vite generates content-hashed filenames for production JavaScript and CSS chunks (e.g. `main-DtFRR8oB.js`). The Service Worker needs to know these exact hashed filenames to precache them for offline use.
- **Decision**: Split the build pipeline into two sequential Vite build steps:
  1. `vite build`: Compiles HTML and client assets, generating `dist/.vite/manifest.json`.
  2. `vite build --config vite.sw.config.ts`: Reads `dist/.vite/manifest.json`, extracts production chunk filenames, and injects them as an array constant (`__SW_MANIFEST_ASSETS__`) into `dist/sw.js`.
- **Consequences**: Ensures 100% accurate asset precaching without requiring brittle manual string replacement or heavy third-party workbox plugins.

---

## ADR-005: Modularization of Prospectus CSS into 10 Dedicated Domains

- **Status**: Accepted
- **Context**: `src/css/prospectus.css` had grown into an unmaintainable 1,998-line monolith containing mixed print styles, grid calculations, mobile media queries, and institutional banners.
- **Decision**: Modularize Prospectus styles into 10 domain-specific stylesheets under `src/css/prospectus/` (`variables.css`, `base.css`, `header.css`, `document.css`, `sections.css`, `tables.css`, `footer.css`, `motion.css`, `responsive.css`, `print.css`). The master `src/css/prospectus.css` serves purely as an `@import` orchestrator.
- **Consequences**: Dramatically improves maintainability, isolates print media logic, and cleans up legacy unused styles.

---

## ADR-006: Intentional Static HTML Duplication of Canonical Data

- **Status**: Accepted
- **Context**: Canonical datasets exist in `src/data/` (e.g. `tuitionFees.ts`). Injecting these into `prospectus.html` via client-side DOM rendering would violate the zero-JS document-first principle.
- **Decision**: Retain static HTML tables in `prospectus.html`. The canonical TypeScript files serve as the programmatic single source of truth for runtime validation and tests, but static HTML copies are intentionally maintained in `prospectus.html`.
- **Consequences**: Requires manual synchronization whenever official fees or dates change. If automated synchronization is desired in the future, it must be performed at build-time via static site generation (SSG) templates rather than client-side runtime hydration.

---

## Cross-Links

- [System Overview](overview.md)
- [Shared Infrastructure](shared-infrastructure.md)
- [Prospectus Architecture](prospectus.md)
- [Build & Deployment](build-and-deployment.md)
