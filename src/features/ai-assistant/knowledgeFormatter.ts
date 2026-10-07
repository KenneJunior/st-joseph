/**
 * ============================================================================
 * SJCCC – Knowledge Formatter & Prompt Generator (knowledgeFormatter.ts)
 * 
 * Bridges authoritative institutional data (`SJCCC_KNOWLEDGE`) to:
 * 1. The dynamic Gemini System Prompt (used by server-side Gemini proxy)
 * 2. Deterministic, structured offline response builders
 * 
 * Ensures:
 * - Single source of truth (zero duplicated facts)
 * - Dynamic Cameroon calendar date awareness (Africa/Douala)
 * - Clear date semantics (past dates are never presented as future events)
 * - Absolute grounding in verified SJCCC records
 * ============================================================================
 */

import { SJCCC_KNOWLEDGE, type SjcccKnowledge } from '../../data/sjcccKnowledge.ts';
import { getCameroonDate, describeDateStatus } from './dateUtils.ts';

/**
 * Dynamically builds the comprehensive, grounded Gemini System Prompt
 * incorporating authoritative institutional records and runtime Cameroon date.
 */
export function buildSjcccSystemPrompt(options?: {
    todayCameroon?: string;
    knowledge?: SjcccKnowledge;
}): string {
    const k = options?.knowledge ?? SJCCC_KNOWLEDGE;
    const today = options?.todayCameroon ?? getCameroonDate();

    const techCourses = k.programs.technicalDepartments
        .map((dept, i) => `  ${i + 1}. ${dept.fullName}: ${dept.description}`)
        .join('\n');

    const historyItems = k.identity.history
        .map((h) => `  - ${h.year}: ${h.event}`)
        .join('\n');

    const interviewStatus = describeDateStatus(
        k.admissions.interview.dateISO,
        k.admissions.interview.dateDisplay,
        today
    );

    return `You are the official SJCCC Guidance Assistant for ${k.identity.name} (${k.identity.acronym}), Mbengwi, North-West Region, Cameroon.
Your role is to assist prospective students, parents, guardians, current students, alumni, and visitors with accurate, professional, welcoming, and respectful information about the college.

### CURRENT RUNTIME DATE CONTEXT (CRITICAL)
- Today's date in Cameroon (Africa/Douala, UTC+1) is ${today}.
- Use this date when interpreting all dates and academic calendar milestones.
- If an institutional event date (such as the entrance interview on ${k.admissions.interview.dateISO}) is before today's date (${today}), it has ALREADY PASSED.
- You must NEVER present past dates as upcoming events. If a date has passed, state clearly that it was scheduled for that date in the past and direct the user to the official administration contact for current or future arrangements. Never invent a replacement date.

### INSTITUTIONAL IDENTITY & HISTORY
- Name: ${k.identity.name} (${k.identity.acronym})
- Legal Name: ${k.identity.legalName}
- Proprietor & Diocese: ${k.identity.proprietor}
- Founded: ${k.identity.establishedDisplay} (initially entrusted to the Marist Brothers of the Schools)
- Principal: ${k.identity.principalName}
- Motto: Latin: "${k.identity.mottoLatin}" | English: "${k.identity.mottoEnglish}"
- School Type: ${k.identity.schoolType}
- Location: ${k.identity.campusLocation}, ${k.identity.region}, ${k.identity.country}
- Postal Address: ${k.identity.postalAddress}
- Official Email: ${k.identity.contact.email}
- Telephone & WhatsApp: ${k.identity.contact.phoneFormatted} | Direct WhatsApp: ${k.identity.contact.whatsAppUrl}
- Current Academic Year: ${k.identity.currentAcademicYear}
- Milestone History:
${historyItems}

### ADMISSION REQUIREMENTS & CALENDAR
- Academic Session: ${k.admissions.session}
- First Cycle (Forms 1 – 5): ${k.admissions.firstCycle.primaryRequirement}
  Required documents: ${k.admissions.firstCycle.requiredDocuments.join('; ')}.
- Second Cycle (Lower Sixth & Upper Sixth): ${k.admissions.secondCycle.primaryRequirement}
  Required documents: ${k.admissions.secondCycle.requiredDocuments.join('; ')}.
- Entrance Interview: ${k.admissions.interview.dateDisplay} (${k.admissions.interview.dateISO}) at ${k.admissions.interview.time} prompt at ${k.admissions.interview.location}.
  Interview Status relative to today (${today}): ${interviewStatus.phrase}.
  Materials required: ${k.admissions.interview.requiredMaterials.join('; ')}.
- Academic Resumption Dates (${k.admissions.session}):
  - New Students (Form 1 & Lower Sixth): ${k.admissions.reopening.newStudentsDisplay} (${k.admissions.reopening.newStudentsDateISO}) – ${k.admissions.reopening.newStudentsDescription}
  - Returning Students: ${k.admissions.reopening.returningStudentsDisplay} (${k.admissions.reopening.returningStudentsDateISO}) – ${k.admissions.reopening.returningStudentsDescription}

### ACADEMIC CURRICULUM & PROGRAMS
- First Cycle (Forms 1 – 5): ${k.programs.grammarFirstCycle}
- Second Cycle (Lower Sixth & Upper Sixth): ${k.programs.grammarSecondCycle} Streams: ${k.programs.grammarStreams.join(', ')}.
- Technical & Vocational Education (Forms 1 to 3):
${techCourses}

### TUITION, FEES & OFFICIAL BANKING
- Academic Session: ${k.fees.session}
- Baseline Total (General Grammar / Boarding): ${k.fees.grammarTotal.toLocaleString()} ${k.fees.currency}
- Technical Section Total: ${k.fees.technicalTotal.toLocaleString()} ${k.fees.currency}
- Official Banking Institution: ${k.fees.banking.institution}
- Account Name: ${k.fees.banking.accountName}
- Account Number: ${k.fees.banking.accountNumber}
- Bank Branch: ${k.fees.banking.branch}
- Installment Schedule:
  - 1st Installment: ${k.fees.banking.firstInstallment}.
  - 2nd Installment: ${k.fees.banking.secondInstallment}.
  - Exam Classes Policy: ${k.fees.banking.examClassesPolicy}
  - Receipt Notice: ${k.fees.banking.receiptNotice}

### CAMPUS FACILITIES & DISCIPLINE
- Facilities: ${k.campus.facilities.join('; ')}.
- Values: ${k.discipline.coreValues.join('; ')}.
- Zero Tolerance: ${k.discipline.zeroTolerance.join('; ')}.
- Prescribed Uniform: ${k.discipline.uniform.daily}
- Footwear: ${k.discipline.uniform.footwear}
- Visiting Policy: ${k.campus.visitingPolicy.frequency} ${k.campus.visitingPolicy.hours} ${k.campus.visitingPolicy.eligibleVisitors}
- Healthcare: ${k.campus.healthcare.infirmary} ${k.campus.healthcare.insurance}

### GUIDANCE & RESPONSE RULES
1. Grounding & Truthfulness:
   - NEVER invent fees, banking information, admission requirements, dates, programs, policies, staff names, contact details, or school history.
   - All factual statements must strictly align with the authoritative records above.
2. Missing Information:
   - If an inquirer asks for details not contained in these authoritative records, explicitly state: "I don't have that information in the current SJCCC records. Please contact the college directly at ${k.identity.contact.phoneFormatted} or ${k.identity.contact.email}."
   - Do NOT guess, extrapolate, or provide speculative answers.
3. Scope:
   - Only answer questions relating to SJCCC Mbengwi (admissions, fees, curriculum, campus life, calendar, contacts).
   - For off-topic queries (e.g. general internet trivia, entertainment, politics, coding outside school), politely decline: "I am the SJCCC Guidance Assistant, so I can only provide information about St. Joseph's Catholic Comprehensive College Mbengwi. I can assist with admissions, fees, academic programs, school life, dates, or contact details."
4. Sensitive Matters:
   - For fee waiver appeals, personal disciplinary disputes, or medical issues, direct the user to the College Administration via email (${k.identity.contact.email}) or WhatsApp (${k.identity.contact.phoneFormatted}).
5. Tone & Style:
   - Warm, respectful, clear, professional, supportive, and concise.
   - Use Markdown bullet points and bold amounts for easy scanning.
   - Avoid robotic filler phrases like "As an AI language model".`;
}

// ============================================================================
// DETERMINISTIC OFFLINE RESPONSE BUILDERS
// ============================================================================

/**
 * Builds authoritative admissions response with accurate date semantics.
 */
export function buildAdmissionResponse(
    knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE,
    todayCameroon?: string
): string {
    const today = todayCameroon ?? getCameroonDate();
    const interview = knowledge.admissions.interview;
    const interviewStatus = describeDateStatus(interview.dateISO, interview.dateDisplay, today);

    let interviewNotice = '';
    if (interviewStatus.isPast) {
        interviewNotice = `• **Entrance Interview:** The official entrance interview was scheduled for **${interview.dateDisplay}** (this date has now passed). For late admissions or upcoming transfer interview dates, please contact the college administration.`;
    } else {
        interviewNotice = `• **Entrance Interview:** Scheduled for **${interview.dateDisplay}** at ${interview.time} prompt on the college campus in Mbengwi.`;
    }

    return `**Admissions at SJCCC Mbengwi (${knowledge.admissions.session} Academic Session)**\n\n` +
        `• **First Cycle (Forms 1–5):** ${knowledge.admissions.firstCycle.primaryRequirement} Required documents: ${knowledge.admissions.firstCycle.requiredDocuments.join(', ')}.\n` +
        `• **Second Cycle (Lower & Upper Sixth):** ${knowledge.admissions.secondCycle.primaryRequirement} Required documents: ${knowledge.admissions.secondCycle.requiredDocuments.join(', ')}.\n` +
        `${interviewNotice}\n\n` +
        `For admission inquiries and registration, call **${knowledge.identity.contact.phoneFormatted}** or [Message Admissions on WhatsApp](${knowledge.identity.contact.whatsAppUrl}).`;
}

/**
 * Builds authoritative academic programs response.
 */
export function buildProgramResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    const depts = knowledge.programs.technicalDepartments
        .map((d, i) => `   ${i + 1}. **${d.fullName}:** ${d.description}`)
        .join('\n');

    return `**Academic Programs Offered at SJCCC Mbengwi**\n\n` +
        `1. **Grammar Education (Forms 1 to Upper Sixth):**\n` +
        `   • First Cycle: Leading to Cameroon GCE Ordinary Level.\n` +
        `   • Second Cycle: Arts, Science, and Commercial streams leading to Cameroon GCE Advanced Level.\n\n` +
        `2. **Technical & Vocational Education (Forms 1–3):**\n` +
        `${depts}\n\n` +
        `All academic and technical sections are supported by specialized workshops, modern science laboratories, and an ICT computer suite.`;
}

/**
 * Builds authoritative tuition fees & OPSEC banking response.
 */
export function buildFeeResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    const fees = knowledge.fees;
    const bank = fees.banking;

    return `**Tuition & Fees Breakdown (${fees.session} Session)**\n\n` +
        `• **General Grammar Baseline Total:** **${fees.grammarTotal.toLocaleString()} ${fees.currency}**\n` +
        `• **Technical Section Total:** **${fees.technicalTotal.toLocaleString()} ${fees.currency}** (includes practical workshop materials)\n` +
        `• **Boarding & Catering:** 112,000 ${fees.currency}\n` +
        `• **Tuition Component:** 40,000 ${fees.currency} (1st or 2nd Cycle)\n\n` +
        `**Official Banking Payment Details:**\n` +
        `• **Bank:** ${bank.institution}\n` +
        `• **Account Name:** ${bank.accountName}\n` +
        `• **Account Number:** **${bank.accountNumber}**\n` +
        `• **Branch:** ${bank.branch}\n\n` +
        `*Payment Terms: First installment payable in July, August, and September prior to resumption. Form 5 and Upper Sixth candidates must pay all fees in full before reopening to guarantee GCE registration.*`;
}

/**
 * Builds campus rules, discipline & uniform response.
 */
export function buildDisciplineResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    const d = knowledge.discipline;

    return `**Campus Life, Rules & Discipline at SJCCC**\n\n` +
        `As a Catholic institution under the Archdiocese of Bamenda, SJCCC promotes holistic human and Christian formation:\n\n` +
        `• **Core Values:** ${d.coreValues.join(', ')}.\n` +
        `• **Zero Tolerance:** Immediate disciplinary sanctions for bullying, exam fraud, alcohol, illegal substances, or vandalism.\n` +
        `• **Prescribed Uniform:** ${d.uniform.daily}\n` +
        `• **Footwear:** ${d.uniform.footwear}\n` +
        `• **Spiritual Life:** Regular Holy Mass and pastoral reflection at the College Chapel & St. Joseph's Shrine.`;
}

/**
 * Builds authoritative official contacts and location response.
 */
export function buildContactResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    const id = knowledge.identity;
    const c = id.contact;

    return `**SJCCC Official Contact & Location Coordinates**\n\n` +
        `• **Campus Location:** ${id.campusLocation}, ${id.city}, ${id.division} Division, ${id.region}, ${id.country}\n` +
        `• **Telephone & WhatsApp:** **${c.phoneFormatted}**\n` +
        `• **Direct WhatsApp:** [Chat with Admissions](${c.whatsAppUrl})\n` +
        `• **Official Email:** ${c.email}\n` +
        `• **Postal Address:** ${id.postalAddress}\n` +
        `• **Principal:** ${id.principalName} (${id.principalTitle})\n` +
        `• **Proprietor:** ${id.proprietor}`;
}

/**
 * Builds college history and identity response.
 */
export function buildHistoryResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    const id = knowledge.identity;

    return `**About St. Joseph's Catholic Comprehensive College (SJCCC)**\n\n` +
        `• **Foundation:** Established on ${id.establishedDisplay} under the Archdiocese of Bamenda (initially entrusted to the Marist Brothers of the Schools).\n` +
        `• **Motto:** *"${id.mottoLatin}"* ("${id.mottoEnglish}").\n` +
        `• **Principal:** ${id.principalName}.\n` +
        `• **Mission:** Integral holistic Catholic formation combining academic rigor, vocational technical skill mastery, and solid moral uprightness.`;
}

/**
 * Builds academic calendar and dates response with date-awareness.
 */
export function buildScheduleResponse(
    knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE,
    todayCameroon?: string
): string {
    const today = todayCameroon ?? getCameroonDate();
    const reopen = knowledge.admissions.reopening;

    const newStudentsStatus = describeDateStatus(reopen.newStudentsDateISO, reopen.newStudentsDisplay, today);
    const returningStatus = describeDateStatus(reopen.returningStudentsDateISO, reopen.returningStudentsDisplay, today);

    return `**Academic Calendar & Key Dates (${knowledge.identity.currentAcademicYear})**\n\n` +
        `• **New Students Resumption:** ${reopen.newStudentsDisplay} (${reopen.newStudentsDateISO}) – ${newStudentsStatus.phrase}.\n` +
        `• **Returning Students Resumption:** ${reopen.returningStudentsDisplay} (${reopen.returningStudentsDateISO}) – ${returningStatus.phrase}.\n\n` +
        `For questions about mid-term breaks, term examinations, or termly visiting days, please contact the college administration at **${knowledge.identity.contact.phoneFormatted}**.`;
}

/**
 * Builds welcoming greeting response.
 */
export function buildGreetingResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    return `Welcome to **${knowledge.identity.name} (${knowledge.identity.acronym})** Mbengwi guidance service.\n\n` +
        `I can assist you with:\n` +
        `• **Admissions & Entrance Requirements** (First Cycle, Second Cycle, documents)\n` +
        `• **Academic Programs** (Grammar streams & 5 Technical trade departments)\n` +
        `• **Tuition Fees & OPSEC Banking** (Account ${knowledge.fees.banking.accountNumber}, installment schedules)\n` +
        `• **School Rules, Uniforms & Boarding Life**\n` +
        `• **Academic Calendar & Important Dates**\n` +
        `• **Official Contact & Location Details**\n\n` +
        `Feel free to ask a specific question, or contact our college office directly at **${knowledge.identity.contact.phoneFormatted}** or [WhatsApp us](${knowledge.identity.contact.whatsAppUrl}).`;
}

/**
 * Builds clean clarification response for ambiguous questions.
 */
export function buildAmbiguousResponse(): string {
    return `I can help with SJCCC admissions, tuition fees, academic programs, school rules and discipline, calendar dates, or official contact information. Could you please clarify which of these topics you would like to know about?`;
}

/**
 * Builds standardized scope boundary response for off-topic questions.
 */
export function buildOutOfScopeResponse(knowledge: SjcccKnowledge = SJCCC_KNOWLEDGE): string {
    return `I am the ${knowledge.identity.acronym} Guidance Assistant, so I can only provide information about ${knowledge.identity.name} Mbengwi. I can assist you with admissions, school fees, academic programs, campus rules, important dates, or contact information.`;
}
