/**
 * ============================================================================
 * SJCCC – Gemini AI Service (geminiService.ts)
 * 
 * Secure, network-aware client service powering the SJCCC Guidance Assistant.
 * 
 * Architectural Highlights:
 * 1. Security Hardening: NO client-side API keys. Production calls route to the
 *    same-origin serverless proxy `/api/gemini`.
 * 2. Network-Aware Routing: Checks `navigator.onLine` for immediate offline
 *    resolution (0ms wait) while handling online fetch failures gracefully.
 * 3. Weighted Offline Resilience: Seamlessly falls back to the deterministic
 *    institutional intent engine on any network, timeout, or server error.
 * 4. Deterministic Date Semantics: Grounded in Cameroon time (`Africa/Douala`).
 * 5. Leak-Free Lifecycle: Strict AbortController timeout cleanup via try/finally.
 * 6. Strictly Typed: Zero `any`, typed error categories, and turn-aware history.
 * ============================================================================
 */

import { generateOfflineResponse, type OfflineIntent } from './offlineIntentEngine.ts';
import { buildSjcccSystemPrompt } from './knowledgeFormatter.ts';

export type AssistantError =
    | 'OFFLINE'
    | 'TIMEOUT'
    | 'RATE_LIMIT'
    | 'AUTH'
    | 'BAD_REQUEST'
    | 'SERVER'
    | 'EMPTY_RESPONSE'
    | 'NETWORK'
    | 'UNKNOWN';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp?: number;
}

export interface GeminiClientOptions {
    timeoutMs?: number;
    apiEndpoint?: string;
}

export interface AssistantResponse {
    text: string;
    isFallback: boolean;
    source: 'gemini' | 'offline';
    error?: AssistantError;
    intent?: OfflineIntent;
}

/**
 * Authoritative System Prompt generated from canonical institutional knowledge.
 * Preserved for inspection and backward-compatible test assertions.
 */
export const SJCCC_SYSTEM_PROMPT = buildSjcccSystemPrompt();

export class GeminiService {
    private readonly apiEndpoint: string = '/api/gemini';
    private readonly defaultTimeoutMs: number = 15000;

    constructor(endpoint?: string) {
        if (endpoint) {
            this.apiEndpoint = endpoint;
        }
    }

    /**
     * Checks if the device is currently reported as online by the browser.
     * Treats navigator.onLine as a fast local hint.
     */
    public isOnline(): boolean {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            return navigator.onLine;
        }
        return true;
    }

    /**
     * Sends user inquiry to the secure server proxy or resolves offline immediately.
     */
    public async sendMessage(
        userPrompt: string,
        history: ChatMessage[] = [],
        options: GeminiClientOptions = {}
    ): Promise<AssistantResponse> {
        const trimmedPrompt = userPrompt.trim();
        if (!trimmedPrompt) {
            return {
                text: 'Please enter a question about SJCCC Mbengwi.',
                isFallback: false,
                source: 'offline',
            };
        }

        // 1. Instant local route if device is known to be offline
        if (!this.isOnline()) {
            return this.generateOfflineFallback(
                trimmedPrompt,
                'Offline mode: Displaying verified institutional information from college records:',
                'OFFLINE'
            );
        }

        const endpoint = options.apiEndpoint || this.apiEndpoint;
        const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

        // 2. Prepare normalized, turn-aware history
        const normalizedHistory = this.prepareHistory(history);

        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: trimmedPrompt,
                    history: normalizedHistory,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const status = response.status;
                const errorType = this.mapHttpStatusToError(status);

                if (status === 429) {
                    return {
                        text: 'The guidance assistant is currently handling high inquiry volume. Please try again shortly, or call the college office at **+237 682 760 271**.',
                        isFallback: true,
                        source: 'offline',
                        error: 'RATE_LIMIT',
                    };
                }

                // If authentication/server configuration error occurs, fall back to offline engine cleanly
                const prefixNote = status === 401 || status === 403 || status === 503
                    ? 'Note: Live assistant temporarily unavailable. Serving verified institutional archive:'
                    : undefined;

                return this.generateOfflineFallback(trimmedPrompt, prefixNote, errorType);
            }

            const data = (await response.json()) as {
                text?: string;
                source?: 'gemini';
                error?: string;
            };

            if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
                return this.generateOfflineFallback(
                    trimmedPrompt,
                    'Note: Reconnecting to Gemini service. Serving verified local guidance:',
                    'EMPTY_RESPONSE'
                );
            }

            return {
                text: data.text.trim(),
                isFallback: false,
                source: 'gemini',
            };

        } catch (error: unknown) {
            const isAbort = error instanceof Error && error.name === 'AbortError';

            if (isAbort) {
                return {
                    text: 'The request timed out. Please check your network connection and try again, or reach us directly at **+237 682 760 271**.',
                    isFallback: true,
                    source: 'offline',
                    error: 'TIMEOUT',
                };
            }

            // General network failure
            return this.generateOfflineFallback(
                trimmedPrompt,
                'Unable to reach server. Here is verified information from our institutional records:',
                'NETWORK'
            );

        } finally {
            clearTimeout(timeoutHandle);
        }
    }

    /**
     * Maps HTTP status codes to strictly typed AssistantError identifiers.
     */
    private mapHttpStatusToError(status: number): AssistantError {
        if (status === 429) return 'RATE_LIMIT';
        if (status === 401 || status === 403) return 'AUTH';
        if (status === 400) return 'BAD_REQUEST';
        if (status === 408) return 'TIMEOUT';
        if (status >= 500) return 'SERVER';
        return 'UNKNOWN';
    }

    /**
     * Prepares sanitized, turn-aware conversation history for payload transmission.
     * Preserves up to 8 recent valid turns without orphaned leading model responses.
     */
    public prepareHistory(history: ChatMessage[]): Array<{ role: 'user' | 'model'; text: string }> {
        if (!Array.isArray(history) || history.length === 0) {
            return [];
        }

        // Take at most 8 recent messages
        const recent = history.slice(-8);
        const filtered: Array<{ role: 'user' | 'model'; text: string }> = [];

        for (const item of recent) {
            if (!item || typeof item !== 'object') continue;
            if (item.role !== 'user' && item.role !== 'model') continue;
            const text = typeof item.text === 'string' ? item.text.trim() : '';
            if (text.length > 0) {
                filtered.push({ role: item.role, text });
            }
        }

        // Drop leading model responses so conversation turns start with user
        while (filtered.length > 0 && filtered[0].role === 'model') {
            filtered.shift();
        }

        return filtered;
    }

    /**
     * Resolves inquiry using authoritative offline knowledge and weighted intent engine.
     */
    public generateOfflineFallback(
        prompt: string,
        prefixNote?: string,
        error?: AssistantError
    ): AssistantResponse {
        const result = generateOfflineResponse(prompt, { prefixNote });

        return {
            text: result.text,
            isFallback: true,
            source: 'offline',
            error,
            intent: result.intent,
        };
    }
}

export const geminiService = new GeminiService();
