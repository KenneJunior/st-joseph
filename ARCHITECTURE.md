# SJCCC — Technical Architecture & Component Map

St. Joseph's Catholic Comprehensive College (SJCCC), Mbengwi  
*Motto: "Edificamus Regnum Dei — Let us build the Kingdom of God"*

---

## 1. Architectural Overview & System Model

The SJCCC web platform is engineered as a **dual-entrypoint, progressive web application (PWA)** built around high-density content, accessibility, and offline resilience:

```text
                               ┌──────────────────────────────────────────────────┐
                               │                 SJCCC PLATFORM                   │
                               └────────────────────────┬─────────────────────────┘
                                                        │
                   ┌────────────────────────────────────┴────────────────────────────────────┐
                   ▼                                                                         ▼
     ┌───────────────────────────┐                                             ┌───────────────────────────┐
     │         HOMEPAGE          │                                             │        PROSPECTUS         │
     │       (Interactive)       │                                             │     (Document-First)      │
     ├───────────────────────────┤                                             ├───────────────────────────┤
     │ • Entry: index.html       │                                             │ • Entry: prospectus.html  │
     │ • Script: src/main.ts     │                                             │ • Script: prospectus.ts   │
     │ • Style: src/css/main.css │                                             │ • Style: prospectus.css   │
     │ • Interactive UI & Engine │                                             │ • Static zero-JS readable │
     │ • Dynamic Canvas & 3D     │                                             │ • A4 PDF print engine     │
     └─────────────┬─────────────┘                                             └─────────────┬─────────────┘
                   │                                                                         │
                   └────────────────────────────────────┬────────────────────────────────────┘
                                                        │
                                                        ▼
                               ┌──────────────────────────────────────────────────┐
                               │              SHARED INFRASTRUCTURE               │
                               ├──────────────────────────────────────────────────┤
                               │ • ThemeManager (localStorage + system prefer)   │
                               │ • MobileNavigation (touch drawer + a11y focus)   │
                               │ • OfflineIndicator (ServiceWorker cache status)  │
                               │ • Canonical Datasets (profile, fees, programs)   │
                               │ • Design Tokens & Base Primitives (tokens.css)   │
                               └──────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Layer Breakdown

### A. Shared Infrastructure (Reused Across Entire Codebase)

These components and modules are completely decoupled from any single page, serving both `index.html` (Homepage) and `prospectus.html` (Prospectus):

| Module | Location | Responsibility & Reuse |
| :--- | :--- | :--- |
| **`ThemeManager`** | `src/core/theme/ThemeManager.ts` | Centralized theme controller supporting multi-stage `clip-path` animations (homepage) and instant/smooth fade mode (`mode: 'fade'` on prospectus). Manages persistent `localStorage` synchronization, `prefers-color-scheme` media query listeners, and synchronized ARIA states across all buttons. |
| **`MobileNavigation`** | `src/ui/navigation/MobileNavigation.ts` | Parameterized mobile drawer navigation. Handles hamburger state, backdrop dismissal, `Escape` key trapping, and link-click auto-closure for viewports `< 1024px` and `< 768px`. |
| **`OfflineIndicator`** | `src/features/offline/OfflineIndicator.ts` | Network status sentinel. Listens to `online`/`offline` window events and Service Worker cache state. Injects a non-intrusive floating connectivity badge with screen-reader live announcements. |
| **`serviceWorker` Lifecycle** | `src/services/serviceWorker.ts`, `src/sw.ts` | Complete offline precaching engine for HTML, stylesheets, vector icons, fonts, and campus photography. Registered independently at both page entrypoints. |
| **Canonical Data Stores** | `src/data/` | Single source of truth consumed by templates, modals, and tests: <br>• `collegeProfile.ts`: Administrative leadership, history, contact.<br>• `tuitionFees.ts`: Statutory tuition, boarding, and BEPHA health fee breakdown.<br>• `academicPrograms.ts`: Grammar cycles and 5 technical workshop trades.<br>• `admissionRequirements.ts`: Entry prerequisites and interview dates.<br>• `academicCalendar.ts`: 2026/2027 milestone dates and term schedule. |
| **Shared Design Tokens** | `src/css/core/tokens.css` | Central CSS token repository: color scales (`--sj-navy-*`, `--sj-gold-*`), 4px spacing scale (`--space-*`), typography clamp scales, radii (`--radius-*`), and z-index hierarchy. |
| **Accessibility Primitives** | `src/css/core/accessibility.css` | Universal focus rings (`:focus-visible`), screen-reader utility classes (`.sr-only`), and `@media (prefers-reduced-motion)` constraints. |
| **Dialog Engine** | `src/ui/dialog/ConfirmDialog.ts`, `src/css/components/dialog.css` | Accessible modal dialog utility with focus lock, backdrop blur, and physics-eased animation. |

---

### B. Homepage-Specific Responsibilities (`index.html`)

The homepage delivers an interactive digital campus experience with dynamic modules:

| Component / Feature | Files | Functionality |
| :--- | :--- | :--- |
| **Hero & Scroll Physics** | `src/features/hero/` | Multi-layer cinematic hero with procedural canvas dust particles (`ParticleSystem.ts`, `HeroParticles.ts`) and precision scroll-speed interpolator (`ScrollEngine.ts`). |
| **Announcement Bar & Archive** | `src/features/announcement/` | Emergency bulletin banner with priority tags (`urgent`, `important`), audio chime alerts, read-receipt persistence in storage, and modal archive (`PastAnnouncementsModal.ts`). |
| **Virtual Campus Map** | `src/features/campus/VirtualCampusMap.ts`, `src/css/features/campus-map.css` | Interactive visual tour of 6 college zones (Chapel, Jubilee Hall, Science Labs, Technical Workshops, Dormitories, Sports Fields) with real-time zone detail drawer. |
| **Admissions Enquiry Hub** | `src/features/enquiry/`, `src/services/enquiryService.ts` | Sticky Enquiry FAB, book-style modal, live character counters, dynamic WhatsApp routing toggle, and Formspree submission pipeline. |
| **Campus Photo Carousel** | `src/features/carousel/` | Hardware-accelerated touch/swipe slider with thumbnail synchronization, auto-advance timers, and pause-on-hover. |
| **Academic Pathway Explorer** | `src/features/academic/` | Interactive toggle switching between Grammar General curriculum (O/A-Levels) and Technical vocational workshops (Building Construction, Electricity, Mechanics, Fashion). |
| **Academic Dates Timeline** | `src/features/calendar/` | Interactive milestone timeline showing resumption, entrance interview dates, feast days, and GCE examination windows. |
| **FAQ Accordion & SEO** | `src/features/faq/` | Collapsible FAQ system synchronized with build-time Schema.org `FAQPage` JSON-LD structured data. |
| **Mobile Dock Tab Bar** | `src/css/layout/navigation-mobile.css` | iOS-style sticky bottom navigation tab bar appearing on devices `< 768px` for one-thumb navigation. |
| **Desktop Header Scroll Engine** | `src/ui/navigation/HeaderScroll.ts`, `ScrollSpy.ts` | Dynamic backdrop-blur header with scroll-intensity ramp, and ScrollSpy tracking active section links. |

---

### C. Prospectus-Specific Responsibilities (`prospectus.html`)

The prospectus is designed under a **document-first, zero-JS readable** architecture for official reference and offline PDF distribution:

| Component / Feature | Files | Functionality |
| :--- | :--- | :--- |
| **Static Document Structure** | `prospectus.html` | Full statutory student handbook readable with JavaScript disabled (all sections, rules, uniforms, and fee tables rendered directly in semantic HTML). |
| **Composition Root** | `src/pages/prospectus/prospectus.ts` | Ultra-lean bootstrap orchestrator (94 lines) initializing `ThemeManager` in lightweight `mode: 'fade'`, `MobileNavigation`, `OfflineIndicator`, and local `PdfExporter`. |
| **Native PDF / Print Trigger** | `PdfExporter` in `prospectus.ts` | Floating action button (`#downloadPdfBtn`) invoking native `window.print()` without DOM mutations. |
| **10-Module CSS Suite** | `src/css/prospectus/` | Isolated modular stylesheet suite: <br>• `variables.css`: Document tokens and semantic aliases.<br>• `base.css`: Typography foundation and master glass container.<br>• `header.css`: Streamlined sticky navigation header.<br>• `document.css`: Formal Latin diocese masthead & motto banner.<br>• `sections.css`: 12-column grid and elevated section cards.<br>• `tables.css`: Responsive fee schedule and uniform tables.<br>• `footer.css`: Institutional footer, caution notice box, and bottom strip.<br>• `motion.css`: Document reveals (`.reveal-on-scroll`) with zero-JS fallback.<br>• `responsive.css`: Breakpoints for 1024px, 768px, 480px, 360px.<br>• `print.css`: Dedicated `@media print` engine ensuring A4 portrait layout, 2-column paired cards, suppressed web chrome, and pure light ink-saving output. |

---

## 3. Repository File & Module Map

```text
/
├── index.html                               # Homepage Entry HTML
├── prospectus.html                          # Official Prospectus Entry HTML
├── metadata.json                            # AI Studio Applet Configuration
├── package.json                             # Dependencies & Scripts
├── tsconfig.json                            # TypeScript Bundler Config
├── vite.config.ts                           # Client Multi-Page Build Configuration
├── vite.sw.config.ts                        # Service Worker Build Configuration
│
├── public/                                  # Static Assets & PWA Icons
│   ├── manifest.json                        # Web App Manifest
│   └── assets/                              # Photography, SVGs, and Splash Screens
│
└── src/
    ├── main.ts                              # Homepage Script Entrypoint
    ├── prospectus.ts                        # Prospectus Script Entrypoint
    ├── sw.ts                                # Service Worker Core Implementation
    ├── sw-register.ts                       # Service Worker Registration Helper
    │
    ├── core/                                # Shared Core Layer
    │   ├── config/selectors.ts              # Centralized DOM Selectors (HOME & PROSPECTUS)
    │   ├── physics/spring.ts                # Spring Animation Helper
    │   ├── storage/storageKeys.ts           # LocalStorage Constants
    │   └── theme/                           # Shared Theme Engine
    │       ├── ThemeManager.ts              # Theme Lifecycle Controller
    │       └── themeTypes.ts                # Theme Types & Preferences
    │
    ├── data/                                # Shared Canonical Datasets
    │   ├── academicCalendar.ts              # Resumption, Exam & Milestone Dates
    │   ├── academicPrograms.ts              # General & Technical Curriculum
    │   ├── admissionRequirements.ts         # First/Second Cycle Admissions
    │   ├── campusSlides.ts                  # Carousel Slides Content
    │   ├── campusZones.ts                   # 6-Zone Campus Details
    │   ├── collegeProfile.ts                # Institutional Metadata & Principal
    │   ├── faqData.ts                       # Admissions & Boarding FAQs
    │   ├── newsStories.ts                   # News & Events Articles
    │   ├── pastAnnouncements.ts             # Historical Circulars Archive
    │   └── tuitionFees.ts                   # Official Fee Item Breakdown
    │
    ├── services/                            # Shared Network & Client Services
    │   ├── enquiryService.ts                # Formspree / WhatsApp Enquiry Handler
    │   └── serviceWorker.ts                 # Service Worker Bootstrap Service
    │
    ├── ui/                                  # Shared UI Primitives
    │   ├── dialog/ConfirmDialog.ts          # Accessible Glass Modal Dialog
    │   ├── navigation/                      # Navigation Controls
    │   │   ├── HeaderScroll.ts              # Progressive Blur Header Controller
    │   │   ├── MobileNavigation.ts          # Responsive Hamburger Drawer
    │   │   └── ScrollSpy.ts                 # Viewport Section Highlighting
    │   └── utils/                           # General UI Utilities
    │       ├── CounterAnimation.ts          # Number Roll-up Animation
    │       ├── ScrollReveal.ts              # IntersectionObserver Reveal
    │       ├── SmoothScroll.ts              # Smooth Anchor Scrolling
    │       └── TextSplitter.ts              # Letter/Word Splitting for Kinetic Text
    │
    ├── features/                            # Domain Feature Implementations
    │   ├── academic/AcademicLevelToggles.ts # Homepage Curriculum Toggles
    │   ├── announcement/                    # Announcement Bar & Modal
    │   ├── calendar/                        # Academic Dates Timeline
    │   ├── campus/VirtualCampusMap.ts       # 6-Zone Campus Map Tour
    │   ├── carousel/                        # Campus Carousel Slider
    │   ├── enquiry/                         # Enquiry Form & Typing Indicator
    │   ├── faq/                             # FAQ Section Controller
    │   ├── hero/                            # Hero Physics & Particles
    │   ├── location/LocationMapFacade.ts    # Google Maps Embed Facade
    │   ├── news/NewsStoriesRenderer.ts      # News Grid Renderer
    │   ├── offline/OfflineIndicator.ts      # Shared PWA Connectivity Toast
    │   ├── preloader/                       # Cinematic Site Preloader
    │   └── pwa/PwaInstallPrompt.ts          # In-App Installation Prompt
    │
    ├── pages/                               # Page Orchestration Controllers
    │   ├── home/home.ts                     # Homepage Composition Root
    │   └── prospectus/prospectus.ts         # Prospectus Composition Root
    │
    └── css/                                 # Style Architecture
        ├── main.css                         # Homepage Master Stylesheet
        ├── prospectus.css                   # Prospectus Master Stylesheet
        │
        ├── core/                            # Shared Base Styles
        │   ├── tokens.css                   # Brand Tokens & CSS Variables
        │   ├── theme.css                    # Dark Mode Overrides
        │   ├── reset.css                    # CSS Reset
        │   ├── typography.css               # Fluid Clamp Typography
        │   ├── utilities.css                # Utility Helper Classes
        │   └── accessibility.css            # Focus Rings & Reduced Motion
        │
        ├── components/                      # Shared & Homepage UI Components
        │   ├── buttons.css                  # Button Styles
        │   ├── cards.css                    # Generic Card Styles
        │   ├── theme-toggle.css             # Glassmorphic Sun/Moon Toggle
        │   ├── offline-indicator.css        # Reused PWA Offline Indicator
        │   ├── dialog.css                   # Glass Modal Dialog
        │   ├── forms.css                    # Form Controls
        │   ├── stats.css                    # Counter Stat Items
        │   ├── events.css                   # Event Cards
        │   ├── testimonials.css             # Testimonial Blockquotes
        │   └── cta-banner.css               # Call to Action Banner
        │
        ├── layout/                          # Layout Scaffolding
        │   ├── header.css                   # Glass Header & Nav
        │   ├── navigation.css               # Desktop Icon-First Navigation
        │   ├── navigation-mobile.css        # Mobile Drawer & Bottom Tab Bar
        │   ├── sections.css                 # Section Paddings & Gutters
        │   ├── footer.css                   # Homepage Footer
        │   └── responsive-legacy.css        # Legacy Breakpoint Adaptations
        │
        ├── features/                        # Homepage Feature Stylesheets
        │   ├── preloader.css                # Loading Animation
        │   ├── hero.css                     # Hero Section
        │   ├── announcement.css             # Notification Banner & Archive
        │   ├── carousel.css                 # Campus Carousel
        │   ├── academics.css                # Curriculum Cards
        │   ├── calendar-timeline.css        # School Dates Timeline
        │   ├── gce-results.css              # GCE Official Results Tables
        │   ├── campus-map.css               # 6-Zone Interactive Map
        │   ├── map-embed.css                # Map Location Card
        │   ├── enquiry.css                  # Enquiry Modal
        │   ├── enquiry-typing.css           # Real-Time Typing Dots
        │   ├── faq.css                      # FAQ Accordion
        │   └── pwa-wco.css                  # Window Controls Overlay
        │
        ├── motion/                          # Motion & Animation Library
        │   ├── keyframes.css                # Universal Keyframe Animations
        │   └── scroll-reveal.css            # Staggered Scroll Transitions
        │
        ├── ui/back-to-top.css               # Floating Scroll-To-Top Button
        │
        └── prospectus/                      # Prospectus Modular Stylesheets (10 Files)
            ├── variables.css                # Document Tokens
            ├── base.css                     # Reset & Base Typography
            ├── header.css                   # Sticky Header & Drawer
            ├── document.css                 # Masthead, Motto & Action Button
            ├── sections.css                 # 12-Column Grid & Section Cards
            ├── tables.css                   # Document Tables & Striping
            ├── footer.css                   # Footer & Notice Box
            ├── motion.css                   # Document Animations & A11y
            ├── responsive.css               # Breakpoint Rules
            └── print.css                    # A4 Print Engine & Chrome Suppression
```

---

## 4. CSS Variable Audit & Consolidation Plan

### Current State Analysis in `src/css/main.css` & Core CSS

A systematic inspection of `src/css/main.css` and its dependency graph reveals four overlapping naming conventions:

1. **Brand Hex Tokens (`src/css/core/tokens.css`)**:
   - Primitive scales: `--sj-navy-950` to `--sj-navy-600`, `--sj-gold-600` to `--sj-gold-200`.
   - Semantic color layer: `--color-brand-primary`, `--color-brand-accent`, `--color-brand-accent-soft`, `--color-brand-accent-bright`.
2. **Legacy Theme Aliases (`tokens.css` & `theme.css`)**:
   - `--primary`, `--primary-light`, `--primary-dark`
   - `--accent`, `--accent-light`, `--accent-glow`
   - `--gold-gradient`
3. **Document-First Aliases in Prospectus (`src/css/prospectus/variables.css`)**:
   - `--deep-blue: var(--sj-navy-900)`
   - `--royal-blue: var(--sj-navy-800)`
   - `--gold: var(--sj-gold-500)`
   - `--gold-light: var(--sj-gold-300)`
4. **Hardcoded Component Variables**:
   - In `src/css/components/dialog.css`: `--cd-accent: #c9a229`, `--cd-accent-glow: #d4a85a`, `--cd-surface-glass: rgba(7, 24, 46, 0.45)` directly re-declare brand colors instead of consuming `var(--color-brand-accent)` or `var(--sj-navy-900)`.
5. **Text & Surface Divergence Between Themes**:
   - In `tokens.css`: `--color-text-primary` (`#07182e`) is defined alongside `--text-dark` (`#1a1a2e`).
   - In `theme.css` (Dark Mode): `--text-dark` is correctly shifted to `#e0e0f0`, but `--color-text-primary` was omitted from dark overrides in some older modules.

---

### Step-by-Step Consolidation Roadmap

To streamline the theme system while preserving 100% backward compatibility and zero visual regression:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   LEVEL 1: PRIMITIVE TOKENS                            │
│  --sj-navy-950 .. 600   |   --sj-gold-600 .. 200                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ maps into
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LEVEL 2: SEMANTIC BRAND TOKENS                       │
│  --color-brand-primary: var(--sj-navy-800)                             │
│  --color-brand-accent:  var(--sj-gold-500)                             │
│  --color-surface-base:  #ffffff (light) / #121a2a (dark)               │
│  --color-text-base:     #07182e (light) / #e0e0f0 (dark)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ aliases for compatibility
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LEVEL 3: BACKWARD-COMPATIBLE ALIASES                 │
│  --primary: var(--color-brand-primary)                                 │
│  --accent:  var(--color-brand-accent)                                  │
│  --deep-blue: var(--sj-navy-900)  |  --gold: var(--color-brand-accent)   │
│  --cd-accent: var(--color-brand-accent) (Dialog component)             │
└────────────────────────────────────────────────────────────────────────┘
```

#### Action Items:
- **Phase A (Zero-Risk Alias Bridging)**:
  Update component-scoped variables (e.g. `--cd-accent`, `--cd-border-glass` in `dialog.css`) to resolve directly to semantic tokens:
  ```css
  --cd-accent: var(--color-brand-accent);
  --cd-accent-glow: var(--color-brand-accent-soft);
  --cd-surface-glass: rgba(7, 24, 46, 0.45);
  --cd-border-glass: rgba(201, 162, 41, 0.25);
  ```
- **Phase B (Dark Mode Parity)**:
  Ensure `src/css/core/theme.css` defines dark mode values for `--color-text-primary` (`#e6edf3`) and `--color-text-secondary` (`#8b949e`), matching the existing `--text-dark` / `--text-body` overrides.
- **Phase C (Shared Token Bridge)**:
  Maintain semantic aliases (`--primary`, `--accent`, `--deep-blue`, `--gold`) as strict aliases of the Level 2 semantic tokens. This guarantees that any existing CSS selector across the 35+ stylesheets continues to work seamlessly without search-and-replace hazards.
