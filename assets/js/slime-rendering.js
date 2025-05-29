// slime-rendering.js - Contains rendering-related functionality for slimes

/**
 * Renders a slime
 * @param {Slime} slime - The slime object to render
 */
export function renderSlime(slime) {
    if (slime.points.length === 0) return;
    slime.ctx.save();
    
    const centerMass = slime.getCenterPoint();
    const slimeCenterX = centerMass.x;
    const slimeCenterY = centerMass.y;

    // Adjust gradient based on healing status
    let gradientInnerR = slime.baseGradientInnerRadius;
    let gradientOuterR = slime.baseGradientOuterRadius * slime.slimeScale;
    
    // During healing, make the gradient more vibrant
    const healingIntensity = slime.isHealing ? 0.2 * Math.sin(slime.healingPulseTime * 4) * slime.healingProgress : 0;

    const gradient = slime.ctx.createRadialGradient(
        slimeCenterX, slimeCenterY, gradientInnerR,
        slimeCenterX, slimeCenterY, gradientOuterR 
    );
    
    // Adjust color based on healing status
    if (slime.isHealing) {
        // Create a more vibrant, glowing gradient while healing
        gradient.addColorStop(0, `rgba(${0 + healingIntensity * 40}, ${255 - healingIntensity * 20}, ${170 + healingIntensity * 40}, ${0.9 + healingIntensity * 0.1})`);
        gradient.addColorStop(1, `rgba(${0 + healingIntensity * 40}, ${255 - healingIntensity * 20}, ${170 + healingIntensity * 40}, ${0.1 + healingIntensity * 0.1})`);
    } else {
        // Regular gradient
        gradient.addColorStop(0, 'rgba(0, 255, 170, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 255, 170, 0.1)');
    }
    
    slime.ctx.beginPath();
    const numOutlinePoints = slime.points.length - (slime.points[slime.points.length-1].isCenter ? 1 : 0);
    
    if (numOutlinePoints < 2) { slime.ctx.restore(); return; }

    slime.ctx.moveTo(
        (slime.points[numOutlinePoints - 1].x + slime.points[0].x) / 2, 
        (slime.points[numOutlinePoints - 1].y + slime.points[0].y) / 2
    );

    for (let i = 0; i < numOutlinePoints; i++) {
        const p1 = slime.points[i];
        const p2 = slime.points[(i + 1) % numOutlinePoints];
        slime.ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    slime.ctx.closePath();
    
    // Enhance glow during healing
    if (slime.isHealing) {
        slime.ctx.shadowColor = `rgba(${0 + healingIntensity * 100}, ${255 - healingIntensity * 50}, ${170 + healingIntensity * 85}, ${1.0})`;
        slime.ctx.shadowBlur = (15 + healingIntensity * 10) * slime.slimeScale;
    } else {
        slime.ctx.shadowColor = slime.slimeGlow;
        slime.ctx.shadowBlur = 15 * slime.slimeScale;
    }
    slime.ctx.fillStyle = gradient;
    slime.ctx.fill();
    
    slime.ctx.globalCompositeOperation = 'lighter';
    slime.ctx.beginPath();
    const highlightX = slimeCenterX + slime.baseHighlightOffsetX * slime.slimeScale;
    const highlightY = slimeCenterY + slime.baseHighlightOffsetY * slime.slimeScale;
    const highlightR = slime.baseHighlightRadius * slime.slimeScale;
    slime.ctx.arc(highlightX, highlightY, highlightR, 0, Math.PI * 2);
    slime.ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + (slime.isHealing ? healingIntensity * 0.2 : 0)})`;
    slime.ctx.fill();
    
    slime.ctx.restore();
    drawSlimeEyes(slime, centerMass);
}

/**
 * Renders the eyes for a slime
 * @param {Slime} slime - The slime object
 * @param {Object} centerPoint - The center point of the slime
 */
export function drawSlimeEyes(slime, centerPoint) {
    const slimeBodyCenterX = centerPoint.x;
    const slimeBodyCenterY = centerPoint.y;
    
    // Calculate the approximate body radius (based on slimeScale)
    const approximateBodyRadius = slime.baseSlimeRadius * slime.slimeScale;
    const eyeRadius = slime.baseEyeRadius * slime.slimeScale;
    
    // Define thresholds based on relative eye-to-body ratio
    const eyeToBodyRatio = eyeRadius / approximateBodyRadius;
    const bothEyesThreshold = 0.25; // If eye radius is more than 25% of body radius, start removing eyes
    const oneEyeThreshold = 0.4;    // If eye radius is more than 40% of body radius, only show one eye
    const noEyesThreshold = 0.6;    // If eye radius is more than 60% of body radius, show no eyes
    
    // If the slime is too small, don't draw eyes
    if (eyeToBodyRatio > noEyesThreshold) {
        return; // Too small for any eyes
    }
    
    const eyeOffsetX = slime.baseEyeOffsetX * slime.slimeScale;
    const eyeOffsetY = slime.baseEyeOffsetY * slime.slimeScale;
    const pupilRadius = slime.basePupilRadius * slime.slimeScale;

    const vx = (centerPoint.x - centerPoint.prevX);
    const vy = (centerPoint.y - centerPoint.prevY);
    const jiggleMultiplier = 2; 

    // For medium-sized slimes, just draw one eye in the center
    if (eyeToBodyRatio > oneEyeThreshold) {
        // Draw a single eye at the center
        const singleEyeX = slimeBodyCenterX - vx * jiggleMultiplier;
        const singleEyeY = slimeBodyCenterY + eyeOffsetY * 0.8 - vy * jiggleMultiplier;
        
        slime.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        slime.ctx.beginPath();
        slime.ctx.arc(singleEyeX, singleEyeY, eyeRadius, 0, Math.PI * 2);
        slime.ctx.fill();
        
        slime.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        const pupilJiggleMultiplier = 3;
        slime.ctx.beginPath();
        slime.ctx.arc(
            singleEyeX + vx * pupilJiggleMultiplier, 
            singleEyeY + vy * pupilJiggleMultiplier, 
            pupilRadius, 0, Math.PI * 2
        );
        slime.ctx.fill();
        return;
    }
    
    // For regular sized slimes, draw both eyes (possibly closer together if approaching the threshold)
    const eyeSpacingFactor = (eyeToBodyRatio > bothEyesThreshold) 
        ? Math.max(0.2, 1 - (eyeToBodyRatio - bothEyesThreshold) / (oneEyeThreshold - bothEyesThreshold)) 
        : 1;
    
    const leftEyeX = slimeBodyCenterX - eyeOffsetX * eyeSpacingFactor - vx * jiggleMultiplier;
    const leftEyeY = slimeBodyCenterY + eyeOffsetY - vy * jiggleMultiplier;
    const rightEyeX = slimeBodyCenterX + eyeOffsetX * eyeSpacingFactor - vx * jiggleMultiplier;
    const rightEyeY = slimeBodyCenterY + eyeOffsetY - vy * jiggleMultiplier;
    
    slime.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    slime.ctx.beginPath(); slime.ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2); slime.ctx.fill();
    slime.ctx.beginPath(); slime.ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2); slime.ctx.fill();
    
    slime.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    const pupilJiggleMultiplier = 3;
    slime.ctx.beginPath(); slime.ctx.arc(leftEyeX + vx * pupilJiggleMultiplier, leftEyeY + vy * pupilJiggleMultiplier, pupilRadius, 0, Math.PI * 2); slime.ctx.fill();
    slime.ctx.beginPath(); slime.ctx.arc(rightEyeX + vx * pupilJiggleMultiplier, rightEyeY + vy * pupilJiggleMultiplier, pupilRadius, 0, Math.PI * 2); slime.ctx.fill();
}