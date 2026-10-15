/**
 * ============================================================================
 * SJCCC – Milestone Chime Synthesizer
 * (MilestoneChimeSynthesizer.ts)
 * 
 * Provides subtle, organic audio chimes for milestone reminder toast
 * notifications via Web Audio API synthesis (zero audio asset dependencies).
 * ============================================================================
 */

import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';

export type ChimeId = 'cathedral' | 'crystal' | 'marimba' | 'harp' | 'silent';

export interface ChimeOption {
    id: ChimeId;
    name: string;
    description: string;
    icon: string;
}

export const CHIME_OPTIONS: readonly ChimeOption[] = [
    {
        id: 'cathedral',
        name: 'Cathedral Bells',
        description: 'Warm resonant dual-tone bell (Catholic chapel ambiance)',
        icon: 'bi-bell-fill',
    },
    {
        id: 'crystal',
        name: 'Harmonic Crystal',
        description: 'Crisp, delicate three-note ascending chime',
        icon: 'bi-gem',
    },
    {
        id: 'marimba',
        name: 'Warm Marimba',
        description: 'Earthy, soft wooden acoustic resonance',
        icon: 'bi-music-note-beamed',
    },
    {
        id: 'harp',
        name: 'Gentle Harp',
        description: 'Smooth two-note acoustic string arpeggio',
        icon: 'bi-soundwave',
    },
    {
        id: 'silent',
        name: 'Mute / Silent',
        description: 'Visual toast alert without audio',
        icon: 'bi-bell-slash',
    },
] as const;

export class MilestoneChimeSynthesizer {
    private static instance: MilestoneChimeSynthesizer | null = null;
    private audioCtx: AudioContext | null = null;

    private constructor() {
        // Lazy initialization to comply with browser autoplay policies
    }

    public static getInstance(): MilestoneChimeSynthesizer {
        if (!MilestoneChimeSynthesizer.instance) {
            MilestoneChimeSynthesizer.instance = new MilestoneChimeSynthesizer();
        }
        return MilestoneChimeSynthesizer.instance;
    }

    /**
     * Retrieves the user's currently selected chime preference from localStorage.
     */
    public getSelectedChime(): ChimeId {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.MILESTONE_CHIME) as ChimeId | null;
            if (saved && CHIME_OPTIONS.some((opt) => opt.id === saved)) {
                return saved;
            }
        } catch {
            // LocalStorage inaccessible
        }
        return 'cathedral';
    }

    /**
     * Persists the user's selected chime preference and notifies listeners.
     */
    public setSelectedChime(chimeId: ChimeId): void {
        try {
            localStorage.setItem(STORAGE_KEYS.MILESTONE_CHIME, chimeId);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('milestone-chime-changed', { detail: { chimeId } })
                );
            }
        } catch (err) {
            console.warn('[MilestoneChimeSynthesizer] Failed to persist chime preference:', err);
        }
    }

    /**
     * Lazily creates or returns the singleton AudioContext.
     */
    private getAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;

        if (!this.audioCtx) {
            const AudioContextClass =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

            if (AudioContextClass) {
                try {
                    this.audioCtx = new AudioContextClass();
                } catch {
                    this.audioCtx = null;
                }
            }
        }

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }

        return this.audioCtx;
    }

    /**
     * Plays the requested chime (or user's selected chime if omitted).
     */
    public async playChime(chimeId?: ChimeId): Promise<void> {
        const target = chimeId || this.getSelectedChime();
        if (target === 'silent') return;

        const ctx = this.getAudioContext();
        if (!ctx) return;

        try {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const now = ctx.currentTime;

            switch (target) {
                case 'cathedral':
                    this.playCathedralBells(ctx, now);
                    break;
                case 'crystal':
                    this.playHarmonicCrystal(ctx, now);
                    break;
                case 'marimba':
                    this.playWarmMarimba(ctx, now);
                    break;
                case 'harp':
                    this.playGentleHarp(ctx, now);
                    break;
            }
        } catch (err) {
            console.warn('[MilestoneChimeSynthesizer] Playback failed:', err);
        }
    }

    /**
     * Cathedral Bells: Dual harmonic bell with warm fundamental and gentle overtone decay.
     */
    private playCathedralBells(ctx: AudioContext, start: number): void {
        const tones = [
            { freq: 523.25, time: 0, gain: 0.16, decay: 1.2 }, // C5
            { freq: 659.25, time: 0.22, gain: 0.18, decay: 1.4 }, // E5
            { freq: 783.99, time: 0.23, gain: 0.08, decay: 1.1 }, // G5 overtone
        ];

        tones.forEach(({ freq, time, gain, decay }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start + time);

            gainNode.gain.setValueAtTime(0.0001, start + time);
            gainNode.gain.linearRampToValueAtTime(gain, start + time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, start + time + decay);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(start + time);
            osc.stop(start + time + decay);
        });
    }

    /**
     * Harmonic Crystal: Bright, pure 3-note ascending crystalline cascade.
     */
    private playHarmonicCrystal(ctx: AudioContext, start: number): void {
        const notes = [
            { freq: 880.0, time: 0, gain: 0.12, decay: 0.5 }, // A5
            { freq: 1174.66, time: 0.08, gain: 0.13, decay: 0.6 }, // D6
            { freq: 1479.98, time: 0.16, gain: 0.15, decay: 0.8 }, // F#6
        ];

        notes.forEach(({ freq, time, gain, decay }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start + time);

            gainNode.gain.setValueAtTime(0.0001, start + time);
            gainNode.gain.linearRampToValueAtTime(gain, start + time + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, start + time + decay);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(start + time);
            osc.stop(start + time + decay);
        });
    }

    /**
     * Warm Marimba: Wooden acoustic strike with fundamental and body dampening.
     */
    private playWarmMarimba(ctx: AudioContext, start: number): void {
        const strikes = [
            { freq: 440.0, time: 0, gain: 0.22, decay: 0.4 }, // A4
            { freq: 554.37, time: 0.12, gain: 0.2, decay: 0.45 }, // C#5
        ];

        strikes.forEach(({ freq, time, gain, decay }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start + time);

            gainNode.gain.setValueAtTime(0.0001, start + time);
            gainNode.gain.linearRampToValueAtTime(gain, start + time + 0.008);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, start + time + decay);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(start + time);
            osc.stop(start + time + decay);
        });
    }

    /**
     * Gentle Harp: Soft acoustic string arpeggio.
     */
    private playGentleHarp(ctx: AudioContext, start: number): void {
        const plucks = [
            { freq: 587.33, time: 0, gain: 0.15, decay: 0.7 }, // D5
            { freq: 739.99, time: 0.1, gain: 0.16, decay: 0.8 }, // F#5
            { freq: 880.0, time: 0.2, gain: 0.18, decay: 1.0 }, // A5
        ];

        plucks.forEach(({ freq, time, gain, decay }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start + time);

            gainNode.gain.setValueAtTime(0.0001, start + time);
            gainNode.gain.linearRampToValueAtTime(gain, start + time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, start + time + decay);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(start + time);
            osc.stop(start + time + decay);
        });
    }
}

export const milestoneChimeSynthesizer = MilestoneChimeSynthesizer.getInstance();
