import { describe, it, expect } from 'vitest';
import { SJCCC_KNOWLEDGE } from '../../src/data/sjcccKnowledge.ts';

describe('Authoritative SJCCC Institutional Knowledge Dataset', () => {
    describe('Identity & Institutional Metadata', () => {
        it('should have complete and authoritative identity coordinates', () => {
            const id = SJCCC_KNOWLEDGE.identity;
            expect(id.name).toBe("St. Joseph's Catholic Comprehensive College");
            expect(id.legalName).toBe("Saint Joseph's Catholic Comprehensive College Mbengwi");
            expect(id.acronym).toBe('SJCCC');
            expect(id.diocese).toBe('Archdiocese of Bamenda');
            expect(id.proprietor).toBe('Archdiocese of Bamenda');
            expect(id.principalName).toBe('Rev. Fr. Joseph Gael Kenne, S.D');
            expect(id.principalTitle).toBe('Principal');
            expect(id.mottoLatin).toBe('Edificamus Regnum Dei');
            expect(id.mottoEnglish).toBe('Let us build the Kingdom of God');
            expect(id.establishedYear).toBe(1999);
            expect(id.establishedDateISO).toBe('1999-05-28');
            expect(id.currentAcademicYear).toBe('2026/2027');
        });

        it('should contain verified contact coordinates without empty values', () => {
            const c = SJCCC_KNOWLEDGE.identity.contact;
            expect(c.phoneFormatted).toBe('+237 682 760 271');
            expect(c.phoneRaw).toBe('237682760271');
            expect(c.whatsAppUrl).toBe('https://wa.me/237682760271');
            expect(c.email).toBe('stjosephcollegembengwi@gmail.com');
            expect(c.website).toBe('https://saintjosephcollege.vercel.app');
            expect(SJCCC_KNOWLEDGE.identity.campusLocation).toContain('Mbengwi');
            expect(SJCCC_KNOWLEDGE.identity.postalAddress).toContain('Mbengwi');
        });

        it('should contain chronological history milestones', () => {
            const history = SJCCC_KNOWLEDGE.identity.history;
            expect(history.length).toBeGreaterThanOrEqual(4);
            const initial = history.find((h) => h.year === '1999');
            expect(initial).toBeDefined();
            expect(initial?.event).toContain('Marist Brothers');
        });
    });

    describe('Fees Structure & Official Banking Details', () => {
        it('should maintain numerical consistency for tuition fee totals', () => {
            const fees = SJCCC_KNOWLEDGE.fees;
            expect(fees.currency).toBe('FCFA');
            expect(fees.session).toBe('2026/2027');
            expect(fees.grammarTotal).toBe(193000);
            expect(fees.technicalTotal).toBe(200500);
            expect(fees.technicalTotal).toBeGreaterThan(fees.grammarTotal);
            expect(fees.items.length).toBeGreaterThanOrEqual(8);
        });

        it('should have strictly verified OPSEC banking payment credentials', () => {
            const b = SJCCC_KNOWLEDGE.fees.banking;
            expect(b.institution).toContain('OPUS SECURITATIS');
            expect(b.accountName).toBe('St. Joseph Cath. Col Mbengwi');
            expect(b.accountNumber).toBe('100117');
            expect(b.branch).toContain('All Saints Business Center');
            expect(b.firstInstallment.length).toBeGreaterThan(10);
            expect(b.secondInstallment.length).toBeGreaterThan(10);
            expect(b.examClassesPolicy).toContain('Upper Sixth');
        });
    });

    describe('Admissions & Programs', () => {
        it('should provide complete First and Second Cycle admission policies', () => {
            const adm = SJCCC_KNOWLEDGE.admissions;
            expect(adm.firstCycle.primaryRequirement).toContain('Common Entrance');
            expect(adm.firstCycle.requiredDocuments.length).toBeGreaterThanOrEqual(3);
            expect(adm.secondCycle.primaryRequirement).toContain('FOUR (4) Ordinary Level');
            expect(adm.secondCycle.requiredDocuments.length).toBeGreaterThanOrEqual(3);
        });

        it('should provide machine-readable ISO dates for entrance interview and reopening', () => {
            const adm = SJCCC_KNOWLEDGE.admissions;
            expect(adm.interview.dateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(adm.interview.dateISO).toBe('2026-08-04');
            expect(adm.reopening.newStudentsDateISO).toBe('2026-08-21');
            expect(adm.reopening.returningStudentsDateISO).toBe('2026-09-02');
            expect(adm.interview.requiredMaterials.length).toBeGreaterThanOrEqual(3);
        });

        it('should contain all 5 technical trade departments', () => {
            const technical = SJCCC_KNOWLEDGE.programs.technicalDepartments;
            expect(technical).toHaveLength(5);
            const codes = technical.map((t) => t.code);
            expect(codes).toContain('CE-BC');
            expect(codes).toContain('FE');
            expect(codes).toContain('EPS');
            expect(codes).toContain('ARM');
            expect(codes).toContain('HEc');
        });
    });

    describe('Discipline, Campus Life & Schedule', () => {
        it('should define core values, zero tolerance items, and uniform rules', () => {
            const disc = SJCCC_KNOWLEDGE.discipline;
            expect(disc.coreValues.length).toBeGreaterThanOrEqual(4);
            expect(disc.zeroTolerance.length).toBeGreaterThanOrEqual(4);
            expect(disc.prohibitedItems.length).toBeGreaterThanOrEqual(4);
            expect(disc.uniform.daily).toContain('Sky blue');
            expect(disc.uniform.footwear).toContain('sandals');
        });

        it('should have valid academic milestones with ISO dates (all 14 canonical milestones)', () => {
            const milestones = SJCCC_KNOWLEDGE.schedule.milestones;
            expect(milestones.length).toBe(14);
            for (const m of milestones) {
                expect(m.id).toBeTruthy();
                expect(m.title).toBeTruthy();
                expect(m.startDateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(m.endDateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            }
        });
    });
});
