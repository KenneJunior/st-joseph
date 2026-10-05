# Developer Console & Logging Infrastructure

## 1. Overview & Purpose

The SJCCC logging infrastructure (`src/core/logger/`) replaces uncontrolled `console.log()` statements with a structured, production-safe logging architecture.

### Key Capabilities:
- **Categorized Priority Levels**: `DEBUG` (10), `INFO` (20), `SUCCESS` (25), `WARN` (30), `ERROR` (40), `NONE` (100).
- **Hierarchical Namespaces**: Scoped child loggers (e.g. `logger.child('Prospectus')` produces `[SJCCC:Prospectus]`).
- **Institutional Branding**: Colorized badges using SJCCC Navy (`#07182E`) and Gold (`#C9A229`, `#F3D779`) styling in browser consoles, and clean ANSI colors in terminal/CLI environments.
- **Production Safety**: Defaults to `WARN` in production builds, eliminating noisy diagnostic messages for general visitors while keeping warnings and errors visible.
- **Payload Sanitization**: Automatically redacts sensitive fields matching `/token|password|secret|key|credential/i`.
- **Developer Extensibility**: Exposed to the browser window as `window.__SJCCC_LOGGER__`.

---

## 2. API Usage

### Basic Logging

```typescript
import { logger } from './core/logger/index.ts';

logger.info('Application bootstrap complete');
logger.success('Service Worker precache verified');
logger.warn('Offline mode detected; serving cached assets');
logger.error('Failed to load dynamic component', error);
```

### Scoped Child Loggers

```typescript
import { logger } from './core/logger/index.ts';

const log = logger.child('Prospectus');
log.debug('Resolving anchor navigation: #fees-structure');
// Outputs: [SJCCC:Prospectus] [DEBUG] Resolving anchor navigation: #fees-structure
```

### Collapsible Group Logging

```typescript
logger.group('Theme Initialisation', () => {
    logger.info('Reading stored theme from localStorage');
    logger.info('Detected system preference: dark');
    logger.success('Applied dark-mode class to document element');
});
```

---

## 3. Dynamic Log Level Configuration

Developers can adjust the active logging threshold in the browser DevTools without modifying source code:

```javascript
// Enable verbose debug logging in browser console
window.__SJCCC_LOGGER__.setLevel('DEBUG');

// Alternatively persist preference across page reloads
localStorage.setItem('sjccc_log_level', 'DEBUG');
```
