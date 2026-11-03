/**
 * ============================================================================
 * SJCCC – Virtual Campus Map Canonical Dataset
 * Single source of truth for campus zones, facilities, locations, hotspot coordinates,
 * amenities, and accessibility descriptions.
 * ============================================================================
 */

export interface CampusZone {
    id: string;
    title: string;
    tagline: string;
    category: string;
    icon: string;
    xPercent: number; // percentage left on map
    yPercent: number; // percentage top on map
    imageSrc: string;
    imageAlt: string;
    description: string;
    amenities: string[];
    hours: string;
    headOfArea: string;
}

export const CAMPUS_ZONES: CampusZone[] = [
    {
        id: 'chapel',
        title: "College Chapel & St. Joseph's Shrine",
        tagline: 'Spiritual foundation and sanctuary for reflection',
        category: 'Spiritual Life',
        icon: 'bi-bank',
        xPercent: 37,
        yPercent: 28,
        imageSrc: '/assets/stJoseph.jpg',
        imageAlt: "St. Joseph statue and College Chapel at SJCCC Mbengwi",
        description: "The serene heart of our Catholic community. Dedicated to Saint Joseph, the Chapel hosts daily morning prayers, Holy Mass, choir practices, and liturgical feast celebrations led by Archdiocese clergy.",
        amenities: [
            'Daily Community Mass & Benediction',
            'Chapel Choir & liturgical music instruments',
            'St. Joseph Grotto prayer grounds',
            'Quiet sacramental counseling rooms'
        ],
        hours: '5:30 AM – 9:00 PM Daily',
        headOfArea: 'College Chaplaincy'
    },
    {
        id: 'workshops-electrical',
        title: 'Technical Electrical Workshops',
        tagline: 'Hands-on electrical installation & electronics hub',
        category: 'Technical Education',
        icon: 'bi-lightning-charge-fill',
        xPercent: 25,
        yPercent: 51,
        imageSrc: '/assets/sjccc-Electricity.jpeg',
        imageAlt: 'Students working with electrical equipment in SJCCC workshop',
        description: "Our dedicated technical laboratory where students learn electrical circuit design, solar installation, domestic conduit wiring, appliance diagnosis, and industrial motor principles with safety as priority number one.",
        amenities: [
            'Individual training wiring demonstration boards',
            'Diagnostic multimeters & circuit testers',
            'Solar photovoltaic educational array',
            'Industrial safety PPE stations'
        ],
        hours: '8:00 AM – 4:30 PM (Mon–Fri)',
        headOfArea: 'Head of Technical Section'
    },
    {
        id: 'dormitories',
        title: 'Boarding Dormitories (St. Peter & St. Therese)',
        tagline: 'Secure, nurturing residential home away from home',
        category: 'Boarding Life',
        icon: 'bi-building-fill',
        xPercent: 42,
        yPercent: 64,
        imageSrc: '/assets/sjccc-Domitory.jpeg',
        imageAlt: 'SJCCC boarding buildings overlooking green Mbengwi hills',
        description: "Separate residential facilities for boys and girls situated in a peaceful, secure compound. Guided by experienced resident House Masters and Matrons providing pastoral care, moral discipline, and structured study routines.",
        amenities: [
            'Dedicated resident house master & matron oversight',
            'Solar backup lighting for evening studies',
            'Clean water reservoirs & filtered water points',
            'Evening supervised prep study rooms'
        ],
        hours: 'Supervised 24/7 Residency',
        headOfArea: 'Dean of Boarding / House Masters'
    },
    {
        id: 'classrooms',
        title: 'Academic Classroom Blocks & Labs',
        tagline: 'Vibrant teaching halls for General & Science curriculum',
        category: 'Academic Core',
        icon: 'bi-book-half',
        xPercent: 67,
        yPercent: 38,
        imageSrc: '/assets/sjccc-Classroom.jpg',
        imageAlt: 'Students engaged in classroom academic work at SJCCC',
        description: "Spacious, well-ventilated classrooms with generous natural lighting. Houses all Form 1 to Upper Sixth General Education arms, demonstration science stations for Physics, Chemistry, Biology, and computer laboratories.",
        amenities: [
            'Optimal student-to-teacher instructional ratios',
            'Science demonstration practical stations',
            'Reference library & quiet reading room',
            'ICT & Computer Studies laboratory'
        ],
        hours: '7:30 AM – 3:30 PM (Classes)',
        headOfArea: 'Dean of Studies'
    },
    {
        id: 'construction',
        title: 'Building & Civil Construction Yard',
        tagline: 'Structural masonry, architectural drafting & woodwork',
        category: 'Technical Education',
        icon: 'bi-tools',
        xPercent: 20,
        yPercent: 61,
        imageSrc: '/assets/sjccc-Construction-site.jpeg',
        imageAlt: 'Students gaining practical construction experience on campus',
        description: "A comprehensive practical site where students master bricklaying, concrete casting, architectural drawing, surveying, and site safety management under licensed master builders.",
        amenities: [
            'Architectural drafting & blue-print room',
            'Masonry & structural concrete practice yard',
            'Surveying transit levels & measuring instruments',
            'Carpentry & scaffolding demonstration area'
        ],
        hours: '8:00 AM – 4:00 PM (Practical Days)',
        headOfArea: 'Senior Construction Instructor'
    },
    {
        id: 'sports',
        title: 'Sports Complex & Athletic Grounds',
        tagline: 'Regulation football pitch, running track, volleyball & basketball courts',
        category: 'Athletics & Recreation',
        icon: 'bi-dribbble',
        xPercent: 77,
        yPercent: 20,
        imageSrc: '/assets/sjccc-view.jpg',
        imageAlt: 'SJCCC sports complex with regulation football pitch and athletic grounds',
        description: "Our premier sports and athletic complex situated in the scenic hills of Mbengwi. Features a full regulation football pitch, running track, volleyball and basketball courts where inter-house tournaments, sports days, and student fitness activities thrive.",
        amenities: [
            'Regulation football pitch & running tracks',
            'Volleyball & basketball courts',
            'Assembly square with flagposts & podium',
            'Shaded spectator trees & cheering pavilions'
        ],
        hours: '4:00 PM – 6:00 PM (Recreation)',
        headOfArea: 'Sports & Games Prefect / Master'
    }
];
