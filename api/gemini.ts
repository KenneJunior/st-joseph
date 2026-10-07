/**
 * ============================================================================
 * SJCCC – Server-Side Gemini API Proxy Endpoint (api/gemini.ts)
 * 
 * Secure serverless route handling Google Gemini AI queries for the
 * SJCCC Guidance Assistant.
 * 
 * Security & Reliability Guarantees:
 * 1. Strict Server Ownership: System prompt, grounding facts, allowed model
 *    (`gemini-2.5-flash`), and credentials are held exclusively on the server.
 * 2. Zero Key Leakage: Reads `process.env.GEMINI_API_KEY`. The secret is never
 *    sent to the browser or logged in diagnostics.
 * 3. Strict Input Validation: Rejects non-POST methods, prompts > 2000 chars,
 *    and malformed conversation histories > 8 turns.
 * 4. Grounded Context: Generates dynamic system prompt using Cameroon date.
 * 5. Universal Compatibility: Works across Vercel Node runtime, Web Request API,
 *    and Vite dev server middleware.
 * ============================================================================
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { buildSjcccSystemPrompt } from '../src/features/ai-assistant/knowledgeFormatter.ts';
import { getCameroonDate } from '../src/features/ai-assistant/dateUtils.ts';

export const APPROVED_MODEL = 'gemini-2.5-flash';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const MAX_PROMPT_LENGTH = 2000;
export const MAX_HISTORY_LENGTH = 8;
export const MAX_HISTORY_MESSAGE_LENGTH = 4000;
export const REQUEST_TIMEOUT_MS = 25000;

export interface ClientChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ClientRequestBody {
    prompt: string;
    history?: ClientChatMessage[];
}

export interface ValidationSuccess {
    isValid: true;
    prompt: string;
    history: ClientChatMessage[];
}

export interface ValidationFailure {
    isValid: false;
    statusCode: number;
    error: string;
    message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates incoming client request body according to strict security boundaries.
 */
export function validateClientPayload(body: unknown): ValidationResult {
    if (!body || typeof body !== 'object') {
        return {
            isValid: false,
            statusCode: 400,
            error: 'BAD_REQUEST',
            message: 'Request payload must be a JSON object.',
        };
    }

    const payload = body as Record<string, unknown>;

    // Prompt validation
    if (typeof payload.prompt !== 'string') {
        return {
            isValid: false,
            statusCode: 400,
            error: 'BAD_REQUEST',
            message: 'Prompt must be a string.',
        };
    }

    const trimmedPrompt = payload.prompt.trim();
    if (trimmedPrompt.length === 0) {
        return {
            isValid: false,
            statusCode: 400,
            error: 'BAD_REQUEST',
            message: 'Prompt cannot be empty.',
        };
    }

    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
        return {
            isValid: false,
            statusCode: 400,
            error: 'BAD_REQUEST',
            message: `Prompt exceeds maximum allowed length of ${MAX_PROMPT_LENGTH} characters.`,
        };
    }

    // History validation
    const validatedHistory: ClientChatMessage[] = [];

    if (payload.history !== undefined) {
        if (!Array.isArray(payload.history)) {
            return {
                isValid: false,
                statusCode: 400,
                error: 'BAD_REQUEST',
                message: 'History must be an array of messages.',
            };
        }

        if (payload.history.length > MAX_HISTORY_LENGTH) {
            return {
                isValid: false,
                statusCode: 400,
                error: 'BAD_REQUEST',
                message: `History exceeds maximum length of ${MAX_HISTORY_LENGTH} messages.`,
            };
        }

        for (const item of payload.history) {
            if (!item || typeof item !== 'object') {
                return {
                    isValid: false,
                    statusCode: 400,
                    error: 'BAD_REQUEST',
                    message: 'Each history entry must be an object with role and text.',
                };
            }

            const msg = item as Record<string, unknown>;
            if (msg.role !== 'user' && msg.role !== 'model') {
                return {
                    isValid: false,
                    statusCode: 400,
                    error: 'BAD_REQUEST',
                    message: 'History message role must be "user" or "model".',
                };
            }

            if (typeof msg.text !== 'string') {
                return {
                    isValid: false,
                    statusCode: 400,
                    error: 'BAD_REQUEST',
                    message: 'History message text must be a string.',
                };
            }

            if (msg.text.length > MAX_HISTORY_MESSAGE_LENGTH) {
                return {
                    isValid: false,
                    statusCode: 400,
                    error: 'BAD_REQUEST',
                    message: `History message exceeds maximum length of ${MAX_HISTORY_MESSAGE_LENGTH} characters.`,
                };
            }

            validatedHistory.push({
                role: msg.role,
                text: msg.text.trim(),
            });
        }
    }

    return {
        isValid: true,
        prompt: trimmedPrompt,
        history: validatedHistory,
    };
}

/**
 * Normalizes history turns ensuring valid alternating sequence without
 * leading model messages.
 */
export function formatGeminiContents(
    history: ClientChatMessage[],
    currentPrompt: string
): Array<{ role: string; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Filter out messages with empty text
    const cleanHistory = history.filter((m) => m.text.length > 0);

    // Ensure we do not start with a model message
    let startIndex = 0;
    while (startIndex < cleanHistory.length && cleanHistory[startIndex].role === 'model') {
        startIndex++;
    }

    for (let i = startIndex; i < cleanHistory.length; i++) {
        const msg = cleanHistory[i];
        contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }],
        });
    }

    contents.push({
        role: 'user',
        parts: [{ text: currentPrompt }],
    });

    return contents;
}

export interface ProxySuccessResponse {
    text: string;
    source: 'gemini';
}

export interface ProxyErrorResponse {
    error: string;
    message: string;
}

export interface CoreProcessResult {
    statusCode: number;
    body: ProxySuccessResponse | ProxyErrorResponse;
}

/**
 * Core business logic: handles validation, prompt construction, and Gemini calling.
 */
export async function processGeminiQuery(
    rawBody: unknown,
    apiKeyOverride?: string
): Promise<CoreProcessResult> {
    const startTime = Date.now();

    // 1. Validate payload
    const validation = validateClientPayload(rawBody);
    if (!validation.isValid) {
        return {
            statusCode: validation.statusCode,
            body: {
                error: validation.error,
                message: validation.message,
            },
        };
    }

    // 2. Resolve Server-Side API Key
    const apiKey = (apiKeyOverride || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
        return {
            statusCode: 503,
            body: {
                error: 'AUTH',
                message: 'Server Gemini API key is not configured.',
            },
        };
    }

    // 3. Build dynamic grounded system prompt
    const todayCameroon = getCameroonDate();
    const systemPrompt = buildSjcccSystemPrompt({ todayCameroon });

    // 4. Build contents payload
    const contents = formatGeminiContents(validation.history, validation.prompt);

    const requestBody = {
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            topP: 0.95,
        },
    };

    const endpoint = `${GEMINI_BASE_URL}/${APPROVED_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        const elapsedMs = Date.now() - startTime;

        if (!response.ok) {
            const status = response.status;
            let errorDetail = '';

            try {
                const errJson = (await response.json()) as { error?: { message?: string } };
                errorDetail = errJson?.error?.message || response.statusText;
            } catch {
                errorDetail = response.statusText;
            }

            // Secure diagnostics: Log status code and elapsed time only (no keys or user data)
            console.error(`[Gemini Proxy] Upstream error: HTTP ${status} in ${elapsedMs}ms`);

            if (status === 429) {
                return {
                    statusCode: 429,
                    body: {
                        error: 'RATE_LIMIT',
                        message: 'Upstream rate limit reached. Please try again shortly.',
                    },
                };
            }

            if (status === 400 || status === 401 || status === 403) {
                return {
                    statusCode: status === 400 ? 400 : 401,
                    body: {
                        error: status === 400 ? 'BAD_REQUEST' : 'AUTH',
                        message: `Authentication or parameter error with upstream Gemini service. (${errorDetail})`,
                    },
                };
            }

            return {
                statusCode: status >= 500 ? 502 : status,
                body: {
                    error: 'SERVER',
                    message: `Gemini service returned an error (${status}).`,
                },
            };
        }

        const data = (await response.json()) as {
            candidates?: Array<{
                content?: {
                    parts?: Array<{
                        text?: string;
                    }>;
                };
            }>;
        };

        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText || typeof generatedText !== 'string' || generatedText.trim().length === 0) {
            return {
                statusCode: 502,
                body: {
                    error: 'EMPTY_RESPONSE',
                    message: 'Gemini service returned an empty response.',
                },
            };
        }

        return {
            statusCode: 200,
            body: {
                text: generatedText.trim(),
                source: 'gemini',
            },
        };

    } catch (error: unknown) {
        const isAbort = error instanceof Error && error.name === 'AbortError';
        const elapsedMs = Date.now() - startTime;

        console.error(`[Gemini Proxy] Request exception (${isAbort ? 'Timeout' : 'Network'}) in ${elapsedMs}ms`);

        if (isAbort) {
            return {
                statusCode: 408,
                body: {
                    error: 'TIMEOUT',
                    message: 'The request to the Gemini service timed out.',
                },
            };
        }

        return {
            statusCode: 502,
            body: {
                error: 'NETWORK',
                message: 'Unable to reach Google Gemini upstream service.',
            },
        };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Standard Web Fetch API Handler (e.g. Edge, Vercel Serverless Functions)
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const body: unknown = await request.json();
        const result = await processGeminiQuery(body);
        return new Response(JSON.stringify(result.body), {
            status: result.statusCode,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch {
        return new Response(
            JSON.stringify({
                error: 'BAD_REQUEST',
                message: 'Invalid JSON request payload.',
            }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

/**
 * Helper to parse JSON body from Node IncomingMessage stream if not pre-parsed.
 */
async function parseNodeRequestBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
    if (req.body !== undefined && req.body !== null) {
        if (typeof req.body === 'string') {
            try {
                return JSON.parse(req.body);
            } catch {
                return null;
            }
        }
        return req.body;
    }

    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            if (!data.trim()) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch {
                resolve(null);
            }
        });
        req.on('error', () => resolve(null));
    });
}

/**
 * Universal Node / Vercel Serverless Function Default Export
 */
export default async function handler(
    req: IncomingMessage & { body?: unknown; method?: string },
    res: ServerResponse & { status?: (code: number) => typeof res; json?: (d: unknown) => void }
): Promise<void> {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Allow', 'POST');
        res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Method Not Allowed. Use POST.' }));
        return;
    }

    const body = await parseNodeRequestBody(req);
    const result = await processGeminiQuery(body);

    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body));
}
