# SJCCC — Phase 3: Controlled Surface System Implementation Plan

**Project:** St. Joseph's Catholic Comprehensive College (SJCCC), Mbengwi, Momo Division, North-West Region, Cameroon  
**Repository:** `KenneJunior/st-joseph`  
**Scope:** Homepage section backgrounds, semantic surface tokens, section boundaries, and light/dark theme consistency  
**Phase:** 3 — Implementation Planning & Controlled Execution  
**Standard:** WCAG 2.2 AA/AAA, CSS Cascade Level 5, Zero Regression Standard  

---

## 1. Executive Summary & Approved Decisions Baseline

All three conditional pre-implementation gates from Phase 2 Section 12 have been explicitly resolved and approved:

1. **Light Mode Canvas Temperature:**  
   **Warm Academic Ivory (`#F4F1EA`)** is approved as the global page canvas (`--bg-canvas`) and base section surface (`--bg-section`). This eliminates pure-white glare (`#ffffff`) and sterile monochrome while respecting SJCCC's historic collegiate identity.
2. **News & Events Dark Mode Treatment:**  
   **Solid Deep Navy (`#0E1828`)** matching canvas is approved for `#news-events` in dark mode. This standardizes thematic pacing across both themes and allows event cards (`#1A2D44`) to lift cleanly off the canvas.
3. **Pre-Footer Transition Styling:**  
   **Subtle vertical gradient ease** (`linear-gradient(to bottom, var(--bg-canvas) 0%, rgba(7, 24, 46, 0.08) 100%)` in light mode, with dark equivalent) on `.cta-section-wrapper` is approved to eliminate the pre-footer visual cliff before entering the terminal navy footer (`#050E1C`).

---

## 2. Definitive File Allowlist

In strict adherence to Phase 2 Section 11 and Section 2 guardrails, source-code modifications are confined strictly to these allowlisted files:

| # | Target File Path | Primary Architectural Responsibility |
|---|------------------|---------------------------------------|
| 1 | `/src/css/core/tokens.css` | Define semantic surface tokens, boundary token, and darken muted text to `#555770` for WCAG AA |
| 2 | `/src/css/core/theme.css` | Define dark mode semantic surface hierarchy, elevate `--surface-card` to `#1A2D44`, resolve card camouflage |
| 3 | `/src/css/core/reset.css` | Map `body` background-color to `var(--bg-canvas, var(--bg-white))` |
| 4 | `/src/css/layout/sections.css` | Map `.cream-bg` to `--bg-section`, `.alt-bg` to `--bg-section-alt`, add 1px hairline boundary; remove static `.section-divider` duplicates |
| 5 | `/src/css/features/calendar-timeline.css` | Remap `.school-dates-section` to `--bg-section-alt` and add boundary in light & dark |
| 6 | `/src/css/features/gce-results.css` | Remap `.gce-results-section` to `--bg-section-feature` and add boundary in light & dark |
| 7 | `/src/css/features/map-embed.css` | Remap `.location-section` to `--bg-section-alt`; eliminate hardcoded `#040d1a` |
| 8 | `/src/css/components/cta-banner.css` | Implement `.cta-section-wrapper` with gradient ease into footer and boundary line |
| 9 | `/src/css/components/stats.css` | Scope typography on `.stats-section` to remove dependency on inline HTML styles |
| 10 | `/src/css/components/events.css` | Standardize `.bg-image-news` to `--bg-section` in light mode and solid deep navy in dark mode |
| 11 | `/index.html` | Sanitize inline `style="color:#fff;"` on `#about` (lines 742–746); add `cta-section-wrapper` class to section at line 2403 |

*Strict Isolation Note: No TypeScript controllers (`VirtualCampusMap.ts`, `Carousel.ts`, `SchoolDatesTimeline.ts`, `TimelineDragScroller.ts`, `ThemeManager.ts`), test suites, or Prospectus files (`prospectus.html`, `/src/css/prospectus/*`) will be modified.*

---

## 3. Macro Surface Rhythm Architecture (DOM Sequence)

The 15 DOM sections will flow in this intentional academic macro-rhythm:

```
[Header & Announcement]   -> --surface-inverse (Deep Navy Glass & Bar)
[Hero Section]           -> --surface-inverse (Immersive Photography & Vignette)
[Community Stats #about] -> --surface-inverse (Fixed Students Photo + Calibrated Overlay)
       ── 1px hairline boundary ──
[Academics #academics]   -> --bg-section (#F4F1EA Ivory / #0E1828 Dark Navy) + Raised Cards (#FAF7F0 / #1A2D44)
       ── 1px hairline boundary ──
[School Dates #dates]    -> --bg-section-alt (#E8EDF3 Slate-Blue / #132238 Midnight) + Raised Cards
       ── 1px hairline boundary ──
[News & Events #news]    -> --bg-section (#F4F1EA Ivory / #0E1828 Dark Navy) + Raised Cards
       ── 1px hairline boundary ──
[GCE Results #results]   -> --bg-section-feature (#EDE5D8 Sandstone / #182A41 Feature Slate) + Gold Glow
       ── 1px hairline boundary ──
[Campus Carousel #campus]-> --bg-section-alt (#E8EDF3 Slate-Blue / #132238 Midnight) + 3D Slides
       ── 1px hairline boundary ──
[Campus Map #map]        -> --bg-section (#F4F1EA Ivory / #0E1828 Dark Navy)
       ── 1px hairline boundary ──
[FAQ #faq]               -> --bg-section-feature (#EDE5D8 Sandstone / #182A41 Feature Slate) + Accordions
       ── 1px hairline boundary ──
[Location #location]     -> --bg-section-alt (#E8EDF3 Slate-Blue / #132238 Midnight) + Location Card
       ── 1px hairline boundary ──
[Admissions CTA Wrapper] -> --bg-canvas + Vertical Gradient Ease into Footer
[Footer #contact]        -> --surface-inverse (#050E1C Terminal Navy)
```

---

## 4. Phased Implementation Sequence

### Stage 1: Core Token Engine Calibration
**Files:** `/src/css/core/tokens.css`, `/src/css/core/theme.css`

1. **`tokens.css` (:root additions & remapping):**
   - `--bg-canvas: #F4F1EA;`
   - `--bg-white: #F4F1EA;` (backward-compatibility alias for body)
   - `--bg-section: #F4F1EA;`
   - `--bg-section-alt: #E8EDF3;`
   - `--bg-section-feature: #EDE5D8;`
   - `--surface-card: #FAF7F0;`
   - `--surface-card-hover: #FFFFFF;`
   - `--color-text-muted: #555770;` (WCAG AA remediation: 6.11:1 on Ivory)
   - `--text-muted: #555770;`
   - `--section-boundary: rgba(7, 24, 46, 0.06);`

2. **`theme.css` (html.dark-mode, body.dark-mode additions & remapping):**
   - `--bg-canvas: #0E1828;`
   - `--bg-white: #0E1828;`
   - `--bg-section: #0E1828;`
   - `--bg-section-alt: #132238;`
   - `--bg-section-feature: #182A41;`
   - `--surface-card: #1A2D44;` (P0 Camouflage Fix: 16-point luminance delta above `#0E1828`)
   - `--surface-card-hover: #223854;`
   - `--section-boundary: rgba(255, 255, 255, 0.06);`

### Stage 2: Layout & Feature Stylesheets Migration
**Files:** `/src/css/core/reset.css`, `/src/css/layout/sections.css`, `/src/css/features/calendar-timeline.css`, `/src/css/features/gce-results.css`, `/src/css/features/map-embed.css`, `/src/css/components/cta-banner.css`, `/src/css/components/stats.css`, `/src/css/components/events.css`

1. **`reset.css`:**
   - Update `body` to `background-color: var(--bg-canvas, var(--bg-white));`

2. **`sections.css`:**
   - `.cream-bg`: `background-color: var(--bg-section); border-top: 1px solid var(--section-boundary); max-width: 100%;`
   - `.alt-bg`: `background-color: var(--bg-section-alt); border-top: 1px solid var(--section-boundary); max-width: 100%;`
   - Remove duplicate static `.section-divider` media queries (lines 46–84) to eliminate cascade conflict and preserve modern fluid `clamp()` formula in `typography.css`.

3. **`calendar-timeline.css`:**
   - `.school-dates-section`: `background: var(--bg-section-alt); border-top: 1px solid var(--section-boundary);`
   - `body.dark-mode .school-dates-section`: `background: var(--bg-section-alt);`

4. **`gce-results.css`:**
   - `.gce-results-section`: `background: var(--bg-section-feature); border-top: 1px solid var(--section-boundary);`
   - Dark mode: `background: var(--bg-section-feature);`

5. **`map-embed.css`:**
   - `.location-section`: `background-color: var(--bg-section-alt); border-top: 1px solid var(--section-boundary);`
   - Remove hardcoded `#040d1a` dark-mode override; use `background-color: var(--bg-section-alt);`

6. **`cta-banner.css`:**
   - Define `.cta-section-wrapper`:
     ```css
     .cta-section-wrapper {
       background: var(--bg-canvas);
       background: linear-gradient(to bottom, var(--bg-canvas) 0%, rgba(7, 24, 46, 0.08) 100%);
       border-top: 1px solid var(--section-boundary);
     }
     html.dark-mode .cta-section-wrapper,
     body.dark-mode .cta-section-wrapper {
       background: var(--bg-canvas);
       background: linear-gradient(to bottom, var(--bg-canvas) 0%, rgba(2, 9, 20, 0.6) 100%);
       border-top: 1px solid var(--section-boundary);
     }
     ```

7. **`stats.css`:**
   - Add scoped typography rules for `.stats-section`:
     ```css
     .stats-section {
       color: #ffffff;
     }
     .stats-section .section-title {
       color: #ffffff;
     }
     .stats-section .section-label {
       color: var(--accent-glow);
     }
     .stats-section .section-divider {
       background: var(--accent-glow);
     }
     ```

8. **`events.css`:**
   - `.bg-image-news`: `background: var(--bg-section); border-top: 1px solid var(--section-boundary);`
   - In dark mode: standardize to solid `var(--bg-section)` (Solid Deep Navy `#0E1828`) per Decision 2.

### Stage 3: Document Markup Sanitization
**Files:** `/index.html`

1. **Section `#about` (Lines 742–746):**
   - Remove inline `style="color:#fff;"` from `<section id="about">`
   - Remove inline `style="color:var(--accent-glow);"` from `<span class="section-label">`
   - Remove inline `style="color:#fff;"` from `<h2 class="section-title">`
   - Remove inline `style="background:var(--accent-glow);"` from `<div class="section-divider">`
   *(All handled cleanly by scoped CSS in `stats.css`)*

2. **Section Admissions CTA (Line 2403):**
   - Change `<section class="section-padding">` to `<section class="section-padding cta-section-wrapper">`

---

## 5. Technical Verification & Acceptance Criteria

1. **Compilation & Build:**
   - `compile_applet` must return SUCCESS with zero Vite bundle errors.
2. **Linting:**
   - `lint_applet` must return 0 syntax errors and 0 missing imports.
3. **Automated Unit & Audit Test Suite:**
   - `npx vitest run` must execute all 18 test suites (179 tests) with 100% pass rate.
   - Specific checks include `html-integrity.test.ts`, `data-integrity.test.ts`, and component suites.
4. **Contrast & Silhouette Calculations:**
   - Normal text on `--bg-canvas` (`#F4F1EA`): 15.86:1 (Passes WCAG AAA)
   - Muted text (`#555770`) on `--bg-canvas` (`#F4F1EA`): 6.11:1 (Passes WCAG AA, req. ≥ 4.5:1)
   - Dark mode card (`#1A2D44`) on dark canvas (`#0E1828`): 16-point luminance delta; zero card camouflage.
5. **Zero Layout Regressions:**
   - No horizontal scrollbars.
   - Mobile and tablet clamp rules in `typography.css` scale cleanly without media query conflicts.
