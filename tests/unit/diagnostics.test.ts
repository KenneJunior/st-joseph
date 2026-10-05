import { describe, it, expect } from 'vitest';
import { SystemDiagnostics } from '../../src/core/diagnostics/SystemDiagnostics.ts';

describe('SystemDiagnostics Tooling', () => {
    it('should collect node environment report without throwing errors', async () => {
        const diagnostics = new SystemDiagnostics();
        const report = await diagnostics.collect();

        expect(report).toBeDefined();
        expect(report.timestamp).toBeTypeOf('string');
        expect(report.environment).toBeDefined();
        expect(report.environment.platform).toBeTypeOf('string');
        expect(report.connectivity.online).toBe(true);
        expect(report.page).toBeDefined();
    });

    it('should report correct shape of diagnostic report', async () => {
        const diagnostics = new SystemDiagnostics();
        const report = await diagnostics.collect();

        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('environment');
        expect(report).toHaveProperty('viewport');
        expect(report).toHaveProperty('preferences');
        expect(report).toHaveProperty('connectivity');
        expect(report).toHaveProperty('storage');
        expect(report).toHaveProperty('serviceWorker');
        expect(report).toHaveProperty('page');
    });
});
