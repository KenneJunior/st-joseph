import { describe, it, expect, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
    buildProspectusPdfBytes,
    createProspectusPdfBlob,
    downloadProspectusPdf,
    PROSPECTUS_PDF_FILENAME,
} from '../../src/features/prospectus/prospectusPdfExport.ts';

describe('Prospectus PDF Export Engine', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('generates a structurally valid multi-page PDF 1.4 document with exact xref byte offsets', () => {
        const bytes = buildProspectusPdfBytes();
        const raw = Buffer.from(bytes).toString('latin1');

        expect(raw.startsWith('%PDF-1.4\n')).toBe(true);
        expect(raw.trimEnd().endsWith('%%EOF')).toBe(true);

        // Verify startxref points directly to the xref table
        const startXrefMatch = raw.match(/startxref\n(\d+)\n%%EOF/);
        expect(startXrefMatch).not.toBeNull();
        const xrefOffset = Number(startXrefMatch![1]);
        expect(raw.slice(xrefOffset, xrefOffset + 4)).toBe('xref');

        // Verify every numbered object offset in the xref table matches its exact byte position
        const xrefSection = raw.slice(xrefOffset).split('\ntrailer')[0];
        const lines = xrefSection.split('\n');
        const entries = lines.slice(2); // skip "xref" and "0 N"

        entries.forEach((line, objId) => {
            if (objId === 0) {
                expect(line).toMatch(/^0000000000 65535 f/);
            } else {
                const offset = Number(line.slice(0, 10));
                expect(raw.slice(offset, offset + `${objId} 0 obj`.length)).toBe(`${objId} 0 obj`);
            }
        });
    });

    it('embeds canonical SJCCC prospectus data into the PDF streams', () => {
        const bytes = buildProspectusPdfBytes();
        const raw = Buffer.from(bytes).toString('latin1');

        expect(raw).toContain("SAINT JOSEPH'S CATHOLIC COMPREHENSIVE COLLEGE");
        expect(raw).toContain('Archdiocese of Bamenda');
        expect(raw).toContain('193,000 FCFA');
        expect(raw).toContain('OPUS SECURITATIS');
        expect(raw).toContain('100117');
        expect(raw).toContain('Building Construction');
        expect(raw).toContain('Rev. Fr. Joseph Gael Kenne, S.D');
    });

    it('creates an application/pdf Blob and triggers a file download via anchor element', () => {
        const blob = createProspectusPdfBlob();
        expect(blob.type).toBe('application/pdf');
        expect(blob.size).toBeGreaterThan(2500);

        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).URL = {
            createObjectURL: vi.fn().mockReturnValue('blob:test-pdf'),
            revokeObjectURL: vi.fn(),
        };

        const clickSpy = vi.spyOn(dom.window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const result = downloadProspectusPdf();

        expect(result).toBe(true);
        expect((globalThis as any).URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);

        // Verify filename default matches expected constant
        expect(PROSPECTUS_PDF_FILENAME).toBe('SJCCC-Official-Prospectus-2026-2027.pdf');
    });
});
