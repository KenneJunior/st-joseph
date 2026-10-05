/**
 * ============================================================================
 * SJCCC – Tuition Fees & Banking Information Canonical Dataset
 * Single source of truth for fee schedules, installment deadlines,
 * and official OPSEC banking payment instructions.
 * ============================================================================
 */

export interface FeeScheduleItem {
    id: string;
    label: string;
    faqLabel: string;
    amount: number;
    amountFormatted: string;
    icon: string;
    category?: 'boarding' | 'tuition' | 'statutory' | 'practical';
}

export interface BankingDetails {
    institution: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    prospectusBranchText: string;
    firstInstallment: string;
    secondInstallment: string;
    examClassesPolicy: string;
    receiptNotice: string;
}

export interface TuitionFeeStructure {
    currency: string;
    session: string;
    baselineTotal: number;
    baselineTotalFormatted: string;
    technicalTotal: number;
    technicalTotalFormatted: string;
    items: FeeScheduleItem[];
    banking: BankingDetails;
}

export const BANKING_INFO: BankingDetails = {
    institution: 'OPUS SECURITATIS (OPSEC) Microfinance',
    accountName: 'St. Joseph Cath. Col Mbengwi',
    accountNumber: '100117',
    branch: 'All Saints Business Center, Mile 2 Nkwen, Bamenda (or any OPSEC branch across Cameroon)',
    prospectusBranchText: 'OPUS SECURITATIS (OPSEC), All Saints Business Center, Mile 2 Nkwen, North West Region, or any of its branches',
    firstInstallment: 'First installment in July, August and September prior to or on resumption day',
    secondInstallment: 'Second installment due and payable before the end of January of the academic school year',
    examClassesPolicy: 'Form Five and Upper Sixth candidates are required to pay all school fees in full on or before the reopening of the school year. This prevents class suspensions and guarantees timely registration with the Cameroon GCE Board.',
    receiptNotice: 'Present the stamped OPSEC bank deposit teller to the College Bursar on campus upon resumption to receive your computerized college receipt.'
};

export const TUITION_FEES: TuitionFeeStructure = {
    currency: 'FCFA',
    session: '2026/2027',
    baselineTotal: 193000,
    baselineTotalFormatted: '193,000',
    technicalTotal: 200500,
    technicalTotalFormatted: '200,500',
    banking: BANKING_INFO,
    items: [
        {
            id: 'boarding',
            label: 'Boarding',
            faqLabel: 'Boarding & Catering',
            amount: 112000,
            amountFormatted: '112,000',
            icon: 'bi-house-heart',
            category: 'boarding'
        },
        {
            id: 'registration',
            label: 'Registration',
            faqLabel: 'Registration Fee',
            amount: 5000,
            amountFormatted: '5,000',
            icon: 'bi-clipboard2',
            category: 'statutory'
        },
        {
            id: 'tuition-1st-cycle',
            label: 'Tuition 1st Cycle',
            faqLabel: 'Tuition (1st or 2nd Cycle)',
            amount: 63000,
            amountFormatted: '63,000',
            icon: 'bi-book',
            category: 'tuition'
        },
        {
            id: 'tuition-2nd-cycle',
            label: 'Tuition 2nd Cycle',
            faqLabel: 'Tuition (1st or 2nd Cycle)',
            amount: 63000,
            amountFormatted: '63,000',
            icon: 'bi-journal-bookmark-fill',
            category: 'tuition'
        },
        {
            id: 'pta',
            label: 'PTA',
            faqLabel: 'PTA Contribution',
            amount: 3000,
            amountFormatted: '3,000',
            icon: 'bi-people',
            category: 'statutory'
        },
        {
            id: 'exam-fee',
            label: 'Exam Fee',
            faqLabel: 'Examination Fee',
            amount: 4000,
            amountFormatted: '4,000',
            icon: 'bi-pencil-square',
            category: 'statutory'
        },
        {
            id: 'id-card',
            label: 'ID Card',
            faqLabel: 'Student Identity Card',
            amount: 1000,
            amountFormatted: '1,000',
            icon: 'bi-person-badge',
            category: 'statutory'
        },
        {
            id: 'health-fee',
            label: 'Health Fee',
            faqLabel: 'Health & BEPHA Mutual Insurance',
            amount: 5000,
            amountFormatted: '5,000',
            icon: 'bi-capsule',
            category: 'statutory'
        },
        {
            id: 'crse-fee',
            label: 'C.R.S.E Fee (Form 3 & Lower Sixth)',
            faqLabel: 'C.R.S.E Fee (Form 3 & Lower Sixth)',
            amount: 2500,
            amountFormatted: '2,500',
            icon: 'bi-clipboard2-check',
            category: 'statutory'
        },
        {
            id: 'practical',
            label: 'Practical (Tech & Science)',
            faqLabel: 'Practical Fee (Technical & Science classes)',
            amount: 5000,
            amountFormatted: '5,000',
            icon: 'bi-gear-wide-connected',
            category: 'practical'
        }
    ]
};
