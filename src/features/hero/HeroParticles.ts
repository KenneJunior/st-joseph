/**
 * ============================================================================
 * SJCCC – Hero Particles
 * Lightweight DOM floating ambient particles in the hero banner
 * ============================================================================
 */

export class HeroParticles {
    constructor(containerId: string = 'heroParticles', count = 40) {
        const container = document.getElementById(containerId);
        if (!container) return;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'hero-particle';
            const size = Math.random() * 4 + 1.5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${Math.random() * 8 + 6}s`;
            particle.style.animationDelay = `${Math.random() * 6}s`;
            container.appendChild(particle);
        }
    }
}
