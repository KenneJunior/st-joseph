/**
 * ============================================================================
 * SJCCC – Frequently Asked Questions (FAQ) Canonical Dataset
 * Single source of truth for the 15 admissions, boarding, and fee questions
 * rendered both in index.html visible accordion and in FAQPage JSON-LD schema.
 * ============================================================================
 */

import { TUITION_FEES, BANKING_INFO } from './tuitionFees.ts';
import { TECHNICAL_DEPARTMENTS } from './academicPrograms.ts';

export interface FaqItem {
    id: string;
    num: number;
    category: 'admissions' | 'boarding' | 'fees';
    categoryTag: string;
    categoryIcon: string;
    question: string;
    answerHtml: string;
    jsonLdAnswer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
    // ───────────────── ADMISSIONS (Questions 1 - 5) ─────────────────
    {
        id: 'faq-q-form1-requirements',
        num: 1,
        category: 'admissions',
        categoryTag: 'Admission Requirements',
        categoryIcon: 'bi-mortarboard-fill',
        question: 'What are the admission requirements for Form One (First Cycle)?',
        answerHtml: `<p>Admission into Form One at SJCCC Mbengwi is open to pupils completing primary education with strong moral standing and academic readiness. The formal entry requirements include:</p>
<ul class="faq-styled-list">
  <li><strong>Government Common Entrance Examination:</strong> A verifiable pass in the National Common Entrance Examination.</li>
  <li><strong>Birth Certificate:</strong> A clear photocopy of the applicant's official birth certificate.</li>
  <li><strong>Progress Card:</strong> A recent progress card (school booklet/report card) certifying completion of Class Six with satisfactory academic performance and conduct.</li>
  <li><strong>Transfer Certificate:</strong> For pupils coming from outside institutions, an official transfer certificate from the previous school head.</li>
  <li><strong>Entrance Interview:</strong> Attendance at the annual Form One interviews held on campus in early August.</li>
</ul>
<div class="faq-callout-card">
  <i class="bi bi-info-circle-fill faq-callout-icon"></i>
  <div class="faq-callout-body">
    <strong>Interviews Date:</strong> Form One interviews take place on <strong>Tuesday, 4th August 2026 at 9:00 AM</strong> on the college campus in Mbengwi. Early registrations can be initiated online through our enquiry portal.
  </div>
</div>`,
        jsonLdAnswer: `Admission into Form One at SJCCC Mbengwi is open to pupils completing primary education with strong moral standing and academic readiness. The formal entry requirements include: Government Common Entrance Examination: A verifiable pass in the National Common Entrance Examination. Birth Certificate: A clear photocopy of the applicant's official birth certificate. Progress Card: A recent progress card (school booklet/report card) certifying completion of Class Six with satisfactory academic performance and conduct. Transfer Certificate: For pupils coming from outside institutions, an official transfer certificate from the previous school head. Entrance Interview: Attendance at the annual Form One interviews held on campus in early August. Interviews Date: Form One interviews take place on Tuesday, 4th August 2026 at 9:00 AM on the college campus in Mbengwi. Early registrations can be initiated online through our enquiry portal.`
    },
    {
        id: 'faq-q-lower6-requirements',
        num: 2,
        category: 'admissions',
        categoryTag: 'Admission Requirements',
        categoryIcon: 'bi-mortarboard-fill',
        question: 'What are the entry criteria for Lower Sixth (Second Cycle Arts, Science & Commercial)?',
        answerHtml: `<p>Admission to the Second Cycle (Lower Sixth) requires students to have demonstrated solid academic foundation in their GCE Ordinary Level examinations. Candidates must provide:</p>
<ul class="faq-styled-list">
  <li><strong>GCE Ordinary Level Passes:</strong> A pass in at least <strong>four (4) GCE Ordinary Level subjects</strong> forming an approved combination in Arts, Science, or Commercial streams.</li>
  <li><strong>Official Result Slip:</strong> A certified photocopy of the Cameroon GCE Ordinary Level results slip or certificate.</li>
  <li><strong>Birth Certificate:</strong> A certified photocopy of the applicant's birth certificate.</li>
  <li><strong>Formal Application:</strong> A handwritten formal application letter addressed directly to the Principal expressing the candidate's chosen combination and educational motivation.</li>
</ul>
<p>Upper Sixth transfers are considered strictly upon review of the student's Lower Sixth progress records and good disciplinary standing.</p>`,
        jsonLdAnswer: `Admission to the Second Cycle (Lower Sixth) requires students to have demonstrated solid academic foundation in their GCE Ordinary Level examinations. Candidates must provide: GCE Ordinary Level Passes: A pass in at least four (4) GCE Ordinary Level subjects forming an approved combination in Arts, Science, or Commercial streams. Official Result Slip: A certified photocopy of the Cameroon GCE Ordinary Level results slip or certificate. Birth Certificate: A certified photocopy of the applicant's birth certificate. Formal Application: A handwritten formal application letter addressed directly to the Principal expressing the candidate's chosen combination and educational motivation. Upper Sixth transfers are considered strictly upon review of the student's Lower Sixth progress records and good disciplinary standing.`
    },
    {
        id: 'faq-q-technical-programs',
        num: 3,
        category: 'admissions',
        categoryTag: 'Technical Education',
        categoryIcon: 'bi-tools',
        question: 'What technical and vocational departments are offered for Forms 1 to 3?',
        answerHtml: `<p>In accordance with our mission to educate both minds and hands (<em>"Edificamus Regnum Dei"</em>), SJCCC offers accredited technical and vocational departments alongside general grammar education. In Forms 1 through 3, students can enroll in:</p>
<ul class="faq-styled-list">
${TECHNICAL_DEPARTMENTS.map(d => `  <li><strong>${d.fullName}:</strong> ${d.description}</li>`).join('\n')}
</ul>
<p>Students benefit from practical workshop sessions supervised by experienced technical instructors, equipping them with self-reliant trade skills.</p>`,
        jsonLdAnswer: `In accordance with our mission to educate both minds and hands ( "Edificamus Regnum Dei" ), SJCCC offers accredited technical and vocational departments alongside general grammar education. In Forms 1 through 3, students can enroll in: ${TECHNICAL_DEPARTMENTS.map(d => `${d.fullName}: ${d.description}`).join(' ')} Students benefit from practical workshop sessions supervised by experienced technical instructors, equipping them with self-reliant trade skills.`
    },
    {
        id: 'faq-q-interview-day',
        num: 4,
        category: 'admissions',
        categoryTag: 'Entrance Process',
        categoryIcon: 'bi-calendar-event',
        question: 'When do entrance interviews happen and what should candidates bring?',
        answerHtml: `<p>The annual Form One entrance interview takes place in August on the SJCCC Mbengwi campus starting promptly at <strong>9:00 AM</strong>. On interview day, candidates should arrive neatly dressed accompanied by a parent or guardian and bring:</p>
<ul class="faq-styled-list">
  <li>Writing materials (blue/black pens, pencils, eraser, and ruler).</li>
  <li>Original Primary School progress booklet (report card).</li>
  <li>Common Entrance Examination candidate slip or registration proof.</li>
  <li>Birth certificate photocopy.</li>
</ul>
<p>The interview evaluates basic numeracy, literacy, and readiness for a structured boarding routine. Families unable to travel on the scheduled date should contact the administration via WhatsApp (+237 682 760 271) to arrange a provisional assessment.</p>`,
        jsonLdAnswer: `The annual Form One entrance interview takes place in August on the SJCCC Mbengwi campus starting promptly at 9:00 AM. On interview day, candidates should arrive neatly dressed accompanied by a parent or guardian and bring: Writing materials (blue/black pens, pencils, eraser, and ruler). Original Primary School progress booklet (report card). Common Entrance Examination candidate slip or registration proof. Birth certificate photocopy. The interview evaluates basic numeracy, literacy, and readiness for a structured boarding routine. Families unable to travel on the scheduled date should contact the administration via WhatsApp (+237 682 760 271) to arrange a provisional assessment.`
    },
    {
        id: 'faq-q-transfer-students',
        num: 5,
        category: 'admissions',
        categoryTag: 'Transfer Policy',
        categoryIcon: 'bi-arrow-left-right',
        question: 'Can students transfer into intermediate classes (Forms 2, 3, 4, or Upper Sixth)?',
        answerHtml: `<p>Yes. SJCCC Mbengwi accepts transfer students into intermediate classes provided space is available in the requested department and the student meets our character standards.</p>
<ul class="faq-styled-list">
  <li><strong>Transfer Certificate:</strong> An official transfer certificate duly signed and stamped by the Principal or Head of the previous school.</li>
  <li><strong>Progress Card &amp; Term Reports:</strong> Academic transcripts showing consistent attendance, passing marks, and no unresolved disciplinary suspensions.</li>
  <li><strong>Parent/Guardian Interview:</strong> A short consultative interview with the Principal or Vice-Principal to ensure alignment with college rules.</li>
</ul>
<p>Transfers into candidate classes (Form Five and Upper Sixth) are accepted only under exceptional circumstances and require early clearance before examination registration deadlines.</p>`,
        jsonLdAnswer: `Yes. SJCCC Mbengwi accepts transfer students into intermediate classes provided space is available in the requested department and the student meets our character standards. Transfer Certificate: An official transfer certificate duly signed and stamped by the Principal or Head of the previous school. Progress Card & Term Reports: Academic transcripts showing consistent attendance, passing marks, and no unresolved disciplinary suspensions. Parent/Guardian Interview: A short consultative interview with the Principal or Vice-Principal to ensure alignment with college rules. Transfers into candidate classes (Form Five and Upper Sixth) are accepted only under exceptional circumstances and require early clearance before examination registration deadlines.`
    },

    // ───────────────── BOARDING (Questions 6 - 10) ─────────────────
    {
        id: 'faq-q-boarding-facilities',
        num: 6,
        category: 'boarding',
        categoryTag: 'Boarding Facilities',
        categoryIcon: 'bi-house-door-fill',
        question: 'What are the boarding facilities and living conditions like at SJCCC Mbengwi?',
        answerHtml: `<p>SJCCC Mbengwi is a co-educational Catholic boarding college situated in Momo Division, North West Region of Cameroon. Our campus offers a tranquil, green, and secure setting completely secluded from urban noise and distractions.</p>
<ul class="faq-styled-list">
  <li><strong>Separate Residential Dormitories:</strong> Gated, dedicated dormitories for boys and girls with strict access controls and round-the-clock supervision.</li>
  <li><strong>Dedicated Pastoral Team:</strong> Live-in House Masters, Matrons, and religious faculty ensure student welfare, discipline, character guidance, and security 24 hours a day.</li>
  <li><strong>Structured Study Routine:</strong> Supervised morning and evening study halls (prep) fostering academic discipline, punctuality, and peer collaboration.</li>
  <li><strong>Recreation &amp; Faith:</strong> On-campus Catholic chapel for spiritual growth, dining hall serving balanced meals, sports courts, and playing fields for football, handball, and athletics.</li>
</ul>`,
        jsonLdAnswer: `SJCCC Mbengwi is a co-educational Catholic boarding college situated in Momo Division, North West Region of Cameroon. Our campus offers a tranquil, green, and secure setting completely secluded from urban noise and distractions. Separate Residential Dormitories: Gated, dedicated dormitories for boys and girls with strict access controls and round-the-clock supervision. Dedicated Pastoral Team: Live-in House Masters, Matrons, and religious faculty ensure student welfare, discipline, character guidance, and security 24 hours a day. Structured Study Routine: Supervised morning and evening study halls (prep) fostering academic discipline, punctuality, and peer collaboration. Recreation & Faith: On-campus Catholic chapel for spiritual growth, dining hall serving balanced meals, sports courts, and playing fields for football, handball, and athletics.`
    },
    {
        id: 'faq-q-boarding-supplies',
        num: 7,
        category: 'boarding',
        categoryTag: 'Boarding Requirements',
        categoryIcon: 'bi-box-seam',
        question: 'What essential bedding, clothing, and toiletry items must boarders bring?',
        answerHtml: `<p>To ensure personal comfort, hygiene, and neatness, every boarding student must bring the following official items on resumption day:</p>
<ul class="faq-styled-list">
  <li><strong>Mattress &amp; Bedding:</strong> One single mattress (1.90m X 70cm). <em>For Form One students, the mattress MUST be covered with protective waterproof plastic material.</em> Bring a thick blanket, two sets of bed sheets (blue or green), a pillow, and two pillowcases.</li>
  <li><strong>Prescribed Footwear:</strong> Official brown sandals for daily classes (purchased on campus or matching college design), black formal shoes for Sundays/feast days, and sports shoes/football boots.</li>
  <li><strong>Compound &amp; Sports Wear:</strong> Two sets of compound wear (white sleeveless gowns with gathers for girls; black trousers and white short-sleeve shirts for boys). Sports wear obtained according to house colours (Peter: White, François: Yellow, Chanel: Red, Champagnat: Green).</li>
  <li><strong>Cutlery &amp; Hygiene:</strong> Two silver plates, spoons, fork, table knife, two cups with handles, drinking water flask, large bucket for laundry and bathing, umbrella or raincoat, torchlight, padlocks with keys for lockers, and toiletries (bathing/laundry soap, toothbrush, toothpaste, sanitary towels for girls).</li>
</ul>
<div class="faq-callout-card">
  <i class="bi bi-shield-check faq-callout-icon"></i>
  <div class="faq-callout-body">
    <strong>Important Labelling:</strong> Parents must permanently mark every single piece of clothing and personal equipment with the student's name or initials before arrival to prevent mix-ups.
  </div>
</div>`,
        jsonLdAnswer: `To ensure personal comfort, hygiene, and neatness, every boarding student must bring the following official items on resumption day: Mattress & Bedding: One single mattress (1.90m X 70cm). For Form One students, the mattress MUST be covered with protective waterproof plastic material. Bring a thick blanket, two sets of bed sheets (blue or green), a pillow, and two pillowcases. Prescribed Footwear: Official brown sandals for daily classes (purchased on campus or matching college design), black formal shoes for Sundays/feast days, and sports shoes/football boots. Compound & Sports Wear: Two sets of compound wear (white sleeveless gowns with gathers for girls; black trousers and white short-sleeve shirts for boys). Sports wear obtained according to house colours (Peter: White, François: Yellow, Chanel: Red, Champagnat: Green). Cutlery & Hygiene: Two silver plates, spoons, fork, table knife, two cups with handles, drinking water flask, large bucket for laundry and bathing, umbrella or raincoat, torchlight, padlocks with keys for lockers, and toiletries (bathing/laundry soap, toothbrush, toothpaste, sanitary towels for girls). Important Labelling: Parents must permanently mark every single piece of clothing and personal equipment with the student's name or initials before arrival to prevent mix-ups.`
    },
    {
        id: 'faq-q-visiting-policy',
        num: 8,
        category: 'boarding',
        categoryTag: 'Campus Guidelines',
        categoryIcon: 'bi-people-fill',
        question: 'What is the policy on visiting days and contacting boarders during the term?',
        answerHtml: `<p>To preserve campus serenity and keep students focused on academic and moral growth, visits are strictly regulated:</p>
<ul class="faq-styled-list">
  <li><strong>Scheduled Visiting Days:</strong> Visiting occurs <strong>once per term</strong> on a date communicated to parents in advance on the school calendar.</li>
  <li><strong>Visiting Hours:</strong> Visiting day begins with Holy Mass at <strong>9:00 AM</strong> and concludes promptly at <strong>4:30 PM</strong>.</li>
  <li><strong>Eligible Visitors:</strong> Only verified parents and officially designated immediate guardians are permitted to visit. Unscheduled or surprise visits are strictly prohibited.</li>
  <li><strong>Exit Passes:</strong> Once on campus, exit passes to leave the college are not granted except for urgent family funerals of parents or siblings. Students whose parents live outside Bamenda/Mbengwi must have a registered local guardian.</li>
</ul>`,
        jsonLdAnswer: `To preserve campus serenity and keep students focused on academic and moral growth, visits are strictly regulated: Scheduled Visiting Days: Visiting occurs once per term on a date communicated to parents in advance on the school calendar. Visiting Hours: Visiting day begins with Holy Mass at 9:00 AM and concludes promptly at 4:30 PM. Eligible Visitors: Only verified parents and officially designated immediate guardians are permitted to visit. Unscheduled or surprise visits are strictly prohibited. Exit Passes: Once on campus, exit passes to leave the college are not granted except for urgent family funerals of parents or siblings. Students whose parents live outside Bamenda/Mbengwi must have a registered local guardian.`
    },
    {
        id: 'faq-q-healthcare-infirmary',
        num: 9,
        category: 'boarding',
        categoryTag: 'Health & Welfare',
        categoryIcon: 'bi-heart-pulse-fill',
        question: 'How are healthcare and medical emergencies managed on campus?',
        answerHtml: `<p>The health and well-being of our students are guarded with diligent Catholic pastoral care:</p>
<ul class="faq-styled-list">
  <li><strong>Campus Infirmary &amp; Resident Nurse:</strong> SJCCC operates an on-campus clinic staffed by a qualified resident nurse who provides daily consultation, first aid, and basic healthcare.</li>
  <li><strong>BEPHA Mutual Health Coverage:</strong> Every enrolled student is registered in BEPHA (the Catholic Mutual Health Insurance Scheme of the Archdiocese of Bamenda), covered within the statutory health fee.</li>
  <li><strong>Hospital Referrals:</strong> In cases requiring specialized medical treatment, students are transported to the reference hospital immediately, and parents or guardians are contacted without delay.</li>
</ul>
<div class="faq-callout-card">
  <i class="bi bi-exclamation-triangle-fill faq-callout-icon"></i>
  <div class="faq-callout-body">
    <strong>Special Diet Notice:</strong> The college serves wholesome, balanced communal meals. Please note that students requiring personalized or restrictive medical diets cannot be admitted, as the institution cannot provide separate kitchen catering.
  </div>
</div>`,
        jsonLdAnswer: `The health and well-being of our students are guarded with diligent Catholic pastoral care: Campus Infirmary & Resident Nurse: SJCCC operates an on-campus clinic staffed by a qualified resident nurse who provides daily consultation, first aid, and basic healthcare. BEPHA Mutual Health Coverage: Every enrolled student is registered in BEPHA (the Catholic Mutual Health Insurance Scheme of the Archdiocese of Bamenda), covered within the statutory health fee. Hospital Referrals: In cases requiring specialized medical treatment, students are transported to the reference hospital immediately, and parents or guardians are contacted without delay. Special Diet Notice: The college serves wholesome, balanced communal meals. Please note that students requiring personalized or restrictive medical diets cannot be admitted, as the institution cannot provide separate kitchen catering.`
    },
    {
        id: 'faq-q-prohibited-items',
        num: 10,
        category: 'boarding',
        categoryTag: 'Discipline & Safety',
        categoryIcon: 'bi-slash-circle-fill',
        question: 'What items are strictly prohibited in the boarding dormitories?',
        answerHtml: `<p>To safeguard moral uprightness, discipline, and fire safety across the compound, the following items are strictly contraband. When found, they are permanently confiscated and will not be returned:</p>
<ul class="faq-styled-list">
  <li><strong>Electronic Devices:</strong> Mobile phones, smartphones, tablets, digital cameras, personal radios, and walkmans/MP3 players.</li>
  <li><strong>Heating Appliances:</strong> Electric irons, hot plates, immersion boiling rings, and unauthorised wiring.</li>
  <li><strong>Unauthorized Clothing &amp; Shoes:</strong> Non-uniform casual clothing, high-heeled shoes, slippers outside dormitories, or fancy footwear.</li>
  <li><strong>Food &amp; Consumables:</strong> Cooked food brought from outside, garri, alcohol, and cigarettes. Food supplies are permitted only on designated visiting days.</li>
  <li><strong>Cosmetics &amp; Jewelry:</strong> Chemical bleaching lotions, hair-tinting chemicals, nail hardener/polish, necklaces, rings, and decorative jewelry.</li>
</ul>`,
        jsonLdAnswer: `To safeguard moral uprightness, discipline, and fire safety across the compound, the following items are strictly contraband. When found, they are permanently confiscated and will not be returned: Electronic Devices: Mobile phones, smartphones, tablets, digital cameras, personal radios, and walkmans/MP3 players. Heating Appliances: Electric irons, hot plates, immersion boiling rings, and unauthorised wiring. Unauthorized Clothing & Shoes: Non-uniform casual clothing, high-heeled shoes, slippers outside dormitories, or fancy footwear. Food & Consumables: Cooked food brought from outside, garri, alcohol, and cigarettes. Food supplies are permitted only on designated visiting days. Cosmetics & Jewelry: Chemical bleaching lotions, hair-tinting chemicals, nail hardener/polish, necklaces, rings, and decorative jewelry.`
    },

    // ───────────────── FEES (Questions 11 - 15) ─────────────────
    {
        id: 'faq-q-fees-breakdown',
        num: 11,
        category: 'fees',
        categoryTag: 'School Fees',
        categoryIcon: 'bi-cash-stack',
        question: 'What is the total school fee structure and what does it include?',
        answerHtml: `<p>SJCCC Mbengwi operates with complete financial transparency under the Archdiocese of Bamenda. The approved fees for the ${TUITION_FEES.session} academic session (all in ${TUITION_FEES.currency}) are:</p>
<div class="table-responsive glass-table-wrapper" style="margin: 14px 0;">
  <table class="data-table" style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(10, 31, 63, 0.06); text-align: left;">
        <th style="padding: 10px 14px;">Fee Item</th>
        <th style="padding: 10px 14px; text-align: right;">Amount (${TUITION_FEES.currency})</th>
      </tr>
    </thead>
    <tbody>
${[
    TUITION_FEES.items.find(i => i.id === 'boarding')!,
    TUITION_FEES.items.find(i => i.id === 'tuition-1st-cycle')!,
    TUITION_FEES.items.find(i => i.id === 'registration')!,
    TUITION_FEES.items.find(i => i.id === 'health-fee')!,
    TUITION_FEES.items.find(i => i.id === 'exam-fee')!,
    TUITION_FEES.items.find(i => i.id === 'pta')!,
    TUITION_FEES.items.find(i => i.id === 'id-card')!,
    TUITION_FEES.items.find(i => i.id === 'practical')!,
    TUITION_FEES.items.find(i => i.id === 'crse-fee')!,
].map(item => `      <tr><td style="padding: 8px 14px;"><i class="bi ${item.icon}"></i> ${item.faqLabel}</td><td style="padding: 8px 14px; text-align: right; font-weight: 600;">${item.amountFormatted}</td></tr>`).join('\n')}
    </tbody>
  </table>
</div>
<p>The standard baseline boarding fee total is <strong>${TUITION_FEES.baselineTotalFormatted} ${TUITION_FEES.currency}</strong> (or up to ${TUITION_FEES.technicalTotalFormatted} ${TUITION_FEES.currency} for technical/science students including practicals and CRSE).</p>`,
        jsonLdAnswer: `SJCCC Mbengwi operates with complete financial transparency under the Archdiocese of Bamenda. The approved fees for the ${TUITION_FEES.session} academic session (all in ${TUITION_FEES.currency}) are: Fee Item Amount (${TUITION_FEES.currency}) Boarding & Catering 112,000 Tuition (1st or 2nd Cycle) 63,000 Registration Fee 5,000 Health & BEPHA Mutual Insurance 5,000 Examination Fee 4,000 PTA Contribution 3,000 Student Identity Card 1,000 Practical Fee (Technical & Science classes) 5,000 C.R.S.E Fee (Form 3 & Lower Sixth) 2,500 The standard baseline boarding fee total is ${TUITION_FEES.baselineTotalFormatted} ${TUITION_FEES.currency} (or up to ${TUITION_FEES.technicalTotalFormatted} ${TUITION_FEES.currency} for technical/science students including practicals and CRSE).`
    },
    {
        id: 'faq-q-fees-installments',
        num: 12,
        category: 'fees',
        categoryTag: 'Payment Plans',
        categoryIcon: 'bi-calendar2-check',
        question: 'Can school fees be paid in installments?',
        answerHtml: `<p>Yes. The college provides an installment plan to help families manage educational expenses comfortably:</p>
<ul class="faq-styled-list">
  <li><strong>First Installment:</strong> Payable during July, August, or September prior to or on resumption day. This clears boarding deposit, registration, and initial tuition.</li>
  <li><strong>Second Installment:</strong> Due and payable before the end of <strong>January</strong> of the academic school year.</li>
</ul>
<div class="faq-callout-card">
  <i class="bi bi-exclamation-octagon-fill faq-callout-icon"></i>
  <div class="faq-callout-body">
    <strong>Mandatory Rule for Examination Classes:</strong> ${BANKING_INFO.examClassesPolicy}
  </div>
</div>`,
        jsonLdAnswer: `Yes. The college provides an installment plan to help families manage educational expenses comfortably: First Installment: Payable during July, August, or September prior to or on resumption day. This clears boarding deposit, registration, and initial tuition. Second Installment: Due and payable before the end of January of the academic school year. Mandatory Rule for Examination Classes: ${BANKING_INFO.examClassesPolicy}`
    },
    {
        id: 'faq-q-bank-details',
        num: 13,
        category: 'fees',
        categoryTag: 'Banking Instructions',
        categoryIcon: 'bi-bank2',
        question: 'Where and how should school fee payments be deposited?',
        answerHtml: `<p>For safety, audit compliance, and accounting precision, school fees must never be handed as cash to staff or intermediaries. All payments must be deposited directly through our official financial partner:</p>
<div class="faq-callout-card" style="border-left: 4px solid var(--accent);">
  <i class="bi bi-check-circle-fill faq-callout-icon"></i>
  <div class="faq-callout-body">
    <strong>Institution:</strong> ${BANKING_INFO.institution}<br>
    <strong>Account Name:</strong> ${BANKING_INFO.accountName}<br>
    <strong>Account Number:</strong> ${BANKING_INFO.accountNumber}<br>
    <strong>Main Branch:</strong> ${BANKING_INFO.branch}
  </div>
</div>
<p><strong>Obtaining Your Official Receipt:</strong> ${BANKING_INFO.receiptNotice}</p>`,
        jsonLdAnswer: `For safety, audit compliance, and accounting precision, school fees must never be handed as cash to staff or intermediaries. All payments must be deposited directly through our official financial partner: Institution: ${BANKING_INFO.institution} Account Name: ${BANKING_INFO.accountName} Account Number: ${BANKING_INFO.accountNumber} Main Branch: ${BANKING_INFO.branch} Obtaining Your Official Receipt: ${BANKING_INFO.receiptNotice}`
    },
    {
        id: 'faq-q-pocket-money',
        num: 14,
        category: 'fees',
        categoryTag: 'Student Allowance',
        categoryIcon: 'bi-wallet2',
        question: 'How is student pocket money managed on campus?',
        answerHtml: `<p>To eliminate theft, peer conflict, and misuse of money, students are strictly forbidden from keeping physical money in dormitories, school bags, or classrooms.</p>
<ul class="faq-styled-list">
  <li><strong>Deposit with the Bursar:</strong> All pocket money must be handed to the College Bursar on resumption day.</li>
  <li><strong>Individual Student Ledgers:</strong> The Bursar records the deposit in the student's personal pocket money account.</li>
  <li><strong>Regulated Disbursements:</strong> Small regulated amounts are disbursed periodically for necessary personal items, haircuts, or stamps.</li>
  <li><strong>Maximum Allowance:</strong> In keeping with college guidelines, termly pocket money should not exceed <strong>25,000 FCFA</strong> per term.</li>
</ul>`,
        jsonLdAnswer: `To eliminate theft, peer conflict, and misuse of money, students are strictly forbidden from keeping physical money in dormitories, school bags, or classrooms. Deposit with the Bursar: All pocket money must be handed to the College Bursar on resumption day. Individual Student Ledgers: The Bursar records the deposit in the student's personal pocket money account. Regulated Disbursements: Small regulated amounts are disbursed periodically for necessary personal items, haircuts, or stamps. Maximum Allowance: In keeping with college guidelines, termly pocket money should not exceed 25,000 FCFA per term.`
    },
    {
        id: 'faq-q-additional-costs',
        num: 15,
        category: 'fees',
        categoryTag: 'Additional Costs',
        categoryIcon: 'bi-receipt',
        question: 'Are there any additional fees or hidden charges during the academic year?',
        answerHtml: `<p>There are no hidden charges. All mandatory institutional costs are included in the published fees. Transparent incidental costs that families should plan for include:</p>
<ul class="faq-styled-list">
  <li><strong>External GCE Board Registration:</strong> Registration fees for the Cameroon GCE Ordinary or Advanced Level examinations for Form 5 and Upper Sixth candidates (fixed independently by the GCE Board).</li>
  <li><strong>Textbooks &amp; Stationery:</strong> Personal writing materials, 80-leaf exercise books (Forms 1-2), and ledgers (Forms 3 through Upper Sixth).</li>
  <li><strong>Practical Projects &amp; Field Trips:</strong> Specific technical workshops or educational excursions (e.g. building site visits or geography field study) may require modest ancillary contributions communicated in advance by letter.</li>
</ul>`,
        jsonLdAnswer: `There are no hidden charges. All mandatory institutional costs are included in the published fees. Transparent incidental costs that families should plan for include: External GCE Board Registration: Registration fees for the Cameroon GCE Ordinary or Advanced Level examinations for Form 5 and Upper Sixth candidates (fixed independently by the GCE Board). Textbooks & Stationery: Personal writing materials, 80-leaf exercise books (Forms 1-2), and ledgers (Forms 3 through Upper Sixth). Practical Projects & Field Trips: Specific technical workshops or educational excursions (e.g. building site visits or geography field study) may require modest ancillary contributions communicated in advance by letter.`
    }
] as const;
