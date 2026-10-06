/**
 * ============================================================================
 * SJCCC – Gemini AI Integration Service
 * Client wrapper for Google Gemini API targeting model `gemini-2.5-flash`.
 * Contains authoritative structured knowledge base about St. Joseph's Catholic
 * Comprehensive College Mbengwi, system prompt guardrails, and error resilience.
 * ============================================================================
 */

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp?: number;
}

export interface GeminiApiOptions {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
}

export interface AssistantResponse {
    text: string;
    isFallback: boolean;
    error?: string;
}

/**
 * Authoritative System Prompt pre-seeded with complete institutional context
 * regarding St. Joseph Catholic Comprehensive College Mbengwi.
 */
export const SJCCC_SYSTEM_PROMPT = `You are the official SJCCC Guidance Assistant for St. Joseph's Catholic Comprehensive College (SJCCC), Mbengwi, North-West Region, Cameroon.
Your role is to assist prospective students, parents, guardians, current students, alumni, and visitors with accurate, professional, welcoming, and respectful information about the college.

### INSTITUTIONAL IDENTITY & HISTORY
- Name: St. Joseph's Catholic Comprehensive College, Mbengwi (SJCCC)
- Proprietor & Diocese: Catholic Archdiocese of Bamenda
- Founded: 28th May 1999 (initially entrusted to the Marist Brothers of the Schools)
- Principal: Rev. Fr. Joseph Gael Kenne, S.D
- Motto: Latin: "Edificamus Regnum Dei" | English: "Let us build the Kingdom of God"
- School Type: Co-educational Catholic Boarding & Day College offering both Grammar (General) and Technical/Vocational Education
- Location: SJCCC Campus, Mbengwi, Momo Division, North-West Region, Cameroon
- Postal Address: P.O. Box 23, Mbengwi, Momo Division, Cameroon
- Official Email: stjosephcollegembengwi@gmail.com
- Telephone & WhatsApp: +237 682 760 271 | WhatsApp direct: https://wa.me/237682760271
- Current Academic Year: 2026/2027

### ADMISSION REQUIREMENTS & CALENDAR
- First Cycle (Forms 1 – 5): Pass in the Government Common Entrance Examination. Required documents: Photocopy of birth certificate, recent academic progress card, transfer certificate from previous primary/secondary school.
- Second Cycle (Lower Sixth & Upper Sixth): Minimum pass in FOUR (4) Ordinary Level Certificate subjects with an acceptable subject combination. Required documents: Photocopy of birth certificate, photocopy of official GCE O/L result slip, handwritten application letter addressed to the Principal.
- Entrance Interview Date: Tuesday, 4th August 2026 at 9:00 AM prompt at SJCCC Campus, Mbengwi.
- Reopening / Resumption 2026/2027:
  - Friday, 21st August 2026: New boarders (Form 1 & Lower Sixth) report for orientation, vestiary fitting, and medical registry.
  - Wednesday, 2nd September 2026: Returning students (Forms 2, 3, 4, 5 & Upper Sixth) report by 8:00 AM prompt.

### ACADEMIC CURRICULUM & PROGRAMS
- First Cycle (Forms 1 – 5): Broad Catholic secondary grammar curriculum leading to Cameroon GCE Ordinary Level.
- Second Cycle (Lower Sixth & Upper Sixth): Advanced Level Arts, Science, and Commercial streams leading to Cameroon GCE Advanced Level.
- Technical & Vocational Education (Forms 1 to 3):
  1. Building Construction (CE-BC): Practical masonry, architectural drawing fundamentals, structural civil works.
  2. Fashion Design & Clothing (FE): Garment design, pattern drafting, textile cutting, tailoring.
  3. Electrical Power Systems (EPS): Domestic wiring, electrical installation, circuitry, machine repair.
  4. Automobile Repair Mechanics (ARM): Engine mechanics, diagnostic maintenance, vehicle mechanics, workshop safety.
  5. Home Economics (HEc): Food science, catering, nutrition, interior design, household management.

### TUITION, FEES & OFFICIAL BANKING
- Academic Year: 2026/2027
- Baseline Total (General Grammar/Boarding): 193,000 FCFA
- Technical Section Total: 200,500 FCFA (includes 7,500 FCFA technical workshop practical fee)
- Key Breakdown:
  - Boarding & Lodging: 112,000 FCFA
  - Tuition: 40,000 FCFA
  - Computer / ICT: 10,000 FCFA
  - Medical / PTA / Registration / Identity / Sports: Remaining balance
- Official Banking Institution: OPUS SECURITATIS (OPSEC) Microfinance
- Account Name: St. Joseph Cath. Col Mbengwi
- Account Number: 100117
- Bank Branch: All Saints Business Center, Mile 2 Nkwen, Bamenda, or any OPSEC branch across Cameroon.
- Installment Schedule:
  - 1st Installment: In July, August, and September prior to or on resumption day.
  - 2nd Installment: Due and payable before the end of January.
  - Exam Classes Policy: Form 5 and Upper Sixth candidates must pay all school fees in full on or before school reopening to guarantee timely Cameroon GCE Board registration.
  - Receipt Notice: Present stamped OPSEC bank deposit teller to College Bursar on campus upon resumption to receive official computerized receipt.

### CAMPUS FACILITIES & DISCIPLINE
- Facilities: College Chapel & St. Joseph's Shrine, science laboratories (Physics, Chemistry, Biology), modern ICT computer suite, technical workshops, sports fields, boys and girls dormitories, dining hall.
- Discipline & Values: High Christian moral standards, integrity, punctuality, and mutual respect. Zero tolerance for bullying, alcohol, smoking, weapons, drug abuse, or examination malpractice.
- Uniforms: Sky blue shirt, navy blue trousers/skirts, navy blue cardigan with college crest, black shoes, white socks.

### GUIDANCE & RESPONSE RULES:
1. Tone: Welcoming, courteous, respectful, clear, supportive, and professional.
2. Structure: Use concise formatting, bullet points, and bold text for clarity when presenting fees, requirements, or steps.
3. Guardrails:
   - Only answer queries related to SJCCC (academics, admissions, fees, history, facilities, rules, dates, contacts).
   - If asked off-topic questions (e.g. general internet trivia, entertainment, politics, programming code unrelated to school), politely decline: "As the SJCCC Guidance Assistant, I am specialized in providing information about St. Joseph's Catholic Comprehensive College Mbengwi. For other inquiries, please refer to appropriate resources."
   - For sensitive personal cases, specific financial waivers, or disciplinary appeals, direct the inquirer to contact the College Administration directly via email at stjosephcollegembengwi@gmail.com or phone/WhatsApp at +237 682 760 271.`;

/**
 * Built-in fallback responses for standard questions when offline or API key is not yet set.
 */
const OFFLINE_FALLBACKS: Record<string, string> = {
    admission: `**Admissions at SJCCC Mbengwi (2026/2027 Academic Session)**\n\n• **First Cycle (Forms 1–5):** A pass in the Government Common Entrance Examination. Requires birth certificate, recent progress card, and transfer certificate.\n• **Second Cycle (Lower & Upper Sixth):** Minimum 4 Ordinary Level passes with an acceptable combination. Requires birth certificate, GCE O/L result slip, and a handwritten application letter to the Principal.\n• **Entrance Interview:** Tuesday, 4th August 2026 at 9:00 AM prompt at the college campus in Mbengwi.\n\nFor assistance, call **+237 682 760 271** or WhatsApp [Message us](https://wa.me/237682760271).`,
    program: `**Academic Programs Offered at SJCCC**\n\n1. **Grammar Education (Forms 1 to Upper Sixth):** General Arts, Sciences, and Commercial streams leading to Cameroon GCE Ordinary and Advanced Levels.\n2. **Technical & Vocational Education (Forms 1–3):**\n   - Building Construction (CE-BC)\n   - Fashion Design & Clothing (FE)\n   - Electrical Power Systems (EPS)\n   - Automobile Repair Mechanics (ARM)\n   - Home Economics (HEc)\n\nAll programs are supported by dedicated workshops, science labs, and ICT suites.`,
    fee: `**Tuition & Fees Breakdown (2026/2027 Session)**\n\n• **General Grammar Baseline Total:** **193,000 FCFA**\n• **Technical Section Total:** **200,500 FCFA** (includes workshop practical materials)\n• **Boarding & Lodging:** 112,000 FCFA\n• **Tuition Component:** 40,000 FCFA\n\n**Official Banking Payment:**\n• **Bank:** OPUS SECURITATIS (OPSEC) Microfinance\n• **Account Name:** St. Joseph Cath. Col Mbengwi\n• **Account Number:** **100117**\n• **Branch:** All Saints Business Center, Mile 2 Nkwen, Bamenda (or any OPSEC branch)\n\n*First installment is payable in July/August/September prior to resumption. Form 5 and Upper Sixth must clear fees in full before reopening.*`,
    discipline: `**Campus Life, Rules & Discipline**\n\nAs a Catholic institution under the Archdiocese of Bamenda, SJCCC emphasizes Christian integrity, prayer, and academic excellence:\n\n• **Code of Conduct:** Strict punctuality, respectful behavior, and diligence.\n• **Zero Tolerance:** Immediate sanctions for bullying, exam fraud, alcohol, substances, or vandalism.\n• **Uniform:** Prescribed sky blue shirts, navy blue trousers/skirts, navy blue cardigan with college crest, black shoes, and white socks.\n• **Spiritual Life:** Regular Holy Mass and pastoral accompaniment at the College Chapel & St. Joseph's Shrine.`
};

export class GeminiService {
    private apiKey: string;
    private readonly defaultModel: string = 'gemini-3.8-flash';
    private readonly baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

    constructor() {
        this.apiKey = this.resolveApiKey();
    }

    /**
     * Resolves API key from Vite environment variable safely
     */
    private resolveApiKey(): string {
        try {
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
                return String(import.meta.env.VITE_GEMINI_API_KEY).trim();
            }
        } catch {
            // Environment access fallback
        }
        return '';
    }

    /**
     * Checks if a valid API key is present
     */
    public hasApiKey(): boolean {
        return Boolean(this.apiKey && this.apiKey.length > 5);
    }

    /**
     * Sends conversation turns to Google Gemini 2.5 Flash API with retries and timeout
     */
    public async sendMessage(
        userPrompt: string,
        history: ChatMessage[] = [],
        options: GeminiApiOptions = {}
    ): Promise<AssistantResponse> {
        const trimmedPrompt = userPrompt.trim();
        if (!trimmedPrompt) {
            return {
                text: 'Please enter a question about SJCCC Mbengwi.',
                isFallback: false
            };
        }

        // If no API key is provided, deliver authoritative institutional response
        if (!this.hasApiKey()) {
            return this.generateOfflineFallback(trimmedPrompt);
        }

        const model = options.model || this.defaultModel;
        const endpoint = `${this.baseUrl}/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        const timeoutMs = options.timeoutMs ?? 25000;

        // Build conversation contents in Gemini format
        const contents = this.formatContents(history, trimmedPrompt);

        const requestBody = {
            systemInstruction: {
                parts: [{ text: SJCCC_SYSTEM_PROMPT }]
            },
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.4,
                maxOutputTokens: options.maxOutputTokens ?? 1024,
                topP: 0.95
            }
        };

        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            attempts++;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timer);

                if (!response.ok) {
                    const status = response.status;
                    let errorData: any = null;
                    try {
                        errorData = await response.json();
                    } catch {
                        // Response text parse error
                    }

                    if (status === 429) {
                        return {
                            text: 'The guidance assistant is currently handling high inquiry volume. Please wait a moment and try again, or contact the college office directly at **+237 682 760 271**.',
                            isFallback: true,
                            error: 'RATE_LIMIT'
                        };
                    }

                    if (status === 400 || status === 403) {
                        console.warn('[GeminiService] API key authentication failed, switching to local knowledge base.');
                        return this.generateOfflineFallback(trimmedPrompt, 'Note: Live Gemini service key needs verification. Serving verified institutional archive:');
                    }

                    if (status >= 500 && attempts < maxAttempts) {
                        // Exponential retry on 5xx
                        await new Promise((r) => setTimeout(r, 1500));
                        continue;
                    }

                    throw new Error(`Gemini API error (${status}): ${errorData?.error?.message || response.statusText}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text || typeof text !== 'string') {
                    return this.generateOfflineFallback(trimmedPrompt);
                }

                return {
                    text: text.trim(),
                    isFallback: false
                };

            } catch (err: any) {
                clearTimeout(timer);

                if (err.name === 'AbortError') {
                    if (attempts < maxAttempts) {
                        continue;
                    }
                    return {
                        text: 'The response timed out. Please check your network connection and try again, or reach us at **+237 682 760 271**.',
                        isFallback: true,
                        error: 'TIMEOUT'
                    };
                }

                if (attempts < maxAttempts) {
                    await new Promise((r) => setTimeout(r, 1000));
                    continue;
                }

                console.error('[GeminiService] Network or processing error:', err);
                return this.generateOfflineFallback(trimmedPrompt, 'Unable to reach the Gemini server. Here is authoritative school information from our records:');
            }
        }

        return this.generateOfflineFallback(trimmedPrompt);
    }

    /**
     * Formats internal history and current prompt into Gemini REST API content parts
     */
    private formatContents(history: ChatMessage[], currentPrompt: string): Array<{ role: string; parts: Array<{ text: string }> }> {
        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        // Include last 6 turns (3 exchanges) for conversational coherence without token bloat
        const recentHistory = history.slice(-6);

        for (const msg of recentHistory) {
            contents.push({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            });
        }

        contents.push({
            role: 'user',
            parts: [{ text: currentPrompt }]
        });

        return contents;
    }

    /**
     * Fallback matching authoritative institutional records when offline or without active API key
     */
    public generateOfflineFallback(prompt: string, prefixNote?: string): AssistantResponse {
        const lower = prompt.toLowerCase();
        let matched = '';

        if (lower.includes('admiss') || lower.includes('apply') || lower.includes('requirement') || lower.includes('enroll') || lower.includes('interview')) {
            matched = OFFLINE_FALLBACKS.admission;
        } else if (lower.includes('program') || lower.includes('course') || lower.includes('subject') || lower.includes('technical') || lower.includes('department')) {
            matched = OFFLINE_FALLBACKS.program;
        } else if (lower.includes('fee') || lower.includes('tuition') || lower.includes('cost') || lower.includes('price') || lower.includes('bank') || lower.includes('opsec')) {
            matched = OFFLINE_FALLBACKS.fee;
        } else if (lower.includes('rule') || lower.includes('discipline') || lower.includes('uniform') || lower.includes('campus') || lower.includes('board') || lower.includes('dorm')) {
            matched = OFFLINE_FALLBACKS.discipline;
        } else if (lower.includes('contact') || lower.includes('phone') || lower.includes('email') || lower.includes('location') || lower.includes('address') || lower.includes('where')) {
            matched = `**SJCCC Official Contact & Location Coordinates**\n\n• **Campus Location:** SJCCC Campus, Mbengwi, Momo Division, North-West Region, Cameroon\n• **Telephone & WhatsApp:** **+237 682 760 271**\n• **Direct WhatsApp:** [Chat with Admissions](https://wa.me/237682760271)\n• **Official Email:** stjosephcollegembengwi@gmail.com\n• **Postal Address:** P.O. Box 23, Mbengwi\n• **Principal:** Rev. Fr. Joseph Gael Kenne, S.D`;
        } else if (lower.includes('history') || lower.includes('who') || lower.includes('founder') || lower.includes('motto') || lower.includes('principal')) {
            matched = `**About St. Joseph's Catholic Comprehensive College**\n\n• **Foundation:** Established on 28th May 1999 under the Archdiocese of Bamenda; initially entrusted to the Marist Brothers of the Schools.\n• **Motto:** *"Edificamus Regnum Dei"* (Let us build the Kingdom of God).\n• **Leadership:** Rev. Fr. Joseph Gael Kenne, S.D (Principal).\n• **Mission:** Integral holistic Catholic formation combining academic rigor, vocational technical skill mastery, and solid moral uprightness.`;
        } else {
            // General guidance overview
            matched = `Welcome to **St. Joseph's Catholic Comprehensive College (SJCCC)** Mbengwi guidance service.\n\nI can assist you with:\n• **Admissions & Entrance Interviews** (First Cycle, Second Cycle, GCE O/L criteria)\n• **Academic Curriculum** (Grammar streams & 5 Technical trade departments)\n• **Tuition Fees & OPSEC Banking** (Account 100117, installments)\n• **School Rules, Uniforms & Boarding Life**\n• **Important Calendar Dates & Resumption**\n\nFeel free to ask a specific question, or contact our admissions office directly at **+237 682 760 271** or WhatsApp [here](https://wa.me/237682760271).`;
        }

        const note = prefixNote ? `*${prefixNote}*\n\n` : '';

        return {
            text: `${note}${matched}`,
            isFallback: true
        };
    }
}

export const geminiService = new GeminiService();
