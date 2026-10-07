/**
 * ============================================================================
 * SJCCC – Server-Side Rate Limiter & Abuse Protection (api/rateLimiter.ts)
 * 
 * High-performance, process-local sliding window rate limiter providing
 * multi-tier abuse protection for the SJCCC Gemini API proxy.
 * 
 * Architectural Defense Layers:
 * 1. Short Burst Limiter: 3 requests / 20 seconds / client
 * 2. Long Window Limiter: 10 requests / 5 minutes / client
 * 3. Concurrency Protection: Maximum 2 concurrent in-flight requests / client
 * 4. Duplicate Request Guard: Blocks identical prompts submitted within 5 seconds
 * 5. Privacy-Preserving Client Bucketing: Normalizes and SHA-256 hashes client IPs
 *    (Zero raw IP persistence or exposure)
 * 6. Leak-Free Lifecycle: Concurrency slots guaranteed released via finally block
 * 
 * Note on Serverless Deployment:
 * This limiter maintains in-memory sliding logs per container instance.
 * In horizontally scaled serverless environments without a shared Redis/KV store,
 * protection is process-local per container instance.
 * ============================================================================
 */

import { createHash } from 'node:crypto';

export interface RateLimitConfig {
    /** Maximum requests allowed in the short burst window */
    readonly burstLimit: number;
    /** Duration of the burst window in milliseconds (e.g. 20,000ms = 20s) */
    readonly burstWindowMs: number;
    /** Maximum requests allowed in the long window */
    readonly longWindowLimit: number;
    /** Duration of the long window in milliseconds (e.g. 300,000ms = 5min) */
    readonly longWindowMs: number;
    /** Maximum active in-flight requests per client */
    readonly maxConcurrency: number;
    /** Minimum cooldown between identical prompts from the same client (ms) */
    readonly duplicateCooldownMs: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    burstLimit: 3,
    burstWindowMs: 20 * 1000, // 20 seconds
    longWindowLimit: 10,
    longWindowMs: 5 * 60 * 1000, // 5 minutes
    maxConcurrency: 2,
    duplicateCooldownMs: 5 * 1000, // 5 seconds
};

export type RateLimitRejectionReason =
    | 'BURST_LIMIT'
    | 'LONG_WINDOW_LIMIT'
    | 'CONCURRENCY_LIMIT'
    | 'DUPLICATE_REQUEST';

export interface RateLimitSuccess {
    readonly allowed: true;
    readonly releaseConcurrency: () => void;
}

export interface RateLimitFailure {
    readonly allowed: false;
    readonly reason: RateLimitRejectionReason;
    readonly statusCode: 429;
    readonly retryAfterSeconds: number;
    readonly error: 'RATE_LIMIT' | 'CONCURRENCY_LIMIT';
    readonly message: string;
}

export type RateLimitDecision = RateLimitSuccess | RateLimitFailure;

interface ClientWindowLog {
    burstTimestamps: number[];
    longTimestamps: number[];
    lastPromptHash?: string;
    lastPromptTimestamp?: number;
}

/**
 * Institutional salt for hashing client IP addresses.
 * Avoids storing or logging raw IP addresses anywhere.
 */
const IP_SALT = 'sjccc-mbengwi-guard-2026';

/**
 * Extracts and anonymizes client IP into a privacy-safe bucket identifier.
 * Strips IPv6-mapped prefixes, extracts public gateway IPs from proxies,
 * and hashes with SHA-256.
 */
export function extractClientIdentifier(
    headers?: Headers | Record<string, string | string[] | undefined>,
    remoteAddress?: string
): string {
    let rawIp = '';

    if (headers) {
        if (typeof (headers as Headers).get === 'function') {
            const h = headers as Headers;
            rawIp = h.get('x-forwarded-for') || h.get('x-real-ip') || h.get('cf-connecting-ip') || '';
        } else {
            const h = headers as Record<string, string | string[] | undefined>;
            const xff = h['x-forwarded-for'];
            const xreal = h['x-real-ip'];
            const cfIp = h['cf-connecting-ip'];

            if (Array.isArray(xff)) {
                rawIp = xff[0] || '';
            } else if (typeof xff === 'string') {
                rawIp = xff;
            } else if (typeof xreal === 'string') {
                rawIp = xreal;
            } else if (typeof cfIp === 'string') {
                rawIp = cfIp;
            }
        }
    }

    if (!rawIp && remoteAddress) {
        rawIp = remoteAddress;
    }

    // If comma-separated (proxy chain), take the client-originating IP (first)
    if (rawIp.includes(',')) {
        rawIp = rawIp.split(',')[0].trim();
    }

    rawIp = rawIp.trim();

    // Normalize IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
    if (rawIp.startsWith('::ffff:')) {
        rawIp = rawIp.slice(7);
    }

    if (!rawIp) {
        return 'c_anonymous';
    }

    // Hash with SHA-256 for privacy-preserving bucketing
    const hash = createHash('sha256')
        .update(`${rawIp}:${IP_SALT}`)
        .digest('hex')
        .slice(0, 16);

    return `c_${hash}`;
}

export class RateLimiter {
    private readonly config: RateLimitConfig;
    private readonly clientLogs: Map<string, ClientWindowLog> = new Map();
    private readonly activeConnections: Map<string, number> = new Map();
    private lastCleanupTime: number = Date.now();

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    }

    /**
     * Hashes prompt text for duplicate submission checking.
     */
    private hashPrompt(prompt: string): string {
        return createHash('sha256').update(prompt.trim().toLowerCase()).digest('hex').slice(0, 16);
    }

    /**
     * Cleans up expired client records to prevent memory growth over time.
     */
    public pruneExpired(now: number = Date.now()): void {
        const oldestAllowed = now - this.config.longWindowMs;

        for (const [clientId, log] of this.clientLogs.entries()) {
            log.longTimestamps = log.longTimestamps.filter((t) => t > oldestAllowed);
            log.burstTimestamps = log.burstTimestamps.filter((t) => t > now - this.config.burstWindowMs);

            const hasActiveConcurrency = (this.activeConnections.get(clientId) ?? 0) > 0;
            const hasRecentPrompt = log.lastPromptTimestamp && (now - log.lastPromptTimestamp < this.config.duplicateCooldownMs);

            if (log.longTimestamps.length === 0 && !hasActiveConcurrency && !hasRecentPrompt) {
                this.clientLogs.delete(clientId);
            }
        }

        this.lastCleanupTime = now;
    }

    /**
     * Evaluates a client request against all rate-limiting and abuse criteria.
     * If accepted, returns a releaseConcurrency() callback that MUST be called in finally.
     */
    public checkRateLimits(clientId: string, promptText: string): RateLimitDecision {
        const now = Date.now();

        // Periodically prune expired logs every 60 seconds
        if (now - this.lastCleanupTime > 60 * 1000) {
            this.pruneExpired(now);
        }

        // 1. Concurrency Check: Active in-flight requests from this client bucket
        const activeCount = this.activeConnections.get(clientId) ?? 0;
        if (activeCount >= this.config.maxConcurrency) {
            return {
                allowed: false,
                reason: 'CONCURRENCY_LIMIT',
                statusCode: 429,
                retryAfterSeconds: 5,
                error: 'CONCURRENCY_LIMIT',
                message: 'Too many concurrent requests in progress. Please wait for the current question to complete.',
            };
        }

        // Get or initialize client log
        let log = this.clientLogs.get(clientId);
        if (!log) {
            log = {
                burstTimestamps: [],
                longTimestamps: [],
            };
            this.clientLogs.set(clientId, log);
        }

        // 2. Duplicate Request Guard: Prevent identical rapid submissions within cooldown
        const promptHash = this.hashPrompt(promptText);
        if (
            log.lastPromptHash === promptHash &&
            log.lastPromptTimestamp !== undefined &&
            now - log.lastPromptTimestamp < this.config.duplicateCooldownMs
        ) {
            const remainingCooldown = Math.max(
                1,
                Math.ceil((this.config.duplicateCooldownMs - (now - log.lastPromptTimestamp)) / 1000)
            );
            return {
                allowed: false,
                reason: 'DUPLICATE_REQUEST',
                statusCode: 429,
                retryAfterSeconds: remainingCooldown,
                error: 'RATE_LIMIT',
                message: 'Duplicate question submitted too quickly. Please wait a moment.',
            };
        }

        // 3. Short Burst Limit Check (e.g. 3 requests in 20 seconds)
        const burstWindowStart = now - this.config.burstWindowMs;
        log.burstTimestamps = log.burstTimestamps.filter((t) => t > burstWindowStart);

        if (log.burstTimestamps.length >= this.config.burstLimit) {
            const oldestBurst = log.burstTimestamps[0];
            const retryAfter = Math.max(1, Math.ceil((oldestBurst + this.config.burstWindowMs - now) / 1000));
            return {
                allowed: false,
                reason: 'BURST_LIMIT',
                statusCode: 429,
                retryAfterSeconds: retryAfter,
                error: 'RATE_LIMIT',
                message: `Burst limit reached (${this.config.burstLimit} requests per ${Math.round(this.config.burstWindowMs / 1000)}s). Please wait before trying again.`,
            };
        }

        // 4. Long Window Limit Check (e.g. 10 requests in 5 minutes)
        const longWindowStart = now - this.config.longWindowMs;
        log.longTimestamps = log.longTimestamps.filter((t) => t > longWindowStart);

        if (log.longTimestamps.length >= this.config.longWindowLimit) {
            const oldestLong = log.longTimestamps[0];
            const retryAfter = Math.max(1, Math.ceil((oldestLong + this.config.longWindowMs - now) / 1000));
            return {
                allowed: false,
                reason: 'LONG_WINDOW_LIMIT',
                statusCode: 429,
                retryAfterSeconds: retryAfter,
                error: 'RATE_LIMIT',
                message: `Request limit reached (${this.config.longWindowLimit} requests per 5 minutes). Please try again later.`,
            };
        }

        // 5. Accepted: Record timestamps and acquire concurrency slot
        log.burstTimestamps.push(now);
        log.longTimestamps.push(now);
        log.lastPromptHash = promptHash;
        log.lastPromptTimestamp = now;

        this.activeConnections.set(clientId, activeCount + 1);

        let released = false;
        const releaseConcurrency = () => {
            if (released) return;
            released = true;
            const current = this.activeConnections.get(clientId) ?? 1;
            if (current <= 1) {
                this.activeConnections.delete(clientId);
            } else {
                this.activeConnections.set(clientId, current - 1);
            }
        };

        return {
            allowed: true,
            releaseConcurrency,
        };
    }

    /**
     * Returns current concurrency count for a client bucket.
     */
    public getActiveCount(clientId: string): number {
        return this.activeConnections.get(clientId) ?? 0;
    }

    /**
     * Resets all client state (intended for isolated unit testing).
     */
    public reset(): void {
        this.clientLogs.clear();
        this.activeConnections.clear();
        this.lastCleanupTime = Date.now();
    }
}

export const serverRateLimiter = new RateLimiter();
