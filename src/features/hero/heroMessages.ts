/**
 * ============================================================================
 * SJCCC – Canonical Hero Message Dataset (heroMessages.ts)
 * 
 * Single authoritative source of truth for the 7 institutional marketing
 * and vision messages displayed in the hero section.
 * Consumed by both:
 * 1. Mode A: TimedHeroRotator (Apple devices)
 * 2. Mode B: ScrollEngine (Desktop / Non-Apple devices)
 * ============================================================================
 */

export const HERO_MESSAGES: readonly string[] = [
    'Nurturing <span class="message-highlight">MINDS</span> & <span class="message-highlight">HANDS</span><br>for a better future',
    'Where <span class="message-highlight">FAITH</span> meets<br><span class="message-highlight">EXCELLENCE</span> in education',
    'Rigorous <span class="message-highlight">ACADEMICS</span><br>& industrial training',
    'Building <span class="message-highlight">CHARACTER</span><br>since 6th SEPT 1999',
    'Empowering students to<br><span class="message-highlight">LEAD</span> & <span class="message-highlight">SERVE</span>',
    'A community of<br><span class="message-highlight">DISCIPLINE</span> & integrity',
    'Your journey to<br><span class="message-highlight">SUCCESS</span> starts here',
] as const;
