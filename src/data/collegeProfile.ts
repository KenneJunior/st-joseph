/**
 * ============================================================================
 * SJCCC – College Profile & Institutional Identity Canonical Dataset
 * Single source of truth for college metadata, history, leadership,
 * motto, affiliation, and verified contact coordinates.
 * ============================================================================
 */

export interface ContactChannel {
    readonly phoneFormatted: string;
    readonly phoneRaw: string;
    readonly telHref: string;
    readonly whatsAppUrl: string;
    readonly email: string;
    readonly website: string;
    readonly postalAddress: string;
    readonly campusLocation: string;
    readonly city: string;
    readonly division: string;
    readonly region: string;
    readonly country: string;
}

export interface CollegeHistoryMilestone {
    readonly year: string;
    readonly event: string;
}

export interface CollegeProfile {
    readonly name: string;
    readonly legalName: string;
    readonly acronym: string;
    readonly diocese: string;
    readonly proprietor: string;
    readonly mottoLatin: string;
    readonly mottoEnglish: string;
    readonly establishedDate: string;
    readonly establishedYear: number;
    readonly principalName: string;
    readonly principalTitle: string;
    readonly schoolType: string;
    readonly currentAcademicYear: string;
    readonly contact: ContactChannel;
    readonly history: readonly CollegeHistoryMilestone[];
}

export const COLLEGE_PROFILE: CollegeProfile = {
    name: "St. Joseph's Catholic Comprehensive College",
    legalName: "Saint Joseph's Catholic Comprehensive College Mbengwi",
    acronym: "SJCCC",
    diocese: "Archdiocese of Bamenda",
    proprietor: "Archdiocese of Bamenda",
    mottoLatin: "Edificamus Regnum Dei",
    mottoEnglish: "Let us build the Kingdom of God",
    establishedDate: "28th May 1999",
    establishedYear: 1999,
    principalName: "Rev. Fr. Joseph Gael Kenne, S.D",
    principalTitle: "Principal",
    schoolType: "Co-educational Catholic Boarding College",
    currentAcademicYear: "2026/2027",
    contact: {
        phoneFormatted: "+237 682 760 271",
        phoneRaw: "237682760271",
        telHref: "tel:+237682760271",
        whatsAppUrl: "https://wa.me/237682760271",
        email: "stjosephcollegembengwi@gmail.com",
        website: "https://saintjosephcollege.vercel.app",
        postalAddress: "Post Office Box 23, Mbengwi, MOMO, North-West Region, Republic of Cameroon",
        campusLocation: "SJCCC Campus, Mbengwi, Momo Division",
        city: "Mbengwi",
        division: "Momo",
        region: "North-West Region",
        country: "Cameroon"
    },
    history: [
        { year: "1999", event: "Established on 28th May 1999; initially entrusted to the Marist Brothers of the Schools." },
        { year: "2009/2010", event: "Second Cycle introduced with Arts and Commercial sections." },
        { year: "2010/2011", event: "Second Cycle Science section inaugurated." },
        { year: "2025/2026", event: "Technical section became operational with 5 specialized trade departments." },
        { year: "2026/2027", event: "Expanded inclusive technical & grammar curriculum under the Archdiocese of Bamenda." }
    ]
} as const;
