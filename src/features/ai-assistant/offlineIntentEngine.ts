/**
 * ============================================================================
 * SJCCC – Weighted Offline Intent Engine (offlineIntentEngine.ts)
 * 
 * Deterministic intent classifier and offline response dispatcher.
 * 
 * Key architectural features:
 * 1. Weighted Rule Engine: Distinguishes strong phrase patterns (weight 10),
 *    targeted institutional keywords (weight 5), and contextual cues (weight 2).
 * 2. Greeting vs Inquiry Discrimination: Greetings combined with actual school
 *    questions ("Good morning, how much are fees?") resolve to the school intent.
 * 3. Ambiguity & Out-of-Scope Isolation: Unrelated internet trivia and vague
 *    prompts are cleanly routed to dedicated guardrails.
 * 4. Deterministic Tie Resolution: Close non-dominant intent collisions return
 *    ambiguous rather than guessing wrong answers.
 * 5. Consumes authoritative response builders from `knowledgeFormatter.ts`.
 * ============================================================================
 */

import { SJCCC_KNOWLEDGE, type SjcccKnowledge } from '../../data/sjcccKnowledge.ts';
import {
    buildAdmissionResponse,
    buildProgramResponse,
    buildFeeResponse,
    buildDisciplineResponse,
    buildContactResponse,
    buildHistoryResponse,
    buildScheduleResponse,
    buildGreetingResponse,
    buildAmbiguousResponse,
    buildOutOfScopeResponse,
} from './knowledgeFormatter.ts';

export type OfflineIntent =
    | 'greeting'
    | 'admission'
    | 'program'
    | 'fee'
    | 'discipline'
    | 'contact'
    | 'history'
    | 'schedule'
    | 'ambiguous'
    | 'out_of_scope';

export interface IntentRule {
    readonly intent: OfflineIntent;
    readonly weight: number;
    readonly patterns: readonly RegExp[];
}

/**
 * Weighted rules for intent classification.
 * Higher weight signifies higher specificity and diagnostic certainty.
 */
export const INTENT_RULES: readonly IntentRule[] = [
    // ─────────────── GREETING (PHRASE ORIENTED) ───────────────
    {
        intent: 'greeting',
        weight: 6,
        patterns: [
            /^(hello|hi|hey|good\s+(morning|afternoon|evening|day)|greetings|welcome)\b/i,
            /\b(hello|hi|hey)\s*(there|assistant|sjccc)?$/i,
        ],
    },

    // ─────────────── FEES & BANKING (HIGH VALUE) ───────────────
    // Strong phrase rules: weight 10
    {
        intent: 'fee',
        weight: 10,
        patterns: [
            /how\s+much\s+(is|are|does|do)\s+(the\s+)?(school\s+)?(fees?|tuition|admission|cost|pay)/i,
            /how\s+much\s+do\s+i\s+pay/i,
            /what\s+is\s+tuition/i,
            /what\s+is\s+the\s+opsec\s+account/i,
            /admission\s+fees?/i,
            /cost\s+of\s+(admission|attending|school|study)/i,
            /what\s+(is|are)\s+(the\s+)?(tuition|school\s+fees?|fee\s+structure|breakdown)/i,
            /\bopsec\b/i,
            /\bopus\s+securitatis\b/i,
            /account\s+(number|details?|name)/i,
            /how\s+(do\s+i|to)\s+pay\s+(fees?|tuition|money)/i,
            /installment(s)?\s+(schedule|payment|deadline)/i,
            /\b100117\b/,
            /\b193,?000\b/,
            /\b200,?500\b/,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'fee',
        weight: 5,
        patterns: [
            /\b(fees?|tuition|bursar|bank|deposit|receipt|teller|payable|fcfa|pricing|charges?)\b/i,
        ],
    },

    // ─────────────── ADMISSIONS & REQUIREMENTS ───────────────
    // Strong phrases: weight 10
    {
        intent: 'admission',
        weight: 10,
        patterns: [
            /how\s+(do\s+i|can\s+i|to)\s+(apply|enroll|register|join|enter)\b/i,
            /admission\s+(requirements?|criteria|process|procedure|policy)/i,
            /entry\s+(requirements?|criteria|qualification)/i,
            /first\s+cycle\s+admission/i,
            /second\s+cycle\s+admission/i,
            /common\s+entrance/i,
            /entrance\s+interview/i,
            /when\s+is\s+the\s+interview/i,
            /documents?\s+(are\s+)?(required|needed)/i,
            /required\s+documents?/i,
            /form\s+one\s+(admission|entry|interview|apply)/i,
            /lower\s+sixth\s+(admission|entry|apply|requirements?)/i,
            /\b(lower|upper)\s+sixth\b/i,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'admission',
        weight: 5,
        patterns: [
            /\b(admissions?|admitted|enrollment|enrol|prospectus|intake|interview|documents?|certificates?|progress\s+card|result\s+slip)\b/i,
        ],
    },

    // ─────────────── ACADEMIC & TECHNICAL PROGRAMS ───────────────
    // Strong phrases: weight 10
    {
        intent: 'program',
        weight: 10,
        patterns: [
            /what\s+(academic\s+)?(courses?|programs?|subjects?|trades?)\s+(do\s+you|are)\s*(offer(ed)?|have|taught)/i,
            /what\s+(academic\s+)?programs?\s+are\s+offered/i,
            /what\s+technical\s+courses\s+do\s+you\s+offer/i,
            /do\s+you\s+(offer|have)\s+(electrical|building|fashion|automobile|mechanic|home\s+economics)/i,
            /programs?\s+offered/i,
            /courses?\s+offered/i,
            /technical\s+(education|courses?|department|section|trades?|subjects?)/i,
            /vocational\s+(courses?|training|education|trades?)/i,
            /building\s+construction/i,
            /fashion\s+design/i,
            /electrical\s+power/i,
            /automobile\s+repair/i,
            /home\s+economics/i,
            /\b(ce-bc|fe|eps|arm|hec)\b/i,
            /gce\s+(o\/?l|a\/?l|ordinary|advanced)\s+(level|subjects?|streams?)/i,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'program',
        weight: 5,
        patterns: [
            /\b(programs?|programmes?|curriculum|departments?|subjects?|courses?|syllabus|mechanics?|tailoring|masonry|electrical)\b/i,
        ],
    },

    // ─────────────── DISCIPLINE, RULES & UNIFORMS ───────────────
    // Strong phrases: weight 10
    {
        intent: 'discipline',
        weight: 10,
        patterns: [
            /code\s+of\s+conduct/i,
            /rules?\s+and\s+regulations?/i,
            /prescribed\s+uniform/i,
            /school\s+uniform/i,
            /prohibited\s+items?/i,
            /dormitory\s+(rules?|supplies|bedding)/i,
            /boarding\s+(house|life|regulations?)/i,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'discipline',
        weight: 5,
        patterns: [
            /\b(discipline|uniforms?|cardigan|sandals|dormitory|dormitories|contraband|bullying|expulsion)\b/i,
        ],
    },

    // ─────────────── CONTACT & CAMPUS LOCATION ───────────────
    // Strong phrases: weight 10
    {
        intent: 'contact',
        weight: 10,
        patterns: [
            /how\s+(do\s+i|can\s+i|to)\s+contact\s+(the\s+)?(school|college|principal|office)/i,
            /where\s+is\s+(the\s+)?(school|college|sjccc|campus)(\s+located)?/i,
            /phone\s+number/i,
            /whats?app\s+(number|link|chat)/i,
            /email\s+address/i,
            /location\s+of\s+(sjccc|the\s+college)/i,
            /postal\s+address/i,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'contact',
        weight: 5,
        patterns: [
            /\b(contact|phone|telephone|email|whatsapp|address|located|location|direction|directions|campus|momo|mbengwi)\b/i,
        ],
    },

    // ─────────────── HISTORY & IDENTITY ───────────────
    // Strong phrases: weight 10
    {
        intent: 'history',
        weight: 10,
        patterns: [
            /who\s+founded\s+(sjccc|the\s+college|the\s+school)/i,
            /history\s+of\s+(sjccc|the\s+college|the\s+school)/i,
            /who\s+is\s+(the\s+)?(principal|proprietor)/i,
            /what\s+is\s+the\s+motto/i,
            /edificamus\s+regnum\s+dei/i,
            /when\s+was\s+(the\s+school|sjccc)\s+founded/i,
            /marist\s+brothers/i,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'history',
        weight: 5,
        patterns: [
            /\b(founder|founded|motto|principal|proprietor|archdiocese|patron|saint\s+joseph)\b/i,
        ],
    },

    // ─────────────── CALENDAR & SCHEDULE ───────────────
    // Strong phrases: weight 10
    {
        intent: 'schedule',
        weight: 10,
        patterns: [
            /when\s+(does|do|is)\s+(the\s+)?(school|classes|college)\s+(resume|reopen|start|begin)/i,
            /academic\s+calendar/i,
            /school\s+calendar/i,
            /resumption\s+date/i,
            /re-?opening\s+date/i,
            /term\s+(dates?|calendar|break|vacation)/i,
            /when\s+are\s+(the\s+)?(exams|holidays|mock)/i,
            /visiting\s+day/i,
        ],
    },
    // Moderate keywords: weight 5
    {
        intent: 'schedule',
        weight: 5,
        patterns: [
            /\b(resumption|reopening|vacation|mid-term|holiday|calendar|dates?|mock\s+exams?)\b/i,
        ],
    },
];

/**
 * Patterns explicitly identifying unambiguous off-topic queries.
 */
const OUT_OF_SCOPE_PATTERNS: readonly RegExp[] = [
    /\b(quantum\s+mechanics|quantum|physics|relativity|einstein|schrodinger|string\s+theory)\b/i,
    /\b(football\s+match|world\s+cup|premier\s+league|champions\s+league|messi|ronaldo|soccer|nba)\b/i,
    /\b(president\s+of\s+(the\s+)?(us|france|nigeria|russia|cameroon)|election\s+results?)\b/i,
    /\b(write\s+(a\s+)?(python|javascript|react|c\+\+|java|script|code)|python\s+script|javascript\s+code|coding|software|parse\s+json)\b/i,
    /\b(recipe\s+for|cook\s+jollof|bake\s+a\s+cake|how\s+to\s+cook)\b/i,
    /\b(weather\s+in|weather\s+forecast|crypto|bitcoin|stock\s+market)\b/i,
    /\b(movie\s+recommendations?|celebrity\s+gossip|pop\s+star)\b/i,
    /\b(capital\s+of|who\s+won(\s+yesterday('s)?)?)\b/i,
];

/**
 * Patterns identifying underspecified, ambiguous user inputs.
 */
const AMBIGUOUS_PATTERNS: readonly RegExp[] = [
    /^(tell\s+me\s+more|more\s+info|more\s+details?|explain|how(\?)?|what(\?)?|why(\?)?|what\s+about\s+that(\?)?|and\s+then(\?)?|help(\s+me)?)$/i,
    /^(yes|no|ok|okay|sure|thanks?|thank\s+you|please)$/i,
    /^(can\s+you\s+elaborate|elaborate|clarify|give\s+me\s+more)$/i,
];

export interface ClassificationResult {
    readonly intent: OfflineIntent;
    readonly confidence: number;
    readonly dominantScore: number;
    readonly scores: Record<OfflineIntent, number>;
}

/**
 * Evaluates an input prompt and determines the dominant intent using
 * deterministic weighted scoring.
 */
export function classifyOfflineIntent(userPrompt: string): ClassificationResult {
    const prompt = userPrompt.trim();
    const scores: Record<OfflineIntent, number> = {
        greeting: 0,
        admission: 0,
        program: 0,
        fee: 0,
        discipline: 0,
        contact: 0,
        history: 0,
        schedule: 0,
        ambiguous: 0,
        out_of_scope: 0,
    };

    if (!prompt) {
        return {
            intent: 'ambiguous',
            confidence: 0,
            dominantScore: 0,
            scores,
        };
    }

    // 1. Immediate Check: Out of scope guardrail
    for (const pattern of OUT_OF_SCOPE_PATTERNS) {
        if (pattern.test(prompt)) {
            scores.out_of_scope = 100;
            return {
                intent: 'out_of_scope',
                confidence: 1.0,
                dominantScore: 100,
                scores,
            };
        }
    }

    // 2. Immediate Check: Ambiguous prompts
    for (const pattern of AMBIGUOUS_PATTERNS) {
        if (pattern.test(prompt)) {
            scores.ambiguous = 50;
            return {
                intent: 'ambiguous',
                confidence: 0.9,
                dominantScore: 50,
                scores,
            };
        }
    }

    // 3. Accumulate weighted scores across all rules
    for (const rule of INTENT_RULES) {
        for (const pattern of rule.patterns) {
            if (pattern.test(prompt)) {
                scores[rule.intent] += rule.weight;
            }
        }
    }

    // 4. Greeting vs Question Discrimination
    // If user says "Good morning, how much are the fees?", substantive intents (fee)
    // must override greeting. Greeting should only win if there are NO substantive matches.
    const substantiveIntents: OfflineIntent[] = [
        'fee',
        'admission',
        'program',
        'discipline',
        'contact',
        'history',
        'schedule',
    ];

    let maxSubstantiveScore = 0;
    let dominantSubstantiveIntent: OfflineIntent | null = null;
    let tieSubstantiveCount = 0;

    for (const intent of substantiveIntents) {
        const score = scores[intent];
        if (score > maxSubstantiveScore) {
            maxSubstantiveScore = score;
            dominantSubstantiveIntent = intent;
            tieSubstantiveCount = 1;
        } else if (score === maxSubstantiveScore && score > 0) {
            tieSubstantiveCount++;
        }
    }

    // If substantive intent found with confident score
    if (dominantSubstantiveIntent && maxSubstantiveScore >= 5) {
        // If two substantive intents tie exactly with significant scores (e.g. fee vs admission tie)
        if (tieSubstantiveCount > 1) {
            // Check if fee has strong signal (cost / how much)
            if (scores.fee === maxSubstantiveScore && /how\s+much|cost|fee/i.test(prompt)) {
                return {
                    intent: 'fee',
                    confidence: 0.85,
                    dominantScore: maxSubstantiveScore,
                    scores,
                };
            }
            return {
                intent: 'ambiguous',
                confidence: 0.5,
                dominantScore: maxSubstantiveScore,
                scores,
            };
        }

        return {
            intent: dominantSubstantiveIntent,
            confidence: Math.min(1.0, maxSubstantiveScore / 15),
            dominantScore: maxSubstantiveScore,
            scores,
        };
    }

    // 5. If greeting score exists and no strong substantive intent was found
    if (scores.greeting > 0 && maxSubstantiveScore === 0) {
        return {
            intent: 'greeting',
            confidence: 0.9,
            dominantScore: scores.greeting,
            scores,
        };
    }

    // 6. If weak substantive score exists (< 5)
    if (dominantSubstantiveIntent && maxSubstantiveScore > 0) {
        return {
            intent: dominantSubstantiveIntent,
            confidence: 0.6,
            dominantScore: maxSubstantiveScore,
            scores,
        };
    }

    // 7. If prompt is totally unrecognized (0 score across all rules)
    // Check if prompt looks like an off-topic question vs vague inquiry
    if (/\b(who|what|why|where|when|which|how|is|are|can|do|does)\b/i.test(prompt) && prompt.length > 20) {
        // Long unrecognized question not matching SJCCC -> out of scope
        scores.out_of_scope = 10;
        return {
            intent: 'out_of_scope',
            confidence: 0.7,
            dominantScore: 10,
            scores,
        };
    }

    // Short/unclear prompt -> ambiguous
    scores.ambiguous = 10;
    return {
        intent: 'ambiguous',
        confidence: 0.6,
        dominantScore: 10,
        scores,
    };
}

export interface OfflineResponseOptions {
    readonly knowledge?: SjcccKnowledge;
    readonly todayCameroon?: string;
    readonly prefixNote?: string;
}

/**
 * Routes a prompt to its authoritative offline response based on weighted
 * intent classification.
 */
export function generateOfflineResponse(
    userPrompt: string,
    options: OfflineResponseOptions = {}
): {
    readonly text: string;
    readonly intent: OfflineIntent;
} {
    const k = options.knowledge ?? SJCCC_KNOWLEDGE;
    const today = options.todayCameroon;
    const classification = classifyOfflineIntent(userPrompt);

    let content = '';

    switch (classification.intent) {
        case 'greeting':
            content = buildGreetingResponse(k);
            break;
        case 'fee':
            content = buildFeeResponse(k);
            break;
        case 'admission':
            content = buildAdmissionResponse(k, today);
            break;
        case 'program':
            content = buildProgramResponse(k);
            break;
        case 'discipline':
            content = buildDisciplineResponse(k);
            break;
        case 'contact':
            content = buildContactResponse(k);
            break;
        case 'history':
            content = buildHistoryResponse(k);
            break;
        case 'schedule':
            content = buildScheduleResponse(k, today);
            break;
        case 'out_of_scope':
            content = buildOutOfScopeResponse(k);
            break;
        case 'ambiguous':
        default:
            content = buildAmbiguousResponse();
            break;
    }

    const note = options.prefixNote ? `*${options.prefixNote}*\n\n` : '';

    return {
        text: `${note}${content}`,
        intent: classification.intent,
    };
}
