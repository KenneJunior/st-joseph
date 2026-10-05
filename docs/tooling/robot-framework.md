# Architectural Decision Record: Evaluation of Robot Framework

## Status: REJECTED

## Context

Section 7 of the Developer Tooling brief requested an evaluation of **Robot Framework** to determine whether it provides genuine engineering value for the SJCCC platform.

Robot Framework is a generic, keyword-driven test automation framework implemented in Python, commonly used for end-to-end acceptance testing in enterprise systems with dedicated QA teams.

---

## Evaluation Criteria & Findings

### 1. Technology Stack Alignment
- **SJCCC Architecture**: Pure TypeScript 5.x, Node.js 22 runtime, Vite bundler.
- **Robot Framework Requirement**: Requires Python runtime (`python3`, `pip`), `robotframework` package, and secondary wrapper libraries (such as `robotframework-browser` or `robotframework-seleniumlibrary`) requiring Node gRPC bridges or separate browser driver installations.
- **Finding**: Introducing Robot Framework would introduce a secondary foreign language runtime (Python) into a strictly Node/TypeScript repository, complicating onboarding, container builds, and CI pipelines.

### 2. Maintenance & Cognitive Overhead
- **Syntax**: Robot Framework uses tabular or whitespace-delimited keyword tables (`*** Settings ***`, `*** Test Cases ***`, `*** Keywords ***`).
- **Developer Experience**: Modern frontend developers working on TypeScript components benefit far more from tests written in TypeScript with full IDE auto-completion, refactoring support, and shared type definitions.
- **Finding**: Keyword tables add an abstraction layer without providing additional test fidelity over native TypeScript tests.

### 3. Duplication of Automation Capabilities
- The repository already has:
  1. **Vitest**: Runs TypeScript unit, integration, and structural audit tests in $< 2\text{ seconds}$.
  2. **Static Content Auditor (`scripts/audit/`)**: Audits DOM structure, broken anchors, Cameroon phone formatting, and accessibility directly on static HTML in milliseconds without browser overhead.
  3. **Standard CI Reporting**: Standard JUnit XML export is natively supported via Vitest (`npm run test:ci`).
- **Finding**: Robot Framework would duplicate tests already handled natively by lighter, faster TypeScript tooling.

---

## Decision

**Robot Framework was rejected.**

The repository maintains an all-TypeScript developer tooling ecosystem (`tsx`, `vitest`, `cheerio`) that executes in under 2 seconds, requires zero Python dependencies, and integrates seamlessly into the existing Node.js build and test lifecycle.
