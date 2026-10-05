# Automated Testing Infrastructure

## 1. Overview & Framework Selection

The SJCCC automated testing infrastructure uses **Vitest**, a native TypeScript test runner built for Vite projects.

### Why Vitest was Selected:
- **Zero Build Step**: Directly executes TypeScript without requiring a separate pre-compilation step.
- **Shared Vite Configuration**: Reuses aliases and environment settings directly from the project root.
- **High Execution Speed**: Spawns isolated worker threads with sub-second execution times (~1.7s for the complete suite).
- **Native JUnit XML Support**: Capable of generating standard XML test reports for CI systems via `--reporter=junit`.

---

## 2. Test Execution Commands

```bash
# Run the complete test suite once
npm test

# Run tests in watch mode for active development
npm run test:watch

# Run tests with both terminal output and standard JUnit XML export
npm run test:ci
```

---

## 3. Test Suites Overview

The automated tests reside in `tests/` and are organized by concern:

```text
tests/
├── unit/
│   ├── logger.test.ts          # Logger level filtering, namespaces, sanitization
│   └── diagnostics.test.ts     # SystemDiagnostics collection and report structure
├── audit/
│   └── html-integrity.test.ts  # Static DOM, anchor resolution, Cameroon contact links
└── data/
    └── data-integrity.test.ts  # Canonical tuition fees, OPSEC banking, FAQ, calendar
```

### Coverage Highlights:
- **Logger Tests (`logger.test.ts`)**: Verifies priority level arithmetic, dynamic level adjustments, child logger inheritance, and sensitive key redaction (`apiKey`, `passwordHash`).
- **Diagnostics Tests (`diagnostics.test.ts`)**: Verifies async data collection under both browser and Node runtime environments.
- **HTML Integrity Tests (`html-integrity.test.ts`)**: Verifies that neither `index.html` nor `prospectus.html` contains broken anchor references, missing titles, or unformatted contact links.
- **Data Integrity Tests (`data-integrity.test.ts`)**: Verifies that the canonical tuition fee total matches 193,000 FCFA, that OPSEC account 100117 is preserved, and that FAQ datasets are complete.
