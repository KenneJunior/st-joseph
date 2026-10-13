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

        const expectedIds = [
            'resumption-new-2026',
            'resumption-old-2026',
            'midterm-break-t1-2026',
            'exams-t1-2026',
            'christmas-vacation-2026',
            'resumption-t2-2027',
            'youth-day-2027',
            'midterm-break-t2-2027',
            'exams-t2-2027',
            'feast-st-joseph-2027',
            'resumption-t3-2027',
            'gce-national-exams-2027',
            'promotional-exams-2027',
            'valedictory-graduation-2027',
        ];

        expect(ACADEMIC_MILESTONES_2026_2027.map((m) => m.id)).toEqual(expectedIds);

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

            // Discriminant temporal contract runtime validation
            if (event.temporalType === 'timed') {
                expect(event.localStartDate).toBe(event.localEndDate);
                expect(event.localStartTime).toMatch(/^\d{2}:\d{2}$/);
                expect(event.localEndTime).toMatch(/^\d{2}:\d{2}$/);
                expect(event.localStartTime! < event.localEndTime!).toBe(true);
            } else if (event.temporalType === 'all-day') {
                expect(event.localStartDate).toBe(event.localEndDate);
                expect(event.localStartTime).toBeUndefined();
                expect(event.localEndTime).toBeUndefined();
            } else if (event.temporalType === 'multi-day-all-day') {
                expect(event.localEndDate > event.localStartDate).toBe(true);
                expect(event.localStartTime).toBeUndefined();
                expect(event.localEndTime).toBeUndefined();
            } else if (event.temporalType === 'multi-day-timed') {
                expect(event.localEndDate > event.localStartDate).toBe(true);
                expect(event.localStartTime).toMatch(/^\d{2}:\d{2}$/);
                expect(event.localEndTime).toMatch(/^\d{2}:\d{2}$/);
                expect(event.localStartTime! < event.localEndTime!).toBe(true);
            }
        }
    });

    it('should verify chronological ordering of ACADEMIC_MILESTONES_2026_2027 (REC-01)', () => {
        for (let i = 0; i < ACADEMIC_MILESTONES_2026_2027.length - 1; i++) {
            const current = ACADEMIC_MILESTONES_2026_2027[i];
            const next = ACADEMIC_MILESTONES_2026_2027[i + 1];
            expect(
                current.localStartDate <= next.localStartDate,
                `Milestone ${current.id} (${current.localStartDate}) must precede or equal ${next.id} (${next.localStartDate})`
            ).toBe(true);
        }

        const examsT2Index = ACADEMIC_MILESTONES_2026_2027.findIndex((m) => m.id === 'exams-t2-2027');
        const feastIndex = ACADEMIC_MILESTONES_2026_2027.findIndex((m) => m.id === 'feast-st-joseph-2027');
        expect(examsT2Index).toBeGreaterThanOrEqual(0);
        expect(feastIndex).toBeGreaterThanOrEqual(0);
        expect(examsT2Index).toBeLessThan(feastIndex);
    });
});
