/**
 * ============================================================================
 * SJCCC – Academic Programs & Technical Departments Canonical Dataset
 * Single source of truth for technical and vocational trade departments
 * offered for Forms 1 through 3 at SJCCC Mbengwi.
 * ============================================================================
 */

export interface TechnicalDepartment {
    id: string;
    code: string;
    name: string;
    fullName: string;
    prospectusLabel: string;
    indexLabel: string;
    description: string;
}

export const TECHNICAL_DEPARTMENTS: readonly TechnicalDepartment[] = [
    {
        id: 'construction',
        code: 'CE-BC',
        name: 'Building Construction',
        fullName: 'Building Construction (CE-BC)',
        prospectusLabel: 'Building Construction (CE-BC)',
        indexLabel: 'Building Construction (CE-BC)',
        description: 'Practical masonry, architectural drawing fundamentals, and structural civil works.'
    },
    {
        id: 'fashion',
        code: 'FE',
        name: 'Fashion Design',
        fullName: 'Fashion Design & Clothing (FE)',
        prospectusLabel: 'Fashion Design (FE)',
        indexLabel: 'Fashion Design (FE)',
        description: 'Garment design, pattern drafting, textile cutting, and professional tailoring techniques.'
    },
    {
        id: 'electrical',
        code: 'EPS',
        name: 'Electrical Power System',
        fullName: 'Electrical Power Systems (EPS)',
        prospectusLabel: 'Electrical Power System (EPS)',
        indexLabel: 'Electrical Power System (EPS)',
        description: 'Domestic wiring, electrical installation, machine repair, and circuitry principles.'
    },
    {
        id: 'automobile',
        code: 'ARM',
        name: 'Automobile Repair Mechanics',
        fullName: 'Automobile Repair Mechanics (ARM)',
        prospectusLabel: 'Automobile Repair Mechanics (ARM)',
        indexLabel: 'Automobile Repair Mechanics (ARM)',
        description: 'Engine mechanics, diagnostic maintenance, vehicle mechanics, and workshop safety.'
    },
    {
        id: 'home-economics',
        code: 'HEc',
        name: 'Home Economics',
        fullName: 'Home Economics (HEc)',
        prospectusLabel: 'Home Economics (HEc)',
        indexLabel: 'Home Economics (HEc)',
        description: 'Nutrition, food technology, hospitality craft, and family resource management.'
    }
] as const;
