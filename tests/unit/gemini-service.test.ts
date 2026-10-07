import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiService } from '../../src/features/ai-assistant/geminiService.ts';
import {
    validateClientPayload,
    formatGeminiContents,
    processGeminiQuery,
    MAX_PROMPT_LENGTH,
    MAX_HISTORY_LENGTH,
} from '../../api/gemini.ts';

describe('Gemini AI Service & Server Proxy Integration', () => {
    let service: GeminiService;

    beforeEach(() => {
        service = new GeminiService('/api/gemini');
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Network Routing & Offline First Behavior', () => {
        it('should immediately return offline fallback with 0ms delay when navigator.onLine is false', async () => {
            const fetchSpy = vi.fn();
            globalThis.fetch = fetchSpy;

            vi.spyOn(service, 'isOnline').mockReturnValue(false);

            const result = await service.sendMessage('How much are school fees?');

            expect(result.isFallback).toBe(true);
            expect(result.source).toBe('offline');
            expect(result.error).toBe('OFFLINE');
            expect(result.text).toContain('193,000 FCFA');
            // Fetch should NOT have been invoked
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('should call /api/gemini when online and return live model text on success', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    text: 'Live guidance response from Gemini 2.5 Flash regarding fees.',
                    source: 'gemini',
                }),
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('What are the school fees?');

            expect(result.isFallback).toBe(false);
            expect(result.source).toBe('gemini');
            expect(result.text).toContain('Live guidance response');
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/gemini',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });
    });

    describe('Error Mapping & Fallback Behavior', () => {
        it('should map HTTP 429 to RATE_LIMIT and return helpful volume message', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('How much are school fees?');
            expect(result.isFallback).toBe(true);
            expect(result.error).toBe('RATE_LIMIT');
            expect(result.text).toContain('high inquiry volume');
        });

        it('should map HTTP 401/403 to AUTH and cleanly fall back to local knowledge', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('How do I apply for Form 1?');
            expect(result.isFallback).toBe(true);
            expect(result.error).toBe('AUTH');
            expect(result.text).toContain('Admissions at SJCCC Mbengwi');
        });

        it('should map HTTP 400 to BAD_REQUEST and fall back to local knowledge', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('What technical courses are offered?');
            expect(result.isFallback).toBe(true);
            expect(result.error).toBe('BAD_REQUEST');
            expect(result.text).toContain('Building Construction');
        });

        it('should map HTTP 500/502 to SERVER and fall back to local knowledge', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('Where is SJCCC located?');
            expect(result.isFallback).toBe(true);
            expect(result.error).toBe('SERVER');
            expect(result.text).toContain('Mbengwi');
        });

        it('should map network/fetch failure to NETWORK and fall back locally', async () => {
            globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('Who is the principal?');
            expect(result.isFallback).toBe(true);
            expect(result.error).toBe('NETWORK');
            expect(result.text).toContain('Rev. Fr. Joseph Gael Kenne, S.D');
        });

        it('should map empty response text to EMPTY_RESPONSE and fall back locally', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ text: '   ', source: 'gemini' }),
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            const result = await service.sendMessage('What are the school fees?');
            expect(result.isFallback).toBe(true);
            expect(result.error).toBe('EMPTY_RESPONSE');
            expect(result.text).toContain('193,000 FCFA');
        });
    });

    describe('Timeout Cleanup & Timer Lifecycle', () => {
        it('should clear timeout handle after successful response', async () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ text: 'Response from model', source: 'gemini' }),
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            await service.sendMessage('Hello');
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });

        it('should clear timeout handle after HTTP error response', async () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            await service.sendMessage('Hello');
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });

        it('should clear timeout handle after network failure', async () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            vi.spyOn(service, 'isOnline').mockReturnValue(true);

            await service.sendMessage('Hello');
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe('Turn-Aware History Trimming', () => {
        it('should trim history to a maximum of 8 recent messages', () => {
            const longHistory = Array.from({ length: 15 }, (_, i) => ({
                role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
                text: `Turn ${i}`,
            }));

            const prepared = service.prepareHistory(longHistory);
            expect(prepared.length).toBeLessThanOrEqual(8);
        });

        it('should drop leading model messages to prevent orphaned responses', () => {
            const history = [
                { role: 'model' as const, text: 'Orphaned opening model reply' },
                { role: 'user' as const, text: 'First user question' },
                { role: 'model' as const, text: 'Assistant reply' },
            ];

            const prepared = service.prepareHistory(history);
            expect(prepared[0].role).toBe('user');
            expect(prepared[0].text).toBe('First user question');
        });

        it('should filter out entries with empty text', () => {
            const history = [
                { role: 'user' as const, text: '   ' },
                { role: 'user' as const, text: 'Valid question' },
            ];

            const prepared = service.prepareHistory(history);
            expect(prepared).toHaveLength(1);
            expect(prepared[0].text).toBe('Valid question');
        });
    });

    describe('Server Endpoint Payload Validation (api/gemini.ts)', () => {
        it('should accept valid client request body', () => {
            const result = validateClientPayload({
                prompt: 'What are the school fees?',
                history: [
                    { role: 'user', text: 'Hello' },
                    { role: 'model', text: 'Welcome to SJCCC' },
                ],
            });

            expect(result.isValid).toBe(true);
            if (result.isValid) {
                expect(result.prompt).toBe('What are the school fees?');
                expect(result.history).toHaveLength(2);
            }
        });

        it('should reject non-object or null request body', () => {
            const result = validateClientPayload(null);
            expect(result.isValid).toBe(false);
            if (!result.isValid) {
                expect(result.statusCode).toBe(400);
            }
        });

        it('should reject empty or whitespace-only prompt', () => {
            const result = validateClientPayload({ prompt: '   ' });
            expect(result.isValid).toBe(false);
            if (!result.isValid) {
                expect(result.statusCode).toBe(400);
                expect(result.message).toContain('empty');
            }
        });

        it('should reject prompt exceeding maximum length limit', () => {
            const longPrompt = 'A'.repeat(MAX_PROMPT_LENGTH + 10);
            const result = validateClientPayload({ prompt: longPrompt });
            expect(result.isValid).toBe(false);
            if (!result.isValid) {
                expect(result.statusCode).toBe(400);
                expect(result.message).toContain('exceeds maximum allowed length');
            }
        });

        it('should reject history exceeding maximum message count', () => {
            const longHistory = Array.from({ length: MAX_HISTORY_LENGTH + 2 }, (_, i) => ({
                role: 'user',
                text: `Message ${i}`,
            }));

            const result = validateClientPayload({
                prompt: 'Valid prompt',
                history: longHistory,
            });

            expect(result.isValid).toBe(false);
            if (!result.isValid) {
                expect(result.statusCode).toBe(400);
            }
        });

        it('should format contents ensuring user start and appending current prompt', () => {
            const contents = formatGeminiContents(
                [
                    { role: 'model', text: 'Stray model text' },
                    { role: 'user', text: 'Hi' },
                    { role: 'model', text: 'Hello' },
                ],
                'How much are fees?'
            );

            expect(contents[0].role).toBe('user');
            expect(contents[contents.length - 1].role).toBe('user');
            expect(contents[contents.length - 1].parts[0].text).toBe('How much are fees?');
        });

        it('should return 503 AUTH when server API key is not configured', async () => {
            const result = await processGeminiQuery(
                { prompt: 'What are the fees?' },
                '' // empty API key override
            );

            expect(result.statusCode).toBe(503);
            if ('error' in result.body) {
                expect(result.body.error).toBe('AUTH');
            }
        });
    });
});
