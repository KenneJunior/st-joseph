/**
 * ============================================================================
 * SJCCC – Authoritative Institutional Knowledge Source (sjcccKnowledge.ts)
 * 
 * Single authoritative source of truth for all St. Joseph's Catholic
 * Comprehensive College (SJCCC) Mbengwi institutional data.
 * 
 * Consumed by:
 * 1. Gemini system context generator (server-side and grounding)
 * 2. Offline weighted intent engine and deterministic response builders
 * 3. Unit, integration, and data integrity tests
 * 
 * All monetary values are strictly typed numbers.
 * All calendar dates are machine-readable ISO 8601 strings.
 * ============================================================================
 */

import { COLLEGE_PROFILE, type ContactChannel, type CollegeHistoryMilestone } from './collegeProfile.ts';
import { TUITION_FEES, BANKING_INFO, type FeeScheduleItem, type BankingDetails } from './tuitionFees.ts';
import { ADMISSION_REQUIREMENTS, type AdmissionCyclePolicy } from './admissionRequirements.ts';
import { TECHNICAL_DEPARTMENTS, type TechnicalDepartment } from './academicPrograms.ts';
import { ACADEMIC_MILESTONES_2026_2027, type AcademicMilestone } from './academicCalendar.ts';

export interface SjcccIdentity {
    readonly name: string;
    readonly legalName: string;
    readonly acronym: string;
    readonly diocese: string;
    readonly proprietor: string;
    readonly mottoLatin: string;
    readonly mottoEnglish: string;
    readonly establishedDateISO: string;
    readonly establishedDisplay: string;
    readonly establishedYear: number;
    readonly principalName: string;
    readonly principalTitle: string;
    readonly schoolType: string;
    readonly currentAcademicYear: string;
    readonly campusLocation: string;
    readonly postalAddress: string;
    readonly city: string;
    readonly division: string;
    readonly region: string;
    readonly country: string;
    readonly contact: ContactChannel;
    readonly history: readonly CollegeHistoryMilestone[];
}

export interface InterviewSchedule {
    readonly dateISO: string;
    readonly dateDisplay: string;
    readonly time: string;
    readonly location: string;
    readonly requiredMaterials: readonly string[];
}

export interface ReopeningSchedule {
    readonly newStudentsDateISO: string;
    readonly newStudentsDisplay: string;
    readonly newStudentsDescription: string;
    readonly returningStudentsDateISO: string;
    readonly returningStudentsDisplay: string;
    readonly returningStudentsDescription: string;
}

export interface SjcccAdmissions {
    readonly session: string;
    readonly firstCycle: AdmissionCyclePolicy;
    readonly secondCycle: AdmissionCyclePolicy;
    readonly interview: InterviewSchedule;
    readonly reopening: ReopeningSchedule;
    readonly expectations: readonly string[];
}

export interface SjcccPrograms {
    readonly grammarFirstCycle: string;
    readonly grammarSecondCycle: string;
    readonly grammarStreams: readonly string[];
    readonly technicalDepartments: readonly TechnicalDepartment[];
}

export interface SjcccFees {
    readonly currency: string;
    readonly session: string;
    readonly grammarTotal: number;
    readonly technicalTotal: number;
    readonly items: readonly FeeScheduleItem[];
    readonly banking: BankingDetails;
}

export interface SjcccUniform {
    readonly daily: string;
    readonly footwear: string;
    readonly compound: string;
    readonly sports: string;
}

export interface SjcccDiscipline {
    readonly coreValues: readonly string[];
    readonly zeroTolerance: readonly string[];
    readonly prohibitedItems: readonly string[];
    readonly uniform: SjcccUniform;
}

export interface SjcccCampusLife {
    readonly facilities: readonly string[];
    readonly visitingPolicy: {
        readonly frequency: string;
        readonly hours: string;
        readonly eligibleVisitors: string;
        readonly exitPassNotice: string;
    };
    readonly healthcare: {
        readonly infirmary: string;
        readonly insurance: string;
        readonly dietNotice: string;
    };
}

export interface SjcccScheduleEvent {
    readonly id: string;
    readonly title: string;
    readonly category: string;
    readonly startDateISO: string;
    readonly endDateISO: string;
    readonly dateDisplay: string;
    readonly description: string;
    readonly isKeyMilestone: boolean;
}

export interface SjcccSchedule {
    readonly academicYear: string;
    readonly milestones: readonly SjcccScheduleEvent[];
}

export interface SjcccKnowledge {
    readonly identity: SjcccIdentity;
    readonly admissions: SjcccAdmissions;
    readonly programs: SjcccPrograms;
    readonly fees: SjcccFees;
    readonly discipline: SjcccDiscipline;
    readonly campus: SjcccCampusLife;
    readonly schedule: SjcccSchedule;
}

export const SJCCC_KNOWLEDGE: SjcccKnowledge = {
    identity: {
        name: COLLEGE_PROFILE.name,
        legalName: COLLEGE_PROFILE.legalName,
        acronym: COLLEGE_PROFILE.acronym,
        diocese: COLLEGE_PROFILE.diocese,
        proprietor: COLLEGE_PROFILE.proprietor,
        mottoLatin: COLLEGE_PROFILE.mottoLatin,
        mottoEnglish: COLLEGE_PROFILE.mottoEnglish,
        establishedDateISO: '1999-05-28',
        establishedDisplay: COLLEGE_PROFILE.establishedDate,
        establishedYear: COLLEGE_PROFILE.establishedYear,
        principalName: COLLEGE_PROFILE.principalName,
        principalTitle: COLLEGE_PROFILE.principalTitle,
        schoolType: COLLEGE_PROFILE.schoolType,
        currentAcademicYear: COLLEGE_PROFILE.currentAcademicYear,
        campusLocation: COLLEGE_PROFILE.contact.campusLocation,
        postalAddress: COLLEGE_PROFILE.contact.postalAddress,
        city: COLLEGE_PROFILE.contact.city,
        division: COLLEGE_PROFILE.contact.division,
        region: COLLEGE_PROFILE.contact.region,
        country: COLLEGE_PROFILE.contact.country,
        contact: COLLEGE_PROFILE.contact,
        history: COLLEGE_PROFILE.history,
    },

    admissions: {
        session: COLLEGE_PROFILE.currentAcademicYear,
        firstCycle: ADMISSION_REQUIREMENTS.firstCycle,
        secondCycle: ADMISSION_REQUIREMENTS.secondCycle,
        interview: {
            dateISO: '2026-08-04',
            dateDisplay: ADMISSION_REQUIREMENTS.expectations.interviewDate,
            time: ADMISSION_REQUIREMENTS.expectations.interviewTime,
            location: ADMISSION_REQUIREMENTS.expectations.interviewLocation,
            requiredMaterials: [
                'Writing materials (blue/black pens, pencils, eraser, and ruler)',
                'Original Primary School progress booklet (report card)',
                'Common Entrance Examination candidate slip or registration proof',
                'Photocopy of official birth certificate',
            ],
        },
        reopening: {
            newStudentsDateISO: '2026-08-21',
            newStudentsDisplay: 'Friday, 21st August 2026',
            newStudentsDescription: 'New boarders (Form 1 & Lower Sixth) report for orientation, vestiary fitting, and medical registry.',
            returningStudentsDateISO: '2026-09-02',
            returningStudentsDisplay: 'Wednesday, 2nd September 2026',
            returningStudentsDescription: 'Returning students (Forms 2, 3, 4, 5 & Upper Sixth) report by 8:00 AM prompt.',
        },
        expectations: ADMISSION_REQUIREMENTS.expectations.readinessCriteria,
    },

    programs: {
        grammarFirstCycle: 'Broad Catholic secondary grammar curriculum (Forms 1–5) leading to Cameroon GCE Ordinary Level.',
        grammarSecondCycle: 'Second Cycle (Lower Sixth & Upper Sixth) leading to Cameroon GCE Advanced Level.',
        grammarStreams: ['Arts', 'Science', 'Commercial'],
        technicalDepartments: TECHNICAL_DEPARTMENTS,
    },

    fees: {
        currency: TUITION_FEES.currency,
        session: TUITION_FEES.session,
        grammarTotal: TUITION_FEES.baselineTotal,
        technicalTotal: TUITION_FEES.technicalTotal,
        items: TUITION_FEES.items,
        banking: BANKING_INFO,
    },

    discipline: {
        coreValues: [
            'Christian integrity and moral uprightness',
            'Academic diligence and vocational skill mastery',
            'Mutual respect, dignity, and courtesy',
            'Punctuality and personal discipline',
            'Spiritual formation and regular prayer',
        ],
        zeroTolerance: [
            'Bullying, fighting, or harassment of any form',
            'Examination malpractice or academic dishonesty',
            'Possession or consumption of alcohol, tobacco, or illegal drugs',
            'Weapons, hazardous materials, or vandalism of college property',
            'Possession of unauthorized electronic devices (smartphones, radios, etc.)',
        ],
        prohibitedItems: [
            'Mobile phones, smartphones, tablets, cameras, radios, and music players',
            'Electric irons, immersion heaters, boiling rings, and unauthorised wiring',
            'Non-uniform casual clothing, high-heeled shoes, or fancy footwear',
            'Outside cooked food, garri, alcohol, and cigarettes',
            'Chemical skin-bleaching lotions, hair dyes, and decorative jewelry',
        ],
        uniform: {
            daily: 'Sky blue shirt, navy blue trousers/skirts, navy blue cardigan with college crest, black shoes, and white socks.',
            footwear: 'Official brown sandals for daily classes, formal black shoes for Sundays/feast days, and sports shoes/football boots.',
            compound: 'White sleeveless gowns with gathers for girls; black trousers and white short-sleeve shirts for boys.',
            sports: 'House colors: Peter (White), François (Yellow), Chanel (Red), Champagnat (Green).',
        },
    },

    campus: {
        facilities: [
            "College Chapel & St. Joseph's Shrine",
            'Science Laboratories (Physics, Chemistry, Biology)',
            'Modern ICT Computer Suite',
            'Technical & Vocational Workshops (Building, Electrical, Mechanics, Fashion, Home Economics)',
            'Sports Fields & Athletic Grounds',
            'Boys and Girls Separate Boarding Dormitories',
            'Dining Hall & Kitchen Catering',
            'On-campus Healthcare Infirmary staffed by a resident nurse',
        ],
        visitingPolicy: {
            frequency: 'Once per term on a scheduled visiting Sunday communicated to parents in advance.',
            hours: 'Begins with Holy Mass at 9:00 AM and concludes promptly at 4:30 PM.',
            eligibleVisitors: 'Only verified parents and registered immediate guardians are permitted.',
            exitPassNotice: 'Exit passes from campus are not granted except for urgent family bereavement of parents or siblings.',
        },
        healthcare: {
            infirmary: 'On-campus clinic staffed by a qualified resident nurse providing daily care and first aid.',
            insurance: 'Every enrolled student is registered in BEPHA (Archdiocese of Bamenda Mutual Health Insurance).',
            dietNotice: 'Communal meals are served. The college cannot cater to personalized or restrictive medical diets.',
        },
    },

    schedule: {
        academicYear: '2026/2027',
        milestones: ACADEMIC_MILESTONES_2026_2027.map((m: AcademicMilestone) => ({
            id: m.id,
            title: m.title,
            category: m.category,
            startDateISO: m.startDate.toISOString().split('T')[0],
            endDateISO: m.endDate.toISOString().split('T')[0],
            dateDisplay: m.dateText,
            description: m.description,
            isKeyMilestone: Boolean(m.isKeyMilestone),
        })),
    },
} as const;
