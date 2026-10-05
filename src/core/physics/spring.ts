/**
 * ============================================================================
 * SJCCC – Shared Physics Primitives
 * Critically damped harmonic oscillator and stochastic sampling utilities
 * ============================================================================
 */

/**
 * Natural angular frequency ω such that a critically damped spring
 * settles to ~2% of its initial error after `responseTime` seconds
 * (4 time-constants; e^-4 ≈ 0.018).
 */
export function omegaFromResponseTime(responseTimeSeconds: number): number {
    return 4 / Math.max(responseTimeSeconds, 0.001);
}

/**
 * Exact closed-form step of a critically damped harmonic oscillator
 * (damping ratio ζ = 1) with natural frequency ω, tracking `target`:
 *
 *   ẍ = -ω²(x - target) - 2ω·ẋ
 *
 * The characteristic equation r² + 2ωr + ω² = (r+ω)² = 0 has a repeated
 * root r = -ω, so with y = x - target the general solution is
 * y(t) = (C1 + C2·t)e^(-ωt). Matching y(0) = y0 and y'(0) = v0 gives
 * C1 = y0, C2 = v0 + ωy0, and therefore:
 *
 *   y(t) = (y0 + (v0 + ωy0)·t)·e^(-ωt)
 *   v(t) = (v0 - ω(v0 + ωy0)·t)·e^(-ωt)
 *
 * This closed form is exact for any dt ≥ 0 with zero discretization error
 * and no numerical instability at large timesteps.
 */
export function springStep(
    x: number,
    v: number,
    target: number,
    omega: number,
    dt: number
): [number, number] {
    const y0 = x - target;
    const expTerm = Math.exp(-omega * dt);
    const temp = v + omega * y0;
    const y = (y0 + temp * dt) * expTerm;
    const newV = (v - omega * temp * dt) * expTerm;
    return [target + y, newV];
}

/**
 * Box–Muller transform: returns one standard-normal sample N(0,1)
 * from two independent uniform samples.
 */
export function gaussianRandom(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
