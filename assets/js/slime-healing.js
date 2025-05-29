// slime-healing.js - Contains healing-related functionality for slimes

/**
 * Updates the healing process for a slime
 * @param {Slime} slime - The slime object to update
 */
export function updateHealing(slime) {
    if (!slime.isHealing) return;
    
    slime.healingProgress += slime.healingRate;
    slime.healingPulseTime += 0.05;
    
    if (slime.healingProgress >= 1) {
        slime.isHealing = false;
        slime.healingProgress = 1;
        
        // Create a burst of particles to show completed healing
        const centerPoint = slime.getCenterPoint();
        if (slime.manager.particleManager) {
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = slime.baseSlimeRadius * slime.slimeScale * 0.7 * Math.random();
                const px = centerPoint.x + Math.cos(angle) * dist;
                const py = centerPoint.y + Math.sin(angle) * dist;
                
                slime.manager.particleManager.createParticle(px, py, {
                    velocityX: Math.cos(angle) * (1 + Math.random() * 2),
                    velocityY: Math.sin(angle) * (1 + Math.random() * 2),
                    size: 2 + Math.random() * 3,
                    color: slime.slimeColor,
                    alpha: 0.7 + Math.random() * 0.3,
                    decay: 0.03 + Math.random() * 0.02,
                    lifetime: 20 + Math.random() * 20
                });
            }
        }
    } else {
        // Update point positions for healing animation
        const numOuterPoints = slime.points.length - (slime.points[slime.points.length-1].isCenter ? 1 : 0);
        const centerPoint = slime.getCenterPoint();
        
        // During healing, apply a slight pulsing effect to make the regeneration more visible
        const pulse = Math.sin(slime.healingPulseTime) * 0.03;
        
        for (let i = 0; i < numOuterPoints; i++) {
            const point = slime.points[i];
            if (point.isHealing) {
                // Update point's heal progress
                point.healProgress = Math.min(1, (point.healProgress || 0) + slime.healingRate);
                
                // If we have enough healing progress, create occasional healing particles
                if (slime.manager.particleManager && Math.random() < 0.03 * slime.healingProgress) {
                    slime.manager.particleManager.createParticle(point.x, point.y, {
                        velocityX: (Math.random() - 0.5) * 1,
                        velocityY: (Math.random() - 0.5) * 1 - 1, // Slight upward bias
                        size: 1 + Math.random() * 2,
                        color: slime.slimeColor,
                        alpha: 0.5 + Math.random() * 0.3,
                        decay: 0.05 + Math.random() * 0.05,
                        lifetime: 10 + Math.random() * 15
                    });
                }
            }
        }
        
        // Apply a subtle pulse to all springs during healing
        for (const spring of slime.springs) {
            spring.length = spring.baseLength * slime.slimeScale * (1 + pulse);
        }
    }
}