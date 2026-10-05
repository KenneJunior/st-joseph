import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, LogLevel, parseLogLevel } from '../../src/core/logger/index.ts';

describe('Logger Framework', () => {
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger({ namespace: 'TestNamespace', minLevel: LogLevel.DEBUG });
    });

    it('should parse log level string and numeric values correctly', () => {
        expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
        expect(parseLogLevel('info')).toBe(LogLevel.INFO);
        expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
        expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
        expect(parseLogLevel('SUCCESS')).toBe(LogLevel.SUCCESS);
        expect(parseLogLevel(40)).toBe(LogLevel.ERROR);
        expect(parseLogLevel('UNKNOWN', LogLevel.WARN)).toBe(LogLevel.WARN);
    });

    it('should create scoped child loggers with composite namespaces', () => {
        const child = logger.child('SubModule');
        expect(child.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should respect minimum log level filtering', () => {
        const warnLogger = new Logger({ namespace: 'FilterTest', minLevel: LogLevel.WARN });
        expect(warnLogger.isEnabled(LogLevel.DEBUG)).toBe(false);
        expect(warnLogger.isEnabled(LogLevel.INFO)).toBe(false);
        expect(warnLogger.isEnabled(LogLevel.WARN)).toBe(true);
        expect(warnLogger.isEnabled(LogLevel.ERROR)).toBe(true);
    });

    it('should dynamically update log level', () => {
        logger.setLevel('ERROR');
        expect(logger.getLevel()).toBe(LogLevel.ERROR);
        expect(logger.isEnabled(LogLevel.WARN)).toBe(false);
        expect(logger.isEnabled(LogLevel.ERROR)).toBe(true);
    });

    it('should redact sensitive keywords in logged context objects', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        logger.info('User session', {
            username: 'admin',
            apiKey: 'sensitive-api-token-123',
            passwordHash: 'secret-hash',
            role: 'editor'
        });

        expect(consoleSpy).toHaveBeenCalled();
        const loggedArgs = consoleSpy.mock.calls[0];
        const loggedObject = loggedArgs.find((arg: unknown) => typeof arg === 'object' && arg !== null) as Record<string, unknown>;

        expect(loggedObject.username).toBe('admin');
        expect(loggedObject.role).toBe('editor');
        expect(loggedObject.apiKey).toBe('[REDACTED]');
        expect(loggedObject.passwordHash).toBe('[REDACTED]');

        consoleSpy.mockRestore();
    });
});
