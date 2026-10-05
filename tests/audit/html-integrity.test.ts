import { describe, it, expect } from 'vitest';
import { ContentAuditor } from '../../scripts/audit/auditor.ts';

describe('HTML Document & Accessibility Integrity Audit', () => {
    const auditor = new ContentAuditor(process.cwd());

    it('should validate Homepage (index.html) structure with 0 errors', () => {
        const result = auditor.auditFile('index.html', 'Homepage');

        expect(result.filePath).toBe('index.html');
        expect(result.metadata.title).toBeDefined();
        expect(result.metadata.title?.length).toBeGreaterThan(15);
        expect(result.stats.headings.h1).toBe(1);
        expect(result.stats.totalLinks).toBeGreaterThan(10);
        expect(result.errorCount).toBe(0);
        expect(result.passed).toBe(true);
    });

    it('should validate Prospectus (prospectus.html) structure with 0 errors', () => {
        const result = auditor.auditFile('prospectus.html', 'Prospectus');

        expect(result.filePath).toBe('prospectus.html');
        expect(result.metadata.title).toBeDefined();
        expect(result.stats.headings.h1).toBe(1);
        expect(result.stats.headings.h2).toBeGreaterThanOrEqual(9);
        expect(result.errorCount).toBe(0);
        expect(result.passed).toBe(true);
    });

    it('should ensure all statutory prospectus cards exist by ID', () => {
        const result = auditor.auditFile('prospectus.html', 'Prospectus');
        const statutoryIds = [
            'about-sjccc',
            'departments-entry',
            'books-stationery',
            'uniform-apparel',
            'boarding-toiletry',
            'school-rules',
            'fees-structure',
            'health-finance',
            'important-dates'
        ];

        const missingIdIssues = result.issues.filter(i => i.code === 'PROSPECTUS_SECTION_MISSING');
        expect(missingIdIssues).toHaveLength(0);
    });

    it('should verify Cameroon phone and WhatsApp international formatting', () => {
        const result = auditor.auditFile('index.html', 'Homepage');
        const formatErrors = result.issues.filter(
            i => i.code === 'LINK_TEL_FORMAT' || i.code === 'LINK_WHATSAPP_FORMAT'
        );
        expect(formatErrors).toHaveLength(0);
    });
});
