/**
 * SJCCC Logging Framework — Log Level Primitives
 * Defines priority hierarchy, color styling tokens, and level parsers.
 */

export const LogLevel = {
    DEBUG: 10,
    INFO: 20,
    SUCCESS: 25,
    WARN: 30,
    ERROR: 40,
    NONE: 100,
} as const;

export type LogLevelName = keyof typeof LogLevel;
export type LogLevelValue = typeof LogLevel[LogLevelName];

export interface LevelStyle {
    browserStyle: string;
    ansiCode: string;
    label: string;
}

export const LEVEL_METADATA: Record<LogLevelName, LevelStyle> = {
    DEBUG: {
        browserStyle: 'color: #94A3B8; font-weight: 600;',
        ansiCode: '\x1b[90m',
        label: 'DEBUG',
    },
    INFO: {
        browserStyle: 'color: #38BDF8; font-weight: 600;',
        ansiCode: '\x1b[36m',
        label: 'INFO',
    },
    SUCCESS: {
        browserStyle: 'color: #10B981; font-weight: 700;',
        ansiCode: '\x1b[32m',
        label: 'SUCCESS',
    },
    WARN: {
        browserStyle: 'color: #F59E0B; font-weight: 700;',
        ansiCode: '\x1b[33m',
        label: 'WARN',
    },
    ERROR: {
        browserStyle: 'color: #EF4444; font-weight: 700;',
        ansiCode: '\x1b[31m',
        label: 'ERROR',
    },
    NONE: {
        browserStyle: '',
        ansiCode: '',
        label: 'NONE',
    },
};

/**
 * Normalizes string or number to a valid LogLevelValue
 */
export function parseLogLevel(val: unknown, fallback: LogLevelValue = LogLevel.INFO): LogLevelValue {
    if (typeof val === 'number') {
        const found = Object.values(LogLevel).includes(val as LogLevelValue);
        return found ? (val as LogLevelValue) : fallback;
    }
    if (typeof val === 'string') {
        const upper = val.toUpperCase().trim() as LogLevelName;
        if (upper in LogLevel) {
            return LogLevel[upper];
        }
    }
    return fallback;
}
