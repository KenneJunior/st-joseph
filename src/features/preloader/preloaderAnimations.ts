/**
 * ============================================================================
 * SJCCC – Preloader Pillar Animation Algorithms
 * Pure mathematical timing curves for pillar dissolve sequences
 * ============================================================================
 */

export interface PillarTiming {
    index: number;
    delay: number;
}

export const PRELOADER_ANIMATIONS = [
    'Center',
    'LeftToRight',
    'RightToLeft',
    'Checkerboard',
    'EdgeInward',
    'Wave',
    'DoubleDoor',
    'RandomDissolve',
    'WhipAccelerate',
    'Staircase',
] as const;

export type PreloaderAnimationType = typeof PRELOADER_ANIMATIONS[number];

// 1. CENTER OUTWARD: Polynomial Radial Distance
export function getCenterTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const center = (pillarCount - 1) / 2;
    const maxDuration = 800;

    for (let i = 0; i < pillarCount; i++) {
        const x = Math.abs(i - center) / center;
        const delay = Math.pow(x, 1.5) * maxDuration;
        timings.push({ index: i, delay });
    }
    return timings;
}

// 2. LEFT TO RIGHT: Linear
export function getLeftToRightTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    for (let i = 0; i < pillarCount; i++) {
        timings.push({ index: i, delay: i * 60 });
    }
    return timings;
}

// 3. RIGHT TO LEFT: Inverse Linear
export function getRightToLeftTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    for (let i = 0; i < pillarCount; i++) {
        timings.push({ index: i, delay: (pillarCount - 1 - i) * 60 });
    }
    return timings;
}

// 4. CHECKERBOARD: Modulo Offset Matrix
export function getCheckerboardTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const staggerGroup = 400;
    const localStagger = 30;

    for (let i = 0; i < pillarCount; i++) {
        const groupDelay = (i % 2) * staggerGroup;
        const flowDelay = (i / pillarCount) * localStagger * pillarCount;
        timings.push({ index: i, delay: groupDelay + flowDelay });
    }
    return timings;
}

// 5. EDGE INWARD: Inverse Radial Distance
export function getEdgeInwardTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const center = (pillarCount - 1) / 2;
    const maxDuration = 800;

    for (let i = 0; i < pillarCount; i++) {
        const x = 1 - (Math.abs(i - center) / center);
        const delay = Math.pow(x, 2) * maxDuration;
        timings.push({ index: i, delay });
    }
    return timings;
}

// 6. WAVE: Superimposed Trigonometry (Sine Wave)
export function getWaveTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const cycles = 2;

    for (let i = 0; i < pillarCount; i++) {
        const x = i / (pillarCount - 1);
        const waveAmplitude = (1 - Math.cos(x * cycles * 2 * Math.PI)) / 2;
        const delay = (waveAmplitude * 500) + (x * 300);
        timings.push({ index: i, delay });
    }
    return timings;
}

// 7. DOUBLE DOOR: Normalized Exponential Decay
export function getDoubleDoorTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const center = (pillarCount - 1) / 2;
    const k = 3.5;
    const maxDuration = 800;

    for (let i = 0; i < pillarCount; i++) {
        const x = Math.abs(i - center) / center;
        const exponentialFactor = (Math.exp(k * x) - 1) / (Math.exp(k) - 1);
        const delay = exponentialFactor * maxDuration;
        timings.push({ index: i, delay });
    }
    return timings;
}

// 8. RANDOM DISSOLVE: Pure Chaos
export function getRandomDissolveTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const maxDuration = 700;

    for (let i = 0; i < pillarCount; i++) {
        const delay = Math.random() * maxDuration;
        timings.push({ index: i, delay });
    }
    return timings;
}

// 9. WHIP ACCELERATE: Circular Ease-Out
export function getWhipAccelerateTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const maxDuration = 1000;

    for (let i = 0; i < pillarCount; i++) {
        const x = i / (pillarCount - 1);
        const easeOutDelay = Math.sqrt(1 - Math.pow(1 - x, 2));
        const delay = easeOutDelay * maxDuration;
        timings.push({ index: i, delay });
    }
    return timings;
}

// 10. STAIRCASE: Discrete Step Function
export function getStaircaseTimings(pillarCount: number): PillarTiming[] {
    const timings: PillarTiming[] = [];
    const blocks = 4;
    const delayBetweenBlocks = 200;

    for (let i = 0; i < pillarCount; i++) {
        const x = i / (pillarCount - 1);
        const currentBlock = Math.floor(x * (blocks - 0.001));
        const delay = currentBlock * delayBetweenBlocks;
        timings.push({ index: i, delay });
    }
    return timings;
}

export function calculatePillarTimings(animationName: PreloaderAnimationType, pillarCount: number): PillarTiming[] {
    switch (animationName) {
        case 'Center': return getCenterTimings(pillarCount);
        case 'LeftToRight': return getLeftToRightTimings(pillarCount);
        case 'RightToLeft': return getRightToLeftTimings(pillarCount);
        case 'Checkerboard': return getCheckerboardTimings(pillarCount);
        case 'EdgeInward': return getEdgeInwardTimings(pillarCount);
        case 'Wave': return getWaveTimings(pillarCount);
        case 'DoubleDoor': return getDoubleDoorTimings(pillarCount);
        case 'RandomDissolve': return getRandomDissolveTimings(pillarCount);
        case 'WhipAccelerate': return getWhipAccelerateTimings(pillarCount);
        case 'Staircase': return getStaircaseTimings(pillarCount);
        default: return getCenterTimings(pillarCount);
    }
}
