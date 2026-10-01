# St. Joseph's Catholic Comprehensive College — Mbengwi

<div align="center">
  <img src="public/assets/icons/512X512.svg" alt="SJCCC Mbengwi Crest" width="120" />

  <p><em>"Edificamus Regnum Dei — Let us build the Kingdom of God"</em></p>

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://saintjosephcollege.vercel.app)
[![TypeScript 5.x](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-orange?style=flat-square)](docs/architecture/pwa.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Status: Live](https://img.shields.io/badge/Status-Live-success?style=flat-square)](https://saintjosephcollege.vercel.app)
</div>

---

## Overview

**St. Joseph's Catholic Comprehensive College (SJCCC)** is a premier Catholic secondary boarding institution located in Mbengwi, Momo Division, in the North West Region of Cameroon. Founded in 1963 and administered under the Archdiocese of Bamenda, SJCCC balances academic rigour with Christian moral formation and technical craftsmanship under the leadership of Principal **Rev. Fr. Joseph Gael Kenne**.

This repository hosts the official web platform for the college. Operating as a **dual-entrypoint Progressive Web App (PWA)**, the platform serves two core missions:
1. **Interactive Digital Campus (`/` or `/index.html`)**: An interactive landing experience showcasing academic pathways, campus life, interactive 6-zone virtual tours, dynamic announcements, and direct admissions enquiries.
2. **Official Student Handbook & Prospectus (`/prospectus.html`)**: An official statutory document formatted for screen reading, offline study, and native A4 PDF generation.

* **Live Production Website:** [saintjosephcollege.vercel.app](https://saintjosephcollege.vercel.app)

---

## Features

- **Dual-Track Academic Explorer**: Interactive curriculum showcases covering General Education (GCE Ordinary & Advanced Levels) and Technical Education (Woodwork, Metalwork, Electrical Installation, Building Construction, Mechanics).
- **Document-First Official Prospectus**: Complete statutory student handbook rendered in semantic HTML, remaining 100% visible and readable with JavaScript disabled.
- **Native A4 Print / PDF Engine**: Dedicated `@media print` styling that formats the prospectus into clean, paired 2-column cards, suppresses web chrome, and neutralizes dark mode backgrounds to conserve printer toner.
- **Progressive Dark / Light Theming**: Persistent theme switcher with system preference detection (`prefers-color-scheme`), animated multi-shape transitions on the homepage, and smooth fade transitions on the prospectus.
- **Full Offline PWA Support**: Precached multi-page application shell, offline status sentinel badge, and background caching for campus photography and typography.
- **Virtual Campus Map**: Interactive 6-zone exploration of campus facilities (Chapel, Jubilee Hall, Science Labs, Technical Workshops, Dormitories, Sports Fields).
- **Admissions Enquiry Hub**: Floating enquiry modal with Formspree form submission and real-time WhatsApp direct-routing toggle.
- **Academic Milestones Timeline**: Real-time calendar of resumption dates, entrance examinations, feast days, and official GCE windows.
- **Announcement System**: Priority alert bar (`urgent` / `important`) with persistent dismissal tracking and modal archive.
- **Touch-Enabled Campus Carousel**: Hardware-accelerated image slider with swipe support, indicator dots, and auto-play pause-on-hover.

---

## Architecture

The SJCCC web platform follows a **framework-free, multi-page progressive enhancement architecture**:

- **Zero-Framework TypeScript**: Class-based modular architecture operating directly on the semantic DOM without client-side framework overhead (no React, Vue, or Angular).
- **Dual-Entrypoint MPA**: Dedicated composition roots for the dynamic homepage (`src/pages/home/home.ts`) and the document-first prospectus (`src/pages/prospectus/prospectus.ts`).
- **Document-First Baseline Resilience**: Official regulations, fee schedules, and uniform requirements are rendered in static HTML, ensuring full readability without JavaScript.
- **Shared Infrastructure**: Centralized cross-cutting concerns (`ThemeManager`, `MobileNavigation`, `OfflineIndicator`) are implemented once and parameterized across pages.
- **Offline First**: All core HTML documents, hashed assets, and fallback graphics are precached by the Service Worker during installation.

```text
Presentation (HTML5)      ──> Multi-page semantic documents (index.html, prospectus.html)
Composition Roots (TS)    ──> HomeApp (home.ts) vs ProspectusApp (prospectus.ts)
Shared Infrastructure     ──> ThemeManager, MobileNavigation, OfflineIndicator
Domain Features           ──> Self-contained modules (Hero, Map, Enquiry, Carousel, FAQ)
Data Layer                ──> Typed canonical stores in src/data/
PWA / Service Worker      ──> Precache v2.0.0, network-first navigation, image fallbacks
```

👉 *Read the full specification: [Architecture Overview](docs/architecture.md)*  
👉 *View the visual model: [Application Architecture Diagram](docs/diagrams/application-architecture.mmd)*

---

## Technology Stack

| Layer | Technologies & Standards |
| :--- | :--- |
| **Language & Typing** | TypeScript 5.x (Strict mode, ES2022 target, ESNext modules) |
| **Frontend Architecture** | Framework-Free TypeScript Classes, Direct Semantic DOM Binding |
| **Build System & Bundler** | Vite 8.x, Rollup Multi-Page Bundling |
| **Styling & Theming** | Modern CSS, CSS Custom Properties (Design Tokens), Fluid `clamp()` Typography |
| **PWA & Offline** | Service Worker API (`src/sw.ts`), Cache Storage API, Web App Manifest |
| **Icons & Typography** | Bootstrap Icons, Google Fonts (*Playfair Display*, *Cormorant Garamond*, *Inter*) |
| **Deployment** | Vercel Edge Network / Google Cloud Run Container Environment |

👉 *Read the full specification: [TypeScript Architecture](docs/architecture/typescript-architecture.md)* and [CSS Architecture](docs/architecture/css-architecture.md)*

---

## Project Structure

```text
sjccc/
├── index.html                   # Homepage multi-page entrypoint
├── prospectus.html              # Official Prospectus document entrypoint
├── metadata.json                # Project runtime metadata
├── package.json                 # Scripts and dependencies
├── tsconfig.json                # TypeScript strict configuration
├── vite.config.ts               # Multi-page client build configuration
├── vite.sw.config.ts            # Service Worker build & manifest injection
│
├── public/                      # Static public web assets
│   ├── manifest.json            # Web App Manifest (PWA metadata)
│   └── assets/                  # Photography, icons, and splash screens
│
├── src/                         # Application source code
│   ├── main.ts                  # Homepage bootstrap entrypoint
│   ├── prospectus.ts            # Prospectus bootstrap entrypoint
│   ├── sw.ts                    # Service Worker core implementation
│   ├── sw-register.ts           # Service worker registration helper
│   │
│   ├── core/                    # Shared core platform layer
│   │   ├── config/selectors.ts  # Strongly typed DOM selector contracts
│   │   ├── storage/storageKeys.ts# Namespaced LocalStorage keys
│   │   ├── physics/spring.ts    # Spring physics calculations
│   │   └── theme/               # Centralized ThemeManager engine
│   │
│   ├── data/                    # Canonical typed datasets (Single Source of Truth)
│   │   ├── academicCalendar.ts  # Resumption & milestone dates
│   │   ├── academicPrograms.ts  # General & Technical curricula
│   │   ├── admissionRequirements.ts# Entrance criteria & requirements
│   │   ├── tuitionFees.ts       # Approved fees & installment breakdowns
│   │   ├── collegeProfile.ts    # Institutional leadership & contacts
│   │   ├── faqData.ts           # Admissions & boarding FAQs
│   │   ├── campusZones.ts       # 6-zone campus tour facility data
│   │   ├── campusSlides.ts      # Campus carousel slide metadata
│   │   ├── newsStories.ts       # News articles & GCE achievement reports
│   │   └── pastAnnouncements.ts # Archived bulletins
│   │
│   ├── features/                # Domain-specific feature controllers
│   │   ├── academic/            # Curriculum filter buttons
│   │   ├── announcement/        # Priority announcement bar & archive
│   │   ├── calendar/            # Milestone timeline renderer
│   │   ├── campus/              # Interactive SVG campus map
│   │   ├── carousel/            # Campus image slider
│   │   ├── enquiry/             # Admissions modal & Formspree form
│   │   ├── faq/                 # Collapsible FAQ accordion
│   │   ├── hero/                # Procedural canvas particles & scroll engine
│   │   ├── location/            # Google Map lazy-load facade
│   │   ├── news/                # News stories renderer
│   │   ├── offline/             # Shared PWA offline status indicator
│   │   ├── preloader/           # Site loading animation
│   │   └── pwa/                 # PWA install prompt modal
│   │
│   ├── pages/                   # Page composition roots
│   │   ├── home/home.ts         # HomeApp composition root
│   │   └── prospectus/prospectus.ts# ProspectusApp composition root
│   │
│   ├── services/                # Network services & platform bridges
│   │   ├── enquiryService.ts    # Formspree & WhatsApp dispatch
│   │   └── serviceWorker.ts     # Service worker registration service
│   │
│   ├── ui/                      # Shared UI primitives & controllers
│   │   ├── dialog/ConfirmDialog.ts # Accessible glassmorphic dialog
│   │   ├── navigation/          # HeaderScroll, MobileNavigation, ScrollSpy
│   │   └── utils/               # CounterAnimation, ScrollReveal, SmoothScroll
│   │
│   └── css/                     # Styling architecture
│       ├── main.css             # Homepage master stylesheet
│       ├── scrollEffect.css     # Kinetic hero text effects
│       ├── prospectus.css       # Prospectus master stylesheet
│       ├── core/                # Design tokens, theme overrides, typography, a11y
│       ├── components/          # Reusable component styles
│       ├── layout/              # Headers, footers, and mobile drawers
│       ├── features/            # Feature-specific stylesheets
│       └── prospectus/          # 10 modular domain stylesheets (inc. print.css)
│
└── docs/                        # Modular architecture documentation system
    ├── architecture.md          # Architecture navigation hub & agent rules
    ├── architecture/            # 12 detailed architecture specifications
    └── diagrams/                # 10 standalone Mermaid architecture models
```

👉 *View the dependency model: [Module Dependencies Diagram](docs/diagrams/module-dependencies.mmd)*

---

## Pages

### Homepage (`index.html`)
The Homepage serves as the interactive digital campus gateway. Orchestrated by `HomeApp` (`src/pages/home/home.ts`), it manages 19 feature controllers:
- Hero section with procedural dust particles and kinetic text reveals.
- Campus photo carousel with touch-swipe gestures.
- Academic pathway filters (General Grammar vs 5 Technical Workshop trades).
- Interactive 6-zone virtual campus map tour.
- Admissions enquiry form with direct WhatsApp message routing.
- Fixed iOS-style bottom dock tab bar on mobile viewports (< 768px).

👉 *Read the full specification: [Homepage Architecture](docs/architecture/homepage.md)*  
👉 *View the runtime flow: [Homepage Flow Diagram](docs/diagrams/homepage-flow.mmd)*

### Official Prospectus (`prospectus.html`)
The Prospectus is the statutory student handbook containing official fees, boarding item lists, and disciplinary rules. Orchestrated by `ProspectusApp` (`src/pages/prospectus/prospectus.ts`), it is built with a **document-first philosophy**:
- **Zero-JS Baseline**: All sections and tables are rendered directly in semantic HTML, remaining 100% readable even with JavaScript disabled.
- **Native A4 Print Engine (`print.css`)**: Built-in `@media print` rules format cards into 2-column paired layouts, suppress web chrome, and neutralize dark mode backgrounds.
- **Native PDF Trigger (`PdfExporter`)**: Calls the browser's native `window.print()` without DOM mutations.
- **10 Modular Stylesheets**: Isolated CSS suite under `src/css/prospectus/` ensuring high maintainability.

👉 *Read the full specification: [Prospectus Architecture](docs/architecture/prospectus.md)* and [CSS Architecture](docs/architecture/css-architecture.md)*  
👉 *View the runtime flow: [Prospectus Flow Diagram](docs/diagrams/prospectus-flow.mmd)*

---

## Shared Infrastructure

Cross-cutting systems are implemented once in `src/core/` and `src/ui/` and reused across pages:
- **`ThemeManager` (`src/core/theme/ThemeManager.ts`)**: Centralized light/dark mode engine supporting animated SVG clip-path transitions (homepage) and smooth opacity fade mode (prospectus), with `localStorage` persistence and `prefers-color-scheme` synchronization.
- **`MobileNavigation` (`src/ui/navigation/MobileNavigation.ts`)**: Parameterized mobile drawer controller handling hamburger toggle states, backdrop dismissals, `Escape` key trapping, and link-click auto-close.
- **`OfflineIndicator` (`src/features/offline/OfflineIndicator.ts`)**: Network connectivity sentinel that validates Service Worker cache status and informs users when viewing cached pages.
- **`serviceWorker` Lifecycle (`src/services/serviceWorker.ts`)**: Centralized Service Worker registration and update detection.

👉 *Read the full specification: [Shared Infrastructure Architecture](docs/architecture/shared-infrastructure.md)*  
👉 *View the interface model: [Shared Infrastructure Diagram](docs/diagrams/shared-infrastructure.mmd)*

---

## Data Layer

Official college data is stored in typed TypeScript modules under `src/data/`:
- `tuitionFees.ts`: Approved fee schedules, BEPHA health insurance, and 3-term installment breakdowns.
- `academicPrograms.ts`: Grammar cycles and 5 vocational workshop trades.
- `academicCalendar.ts`: 2026/2027 term dates, resumption milestones, and GCE windows.
- `admissionRequirements.ts`: First and Second Cycle admission criteria.
- `collegeProfile.ts`: Administrative leadership and legal metadata.

> **Data Synchronization Policy:**  
> On the Homepage, components dynamically render from these datasets via client-side renderers (`CarouselRenderer.ts`, `TimelineRenderer.ts`, `FaqRenderer.ts`).  
> On the Prospectus, canonical data is mirrored in **static HTML tables** to guarantee zero-JS readability. When official fees or dates change, both the dataset and `prospectus.html` must be updated together.

👉 *Read the full specification: [Canonical Data Layer](docs/architecture/data-layer.md)*  
👉 *View the data flow model: [Data Flow Diagram](docs/diagrams/data-flow.mmd)*

---

## PWA

SJCCC is built with an offline-first architecture powered by `src/sw.ts`:
- **Precache Set (`sjccc-precache-v2.0.0`)**: Automatically precaches `index.html`, `prospectus.html`, `manifest.json`, production-hashed Vite CSS/JS bundles, and fallback graphics.
- **Network-First Navigation with Timeout (3.5s)**: Attempts to fetch fresh HTML for up to 3,500ms; falls back immediately to cached copies if offline or experiencing connectivity drops.
- **Cache-First Immutable Assets**: Production Vite assets (e.g. `main-[hash].js`) are served directly from cache without network latency.
- **Bounded Dynamic Caches**: Limits runtime image cache to 60 items and CDN assets to 50 items using FIFO eviction.
- **Offline Handbook Guarantee**: Visitors can open `/prospectus.html` completely offline, read all tuition tables, and print or save an A4 PDF copy.

👉 *Read the full specification: [PWA & Offline Subsystem](docs/architecture/pwa.md)*  
👉 *View the lifecycle diagrams: [PWA Lifecycle Diagram](docs/diagrams/pwa-flow.mmd)* and [Service Worker Request Flow](docs/diagrams/service-worker-flow.mmd)*

---

## Development

### Prerequisites
- **Node.js** (v18.x or later) or **Bun** (v1.x or later)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-org/sjccc.git
cd sjccc
npm install
```

### Local Development Server
Start the local Vite development server on port 3000:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the Homepage or [http://localhost:3000/prospectus.html](http://localhost:3000/prospectus.html) for the Prospectus.

### Type Checking & Linting
Run strict TypeScript static validation across all modules:
```bash
npm run lint
```
*(Executes `tsc --noEmit` based on `tsconfig.json`).*

### Production Build
Build the multi-page client and the Service Worker:
```bash
npm run build
```
This executes the two-stage build pipeline:
1. `tsc`: Validates strict types.
2. `vite build`: Compiles HTML and hashed client assets into `dist/`, generating `dist/.vite/manifest.json`.
3. `vite build --config vite.sw.config.ts`: Reads the asset manifest and compiles `dist/sw.js` with the precache asset array injected.

### Preview Production Build
Preview the production `dist/` build locally:
```bash
npm run preview
```

---

## Deployment

- **Hosting Platform**: Vercel Edge Network / Google Cloud Run containerized edge.
- **Routing**: Multi-page application routing (`/` -> `index.html`, `/prospectus.html` -> `prospectus.html`).
- **Caching Strategy**:
    - `dist/index.html` & `dist/prospectus.html`: `Cache-Control: no-cache` (enables instant Service Worker update checks).
    - `dist/assets/*`: `Cache-Control: public, max-age=31536000, immutable` (hashed assets cached permanently).
    - `dist/sw.js`: `Cache-Control: no-cache` (enables prompt worker update detection).

👉 *Read the full specification: [Build & Deployment Architecture](docs/architecture/build-and-deployment.md)*  
👉 *View the pipeline model: [Deployment Flow Diagram](docs/diagrams/deployment-flow.mmd)*

---

## Documentation

The repository's detailed architecture is maintained separately from this README in [`docs/architecture/`](docs/architecture/) and [`docs/diagrams/`](docs/diagrams/):

### Specifications Matrix
- **[Architecture Hub & Index](docs/architecture.md)** — Master navigation map and rules for developers and AI agents.
- **[System Overview](docs/architecture/overview.md)** — System overview, dual-entrypoint model, and architectural tiers.
- **[Shared Infrastructure](docs/architecture/shared-infrastructure.md)** — Reusable controllers (`ThemeManager`, `MobileNavigation`, `OfflineIndicator`).
- **[Homepage Architecture](docs/architecture/homepage.md)** — `HomeApp` composition root, hero physics, and 19 feature controllers.
- **[Prospectus Architecture](docs/architecture/prospectus.md)** — Document-first zero-JS architecture, `ProspectusApp`, and print engine.
- **[CSS Architecture](docs/architecture/css-architecture.md)** — Design tokens, dark mode overrides, and the 10-module prospectus CSS suite.
- **[TypeScript Architecture](docs/architecture/typescript-architecture.md)** — Code taxonomy, initialization lifecycle, and strict compiler contracts.
- **[Canonical Data Layer](docs/architecture/data-layer.md)** — Datasets in `src/data/`, dynamic hydration, and static HTML duplication.
- **[Navigation Architecture](docs/architecture/navigation.md)** — Desktop menus, mobile drawer, bottom dock bar, and focus rings.
- **[PWA & Offline Architecture](docs/architecture/pwa.md)** — Service Worker lifecycle, caching strategies, and offline handbook viewing.
- **[Accessibility Architecture](docs/architecture/accessibility.md)** — Landmarks, `:focus-visible`, live announcers, and reduced motion.
- **[Build & Deployment Pipeline](docs/architecture/build-and-deployment.md)** — Multi-page Vite bundling and two-stage Service Worker compilation.
- **[Architectural Decision Records](docs/architecture/decisions.md)** — Accepted ADRs (ADR-001 through ADR-006) preserving core technical intent.

### Visual Architecture Diagrams
1. **[Application Architecture](docs/diagrams/application-architecture.mmd)** — High-level system tier topology.
2. **[Module Dependencies](docs/diagrams/module-dependencies.mmd)** — Architectural dependencies from entrypoints to data stores.
3. **[Shared Infrastructure](docs/diagrams/shared-infrastructure.mmd)** — Interface between shared controllers and browser subsystems.
4. **[Homepage Runtime Flow](docs/diagrams/homepage-flow.mmd)** — Sequence diagram of homepage bootstrap and user events.
5. **[Prospectus Runtime Flow](docs/diagrams/prospectus-flow.mmd)** — Sequence diagram of zero-JS loading and native PDF printing.
6. **[Data Flow & Parity](docs/diagrams/data-flow.mmd)** — Dynamic hydration versus static document duplication.
7. **[PWA Lifecycle](docs/diagrams/pwa-flow.mmd)** — Registration, precaching, and offline navigation pathways.
8. **[Service Worker Request Flow](docs/diagrams/service-worker-flow.mmd)** — Request routing decision tree.
9. **[CSS Architecture](docs/diagrams/css-architecture.mmd)** — Token hierarchy, homepage styles, and prospectus modules.
10. **[Build & Deployment Pipeline](docs/diagrams/deployment-flow.mmd)** — Two-stage compilation and asset injection.

---

## Project Status

The SJCCC web platform is actively maintained as a production-grade multi-page web platform:
- **Core Platform**: Production-ready, deployed on Vercel at [saintjosephcollege.vercel.app](https://saintjosephcollege.vercel.app).
- **Prospectus**: Fully modularized with 10 isolated CSS modules and native A4 print engine.
- **PWA Subsystem**: Production precache v2.0.0 operating with offline navigation and dynamic cache eviction.
- **Documentation**: Fully documented architecture with 12 modular specifications and 10 Mermaid diagram files.

---

## Contributing

Contributors and AI coding agents must adhere to the core architectural principles defined in [`docs/architecture.md`](docs/architecture.md):

1. **Reuse Shared Infrastructure**: Always consume existing shared classes in `src/core/` and `src/ui/`. Do not create duplicate theme managers or navigation drawers.
2. **Preserve Zero-JS on Prospectus**: The Prospectus must remain 100% visible with JavaScript disabled. Never hide content behind client-side reveal classes.
3. **Do Not Add Runtime Hydration to Handbook Prose**: Institutional tables and regulations in `prospectus.html` must remain static HTML for search indexing and offline resilience.
4. **Delegate Print Styling to CSS**: The PDF download button invokes `window.print()`. Layout adjustments belong in `src/css/prospectus/print.css`. Do not add client-side PDF generation packages.
5. **Respect CSS Boundaries**: Shared tokens belong in `src/css/core/tokens.css`; homepage features belong in `src/css/features/`; prospectus styles belong in `src/css/prospectus/`.
6. **Verify Both Pages**: Always verify `/index.html` and `/prospectus.html` whenever touching shared code.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full terms and conditions.

- **Campus Photography**: © SJCCC Mbengwi Media Team
- **Institutional Crest & Insignia**: Official insignia of St. Joseph's Catholic Comprehensive College, Mbengwi

---

<div align="center">
  <strong>St. Joseph's Catholic Comprehensive College, Mbengwi</strong><br>
  Momo Division, North West Region, Cameroon<br><br>

📞 <strong>Admissions Office:</strong> <a href="tel:+237683758002">+237 683 758 002</a><br>
💬 <strong>WhatsApp Inquiries:</strong> <a href="https://wa.me/237672829014">+237 672 829 014</a><br>
✉️ <strong>Official Email:</strong> <a href="mailto:stjosephcollegembengwi@gmail.com">stjosephcollegembengwi@gmail.com</a><br>
🌐 <strong>Official Website:</strong> <a href="https://saintjosephcollege.vercel.app">saintjosephcollege.vercel.app</a><br><br>

<em>"Train up a child in the way he should go, and when he is old he will not depart from it." — Proverbs 22:6</em><br><br>

© 2026 St. Joseph's Catholic Comprehensive College, Mbengwi. All Rights Reserved.
</div>
