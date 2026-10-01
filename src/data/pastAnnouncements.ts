/**
 * ============================================================================
 * SJCCC – Historical School Announcements & Notifications Data
 * Saint Joseph Catholic Comprehensive College Mbengwi (Momo Division)
 * ============================================================================
 */

export type AnnouncementPriorityLevel = 'urgent' | 'important' | 'info';

export interface SchoolAnnouncement {
    id: string;
    date: string;
    isoDate: string;
    title: string;
    category: 'admissions' | 'academic' | 'campus' | 'celebration';
    priority: AnnouncementPriorityLevel;
    badge: string;
    summary: string;
    details: string;
    linkText?: string;
    linkHref?: string;
    isPinned?: boolean;
}

export const PAST_ANNOUNCEMENTS: SchoolAnnouncement[] = [
    {
        id: 'notice-resumption-2026',
        date: '21 Aug / 02 Sept 2026',
        isoDate: '2026-08-21',
        title: '2026/2027 Academic Year Resumption & Boarding Check-In Dates',
        category: 'admissions',
        priority: 'urgent',
        badge: 'Resumption Schedule',
        summary: 'Mandatory reporting timeline: New students (Form 1 & Lower Sixth) arrive Friday, 21st August 2026. Returning students arrive Wednesday, 2nd September 2026.',
        details: 'The administration of St. Joseph’s Catholic Comprehensive College Mbengwi informs parents and guardians that school resumption for the 2026/2027 academic year begins Friday, 21st August 2026 for all new boarders (Form 1 & Lower Sixth) for orientation, vestiary fitting, and medical registry. Returning students (Forms 2, 3, 4, 5 & Upper Sixth) report on Wednesday, 2nd September 2026 by 8:00 AM prompt. Please present bank deposit slips for first installment tuition fees at the bursary desk.',
        linkText: 'View School Dates & Calendar',
        linkHref: '#schoolDatesSection',
        isPinned: true
    },
    {
        id: 'notice-form-one-2026',
        date: '04 August 2026',
        isoDate: '2026-08-04',
        title: 'Form One Entrance Assessment & Placement Interviews',
        category: 'admissions',
        priority: 'urgent',
        badge: 'Admissions 2026/2027',
        summary: 'Entrance examination and oral placement interview for new Form One candidates at the campus Jubilee Hall.',
        details: 'The entrance interview session for incoming Form One students commenced promptly at 9:00 AM on Tuesday, 4th August 2026. Prospective candidates sat for Mathematics, English Language, and General Knowledge papers, followed by oral interview panels. Guided dormitory and science laboratory tours were conducted for accompanying parents.',
        linkText: 'Enquire for Late Placement',
        linkHref: '#contact'
    },
    {
        id: 'notice-gce-2026',
        date: '21 August 2026',
        isoDate: '2026-08-21',
        title: 'Official 2026 GCE Board Examination Results Released',
        category: 'academic',
        priority: 'important',
        badge: '100% O-Level Pass',
        summary: 'SJCCC celebrates historic GCE results: 100% pass rate at Ordinary Level (10/10 candidates) and 66.6% at Advanced Level.',
        details: 'The Cameroon GCE Board has officially released the June 2026 session returns. SJCCC Mbengwi recorded a stellar 100% pass rate in the General Ordinary Level examination, with 50% of candidates obtaining 10 and 11 papers. At Advanced Level, 1 student attained 4 papers with high distinction and 1 student attained 3 papers. Hearty congratulations to our staff, students, and parents!',
        linkText: 'View 2026 Results Breakdown',
        linkHref: '#results'
    },
    {
        id: 'notice-registration-2026',
        date: '15 July 2026',
        isoDate: '2026-07-15',
        title: '2026/2027 Registration Opens for Forms 2, 3, 4 & Lower Sixth',
        category: 'admissions',
        priority: 'important',
        badge: 'Enrolment Window',
        summary: 'General Grammar and Technical trade streams open for transfer admissions and continuing learners.',
        details: 'Registration for continuing learners and transfer candidates for the 2026/2027 academic year is officially open until 30th September 2026. Available departments include General Grammar (Science & Arts) and Technical Commercial Trades. Prospective transfer students are required to submit recent report booklets and birth certificates to the Principal’s Office.',
        linkText: 'Download Prospectus',
        linkHref: '/prospectus.html'
    },
    {
        id: 'notice-sports-term2-2026',
        date: '06 January 2026',
        isoDate: '2026-01-06',
        title: 'Term Two Resumption & Inter-House Athletic Championship',
        category: 'campus',
        priority: 'important',
        badge: 'Sports & Wellness',
        summary: 'Boarders return to campus for the second academic term and kickoff of the 2026 Inter-House Football & Handball tournament.',
        details: 'All boarding students safely returned to campus on January 6 following the Christmas recess. Second term academic lectures commenced immediately, alongside preliminary track and field heats for the biennial Inter-House Athletics Shield.',
        linkText: 'Explore Campus Life',
        linkHref: '#campus'
    },
    {
        id: 'notice-graduation-2026',
        date: '26 June 2026',
        isoDate: '2026-06-26',
        title: 'Class of 2026 Valedictory Service & Convocation Honors',
        category: 'celebration',
        priority: 'info',
        badge: 'Graduation Ceremony',
        summary: 'Solemn Thanksgiving High Mass, robing ceremony, and prize-giving day at Saint Joseph Jubilee Hall.',
        details: 'SJCCC held its annual Valedictory Thanksgiving Mass and Convocation Ceremony honoring graduating Form Five and Upper Sixth students under the college motto "Edificamus Regnum Dei". Outstanding awards in sciences, arts, Christian character, and community leadership were conferred.',
        linkText: 'View Academic Calendar',
        linkHref: '#schoolDatesSection'
    },
    {
        id: 'notice-lab-upgrade-2026',
        date: '12 May 2026',
        isoDate: '2026-05-12',
        title: 'Modern Computer Science & Technical Laboratory Expansion',
        category: 'campus',
        priority: 'info',
        badge: 'Campus Infrastructure',
        summary: 'Commissioning of updated high-speed desktop terminals, multimedia educational projectors, and electrical workshop equipment.',
        details: 'Thanks to the support of the Catholic Education Secretariat and alumni benefactors, SJCCC completed the refurbishment of the campus ICT Center and Technical Drawing Workshops, expanding student workstations to support computer science practical sessions and modern vocational training.',
        linkText: 'Explore Campus Facilities',
        linkHref: '#campusMapSection'
    },
    {
        id: 'notice-patronal-feast-2026',
        date: '19 March 2026',
        isoDate: '2026-03-19',
        title: 'Solemnity of Saint Joseph – College Feast Day & Community Feast',
        category: 'celebration',
        priority: 'info',
        badge: 'Patronal Feast',
        summary: 'Archdiocesan Thanksgiving Mass, inter-class choral singing competitions, and traditional cultural displays.',
        details: 'The college family gathered in prayer and festivity on March 19 to celebrate our patron saint, Saint Joseph the Worker. The day included a Pontifical Eucharistic celebration, choral anthem competitions among houses, friendly football matches, and an open barbecue banquet for all enrolled boarding students.',
        linkText: 'Read About Our Community',
        linkHref: '#about'
    },
    {
        id: 'notice-carol-service-2025',
        date: '15 December 2025',
        isoDate: '2025-12-15',
        title: 'Nine Lessons & Christmas Carol Festival 2025',
        category: 'celebration',
        priority: 'info',
        badge: 'Advent Season',
        summary: 'Candlelight choral service by the SJCCC College Choir at the Campus Chapel before vacation departure.',
        details: 'The annual Advent Festival of Nine Lessons and Carols brought together parents, clergy, staff, and students for an evening of Scripture readings and choral hymns in English, French, and local dialects.',
        linkText: 'Contact Administration',
        linkHref: '#contact'
    }
];
