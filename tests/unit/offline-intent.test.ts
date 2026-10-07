import { describe, it, expect } from 'vitest';
import {
    classifyOfflineIntent,
    generateOfflineResponse,
} from '../../src/features/ai-assistant/offlineIntentEngine.ts';
import {
    buildAdmissionResponse,
    buildFeeResponse,
    buildProgramResponse,
    buildContactResponse,
} from '../../src/features/ai-assistant/knowledgeFormatter.ts';
import {
    getCameroonDate,
    getDateRelation,
    describeDateStatus,
} from '../../src/features/ai-assistant/dateUtils.ts';
import { SJCCC_KNOWLEDGE } from '../../src/data/sjcccKnowledge.ts';

describe('SJCCC Weighted Offline Intent Engine & Guardrails', () => {
    describe('Greeting vs Inquiries', () => {
        it('should classify standalone greeting phrases as greeting intent', () => {
            expect(classifyOfflineIntent('hello').intent).toBe('greeting');
            expect(classifyOfflineIntent('hi').intent).toBe('greeting');
            expect(classifyOfflineIntent('good morning').intent).toBe('greeting');
            expect(classifyOfflineIntent('Good afternoon!').intent).toBe('greeting');
            expect(classifyOfflineIntent('hey there').intent).toBe('greeting');
        });

        it('should prioritize substantive inquiry when combined with greeting', () => {
            // Must resolve toward the fee intent rather than greeting-only
            const res = classifyOfflineIntent('Good morning, how much are the fees?');
            expect(res.intent).toBe('fee');
        });

        it('should prioritize admission when greeting precedes application question', () => {
            const res = classifyOfflineIntent('Hello, how do I apply for Form 1?');
            expect(res.intent).toBe('admission');
        });
    });

    describe('Fee & Banking Inquiries', () => {
        it('should resolve fee questions accurately', () => {
            expect(classifyOfflineIntent('How much are the school fees?').intent).toBe('fee');
            expect(classifyOfflineIntent('What is tuition?').intent).toBe('fee');
            expect(classifyOfflineIntent('How much do I pay?').intent).toBe('fee');
            expect(classifyOfflineIntent('What is the OPSEC account?').intent).toBe('fee');
            expect(classifyOfflineIntent('Where do I pay school fees?').intent).toBe('fee');
        });

        it('should resolve multi-intent question "How much does admission cost?" to dominant fee intent', () => {
            const res = classifyOfflineIntent('How much does admission cost?');
            expect(res.intent).toBe('fee');
        });

        it('should include authoritative amounts and OPSEC bank details in fee response', () => {
            const response = buildFeeResponse(SJCCC_KNOWLEDGE);
            expect(response).toContain('193,000 FCFA');
            expect(response).toContain('200,500 FCFA');
            expect(response).toContain('OPUS SECURITATIS (OPSEC) Microfinance');
            expect(response).toContain('100117');
            expect(response).toContain('All Saints Business Center');
        });
    });

    describe('Admission Inquiries', () => {
        it('should resolve admissions questions appropriately', () => {
            expect(classifyOfflineIntent('How do I apply?').intent).toBe('admission');
            expect(classifyOfflineIntent('What are the admission requirements?').intent).toBe('admission');
            expect(classifyOfflineIntent('When is the interview?').intent).toBe('admission');
            expect(classifyOfflineIntent('What documents are required for Lower Sixth?').intent).toBe('admission');
        });

        it('should include First and Second cycle requirements in admission response', () => {
            const response = buildAdmissionResponse(SJCCC_KNOWLEDGE);
            expect(response).toContain('Common Entrance');
            expect(response).toContain('Ordinary Level');
            expect(response).toContain('+237 682 760 271');
        });
    });

    describe('Academic & Technical Programs', () => {
        it('should resolve technical and general academic curriculum questions', () => {
            expect(classifyOfflineIntent('What technical courses do you offer?').intent).toBe('program');
            expect(classifyOfflineIntent('Do you have electrical?').intent).toBe('program');
            expect(classifyOfflineIntent('What academic programs are offered?').intent).toBe('program');
            expect(classifyOfflineIntent('Tell me about building construction').intent).toBe('program');
        });

        it('should list all technical departments in program response', () => {
            const response = buildProgramResponse(SJCCC_KNOWLEDGE);
            expect(response).toContain('Building Construction (CE-BC)');
            expect(response).toContain('Fashion Design & Clothing (FE)');
            expect(response).toContain('Electrical Power Systems (EPS)');
            expect(response).toContain('Automobile Repair Mechanics (ARM)');
            expect(response).toContain('Home Economics (HEc)');
        });
    });

    describe('Official Contact Inquiries', () => {
        it('should resolve contact and location queries', () => {
            expect(classifyOfflineIntent('How do I contact the school?').intent).toBe('contact');
            expect(classifyOfflineIntent('Where is SJCCC?').intent).toBe('contact');
            expect(classifyOfflineIntent('What is the WhatsApp number?').intent).toBe('contact');
            expect(classifyOfflineIntent('What is the college email address?').intent).toBe('contact');
        });

        it('should return authoritative contact info in contact response', () => {
            const response = buildContactResponse(SJCCC_KNOWLEDGE);
            expect(response).toContain('+237 682 760 271');
            expect(response).toContain('stjosephcollegembengwi@gmail.com');
            expect(response).toContain('Rev. Fr. Joseph Gael Kenne, S.D');
            expect(response).toContain('Mbengwi');
        });
    });

    describe('Out of Scope & Ambiguity Guardrails', () => {
        it('should detect off-topic queries and NEVER return greeting', () => {
            const res1 = classifyOfflineIntent('What is quantum mechanics?');
            expect(res1.intent).toBe('out_of_scope');
            expect(res1.intent).not.toBe('greeting');

            const res2 = classifyOfflineIntent("Who won yesterday's football match?");
            expect(res2.intent).toBe('out_of_scope');
            expect(res2.intent).not.toBe('greeting');

            const res3 = classifyOfflineIntent('Write a python script to parse json');
            expect(res3.intent).toBe('out_of_scope');
        });

        it('should return dedicated out-of-scope response for off-topic queries', () => {
            const out = generateOfflineResponse('What is quantum mechanics?');
            expect(out.intent).toBe('out_of_scope');
            expect(out.text).toContain('I am the SJCCC Guidance Assistant');
            expect(out.text).toContain('only provide information about');
        });

        it('should classify vague or underspecified queries as ambiguous', () => {
            expect(classifyOfflineIntent('Tell me more').intent).toBe('ambiguous');
            expect(classifyOfflineIntent('How?').intent).toBe('ambiguous');
            expect(classifyOfflineIntent('What about that?').intent).toBe('ambiguous');
            expect(classifyOfflineIntent('explain').intent).toBe('ambiguous');
        });

        it('should return helpful clarification response for ambiguous questions', () => {
            const out = generateOfflineResponse('Tell me more');
            expect(out.intent).toBe('ambiguous');
            expect(out.text).toContain('Could you please clarify');
        });
    });

    describe('Date Awareness & Semantics (Africa/Douala Timezone)', () => {
        it('should correctly format date in Cameroon timezone', () => {
            const cameroonDate = getCameroonDate(new Date('2026-10-07T08:30:00Z'));
            expect(cameroonDate).toBe('2026-10-07');
        });

        it('should classify dates correctly as past, today, or upcoming', () => {
            const refToday = '2026-10-07';
            expect(getDateRelation('2026-08-04', refToday)).toBe('past');
            expect(getDateRelation('2026-10-07', refToday)).toBe('today');
            expect(getDateRelation('2026-11-30', refToday)).toBe('upcoming');
        });

        it('should present passed interview date as a historical event without inventing dates', () => {
            // Simulated date after the 4th August 2026 interview
            const pastToday = '2026-10-07';
            const response = buildAdmissionResponse(SJCCC_KNOWLEDGE, pastToday);

            expect(response).toContain('was scheduled for');
            expect(response).toContain('this date has now passed');
            // Ensure it directs to administration for late admissions
            expect(response).toContain('contact the college administration');
            // Ensure no replacement date was invented
            expect(response).not.toContain('is on 4th August');
        });

        it('should present future interview date as upcoming when viewed before event', () => {
            // Simulated date before interview
            const futureToday = '2026-07-01';
            const response = buildAdmissionResponse(SJCCC_KNOWLEDGE, futureToday);

            expect(response).toContain('Scheduled for **Tuesday, 4th August 2026** at 9:00 AM prompt');
            expect(response).not.toContain('has now passed');
        });

        it('should accurately handle event taking place on current day', () => {
            const eventStatus = describeDateStatus('2026-08-04', '4th August 2026', '2026-08-04');
            expect(eventStatus.relation).toBe('today');
            expect(eventStatus.phrase).toContain('is taking place today');
        });
    });
});
