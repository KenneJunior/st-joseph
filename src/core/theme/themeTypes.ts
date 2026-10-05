/**
 * ============================================================================
 * SJCCC – Theme System Types
 * ============================================================================
 */

export type ThemePreference = 'dark' | 'light';

export type AnimationStyle =
    | 'circle-center'
    | 'circle-top-left'
    | 'circle-top-right'
    | 'rect-top-down'
    | 'rect-bottom-up'
    | 'rect-left-right'
    | 'rect-right-left'
    | 'blur';

export interface ThemeManagerOptions {
    /** Toggle trigger button element ID */
    toggleId?: string;
    /** Transition mode: 'animated' uses multi-shape clip-path overlay; 'fade' uses simple opacity overlay */
    mode?: 'animated' | 'fade';
    /** Custom overlay element ID (defaults to 'themeTransitionOverlay') */
    overlayId?: string;
}
