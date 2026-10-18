/**
 * ============================================================================
 * SJCCC – Canonical Testimonials & Community Voices Dataset
 * Reflects authentic lived experiences from students, faculty, PTA, and alumni.
 * ============================================================================
 */

export interface TestimonialItem {
    id: string;
    name: string;
    role: string;
    category: 'all' | 'students' | 'faculty' | 'parents' | 'alumni';
    categoryLabel: string;
    avatarUrl: string;
    avatarAlt: string;
    quote: string;
    highlight: string;
    virtue: string;
    rating: number;
    yearOrClass: string;
    fullStory: string;
}

export const TESTIMONIALS_DATA: readonly TestimonialItem[] = [
    {
        id: 'chrisantus-sports',
        name: 'Chrisantus Monjoh Mbobnda',
        role: 'Sports Coordinator & Physical Education Master',
        category: 'faculty',
        categoryLabel: 'Faculty & Athletics',
        avatarUrl: '/assets/sjccc-sports-instructor.jpg',
        avatarAlt: 'Chrisantus Monjoh Mbobnda, Sports Coordinator',
        quote: 'For the very first time in the history of the college, Saint Joseph has qualified for Football at the FENASCO Games. With the talent and enthusiasm I see in our students, we are truly proving what SJCCC is capable of achieving.',
        highlight: 'FENASCO Football Qualification 2026',
        virtue: 'Discipline & Teamwork',
        rating: 5,
        yearOrClass: 'Physical Education Faculty',
        fullStory: 'Under dedicated coaching and Catholic moral formation, our sports program blends physical fitness with Christian sportsmanship. The 2026 qualification for FENASCO Football marks a historic milestone for Momo Division, demonstrating that academic rigor and athletic triumph go hand-in-hand at SJCCC.',
    },
    {
        id: 'sunjoh-prefect',
        name: 'Sunjoh Tessy',
        role: 'Assistant Senior Girls’ Prefect',
        category: 'students',
        categoryLabel: 'Student Leadership',
        avatarUrl: '/assets/sjccc-sunjo.jpg',
        avatarAlt: 'Sunjoh Tessy, Assistant Senior Girls’ Prefect',
        quote: 'Saint Joseph is a serene environment that makes learning natural and calm. The student-teacher relationship is truly wonderful—our teachers are always accessible whenever we face difficulties, helping every student adapt quickly and excel.',
        highlight: 'Serene Campus & Accessible Faculty',
        virtue: 'Academic Excellence',
        rating: 5,
        yearOrClass: 'Class of 2026 · Upper Sixth Arts',
        fullStory: 'Living on campus in Mbengwi provides an unshakeable sense of security, peace, and focus away from city distractions. The structured evening prep routines and personal mentorship from house mistresses and tutors have enabled me to excel in my studies while serving our school family.',
    },
    {
        id: 'cyprian-pta',
        name: 'Cyprian Kudi Montwa',
        role: 'Secretary General of the PTA',
        category: 'parents',
        categoryLabel: 'Parents & PTA Council',
        avatarUrl: '/assets/sjccc-pta.jpg',
        avatarAlt: 'Cyprian Kudi Montwa, Secretary General of the PTA',
        quote: 'The PTA works hand-in-hand with the administration to equip modern science laboratories, provide dedicated school transport, and foster holistic development. We invite parents all over Cameroon to come and discover Saint Joseph.',
        highlight: 'Modern Labs & Secure Transport',
        virtue: 'Community Partnership',
        rating: 5,
        yearOrClass: 'PTA Executive Council',
        fullStory: 'As parents, our peace of mind comes from knowing our children are safe, morally guarded, and guided by principled Catholic educators. The Parent-Teacher Association actively co-funds advanced laboratory apparatus, compound infrastructure, and student health welfare.',
    },
    {
        id: 'dr-jude-alumni',
        name: 'Dr. Jude N. Tembeng',
        role: 'Alumnus · Biomedical Researcher',
        category: 'alumni',
        categoryLabel: 'Alumni Network',
        avatarUrl: '/assets/sjccc-graduants-0.jpg',
        avatarAlt: 'Dr. Jude N. Tembeng, Alumnus and Biomedical Researcher',
        quote: 'The rigorous laboratory discipline, Christian moral compass, and self-reliance instilled at SJCCC provided the bedrock for my research career. SJCCC does not simply prepare you for exams; it equips you with integrity that lasts a lifetime.',
        highlight: 'Bedrock for Scientific Research',
        virtue: 'Lifelong Integrity',
        rating: 5,
        yearOrClass: 'Class of 2012 · Science Stream',
        fullStory: 'From Form One through Upper Sixth at Saint Joseph, hands-on physics and chemistry sessions taught me to think critically and observe with patience. Those formative years directly paved my path to earning a doctorate in biomedical sciences and leading clinical research initiatives.',
    },
    {
        id: 'sr-beatrice-matron',
        name: 'Rev. Sister Beatrice Lum',
        role: 'House Matron & Pastoral Care Director',
        category: 'faculty',
        categoryLabel: 'Pastoral Care & Welfare',
        avatarUrl: '/assets/sjccc-student-meeting.jpeg',
        avatarAlt: 'Rev. Sister Beatrice Lum, House Matron and Pastoral Care Director',
        quote: 'Our residential boarding life is centered on prayer, mutual brotherhood and sisterhood, and daily order. Seeing timid Form One children mature into confident, God-fearing leaders by Upper Sixth is the greatest reward of our Catholic vocation.',
        highlight: 'Holistic Spiritual Formation',
        virtue: 'Faith & Pastoral Love',
        rating: 5,
        yearOrClass: 'Pastoral Ministry Team',
        fullStory: 'In the college dormitories, we ensure every boy and girl receives maternal care, balanced nutrition, and daily spiritual encouragement. Our daily rhythm of chapel reflection, supervised prep, and communal chores builds self-reliant characters prepared for life.',
    },
    {
        id: 'mbah-emmanuel-prefect',
        name: 'Mbah Emmanuel',
        role: 'Senior Boy Prefect · Technical Division',
        category: 'students',
        categoryLabel: 'Student Leadership',
        avatarUrl: '/assets/Students.jpeg',
        avatarAlt: 'Mbah Emmanuel, Senior Boy Prefect',
        quote: 'Combining technical Electrical Power Systems with Advanced Level Sciences gives us hands-on mastery that grammar schools cannot match. When you step out of SJCCC, you possess both academic insight and tangible trade skills.',
        highlight: 'Dual Technical & Academic Mastery',
        virtue: 'Minds & Hands Synergy',
        rating: 5,
        yearOrClass: 'Class of 2026 · Technical Division',
        fullStory: 'Working in practical electrical and construction workshops while tackling rigorous GCE theory taught me real engineering problem-solving. At SJCCC, teachers remain in the workshops after regular hours until every student has mastered both the circuit and the mathematics behind it.',
    },
] as const;

export interface TestimonialFilterCategory {
    id: 'all' | 'students' | 'faculty' | 'parents' | 'alumni';
    label: string;
    iconClass: string;
}

export const TESTIMONIAL_FILTER_CATEGORIES: readonly TestimonialFilterCategory[] = [
    { id: 'all', label: 'All Perspectives', iconClass: 'bi-grid-fill' },
    { id: 'students', label: 'Student Leaders', iconClass: 'bi-mortarboard-fill' },
    { id: 'faculty', label: 'Faculty & Staff', iconClass: 'bi-person-badge-fill' },
    { id: 'parents', label: 'Parents & PTA', iconClass: 'bi-people-fill' },
    { id: 'alumni', label: 'Alumni Network', iconClass: 'bi-award-fill' },
] as const;
