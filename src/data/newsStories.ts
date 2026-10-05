/**
 * ============================================================================
 * SJCCC – Institutional News & Storytelling Canonical Dataset
 * Saint Joseph Catholic Comprehensive College Mbengwi (Momo Division)
 *
 * Enforces strict information ownership:
 * - Academic dates / deadlines -> src/data/academicCalendar.ts
 * - Ephemeral urgent alerts -> AnnouncementBar component
 * - Official notices / circulars archive -> src/data/pastAnnouncements.ts
 * - Institutional stories / triumphs / highlights -> src/data/newsStories.ts
 * ============================================================================
 */

export interface NewsStoryMetadataItem {
    label: string;
    value: string;
    icon?: string;
}

export interface NewsStory {
    id: string;
    title: string;
    slug: string;
    date: string;
    datetime: string; // ISO 8601 string for semantic <time datetime="...">
    dateISO?: string;
    category: 'Academic Excellence' | 'Convocation' | 'Campus Development' | 'Faith & Community';
    summary: string;
    imageSrc: string;
    imageAlt: string;
    href: string;
    ctaText: string;
    featured?: boolean;
    readTime: string;
    fullStory?: string[];
    metadata?: NewsStoryMetadataItem[];
    keyTakeaway?: string;
}

/**
 * Verified institutional highlights sourced strictly from existing college records,
 * official examination returns, and documented campus events.
 */
export const NEWS_STORIES: NewsStory[] = [
    {
        id: 'story-gce-2026',
        title: 'Historic 2026 GCE Results: 100% Ordinary Level Pass Rate',
        slug: 'historic-gce-results-2026',
        date: '21 August 2026',
        datetime: '2026-08-21',
        dateISO: '2026-08-21',
        category: 'Academic Excellence',
        summary: 'Official returns from the Cameroon GCE Board confirm a landmark 100% pass rate in the General Ordinary Level session, with 50% of candidates passing with 10 and 11 papers.',
        imageSrc: '/assets/sjccc-trophies.jpg',
        imageAlt: 'SJCCC academic and athletic achievement trophies on display',
        href: '#results',
        ctaText: 'View Official Returns',
        featured: true,
        readTime: '3 min read',
        fullStory: [
            'The official examination returns released by the Cameroon GCE Board officially confirm a landmark 100% pass rate for the General Ordinary Level cohort at Saint Joseph Catholic Comprehensive College Mbengwi. Exactly 50% of all registered candidates cleared 10 and 11 subjects with distinguished honors.',
            'Core scientific subjects including Biology, Human Biology, Chemistry, and Additional Mathematics recorded flawless 100% pass rates, while English Language and Religious Knowledge garnered more than 40 Grade "A" marks across the student body.',
            'Principal Rev. Father noted during the assembly: "This achievement demonstrates our culture of rigorous evening tutorials, individual pastoral mentoring, and moral rectitude. We congratulate our teachers and supportive parents across Momo Division."',
        ],
        metadata: [
            { label: 'Exam Body', value: 'Cameroon GCE Board', icon: 'bi-award-fill' },
            { label: 'Center Code', value: 'Center No. 1028 Mbengwi', icon: 'bi-geo-alt-fill' },
            { label: 'Pass Rate', value: '100% O-Level · 66.6% A-Level', icon: 'bi-graph-up-arrow' },
            { label: 'Distinction', value: '50% Passed 10-11 Papers', icon: 'bi-star-fill' },
        ],
        keyTakeaway: 'Landmark 100% O-Level pass rate with 50% scoring 10 to 11 subjects in June 2026.',
    },
    {
        id: 'story-graduation-2026',
        title: 'Class of 2026 Valedictory Service & Convocation Honors',
        slug: 'class-of-2026-valedictory-convocation',
        date: '26 June 2026',
        datetime: '2026-06-26',
        dateISO: '2026-06-26',
        category: 'Convocation',
        summary: 'Graduating Form Five and Upper Sixth students were robed and honored in a solemn Thanksgiving High Mass at Saint Joseph Jubilee Hall under the motto "Edificamus Regnum Dei".',
        imageSrc: '/assets/sjccc-graduants-0.jpg',
        imageAlt: 'SJCCC Class of 2026 graduands in formal academic robes and convocation caps',
        href: '#schoolDatesSection',
        ctaText: 'View Convocation Milestone',
        featured: false,
        readTime: '4 min read',
        fullStory: [
            'Dressed in formal collegiate academic regalia, 185 graduands from General Arts, Science, and Technical Engineering tracks participated in the 2026 Valedictory High Mass at Saint Joseph Jubilee Hall, celebrated by Archdiocesan clergy and faculty.',
            'The prestigious Edificamus Shield of Honor was awarded to the Senior College Prefect in recognition of seven years of exemplary boarding leadership, academic integrity, and dedicated liturgical service.',
            'During the ceremony, the Saint Joseph Old Boys & Alumni Association (SJCCC-OBA) formally inducted the graduating class, presenting each scholar with a collegiate alumni lapel pin and lifelong mentoring directory access.',
        ],
        metadata: [
            { label: 'Graduand Count', value: '185 Scholars Inducted', icon: 'bi-people-fill' },
            { label: 'Venue', value: 'Saint Joseph Jubilee Hall', icon: 'bi-building-fill' },
            { label: 'Top Honor', value: 'Edificamus Shield of Character', icon: 'bi-trophy-fill' },
            { label: 'Alumni Registry', value: 'SJCCC-OBA Worldwide Network', icon: 'bi-globe' },
        ],
        keyTakeaway: '185 graduands commissioned with Archdiocesan blessing and lifetime alumni induction.',
    },
    {
        id: 'story-technical-workshop-2026',
        title: 'Electrical Power Systems & ICT Laboratory Expansion',
        slug: 'technical-workshops-expansion-2026',
        date: '12 May 2026',
        datetime: '2026-05-12',
        dateISO: '2026-05-12',
        category: 'Campus Development',
        summary: 'Commissioning of expanded electrical engineering workstations, solar circuit trainers, and upgraded computer science terminals, advancing hands-on technical education.',
        imageSrc: '/assets/sjccc-Electricity.jpeg',
        imageAlt: 'SJCCC students engaged in technical electrical engineering workshop training',
        href: '#campusMapSection',
        ctaText: 'Tour Technical Labs',
        featured: false,
        readTime: '2 min read',
        fullStory: [
            'In alignment with SJCCC’s mission to equip students with certified vocational mastery, the College Board inaugurated two major infrastructure modernizations: the Smart Energy Electrical Training Facility and the upgraded 60-terminal Computer Center.',
            'The electrical laboratory includes industrial three-phase circuit demonstration boards, solar inverter diagnostic stations, and protective relay test benches conforming to CEMAC industrial safety protocols.',
            'The computing facility features high-speed LAN connectivity, offline architectural design suites (CAD), and programming environments to prepare Form 3 through Upper Sixth technical students for regional engineering employment.',
        ],
        metadata: [
            { label: 'Facility', value: 'Smart Energy & Computing Wing', icon: 'bi-tools' },
            { label: 'Power Source', value: 'Dedicated Solar Photovoltaic Bank', icon: 'bi-sun-fill' },
            { label: 'Workstations', value: '60 Dual-Boot Terminals + 12 Test Benches', icon: 'bi-display-fill' },
            { label: 'Certification', value: 'GCE Technical & CAP Alignment', icon: 'bi-patch-check-fill' },
        ],
        keyTakeaway: 'State-of-the-art solar and electrical testing benches paired with 60 modern computing stations.',
    },
    {
        id: 'story-patronal-feast-2026',
        title: 'Solemnity of Saint Joseph: College Patronal Feast Celebrations',
        slug: 'solemnity-of-saint-joseph-feast-day-2026',
        date: '19 March 2026',
        datetime: '2026-03-19',
        dateISO: '2026-03-19',
        category: 'Faith & Community',
        summary: 'Students, alumni, and archdiocesan clergy gathered in prayer and cultural fellowship for the Pontifical High Mass, inter-house choral anthems, and athletic finals.',
        imageSrc: '/assets/sjccc-student-in-chapel-1.png',
        imageAlt: 'Eucharistic and liturgical procession during the Feast of Saint Joseph on campus grounds',
        href: '#about',
        ctaText: 'Discover College Heritage',
        featured: false,
        readTime: '3 min read',
        fullStory: [
            'The feast of Saint Joseph, Universal Patron of Workers and Protector of our College, gathered the entire Mbengwi Catholic community, alumni delegations, and visiting parents for an unforgettable day of spiritual devotion and cultural vibrancy.',
            'The Pontifical High Mass led by visiting Archdiocesan clergy highlighted Saint Joseph’s humble craftsmanship, devotion to family, and persevering faith as the foundational virtues guiding every SJCCC student.',
            'Festivities concluded with the annual Inter-House Choral and Athletic Championship, where Saint Peter’s House clinched the coveted 2026 Patronal Cup after a fiercely contested football final and four-part Latin hymn competition.',
        ],
        metadata: [
            { label: 'Feast Day', value: '19 March (Solemnity of St. Joseph)', icon: 'bi-calendar-heart-fill' },
            { label: 'Liturgy', value: 'Pontifical High Mass & Benediction', icon: 'bi-church' },
            { label: 'House Winner', value: "Saint Peter's House (Football & Choral)", icon: 'bi-trophy-fill' },
            { label: 'Motto Theme', value: '"Edificamus Regnum Dei"', icon: 'bi-shield-fill' },
        ],
        keyTakeaway: 'Archdiocesan Eucharistic celebration, Latin choral contests, and annual athletic championship.',
    },
];
