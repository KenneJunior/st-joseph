# Mbengwi Map SVG Integration & Facade Enhancement

Replace the synthetic SVG map illustration in the Campus Location section with the authentic Mbengwi map asset (`/assets/mbengwi-map.svg`), maintaining full vector fidelity, uncropped framing, and interactive overlay markers.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the Phase 1 clarification:

- **Confirmed Decision 1 (Overlays)**: Keep the SJCCC campus pin indicator, geographic coordinates badge, and the "Load Interactive Map" Google Maps embed toggle button layered over the authentic Mbengwi map.
- **Confirmed Decision 2 (Framing & Aspect Ratio)**: Fit the entire 742×850 portrait SVG vector graphic cleanly within the facade viewport using uncropped aspect-ratio preservation (`object-fit: contain`), paired with the deep navy institutional backdrop (`#07182E`).

---

### 1. Overview & Core Concept

- **What It Does**: Upgrades the Campus Location section from a decorative conceptual vector schematic to an authentic regional map of Mbengwi loaded directly from `/assets/mbengwi-map.svg`.
- **Target Audience / Persona**: Prospective students, visiting parents, alumni, and educational inspectors seeking clear spatial orientation of SJCCC in Mbengwi, Momo Division.
- **Key Value**: Provides accurate regional geographic context while preserving offline reliability and the on-demand Google Map embed feature.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Visual Orientation**: Visitors scrolling to the "Our Location & Campus Grounds" section see the detailed, high-resolution Mbengwi regional map.
  2. **Campus Highlighting**: The glowing SJCCC Campus pin (`6°01'53.4"N 10°00'55.6"E`) and Mbengwi Central distance badge provide immediate visual anchoring.
  3. **Interactive Transition**: Tapping "Load Interactive Map" transitions smoothly into the interactive Google Maps iframe (or presents offline indicators if disconnected).
- **Visual Identity & Theme**:
  - *Color Palette & Backdrop*: Preserves the institutional palette: deep navy foundation (`#07182E`), warm gold accents (`#C9A229`), and subtle grid texturing.
  - *Vector Display Discipline*: Uses crisp SVG rendering (`image-rendering: auto`, vector geometry scaling) without raster distortion or letterbox visual clutter.
  - *Touch & Overlay Ergonomics*: Overlays remain touch-friendly with high-contrast semi-transparent glass badges conforming to WCAG AA contrast standards.

---

### 3. Key Product Decisions & Trade-Offs

- **Asset Reference via Semantic `<img>` Tag**:
  - *Chosen Approach*: Embed the SVG via an optimized `<img>` element pointing to `/assets/mbengwi-map.svg`.
  - *Why*: Allows browser-native caching, hardware-accelerated rendering, lazy loading, and avoids cluttering `index.html` with thousands of raw SVG path coordinates.
  - *Alternatives Considered*: Inlining all 660 KB of raw SVG XML directly into `index.html` (rejected due to excessive DOM bloat and payload overhead).

- **Uncropped Letterbox-Free Framing**:
  - *Chosen Approach*: Center the SVG using `object-fit: contain` with seamless background color match (`#07182E`).
  - *Why*: Keeps every road, contour line, and boundary of Mbengwi fully visible across all screen sizes (mobile, tablet, and desktop) without awkward cropping.

- **Offline Availability Integration**:
  - *Chosen Approach*: Register `/assets/mbengwi-map.svg` within Service Worker cache list so the custom map loads even without internet connectivity.
  - *Why*: Aligns with the app's offline-first architecture for rural Cameroon connectivity conditions.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                  Location Card Container                     │
├──────────────────────────────┬───────────────────────────────┤
│    Location Facade Viewport   │    Transit Information Panel  │
│  ┌─────────────────────────┐ │  ┌──────────────────────────┐ │
│  │ Authentic Mbengwi SVG   │ │  │ Travel routes & transit   │ │
│  │ /assets/mbengwi-map.svg │ │  │ Mbengwi town center info  │ │
│  └───────────┬─────────────┘ │  └──────────────────────────┘ │
│              │               │                               │
│  ┌───────────▼─────────────┐ │                               │
│  │ Layered Visual Overlay  │ │                               │
│  │ • SJCCC Location Pin    │ │                               │
│  │ • Regional Badge        │ │                               │
│  │ • Load Map Button (CTA) │ │                               │
│  └─────────────────────────┘ │                               │
└──────────────────────────────┴───────────────────────────────┘
```

- **Interactive State Transitions**:
  - `Default Facade`: Shows the Mbengwi SVG asset with campus pin and "Load Interactive Map" button.
  - `Live Embed Requested`: Replaces the static facade with Google Maps iframe on user click; displays fallback banner if offline.
  - `Offline Service Worker`: Pre-caches the vector SVG file to ensure immediate load even on unstable cellular networks.
