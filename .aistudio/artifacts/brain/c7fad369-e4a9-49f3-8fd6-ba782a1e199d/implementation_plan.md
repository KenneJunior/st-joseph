# SJCCC — Uniform & Prominent H2 Heading Typography Scale

**Project:** St. Joseph's Catholic Comprehensive College (SJCCC), Mbengwi  
**Repository:** `KenneJunior/st-joseph`  
**Feature:** Mobile H2 Typography Expansion & System-Wide Heading Sizing Harmonization  
**Evaluation Standards:** Fluid Typography Clamp Math, WCAG 2.2 AA Contrast & Readability, CSS Cascade Order  

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Currently, `<h2>` elements and `.section-title` headings in `index.html` suffer from aggressive mobile downscaling across multiple stylesheets. In `src/css/core/typography.css`, `--fluid-h2` starts at an undersized `1.05rem` (~16.8px), and `src/css/layout/responsive-legacy.css` further overrides `.section-title` down to `0.98rem` (~15.6px) at 480px and `0.90rem` (~14.4px) at 360px—effectively rendering major institutional section titles at body copy size. Furthermore, modal headers (`#enquiryTitle`, `#pastAnnouncementsTitle`) and the CTA banner (`.cta-banner h2`) had disparate sizes.
>
> This plan establishes a uniform, impactful, and responsive font scale for **all** `<h2>` tags across `index.html`.

- **Confirmed Decision 1: Mobile Minimum Size Enhancement**:
  - Elevate mobile H2 base size from ~0.90rem–1.05rem (14px–17px) to **1.45rem–1.55rem (~23px–25px)** on small mobile screens (360px–414px).
  - This provides a +45% to +60% visual boost on smartphones, making section headings immediately clear, prestigious, and readable.
- **Confirmed Decision 2: 100% Uniformity Across All H2 Elements**:
  - Every H2 in `index.html` will share the identical typography token:
    1. Page Section Titles (`.section-title`): Academic Rigor, Academic Pathways, School Dates, Latest News, GCE Results, Life at SJCCC, Campus Map, Testimonials, FAQ, Location Map.
    2. Call-to-Action Banner (`.cta-banner h2`): *"Ready to Join Our Family?"*
    3. Interactive Modals (`#enquiryTitle`, `#pastAnnouncementsTitle`).
- **Confirmed Decision 3: Removal of Overriding Responsive Clamps**:
  - Deprecate downscaling overrides in `src/css/layout/responsive-legacy.css` that degrade `.section-title` below the core `--fluid-h2` scale.
  - Maintain fluid line-height (`1.2` to `1.25`) to prevent multiline titles from colliding on narrow devices.

---

## 1. Overview & Core Concept

- **What It Does**:
  Calibrates and unifies the typography engine for all `<h2>` headings in `index.html`. It replaces legacy sub-1rem mobile clamp limits with a prominent fluid scale (`clamp(1.45rem, 1.15rem + 1.45vw, 2.50rem)`), ensuring equal size, visual hierarchy, and balanced rhythm across mobile, tablet, and desktop viewports.
- **Target Audience / Persona**:
  Prospective students, parents, and community members browsing SJCCC on mobile phones (iPhone, Samsung Galaxy, budget Android devices with 360px–414px screens) who require legible, scannable section anchors.
- **Key Value**:
  Eliminates the "tiny text" impression on mobile, reinforces institutional prestige, and guarantees visual consistency across every section.

---

## 2. User Experience & Visual Design

### Typography Scale Comparison

```
┌────────────────────────────────────────────────────────────────────────┐
│                      H2 TYPOGRAPHY SCALE COMPARISON                    │
├──────────────────────┬────────────────────────┬────────────────────────┤
│ Viewport             │ Previous Scale         │ New Uniform Scale      │
├──────────────────────┼────────────────────────┼────────────────────────┤
│ Small Mobile (360px) │ 0.90rem – 1.05rem      │ 1.45rem (~23.2px)      │
│ Standard Mobile (414)│ 0.98rem – 1.14rem      │ 1.52rem (~24.3px)      │
│ Tablet (768px)       │ 1.12rem – 1.35rem      │ 1.85rem (~29.6px)      │
│ Desktop (1200px+)    │ 1.95rem – 2.70rem      │ 2.40rem – 2.50rem      │
└──────────────────────┴────────────────────────┴────────────────────────┘
```

### Affected Index.html Headings

1. `<h2 class="section-title">Academic Rigor &amp; Caring Community</h2>`
2. `<h2 class="section-title stagger-item">Academic &amp; Technical Pathways</h2>`
3. `<h2 class="section-title" id="schoolDatesTitle">Upcoming School Dates &amp; Milestones</h2>`
4. `<h2 class="section-title stagger-item">Latest News &amp; Events</h2>`
5. `<h2 class="section-title" id="gceResultsTitle">Official 2026 GCE Examination Results</h2>`
6. `<h2 class="section-title">Life at SJCCC Mbengwi</h2>`
7. `<h2 class="section-title" id="campusMapTitle">Interactive Virtual Campus Map</h2>`
8. `<h2 class="section-title">What Our Family Says</h2>`
9. `<h2 class="section-title" id="faqTitle">Frequently Asked Questions</h2>`
10. `<h2 class="section-title">Our Location &amp; Campus Grounds</h2>`
11. `<div class="cta-banner"> <h2>Ready to Join Our Family?</h2> ... </div>`
12. `<div class="enquiry-modal"> <h2 id="enquiryTitle">Send Us an Enquiry</h2> ... </div>`
13. `<div class="announcements-modal"> <h2 id="pastAnnouncementsTitle">Historical Announcements</h2> ... </div>`

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Mathematical Fluid Clamp vs. Fixed Media Queries**:
  - *Chosen Approach*: Define `--fluid-h2: clamp(1.45rem, 1.15rem + 1.45vw, 2.50rem);` as the single source of truth in `src/css/core/typography.css`.
  - *Why*: Delivers continuous, pixel-perfect scaling across every viewport width without jarring breakpoint jumps, while strictly enforcing the 1.45rem floor on mobile devices.
  - *Alternatives Considered*: Writing distinct `@media (max-width: 480px)` overrides for each element; rejected because it fragments typography management and caused the existing inconsistency.

- **Decision 2: Section Title Line-Height and Text-Wrap Balancing**:
  - *Chosen Approach*: Pair the increased font size with `line-height: 1.22`, `letter-spacing: -0.015em`, and `text-wrap: balance`.
  - *Why*: Prevents multiline mobile headings from stacking awkwardly or creating orphan words, keeping section headers visually compact even with larger type.

- **Decision 3: Harmonizing Legacy Responsive Overrides**:
  - *Chosen Approach*: Remove or re-target `.section-title` and `.cta-banner h2` font-size resets in `src/css/layout/responsive-legacy.css`.
  - *Why*: If legacy responsive stylesheets declare lower font sizes with higher specificity or later cascade order, the typography variable would be overridden on mobile.

---

## 4. Technical Architecture & Cascade Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CSS CASCADE & TOKENS                           │
├────────────────────────────────────────────────────────────────────────┤
│  src/css/core/typography.css                                           │
│  │                                                                     │
│  ├── :root { --fluid-h2: clamp(1.45rem, 1.15rem + 1.45vw, 2.50rem); }  │
│  │                                                                     │
│  ├── h2, .h2 { font-size: var(--fluid-h2); }                           │
│  │                                                                     │
│  └── .section-title { font-size: var(--fluid-h2); }                    │
│                                                                        │
│  src/css/layout/responsive-legacy.css                                  │
│  │                                                                     │
│  └── Synchronize @media (max-width: 768px/480px/360px) so              │
│      .section-title and .cta-banner h2 do not downscale below          │
│      var(--fluid-h2).                                                  │
│                                                                        │
│  Interactive Modals & CTA                                              │
│  │                                                                     │
│  └── #enquiryTitle, #pastAnnouncementsTitle, .cta-banner h2 inherit    │
│      and align with var(--fluid-h2).                                   │
└────────────────────────────────────────────────────────────────────────┘
```

### Verification & Testing Plan
- Test on 360px viewport (Galaxy S8/small mobile baseline).
- Test on 390px–414px viewport (iPhone 12/13/14/15/Pro Max).
- Test on 768px viewport (iPad / tablet portrait).
- Test on 1200px+ viewport (desktop).
- Confirm every `<h2>` in `index.html` displays the exact same computed font size.
