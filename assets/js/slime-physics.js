// slime-physics.js - Contains physics-related functionality for slimes

/**
 * Updates the physics for a slime object
 * @param {Slime} slime - The slime object to update
 * @param {Object} draggedPointInfo - Information about any point being dragged
 * @returns {Object} Previous center position info for particle effects
 */
export function updateSlimePhysics(slime, draggedPointInfo) {
    // Store the previous center position for velocity calculation
    const centerPoint = slime.getCenterPoint();
    const prevCenterX = centerPoint.x;
    const prevCenterY = centerPoint.y;

    let currentAppliedGravity = slime.baseGravity;
    const boundaryMargin = Math.max(10, slime.baseSlimeRadius * slime.slimeScale * 0.1);

    let isGrounded = false;
    if (slime.points.length > 0) {
        let lowestY = -Infinity;
        const numOuterPoints = slime.points.length - (slime.points[slime.points.length -1].isCenter ? 1 : 0);
        for (let i = 0; i < numOuterPoints; i++) {
            if (slime.points[i].y > lowestY) lowestY = slime.points[i].y;
        }
        if (lowestY >= slime.canvas.height - boundaryMargin - 1) isGrounded = true;
    }
    
    const isBeingLiftedByMouse = draggedPointInfo && draggedPointInfo.slimeId === slime.id;

    if (isGrounded && !isBeingLiftedByMouse) {
        currentAppliedGravity = slime.baseGravity * slime.increasedGravityMultiplier;
    }

    if (draggedPointInfo && draggedPointInfo.slimeId === slime.id && draggedPointInfo.pointIndex !== null) {
        const point = slime.points[draggedPointInfo.pointIndex];
        if (point) { // Ensure point exists
            const dx = slime.manager.mouse.x - point.x;
            const dy = slime.manager.mouse.y - point.y;
            
            point.x += dx * slime.manager.dragStrength;
            point.y += dy * slime.manager.dragStrength;
            point.prevX = point.x - (dx * slime.manager.dragStrength);
            point.prevY = point.y - (dy * slime.manager.dragStrength);
        }
    }
    
    for (let i = 0; i < slime.points.length; i++) {
        const point = slime.points[i];
        if (point.isFixed) continue;
        
        const x = point.x; const y = point.y;
        let vx = (point.x - point.prevX) * slime.friction;
        let vy = (point.y - point.prevY) * slime.friction;
        
        vy += currentAppliedGravity; 
        
        point.x += vx; point.y += vy;
        point.prevX = x; point.prevY = y;
        
        // Boundary constraints
        const effectiveBoundaryMargin = point.isCenter ? boundaryMargin * 0.5 : boundaryMargin; // Center point can get closer
        if (point.y > slime.canvas.height - effectiveBoundaryMargin) {
            point.y = slime.canvas.height - effectiveBoundaryMargin;
            point.prevY = point.y + vy * slime.groundFriction;
        }
        if (point.y < effectiveBoundaryMargin) {
            point.y = effectiveBoundaryMargin;
            point.prevY = point.y + vy * slime.groundFriction;
        }
        if (point.x < effectiveBoundaryMargin) {
            point.x = effectiveBoundaryMargin;
            point.prevX = point.x + vx * slime.groundFriction;
        } else if (point.x > slime.canvas.width - effectiveBoundaryMargin) {
            point.x = slime.canvas.width - effectiveBoundaryMargin;
            point.prevX = point.x + vx * slime.groundFriction;
        }
    }
    
    const constraintIterations = 3;
    for (let iter = 0; iter < constraintIterations; iter++) {
        for (let i = 0; i < slime.springs.length; i++) {
            const spring = slime.springs[i];
            // Ensure points exist, can happen briefly during splits if logic is complex
            if (!slime.points[spring.pointA] || !slime.points[spring.pointB]) continue;

            const pointA = slime.points[spring.pointA];
            const pointB = slime.points[spring.pointB];

            const dx = pointB.x - pointA.x;
            const dy = pointB.y - pointA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) continue;

            const difference = (spring.length - distance) / distance;
            let scalarA = 0.5, scalarB = 0.5;
            if (pointA.isFixed) { scalarA = 0; scalarB = 1; }
            if (pointB.isFixed) { scalarB = 0; scalarA = 1; }
            if (pointA.isFixed && pointB.isFixed) {scalarA = 0; scalarB = 0;}
            
            const moveX = dx * difference * spring.stiffness;
            const moveY = dy * difference * spring.stiffness;

            if (!pointA.isFixed) { pointA.x -= moveX * scalarA; pointA.y -= moveY * scalarA; }
            if (!pointB.isFixed) { pointB.x += moveX * scalarB; pointB.y += moveY * scalarB; }
        }
    }
    
    // Update healing process if the slime is healing
    if (slime.isHealing) {
        slime.updateHealing();
    }
    
    // Return the previous center position for particle effects
    return { prevCenterX, prevCenterY };
}