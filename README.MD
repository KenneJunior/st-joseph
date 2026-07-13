# St. Joseph's Catholic Comprehensive College — Mbengwi

Official website for **St. Joseph's Catholic Comprehensive College (SJCCC), Mbengwi** — a Catholic institution in the Momo Division, North West Region of Cameroon, offering General, Technical, and Commercial education from Ordinary to Advanced Level.

> *"Edificamus Regnum Dei – Let us build the Kingdom of God"*

**Live site:** [saintjosephcolledge.vercel.app](https://saintjosephcolledge.vercel.app/)

---

## About the school

SJCCC Mbengwi provides holistic education through three pathways:

- **General Education** — academic curriculum leading to GCE Ordinary and Advanced Level
- **Technical Education** — hands-on skills training (Form 1–3) for direct employment or further technical study
- **Commercial Education** — business and commerce courses (Form 1–4)

The school reports a **98% GCE pass rate** for the 2025 session, under the guidance of Principal Rev. Fr. Joseph Gael Kenne.

## What's on the site

- Hero section with programme overview and animated enrollment statistics
- Academic pathway breakdown (General / Technical / Commercial)
- News & events listings (registration periods, open days, entrance interviews)
- Campus life photo gallery
- Alumni, parent, and faculty testimonials
- Embedded campus location map
- Contact form (Formspree-powered) and floating enquiry modal
- Light / dark mode toggle with system preference detection
- Dismissible announcement bar with dynamic layout offset

## Tech stack

- **TypeScript** (compiled to vanilla JS, no framework)
- Native Web APIs: `IntersectionObserver`, `ResizeObserver`, `matchMedia`, `localStorage`
- **Formspree** for contact form submission
- Hosted on **Vercel**

No build framework or UI library — the entire frontend is hand-rolled, class-based TypeScript operating directly on the DOM.

## Architecture

The site is composed of small, single-responsibility classes, each owning one piece of behaviour. An `App` class bootstraps all of them on `DOMContentLoaded`.

| Class                  | Responsibility                                                                                                           |
|------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `Preloader`            | Fades out the loading screen once the page has fully loaded                                                              |
| `ThemeManager`         | Light/dark mode — persists choice in `localStorage`, falls back to OS preference, listens for live OS theme changes      |
| `HeaderScroll`         | Adds a "scrolled" state to the header and shows/hides the back-to-top button                                             |
| `MobileNavigation`     | Hamburger menu — toggling, closing on link click, closing on outside click                                               |
| `AnnouncementBar`      | Dismissible top banner; keeps `--header-height` / `--bar-height` CSS variables in sync via `ResizeObserver`              |
| `Carousel`             | Campus life image slider — dot navigation, autoplay, hover-to-pause, swipe support                                       |
| `CounterAnimation`     | Animates the enrollment/pass-rate statistics from 0 once scrolled into view, using an eased `requestAnimationFrame` loop |
| `ScrollReveal`         | Fades elements in as they enter the viewport via `IntersectionObserver`                                                  |
| `SmoothScroll`         | Smooth in-page anchor scrolling, offset for the fixed header height                                                      |
| `HeroParticles`        | Generates decorative floating particles in the hero background                                                           |
| `AcademicLevelToggles` | Expand/collapse behaviour for academic pathway details                                                                   |
| `ScrollSpy`            | Highlights the active nav link based on which section is in view                                                         |
| `EnquiryModal`         | Floating action button that opens the enquiry modal; handles outside-click, `Escape`, and focus return                   |
| `EnquiryForm`          | Submits the enquiry form to Formspree via `fetch`, with loading/success/error states                                     |

### Design notes

- All classes are independent and DOM-driven — no shared state or central store.
- Most classes accept element **IDs or selectors** in their constructor rather than DOM nodes directly, so wiring happens in one place (`App.init()`).
- Where a class needs to expose a public check (e.g. `ThemeManager.isDark()`), it does so via a getter/method rather than a public field.
- Event handlers that are passed as callbacks (e.g. `HeaderScroll.onScroll`, `Carousel.nextSlide`) are defined as class field arrow functions to preserve `this` binding without manual `.bind()` calls.

## Project structure

```
.
├── index.html          # Page markup
├── styles.css           # Stylesheet (light/dark themes, responsive)
├── main.ts              # All TypeScript classes (this file)
└── assets/              # Campus photos, social preview image
```

## Running locally

```bash
# Install dependencies (if using a TS toolchain / bundler)
npm install

# Compile TypeScript
npx tsc

# Or, if using a dev server / bundler setup
npm run dev
```

Open `index.html` in a browser, or serve it with any static file server.

## Deployment

The site is deployed on **Vercel**. Pushing to the connected branch triggers an automatic build and deploy.

## Contact

**St. Joseph's Catholic Comprehensive College, Mbengwi**
Momo Division, North West Region, Cameroon

📞 +237 680 546 028 · +237 676 405 954 · +237 675 728 634

For enquiries, use the [contact form](https://saintjosephcolledge.vercel.app/#contact) on the site or email **info@sjcccmbengwi.org**.

---

© 2026 St. Joseph's Catholic Comprehensive College, Mbengwi. All Rights Reserved.
