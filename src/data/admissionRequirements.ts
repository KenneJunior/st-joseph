/**
 * ============================================================================
 * SJCCC – Admission Requirements & Entry Criteria Canonical Dataset
 * Single source of truth for First Cycle, Second Cycle, and Technical Section
 * enrollment requirements and interview milestones.
 * ============================================================================
 */

export interface AdmissionCyclePolicy {
    readonly cycle: 'first-cycle' | 'second-cycle';
    readonly name: string;
    readonly primaryRequirement: string;
    readonly requiredDocuments: readonly string[];
    readonly notes?: string;
}

export interface CandidateExpectations {
    readonly readinessCriteria: readonly string[];
    readonly interviewDate: string;
    readonly interviewTime: string;
    readonly interviewLocation: string;
    readonly tentativeReopeningNote: string;
}

export interface AdmissionRequirementsData {
    readonly firstCycle: AdmissionCyclePolicy;
    readonly secondCycle: AdmissionCyclePolicy;
    readonly expectations: CandidateExpectations;
}

export const ADMISSION_REQUIREMENTS: AdmissionRequirementsData = {
    firstCycle: {
        cycle: 'first-cycle',
        name: 'First Cycle (Forms 1 – 5)',
        primaryRequirement: 'A pass in the Government Common Entrance Examination.',
        requiredDocuments: [
            'Photocopy of birth certificate',
            'Recent academic progress card',
            'Transfer certificate from previous primary/secondary school (new students)'
        ]
    },
    secondCycle: {
        cycle: 'second-cycle',
        name: 'Second Cycle (Lower Sixth & Upper Sixth)',
        primaryRequirement: 'A pass in FOUR (4) Ordinary Level Certificate subjects with an acceptable combination.',
        requiredDocuments: [
            'Photocopy of birth certificate (for new incoming candidates)',
            'Photocopy of the official GCE O/L result slip',
            'Handwritten application letter addressed to the Principal'
        ]
    },
    expectations: {
        readinessCriteria: [
            'Work hard academically and practically',
            'Learn good behaviour, integrity, and Christian honesty',
            'Strictly abide by the college rules and regulations'
        ],
        interviewDate: 'Tuesday, 4th August 2026',
        interviewTime: '9:00 AM',
        interviewLocation: 'SJCCC Campus, Mbengwi',
        tentativeReopeningNote: 'Re-opening days will be communicated to parents/guardians in advance. Students are expected to report promptly on the specified dates.'
    }
} as const;
