import { describe, it, expect } from 'vitest';
import { TUITION_FEES, BANKING_INFO } from '../../src/data/tuitionFees.ts';
import { FAQ_ITEMS } from '../../src/data/faqData.ts';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../src/data/academicCalendar.ts';

describe('Canonical Data Integrity', () => {
    it('should verify official tuition fee baseline calculation', () => {
        expect(TUITION_FEES.currency).toBe('FCFA');
        expect(TUITION_FEES.session).toBe('2026/2027');
        expect(TUITION_FEES.baselineTotal).toBe(193000);
        expect(TUITION_FEES.items.length).toBeGreaterThanOrEqual(8);

        // Verify boarding item
        const boardingItem = TUITION_FEES.items.find(i => i.id === 'boarding');
        expect(boardingItem).toBeDefined();
        expect(boardingItem?.amount).toBe(112000);
    });

    it('should verify official OPSEC banking payment credentials', () => {
        expect(BANKING_INFO.accountNumber).toBe('100117');
        expect(BANKING_INFO.institution).toContain('OPUS SECURITATIS');
        expect(BANKING_INFO.accountName).toContain('St. Joseph Cath. Col Mbengwi');
    });

    it('should verify FAQ dataset items have non-empty questions and answers', () => {
        expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);
        for (const item of FAQ_ITEMS) {
            expect(item.id).toBeTruthy();
            expect(item.question.length).toBeGreaterThan(5);
            expect(item.answerHtml.length).toBeGreaterThan(10);
            expect(item.category).toBeTruthy();
        }
    });

    it('should verify academic calendar milestones structure (exactly 14 canonical items)', () => {
        expect(ACADEMIC_MILESTONES_2026_2027.length).toBe(14);
        for (const event of ACADEMIC_MILESTONES_2026_2027) {
            expect(event.id).toBeTruthy();
            expect(event.title).toBeTruthy();
            expect(event.dateText).toBeTruthy();
            expect(event.category).toBeTruthy();
            expect(event.term).toMatch(/^term-[123]$/);
            expect(event.location).toBeTruthy();
            expect(event.description).toBeTruthy();
            expect(event.localStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(event.localEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(event.localEndDate >= event.localStartDate).toBe(true);
            expect(['timed', 'all-day', 'multi-day-all-day', 'multi-day-timed']).toContain(event.temporalType);

            if (event.temporalType === 'timed' || event.temporalType === 'multi-day-timed') {
                expect(event.localStartTime).toMatch(/^\d{2}:\d{2}$/);
                expect(event.localEndTime).toMatch(/^\d{2}:\d{2}$/);
            } else {
                expect(event.localStartTime).toBeUndefined();
                expect(event.localEndTime).toBeUndefined();
            }
        }
    });
});
