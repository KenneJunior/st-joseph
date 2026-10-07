/**
 * ============================================================================
 * SJCCC – Server-Side Gemini API Proxy Endpoint (api/gemini.ts)
 * 
 * Secure, rate-limited serverless route handling Google Gemini AI queries
 * for the SJCCC Guidance Assistant.
 * 
 * Security & Reliability Guarantees:
 * 1. Explicit Rate Limiting: 3 requests / 20s burst & 10 requests / 5min window.
 * 2. Concurrency Control: Max 2 active requests per client bucket, released in finally.
 * 3. Duplicate Prompt Guard: Blocks rapid identical prompts within 5 seconds.
 * 4. Payload Bounds: Max 32KB body, prompt <= 2000 chars, history <= 8 messages.
 * 5. Strict Server Ownership: System prompt, model (`gemini-2.5-flash`), 800 output
 *    token cap, and 15s timeout are locked server-side.
 * 6. Client Override Immunity: Disallows client-supplied model, API key, or system prompt.
 * 7. Privacy & Security: Client IPs are anonymized via SHA-256; Cache-Control: no-store.
 * ============================================================================
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { buildSjcccSystemPrompt } from '../src/features/ai-assistant/knowledgeFormatter.ts';
import { getCameroonDate } from '../src/features/ai-assistant/dateUtils.ts';
import {
    serverRateLimiter,
    extractClientIdentifier,
    RateLimiter,
} from './rateLimiter.ts';

export const APPROVED_MODEL = 'gemini-2.5-flash';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const MAX_REQUEST_BODY_BYTES = 32 * 1024; // 32 KB maximum payload size
export const MAX_PROMPT_LENGTH = 2000;
export const MAX_HISTORY_LENGTH = 8;
export const MAX_HISTORY_MESSAGE_LENGTH = 4000;
export const SERVER_TIMEOUT_MS = 15000; // 15 seconds strict timeout
export const MAX_OUTPUT_TOKENS = 800; // Bounded output budget

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
    error: 'BAD_REQUEST' | 'PAYLOAD_TOO_LARGE';
    message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates incoming client request body according to strict security boundaries.
 * Strictly ignores or rejects any client-supplied `model`, `systemInstruction`, or `apiKey`.
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
    message?: string;
    retryAfterSeconds?: number;
}

export interface CoreProcessResult {
    statusCode: number;
    headers?: Record<string, string>;
    body: ProxySuccessResponse | ProxyErrorResponse;
}

export interface ProcessQueryOptions {
    apiKeyOverride?: string;
    clientId?: string;
    limiter?: RateLimiter;
}

/**
 * Core business logic: handles validation, rate limiting, prompt construction, and Gemini calling.
 */
export async function processGeminiQuery(
    rawBody: unknown,
    options: ProcessQueryOptions = {}
): Promise<CoreProcessResult> {
    const startTime = Date.now();
    const limiter = options.limiter ?? serverRateLimiter;
    const clientId = options.clientId || 'c_default';

    // 1. Validate payload structure and limits
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

    // 2. Enforce Multi-Layer Rate Limiting & Concurrency Guard
    const limitDecision = limiter.checkRateLimits(clientId, validation.prompt);
    if (!limitDecision.allowed) {
        console.warn(`[Gemini Proxy] Rate limit tripped (${limitDecision.reason}) for client bucket ${clientId}`);
        return {
            statusCode: limitDecision.statusCode,
            headers: {
                'Retry-After': String(limitDecision.retryAfterSeconds),
                'Cache-Control': 'no-store',
            },
            body: {
                error: limitDecision.error,
                retryAfterSeconds: limitDecision.retryAfterSeconds,
            },
        };
    }

    const { releaseConcurrency } = limitDecision;

    try {
        // 3. Resolve Server-Side API Key (Never client supplied)
        const apiKey = (options.apiKeyOverride || process.env.GEMINI_API_KEY || '').trim();
        if (!apiKey) {
            return {
                statusCode: 503,
                body: {
                    error: 'AUTH',
                    message: 'Server Gemini API key is not configured.',
                },
            };
        }

        // 4. Build dynamic grounded system prompt (Server owns prompt & Cameroon date)
        const todayCameroon = getCameroonDate();
        const systemPrompt = buildSjcccSystemPrompt({ todayCameroon });

        // 5. Build contents payload (Server owns model and generation limits)
        const contents = formatGeminiContents(validation.history, validation.prompt);

        const requestBody = {
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                topP: 0.95,
            },
        };

        const endpoint = `${GEMINI_BASE_URL}/${APPROVED_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);

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

                // Privacy-safe diagnostics: Log status code and elapsed time only (no keys or user data)
                console.error(`[Gemini Proxy] Upstream error: HTTP ${status} in ${elapsedMs}ms`);

                if (status === 429) {
                    return {
                        statusCode: 429,
                        headers: {
                            'Retry-After': '30',
                            'Cache-Control': 'no-store',
                        },
                        body: {
                            error: 'RATE_LIMIT',
                            retryAfterSeconds: 30,
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
                headers: {
                    'Cache-Control': 'no-store',
                },
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
    } finally {
        // Guaranteed concurrency release across success, failure, timeout, or exception
        releaseConcurrency();
    }
}

/**
 * Standard Web Fetch API Handler (e.g. Edge, Vercel Serverless Functions)
 */
export async function POST(request: Request): Promise<Response> {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES) {
        return new Response(
            JSON.stringify({
                error: 'PAYLOAD_TOO_LARGE',
                message: `Request payload exceeds maximum allowed size of ${MAX_REQUEST_BODY_BYTES} bytes.`,
            }),
            {
                status: 413,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                },
            }
        );
    }

    try {
        const rawText = await request.text();
        if (rawText.length > MAX_REQUEST_BODY_BYTES) {
            return new Response(
                JSON.stringify({
                    error: 'PAYLOAD_TOO_LARGE',
                    message: `Request payload exceeds maximum allowed size of ${MAX_REQUEST_BODY_BYTES} bytes.`,
                }),
                {
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store',
                    },
                }
            );
        }

        const body: unknown = JSON.parse(rawText);
        const clientId = extractClientIdentifier(request.headers);
        const result = await processGeminiQuery(body, { clientId });

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...(result.headers || {}),
        };

        return new Response(JSON.stringify(result.body), {
            status: result.statusCode,
            headers,
        });
    } catch {
        return new Response(
            JSON.stringify({
                error: 'BAD_REQUEST',
                message: 'Invalid JSON request payload.',
            }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                },
            }
        );
    }
}

/**
 * Helper to parse and enforce byte size limits on Node IncomingMessage stream.
 */
async function parseNodeRequestBody(
    req: IncomingMessage & { body?: unknown }
): Promise<{ error?: string; body: unknown }> {
    if (req.body !== undefined && req.body !== null) {
        if (typeof req.body === 'string') {
            if (req.body.length > MAX_REQUEST_BODY_BYTES) {
                return { error: 'PAYLOAD_TOO_LARGE', body: null };
            }
            try {
                return { body: JSON.parse(req.body) };
            } catch {
                return { error: 'BAD_REQUEST', body: null };
            }
        }
        return { body: req.body };
    }

    return new Promise((resolve) => {
        let data = '';
        let bytesCount = 0;
        let exceeded = false;

        req.on('data', (chunk) => {
            bytesCount += chunk.length;
            if (bytesCount > MAX_REQUEST_BODY_BYTES) {
                exceeded = true;
                req.destroy();
                resolve({ error: 'PAYLOAD_TOO_LARGE', body: null });
                return;
            }
            data += chunk;
        });

        req.on('end', () => {
            if (exceeded) return;
            if (!data.trim()) {
                resolve({ error: 'BAD_REQUEST', body: null });
                return;
            }
            try {
                resolve({ body: JSON.parse(data) });
            } catch {
                resolve({ error: 'BAD_REQUEST', body: null });
            }
        });

        req.on('error', () => {
            if (!exceeded) {
                resolve({ error: 'BAD_REQUEST', body: null });
            }
        });
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
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Allow', 'POST');
        res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed. Use POST.' }));
        return;
    }

    // Check Content-Length header up front
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
            JSON.stringify({
                error: 'PAYLOAD_TOO_LARGE',
                message: `Request payload exceeds maximum allowed size of ${MAX_REQUEST_BODY_BYTES} bytes.`,
            })
        );
        return;
    }

    const { error: parseError, body } = await parseNodeRequestBody(req);

    if (parseError === 'PAYLOAD_TOO_LARGE') {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
            JSON.stringify({
                error: 'PAYLOAD_TOO_LARGE',
                message: `Request payload exceeds maximum allowed size of ${MAX_REQUEST_BODY_BYTES} bytes.`,
            })
        );
        return;
    }

    if (parseError || !body) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Invalid JSON request payload.' }));
        return;
    }

    const clientId = extractClientIdentifier(req.headers, req.socket?.remoteAddress);
    const result = await processGeminiQuery(body, { clientId });

    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) {
            res.setHeader(k, v);
        }
    }

    res.end(JSON.stringify(result.body));
}
