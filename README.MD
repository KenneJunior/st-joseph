# St. Joseph's Catholic Comprehensive College — Mbengwi

<div align="center">
  <img src="public/assets/icons/512X512.svg" alt="SJCCC Mbengwi Crest" width="120" />

"Edificamus Regnum Dei — Let us build the Kingdom of God"

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://saintjosephcolledge.vercel.app)
[![TypeScript 5.x](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Status: Live](https://img.shields.io/badge/Status-Live-success?style=flat-square)](https://saintjosephcolledge.vercel.app)
</div>

---

## Table of Contents
1. [Overview](#overview)
2. [About the Institution](#about-the-institution)
3. [Academic Programmes](#academic-programmes)
4. [Feature Showcase](#feature-showcase)
5. [Technical Architecture](#technical-architecture)
6. [Component Library](#component-library)
7. [Design Philosophy](#design-philosophy)
8. [Performance & Accessibility](#performance--accessibility)
9. [Project Structure](#project-structure)
10. [Local Development](#local-development)
11. [Deployment Pipeline](#deployment-pipeline)
12. [Browser Support](#browser-support)
13. [Contributing](#contributing)
14. [License & Attribution](#license--attribution)
15. [Contact & Admissions](#contact--admissions)

---

## Overview

The official digital presence of **St. Joseph's Catholic Comprehensive College (SJCCC)** — a premier Catholic secondary institution nestled in the heart of Mbengwi, Momo Division, in the North West Region of Cameroon.

This platform serves as the school's digital gateway, providing prospective students, parents, alumni, and the broader community with comprehensive information about academic programmes, campus life, admissions, and institutional values.

* **Live Production URL:** [saintjosephcolledge.vercel.app](https://saintjosephcolledge.vercel.app)

---

## About the Institution

Founded on Catholic educational principles, SJCCC Mbengwi is committed to nurturing well-rounded individuals through a tripartite educational model that balances academic rigour with spiritual formation and practical skill development.

### Leadership
Under the visionary guidance of Principal **Rev. Fr. Joseph Gael Kenne**, the institution has consistently maintained academic excellence, achieving a remarkable **98% GCE pass rate** in the 2025 examination session.

### Core Values
* **Faith** — Rooted in Catholic tradition and spiritual formation
* **Excellence** — Uncompromising commitment to academic distinction
* **Integrity** — Building character through moral and ethical education
* **Service** — Preparing students to serve their communities and the Kingdom of God

---

## Academic Programmes

SJCCC offers three distinct educational pathways, each designed to cater to diverse student aptitudes and career aspirations:

### 📚 General Education
A comprehensive academic curriculum preparing students for the GCE Ordinary Level and GCE Advanced Level examinations. This pathway provides a strong foundation for university education across the sciences, arts, and humanities.
* **Subjects include:** Mathematics, English Language, French, Physics, Chemistry, Biology, Economics, Geography, History, Literature, Religious Studies, and Citizenship.

### 🔧 Technical Education
A hands-on, skills-based programme spanning Forms 1–3, equipping students with practical competencies for direct employment or progression to specialised technical institutions.
* **Workshop areas include:** Woodwork, Metalwork, Technical Drawing, Building Construction, Electrical Installation, and Auto Mechanics.

---

## Feature Showcase

### 🎨 Theming & Personalisation
* **Adaptive Light/Dark Mode:** Persistent theme toggle with system preference detection via `window.matchMedia('(prefers-color-scheme: dark)')`. User choice is preserved in `localStorage` and survives across sessions.
* **Animated Transitions:** Theme switches employ `clip-path` and `backdrop-filter` animations for a polished, cinema-grade visual experience.

### 🧭 Navigation & Layout
* **Progressive Blur Header:** A fixed navigation bar with a dynamic `backdrop-filter: blur()` that intensifies based on scroll position, providing a frosted-glass effect without obscuring page content.
* **Responsive Mobile Menu:** An off-canvas slide-in panel with staggered entrance animations, backdrop overlay, and gold-accented interactive states.
* **Active Section Tracking:** `IntersectionObserver`-powered ScrollSpy highlights the current navigation link as users scroll through page sections.

### 📊 Data Visualisation
* **Animated Statistics:** Key metrics (enrollment numbers, pass rates, teaching staff) count up from zero using an eased `requestAnimationFrame` animation triggered on scroll into view.
* **Academic Pathway Cards:** Expandable/collapsible subject listings with smooth `max-height` transitions.

### 📸 Media & Content
* **Campus Carousel:** Touch-enabled, auto-advancing image gallery with dot indicators, hover-to-pause behaviour, and swipe gesture support.
* **Hero Particles:** Procedurally generated floating particles in the hero section background, adding depth and visual intrigue.
* **Scroll-Triggered Reveals:** Content sections fade and slide into view as they enter the viewport, creating an engaging narrative flow.

### 📬 Communication
* **Enquiry Modal:** A floating action button opens a book-style animated modal with staggered form field entrance, keyboard accessibility (`Escape` to close), and focus management.
* **Contact Form:** Formspree-powered submission with loading, success, and error states. Includes a WhatsApp routing toggle for direct messaging.
* **Announcement Bar:** Dismissible notification banner with persistent dismissal state and dynamic layout offset calculation via `ResizeObserver`.

### ♿ Accessibility
* **Skip Navigation Link:** A hidden link appears on focus for keyboard users to bypass navigation.
* **Semantic HTML:** Proper heading hierarchy, ARIA attributes, and landmark regions.
* **Focus Management:** Visible focus indicators, logical tab order, and focus restoration when modals close.
* **Reduced Motion:** Respects `prefers-reduced-motion` media query where applicable.

---

## Technical Architecture

The site is architected as a **zero-dependency, class-based TypeScript application** operating directly on the DOM. There are no frameworks, no virtual DOM, and no build-step abstractions — just meticulously crafted vanilla code that leverages modern browser APIs.

### Design Principles
1. **Single Responsibility:** Each class owns exactly one behavioural concern.
2. **Constructor Injection:** Dependencies (element IDs, selectors) are passed via constructors, enabling centralised wiring in `App.init()`.
3. **DOM-Driven State:** State lives in the DOM (`classList`, `data-*` attributes, CSS custom properties), not in JavaScript objects.
4. **Progressive Enhancement:** Core content is accessible without JavaScript; interactivity layers on top.
5. **Event Delegation:** Where appropriate, events are handled at parent levels to minimise listener count.

### Key Web APIs Employed
| API | Usage |
| :--- | :--- |
| **IntersectionObserver** | ScrollSpy, ScrollReveal, CounterAnimation triggers |
| **ResizeObserver** | AnnouncementBar and header height synchronisation |
| **matchMedia** | System theme preference detection and live monitoring |
| **requestAnimationFrame** | Counter animations, smooth scroll handling |
| **localStorage** | Theme preference, announcement dismissal, animation state |
| **clip-path / backdrop-filter** | Theme transitions, header progressive blur |
| **CSS Custom Properties** | Theming, dynamic layout offsets |

---

## Component Library

| Class | File | Responsibility |
| :--- | :--- | :--- |
| **Preloader** | `main.ts` | Manages loading screen lifecycle with fade-out transition |
| **ThemeManager** | `main.ts` | Light/dark mode orchestration with persistence and system fallback |
| **HeaderScroll** | `main.ts` | Scroll-responsive header styling and back-to-top button visibility |
| **MobileNavigation** | `main.ts` | Off-canvas menu with toggle, backdrop, and link-dismiss behaviour |
| **AnnouncementBar** | `main.ts` | Dismissible notification with dynamic CSS variable updates |
| **Carousel** | `main.ts` | Touch-enabled, auto-advancing image slider with pause-on-hover |
| **CounterAnimation** | `main.ts` | Eased number counting animation triggered on scroll |
| **ScrollReveal** | `main.ts` | Viewport-triggered fade-in animations |
| **SmoothScroll** | `main.ts` | Anchor link navigation with header offset compensation |
| **HeroParticles** | `main.ts` | Procedural floating particle generation |
| **AcademicLevelToggles** | `main.ts` | Expandable/collapsible academic pathway accordions |
| **ScrollSpy** | `main.ts` | Active navigation link tracking based on viewport position |
| **EnquiryModal** | `main.ts` | Book-style animated modal with accessibility features |
| **EnquiryForm** | `main.ts` | Form submission handling with WhatsApp routing option |

---

## Design Philosophy

### Visual Identity
The design language draws from the institution's Catholic heritage and Cameroonian context:
* **Deep Navy (`#06142b`)** — Stability, tradition, and academic gravitas
* **Burnished Gold (`#c8963e`)** — Excellence, divine light, and institutional prestige
* **Playfair Display** — Elegant serif for headings, evoking scholarly tradition
* **Inter** — Clean, modern sans-serif for body text, ensuring readability

### Responsive Strategy
The layout adapts across four breakpoint tiers:
* **Desktop (1025px+)** — Full horizontal navigation, multi-column grids
* **Tablet Landscape (769px–1024px)** — Compact navigation, reduced carousel height
* **Tablet Portrait (481px–768px)** — Off-canvas mobile menu, stacked layouts
* **Mobile (<481px)** — Full-width components, optimised touch targets

### Animation Philosophy
Animations are purposeful, not decorative:
* Entrance animations guide attention to new content
* Micro-interactions (hover states, button presses) provide tactile feedback
* Transition effects (theme switching, modal opening) create spatial understanding
* Performance is prioritised via GPU-accelerated properties (`transform`, `opacity`, `filter`)

---

## Performance & Accessibility

### Performance Targets
* **First Contentful Paint:** <1.5s on 3G
* **Largest Contentful Paint:** <2.5s
* **Cumulative Layout Shift:** <0.1
* **Total Blocking Time:** <200ms

### Accessibility Compliance
* WCAG 2.1 Level AA conformance
* Keyboard-navigable interactive elements
* Screen reader-friendly semantic structure
* Sufficient colour contrast ratios (4.5:1 minimum)
* Focus indicators on all interactive elements

---

## Project Structure

```text
sjccc-mbengwi/
├── index.html              # Single-page application markup
├── style.css               # Complete stylesheet with theming
├── main.ts                 # All TypeScript classes & bootstrap
├── sw-register.ts          # Service worker registration
├── assets/
│   ├── Students.jpeg       # Hero background image
│   ├── Campus.jpeg         # Campus life section background
│   └── favicon.ico         # Site favicon
├── .vercel/
│   └── project.json        # Vercel deployment configuration
├── README.md               # This documentation
└── LICENSE                 # MIT License
```

---

## Local Develeopment

### Prerequisites
* **Node.js** (v18.x or later)
* **npm** (v9.x or later)
* **Vercel CLI** (optional, for local deployment testing)

### Installation
```bash
npm install
# Clone the repository
git clone [https://github.com/your-org/sjccc-mbengwi.git](https://github.com/your-org/sjccc-mbengwi.git)
cd sjccc-mbengwi

# Install TypeScript (if not globally installed)
npm install -g typescript

# Compile TypeScript to JavaScript
tsc main.ts --target ES2020 --module ESNext --outDir dist/

# Serve with any static file server
npx serve .
# or
python3 -m http.server 8080# Clone the repository
git clone [https://github.com/your-org/sjccc-mbengwi.git](https://github.com/your-org/sjccc-mbengwi.git)
cd sjccc-mbengwi

# Install TypeScript (if not globally installed)
npm install -g typescript

# Compile TypeScript to JavaScript
tsc main.ts --target ES2020 --module ESNext --outDir dist/

# Serve with any static file server
npx serve .
# or
python3 -m http.server 8080
```

### Deployment workflow
```bash
# Watch mode for automatic recompilation
tsc main.ts --target ES2020 --module ESNext --outDir dist/ --watch

# In a separate terminal, serve the files
npx serve .
```

### Deployment Pipeline
The project is deployed via **Vercel**, which automatically builds and serves the application upon commits
    to the `main` branch. The deployment process includes:

### Build Configuration
* **Framework Preset:** None (Static Site)
* Build Command: `tsc main.ts --target ES2020 --module ESNext --outDir dist/`
* Output Directory: `dist/`
* install commands: `npm install -g typescript`

### Environment Variables
| Variable | Purpose |
| :--- | :--- |
| `FORMSPREE_ENDPOINT` | Form submission endpoint URL |

---

## Browser Support

| Browser | Minimum Version |
| :--- | :--- |
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Opera | 76+ |
| Samsung Internet | 15+ |

*Note: Internet Explorer is not supported due to reliance on modern APIs (`IntersectionObserver`, `CSS Custom Properties`, `backdrop-filter`).*

---

## Contributing

Contributions that align with the project's design philosophy are welcome.

### Guidelines
1. **Respect the architecture** — New features should be self-contained classes.
2. **No framework dependencies** — All code must be vanilla TypeScript/JavaScript.
3. **Test across breakpoints** — Ensure responsive behaviour at all defined breakpoints.
4. **Maintain accessibility** — New interactive elements must be keyboard-accessible.
5. **Document your code** — JSDoc comments on public methods.

### Pull Request Process
1. Fork the repository and create a feature branch.
2. Implement your changes with appropriate tests.
3. Ensure the site builds and functions correctly.
4. Submit a PR with a clear description of changes and screenshots if applicable.

---

## License & Attribution

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full terms.

### Image Credits
* Campus photography: © SJCCC Mbengwi Media Team
* Background imagery: Licensed from Unsplash

---

## Contact & Admissions

<div align="center">
  <strong>St. Joseph's Catholic Comprehensive College, Mbengwi</strong><br>
  Momo Division, North West Region, Cameroon<br><br>

📞 <strong>Admissions Office</strong><br>
Tel: <a href="tel:+237683758002">+237 683 758 002</a><br>
WhatsApp: <a href="https://wa.me/237672829014">+237 672 829 014</a><br><br>

✉️ <strong>Email</strong><br>
<a href="mailto:saintjosephcollege@gmail.com">mailto:saintjosephcollege@gmail.com</a><br><br>

🌐 <strong>Website</strong><br>
<a href="https://saintjosephcolledge.vercel.app">saintjosephcolledge.vercel.app</a><br><br>

📋 <strong>Enquire Online</strong><br>
Use the contact form for admissions enquiries, school visits, or general information.<br><br>

<em>"Train up a child in the way he should go, and when he is old he will not depart from it." — Proverbs 22:6</em><br><br>

© 2026 St. Joseph's Catholic Comprehensive College, Mbengwi. All Rights Reserved.
</div>