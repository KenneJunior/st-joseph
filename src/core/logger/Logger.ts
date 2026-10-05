/**
 * SJCCC Logging Framework — Enterprise Developer Console System
 * 
 * Features:
 * - Structured levels: DEBUG, INFO, SUCCESS, WARN, ERROR
 * - Namespaces / Child loggers: logger.child('Prospectus')
 * - Colorized browser console badges with SJCCC Navy & Gold branding
 * - Production-safe: defaults to WARN in production, eliminating console noise
 * - Configurable via localStorage ('sjccc_log_level') or runtime window hook
 * - Safe payload serialization and sanitization
 * - Grouped diagnostics support
 */

import { LogLevel, type LogLevelName, type LogLevelValue, LEVEL_METADATA, parseLogLevel } from './logLevels.ts';

export interface LoggerOptions {
    namespace?: string;
    minLevel?: LogLevelValue;
    prefix?: string;
}

export class Logger {
    private namespace: string;
    private minLevel: LogLevelValue;
    private isBrowser: boolean;
    private prefix: string;

    constructor(options: LoggerOptions | string = {}) {
        const opts = typeof options === 'string' ? { namespace: options } : options;
        this.namespace = opts.namespace || 'Core';
        this.prefix = opts.prefix || 'SJCCC';
        this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
        this.minLevel = opts.minLevel ?? this.resolveDefaultLevel();
    }

    /**
     * Resolves the default log level based on environment and local storage
     */
    private resolveDefaultLevel(): LogLevelValue {
        if (!this.isBrowser) {
            // Node / CLI context
            const g = globalThis as unknown as { process?: { env?: Record<string, string> } };
            const envLevel = g.process?.env?.SJCCC_LOG_LEVEL || g.process?.env?.LOG_LEVEL;
            return envLevel ? parseLogLevel(envLevel) : LogLevel.INFO;
        }

        // Browser context: check global override or localStorage
        try {
            const win = window as unknown as { __SJCCC_LOG_LEVEL__?: unknown };
            if (win.__SJCCC_LOG_LEVEL__ !== undefined) {
                return parseLogLevel(win.__SJCCC_LOG_LEVEL__);
            }
            const stored = localStorage.getItem('sjccc_log_level');
            if (stored) {
                return parseLogLevel(stored);
            }
        } catch {
            // Ignore storage access errors in restricted iframe
        }

        // Default: DEBUG in Vite dev mode, WARN in production builds
        // import.meta.env may be populated by Vite
        const isDev = Boolean(
            (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
            (this.isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '0.0.0.0'))
        );

        return isDev ? LogLevel.DEBUG : LogLevel.WARN;
    }

    /**
     * Sets the active minimum log level
     */
    public setLevel(level: LogLevelValue | LogLevelName): this {
        this.minLevel = typeof level === 'string' ? LogLevel[level] : level;
        return this;
    }

    /**
     * Returns the current minimum log level
     */
    public getLevel(): LogLevelValue {
        return this.minLevel;
    }

    /**
     * Creates a scoped child logger with a sub-namespace (e.g. 'SJCCC:PWA')
     */
    public child(childNamespace: string): Logger {
        const fullNamespace = this.namespace ? `${this.namespace}:${childNamespace}` : childNamespace;
        const child = new Logger({
            namespace: fullNamespace,
            minLevel: this.minLevel,
            prefix: this.prefix
        });
        return child;
    }

    /**
     * Determines if a level is enabled under the current threshold
     */
    public isEnabled(level: LogLevelValue): boolean {
        return level >= this.minLevel && this.minLevel < LogLevel.NONE;
    }

    private format(levelName: LogLevelName, message: string, context?: unknown[]): void {
        const levelVal = LogLevel[levelName];
        if (!this.isEnabled(levelVal)) return;

        const meta = LEVEL_METADATA[levelName];
        const sanitizedContext = context ? this.sanitize(context) : [];

        if (this.isBrowser) {
            const badgeStyle = 'background: #07182E; color: #F3D779; padding: 2px 5px; border-radius: 3px; font-weight: bold; border-left: 2px solid #C9A229;';
            const levelStyle = `${meta.browserStyle} padding: 1px 4px;`;

            switch (levelName) {
                case 'ERROR':
                    console.error(`%c${this.prefix}:${this.namespace}%c [${meta.label}]`, badgeStyle, levelStyle, message, ...sanitizedContext);
                    break;
                case 'WARN':
                    console.warn(`%c${this.prefix}:${this.namespace}%c [${meta.label}]`, badgeStyle, levelStyle, message, ...sanitizedContext);
                    break;
                case 'SUCCESS':
                case 'INFO':
                    console.info(`%c${this.prefix}:${this.namespace}%c [${meta.label}]`, badgeStyle, levelStyle, message, ...sanitizedContext);
                    break;
                case 'DEBUG':
                default:
                    console.debug(`%c${this.prefix}:${this.namespace}%c [${meta.label}]`, badgeStyle, levelStyle, message, ...sanitizedContext);
                    break;
            }
        } else {
            // ANSI formatting for CLI / Terminal output
            const reset = '\x1b[0m';
            const bold = '\x1b[1m';
            const time = new Date().toISOString().substring(11, 19);
            const prefixFormatted = `\x1b[34m[${this.prefix}:${this.namespace}]${reset}`;
            const levelFormatted = `${meta.ansiCode}${bold}[${meta.label}]${reset}`;
            const line = `${time} ${prefixFormatted} ${levelFormatted} ${message}`;

            if (levelName === 'ERROR') {
                console.error(line, ...sanitizedContext);
            } else if (levelName === 'WARN') {
                console.warn(line, ...sanitizedContext);
            } else {
                console.log(line, ...sanitizedContext);
            }
        }
    }

    private sanitize(args: unknown[]): unknown[] {
        return args.map(arg => {
            if (arg instanceof Error) {
                return {
                    name: arg.name,
                    message: arg.message,
                    stack: arg.stack
                };
            }
            if (typeof arg === 'object' && arg !== null) {
                // Avoid logging sensitive keys
                const sanitized: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(arg as Record<string, unknown>)) {
                    if (/token|password|secret|key|credential/i.test(k)) {
                        sanitized[k] = '[REDACTED]';
                    } else {
                        sanitized[k] = v;
                    }
                }
                return sanitized;
            }
            return arg;
        });
    }

    public debug(message: string, ...context: unknown[]): void {
        this.format('DEBUG', message, context);
    }

    public info(message: string, ...context: unknown[]): void {
        this.format('INFO', message, context);
    }

    public success(message: string, ...context: unknown[]): void {
        this.format('SUCCESS', message, context);
    }

    public warn(message: string, ...context: unknown[]): void {
        this.format('WARN', message, context);
    }

    public error(message: string, ...context: unknown[]): void {
        this.format('ERROR', message, context);
    }

    /**
     * Executes a callback within a collapsible console group
     */
    public group(label: string, fn: () => void, collapsed = true): void {
        if (!this.isEnabled(LogLevel.INFO)) {
            fn();
            return;
        }

        const tag = `[${this.prefix}:${this.namespace}] ${label}`;
        if (this.isBrowser) {
            if (collapsed) {
                console.groupCollapsed(`%c${tag}`, 'color: #C9A229; font-weight: bold;');
            } else {
                console.group(`%c${tag}`, 'color: #C9A229; font-weight: bold;');
            }
        } else {
            console.log(`\n── ${tag} ──`);
        }

        try {
            fn();
        } finally {
            if (this.isBrowser) {
                console.groupEnd();
            } else {
                console.log(`── end ${label} ──\n`);
            }
        }
    }
}

// Global root logger singleton
export const logger = new Logger('App');

// Attach to window for browser devtools diagnostics
if (typeof window !== 'undefined') {
    (window as unknown as { __SJCCC_LOGGER__: Logger }).__SJCCC_LOGGER__ = logger;
}
