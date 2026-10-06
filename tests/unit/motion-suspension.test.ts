import { describe, it, expect, beforeEach } from 'vitest';
import { MotionSuspensionController } from '../../src/core/physics/MotionSuspension.ts';

describe('MotionSuspensionController', () => {
    let controller: MotionSuspensionController;

    beforeEach(() => {
        controller = new MotionSuspensionController();
    });

    it('should start with zero active suspension reasons', () => {
        expect(controller.isSuspended('scrollEngine')).toBe(false);
        expect(controller.isSuspended('particleSystem')).toBe(false);
        expect(controller.isSuspended('campusMap')).toBe(false);
    });

    it('Scenario A: Subsystems active when hero is visible and no modals are open', () => {
        expect(controller.isSuspended('scrollEngine')).toBe(false);
        expect(controller.isSuspended('particleSystem')).toBe(false);
    });

    it('Scenario B: Offscreen hero suspends scrollEngine and particleSystem', () => {
        controller.suspend('scrollEngine', 'hero-offscreen');
        controller.suspend('particleSystem', 'hero-offscreen');

        expect(controller.isSuspended('scrollEngine')).toBe(true);
        expect(controller.isSuspended('particleSystem')).toBe(true);
        expect(controller.getReasons('scrollEngine')).toContain('hero-offscreen');
    });

    it('Scenario C: Returning to hero resumes animations without duplicate triggers', () => {
        controller.suspend('scrollEngine', 'hero-offscreen');
        expect(controller.isSuspended('scrollEngine')).toBe(true);

        let transitionCount = 0;
        let lastState: boolean | null = null;
        controller.subscribe('scrollEngine', (suspended) => {
            transitionCount++;
            lastState = suspended;
        });

        // Initial subscribe notifies immediately (currently true)
        expect(transitionCount).toBe(1);
        expect(lastState).toBe(true);

        // Resume hero-offscreen
        controller.resume('scrollEngine', 'hero-offscreen');
        expect(controller.isSuspended('scrollEngine')).toBe(false);
        expect(lastState).toBe(false);
        expect(transitionCount).toBe(2);
    });

    it('Scenario D: Opening a modal suspends all background motion', () => {
        controller.suspendAll('modal');

        expect(controller.isSuspended('scrollEngine')).toBe(true);
        expect(controller.isSuspended('particleSystem')).toBe(true);
        expect(controller.isSuspended('campusMap')).toBe(true);
        expect(controller.isSuspended('heroParticles')).toBe(true);
    });

    it('Scenario E: Closing modal while offscreen MUST NOT resume hero systems', () => {
        // User scrolls down: hero is offscreen
        controller.suspend('scrollEngine', 'hero-offscreen');
        controller.suspend('particleSystem', 'hero-offscreen');
        expect(controller.isSuspended('scrollEngine')).toBe(true);

        // User opens modal while offscreen
        controller.suspendAll('modal');
        expect(controller.getReasons('scrollEngine')).toEqual(expect.arrayContaining(['hero-offscreen', 'modal']));

        // User closes modal while still offscreen
        controller.resumeAll('modal');

        // CRITICAL: Hero systems must REMAIN suspended because 'hero-offscreen' is still active!
        expect(controller.isSuspended('scrollEngine')).toBe(true);
        expect(controller.isSuspended('particleSystem')).toBe(true);
        expect(controller.getReasons('scrollEngine')).toEqual(['hero-offscreen']);

        // Only when user scrolls back to the hero does it resume
        controller.resume('scrollEngine', 'hero-offscreen');
        controller.resume('particleSystem', 'hero-offscreen');
        expect(controller.isSuspended('scrollEngine')).toBe(false);
        expect(controller.isSuspended('particleSystem')).toBe(false);
    });

    it('Scenario F: Tab switch suspends on tab hide and resumes on tab visible', () => {
        controller.suspendAll('page-hidden');
        expect(controller.isSuspended('scrollEngine')).toBe(true);
        expect(controller.isSuspended('particleSystem')).toBe(true);
        expect(controller.isSuspended('campusMap')).toBe(true);

        controller.resumeAll('page-hidden');
        expect(controller.isSuspended('scrollEngine')).toBe(false);
        expect(controller.isSuspended('particleSystem')).toBe(false);
        expect(controller.isSuspended('campusMap')).toBe(false);
    });

    it('Scenario G: Campus map offscreen gating functions independently of hero', () => {
        controller.suspend('campusMap', 'map-offscreen');
        expect(controller.isSuspended('campusMap')).toBe(true);
        expect(controller.isSuspended('scrollEngine')).toBe(false);

        controller.resume('campusMap', 'map-offscreen');
        expect(controller.isSuspended('campusMap')).toBe(false);
    });
});
