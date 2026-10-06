/**
 * ============================================================================
 * SJCCC – Motion Suspension Controller
 * Composable, reason-based lifecycle and resource governance controller.
 * Coordinates suspension of background animations (RAF loops, canvas repaints,
 * timer tours, DOM keyframes) when obscured by modals, tab backgrounding,
 * reduced-motion preference, or offscreen scroll positions.
 * ============================================================================
 */

export type MotionTarget = 'scrollEngine' | 'particleSystem' | 'campusMap' | 'heroParticles' | string;
export type SuspensionReason = 'modal' | 'page-hidden' | 'hero-offscreen' | 'map-offscreen' | 'reduced-motion' | string;

export class MotionSuspensionController {
    private reasonsByTarget = new Map<string, Set<string>>();
    private listeners = new Map<string, Set<(isSuspended: boolean, reasons: string[]) => void>>();
    private allTargets = new Set<string>(['scrollEngine', 'particleSystem', 'campusMap', 'heroParticles']);

    /**
     * Registers a subsystem target so suspendAll/resumeAll can reach it.
     */
    public registerTarget(target: string): void {
        this.allTargets.add(target);
        if (!this.reasonsByTarget.has(target)) {
            this.reasonsByTarget.set(target, new Set());
        }
    }

    /**
     * Suspends a specific subsystem target for a specific reason.
     * Multiple suspension reasons compose safely (e.g., hero-offscreen AND modal).
     */
    public suspend(target: string, reason: SuspensionReason): void {
        this.registerTarget(target);
        const reasons = this.reasonsByTarget.get(target)!;
        const wasSuspended = reasons.size > 0;
        reasons.add(reason);

        if (!wasSuspended) {
            this.notify(target, true);
        }
    }

    /**
     * Resumes a specific reason for a given target.
     * The target will ONLY notify as resumed if NO OTHER suspension reasons remain active.
     */
    public resume(target: string, reason: SuspensionReason): void {
        const reasons = this.reasonsByTarget.get(target);
        if (!reasons || !reasons.has(reason)) return;

        reasons.delete(reason);
        if (reasons.size === 0) {
            this.notify(target, false);
        }
    }

    /**
     * Suspends all registered subsystem targets under a shared reason (e.g., 'modal', 'page-hidden').
     */
    public suspendAll(reason: SuspensionReason): void {
        for (const target of this.allTargets) {
            this.suspend(target, reason);
        }
    }

    /**
     * Resumes a shared reason across all registered subsystem targets.
     */
    public resumeAll(reason: SuspensionReason): void {
        for (const target of this.allTargets) {
            this.resume(target, reason);
        }
    }

    /**
     * Checks if a target currently has any active suspension reasons.
     */
    public isSuspended(target: string): boolean {
        const reasons = this.reasonsByTarget.get(target);
        return reasons !== undefined && reasons.size > 0;
    }

    /**
     * Returns an array of currently active suspension reasons for a target.
     */
    public getReasons(target: string): string[] {
        const reasons = this.reasonsByTarget.get(target);
        return reasons ? Array.from(reasons) : [];
    }

    /**
     * Subscribes to suspension state transitions for a target.
     * Immediately notifies the subscriber with the current state.
     */
    public subscribe(target: string, callback: (isSuspended: boolean, reasons: string[]) => void): () => void {
        this.registerTarget(target);
        let set = this.listeners.get(target);
        if (!set) {
            set = new Set();
            this.listeners.set(target, set);
        }
        set.add(callback);

        // Immediate initial notification
        const currentlySuspended = this.isSuspended(target);
        callback(currentlySuspended, this.getReasons(target));

        return () => {
            set?.delete(callback);
        };
    }

    private notify(target: string, isSuspended: boolean): void {
        const set = this.listeners.get(target);
        if (!set) return;
        const reasons = this.getReasons(target);
        for (const cb of set) {
            try {
                cb(isSuspended, reasons);
            } catch (err) {
                console.error(`[MotionSuspension] Error in subscriber for ${target}:`, err);
            }
        }
    }

    /**
     * Resets all suspension reasons and listeners (useful in testing environments).
     */
    public reset(): void {
        this.reasonsByTarget.clear();
        this.listeners.clear();
        this.allTargets = new Set<string>(['scrollEngine', 'particleSystem', 'campusMap', 'heroParticles']);
    }
}

export const motionSuspension = new MotionSuspensionController();
