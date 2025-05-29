// Slime Physics Simulation - Refactored for multiple slimes and slicing

class Slime {
    constructor(canvas, ctx, manager, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.manager = manager; // Reference to SlimeManager for global properties/audio

        // Physics parameters (can be individualized later if needed)
        this.baseGravity = 0.15;
        this.increasedGravityMultiplier = 3.0;
        this.friction = 0.97;
        this.groundFriction = 0.5;

        // Slime properties
        this.points = [];
        this.springs = [];
        this.slimeScale = config.initialScale || 1.0;
        this.baseSlimeRadius = config.baseSlimeRadius || 80;

        // Visual base values for scaling
        this.baseGradientInnerRadius = 10;
        this.baseGradientOuterRadius = 150;
        this.baseEyeOffsetX = 20;
        this.baseEyeOffsetY = -10;
        this.baseEyeRadius = 12;
        this.basePupilRadius = 6;
        this.baseHighlightOffsetX = -20;
        this.baseHighlightOffsetY = -20;
        this.baseHighlightRadius = 30;
        
        this.slimeColor = config.color || '#00ffaa';
        this.slimeGlow = config.glow || '#00ff99';

        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for debugging

        if (config.type === 'new_random') {
            this.initSlimeNew(config.centerX, config.centerY, config.numOuterPoints);
        } else if (config.type === 'from_split') {
            this.initSlimeFromSplit(config.outerPointsData, config.desiredCenterX, config.desiredCenterY);
        }
    }

    initSlimeNew(centerX, centerY, numOuterPoints) {
        const radius = this.baseSlimeRadius * this.slimeScale;
        this.points = [];
        this.springs = [];

        // Create points in a circle
        for (let i = 0; i < numOuterPoints; i++) {
            const angle = (i / numOuterPoints) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            this.points.push({
                x: x, y: y, prevX: x, prevY: y,
                baseMass: 1 + Math.random() * 0.5, mass: 1, isFixed: false
            });
            this.points[this.points.length-1].mass = this.points[this.points.length-1].baseMass * this.slimeScale;
        }
        
        // Create center point
        this.points.push({
            x: centerX, y: centerY, prevX: centerX, prevY: centerY,
            baseMass: 2, mass: 2 * this.slimeScale, isFixed: false, isCenter: true
        });
        this.recalculateSprings(numOuterPoints);
    }

    initSlimeFromSplit(outerPointsData, desiredCenterX, desiredCenterY) {
        this.points = [];
        this.springs = [];

        // Add provided outer points (now assumed to be sorted)
        for (const pData of outerPointsData) {
            this.points.push({ ...pData }); // Shallow copy, ensure mass is updated
            this.points[this.points.length-1].mass = this.points[this.points.length-1].baseMass * this.slimeScale;
        }

        // Create and add new center point
        this.points.push({
            x: desiredCenterX, y: desiredCenterY, prevX: desiredCenterX, prevY: desiredCenterY,
            baseMass: 2, mass: 2 * this.slimeScale, isFixed: false, isCenter: true
        });
        this.recalculateSprings(outerPointsData.length);
    }

    recalculateSprings(numOuterPoints) {
        this.springs = [];
        const centerPointIndex = numOuterPoints; // Center point is last after outer points

        // Create springs between adjacent outer points
        for (let i = 0; i < numOuterPoints; i++) {
            const nextIndex = (i + 1) % numOuterPoints;
            const dist = this.distance(this.points[i].x, this.points[i].y, this.points[nextIndex].x, this.points[nextIndex].y);
            this.springs.push({
                pointA: i, pointB: nextIndex,
                baseLength: dist / this.slimeScale, // Store base length relative to current scale
                length: dist,
                stiffness: 0.1 + Math.random() * 0.05
            });
        }

        // Create cross-springs for stability (outer points only)
        for (let i = 0; i < numOuterPoints; i++) {
            for (let j = i + 2; j < numOuterPoints; j++) {
                if (Math.abs(i - j) > 1 && Math.abs(i - j) < numOuterPoints - 1) {
                    const dist = this.distance(this.points[i].x, this.points[i].y, this.points[j].x, this.points[j].y);
                    this.springs.push({
                        pointA: i, pointB: j,
                        baseLength: dist / this.slimeScale,
                        length: dist,
                        stiffness: 0.005 + Math.random() * 0.005
                    });
                }
            }
        }
        
        // Springs from outer points to center point
        const springLengthToCenterBase = this.baseSlimeRadius; // Use base radius for this connection
        for (let i = 0; i < numOuterPoints; i++) {
            this.springs.push({
                pointA: centerPointIndex,
                pointB: i,
                baseLength: springLengthToCenterBase,
                length: springLengthToCenterBase * this.slimeScale,
                stiffness: 0.03
            });
        }
    }

    getCenterPoint() {
        return this.points.find(p => p.isCenter) || (this.points.length > 0 ? this.points[this.points.length-1] : {x:0, y:0});
    }

    getBoundingBox() {
        if (this.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        // Consider only outer points for bounding box
        const numOuterPoints = this.points.length > 0 && this.points[this.points.length-1].isCenter ? this.points.length -1 : this.points.length;

        for (let i=0; i < numOuterPoints; i++) {
            const p = this.points[i];
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }

    applyGrowth() {
        const growthFactor = 1.05;
        this.slimeScale *= growthFactor;

        for (const spring of this.springs) {
            spring.length = spring.baseLength * this.slimeScale;
        }
        
        for (const point of this.points) {
           point.mass = point.baseMass * this.slimeScale;
        }
        this.manager.playEatSound(); // Global sound player
    }

    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    updatePhysics(draggedPointInfo) {
        let currentAppliedGravity = this.baseGravity;
        const boundaryMargin = Math.max(10, this.baseSlimeRadius * this.slimeScale * 0.1);

        let isGrounded = false;
        if (this.points.length > 0) {
            let lowestY = -Infinity;
            const numOuterPoints = this.points.length - (this.points[this.points.length -1].isCenter ? 1 : 0);
            for (let i = 0; i < numOuterPoints; i++) {
                if (this.points[i].y > lowestY) lowestY = this.points[i].y;
            }
            if (lowestY >= this.canvas.height - boundaryMargin - 1) isGrounded = true;
        }
        
        const isBeingLiftedByMouse = draggedPointInfo && draggedPointInfo.slimeId === this.id;

        if (isGrounded && !isBeingLiftedByMouse) {
            currentAppliedGravity = this.baseGravity * this.increasedGravityMultiplier;
        }

        if (draggedPointInfo && draggedPointInfo.slimeId === this.id && draggedPointInfo.pointIndex !== null) {
            const point = this.points[draggedPointInfo.pointIndex];
            if (point) { // Ensure point exists
                const dx = this.manager.mouse.x - point.x;
                const dy = this.manager.mouse.y - point.y;
                
                point.x += dx * this.manager.dragStrength;
                point.y += dy * this.manager.dragStrength;
                point.prevX = point.x - (dx * this.manager.dragStrength);
                point.prevY = point.y - (dy * this.manager.dragStrength);
            }
        }
        
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            if (point.isFixed) continue;
            
            const x = point.x; const y = point.y;
            let vx = (point.x - point.prevX) * this.friction;
            let vy = (point.y - point.prevY) * this.friction;
            
            vy += currentAppliedGravity; 
            
            point.x += vx; point.y += vy;
            point.prevX = x; point.prevY = y;
            
            // Boundary constraints
            const effectiveBoundaryMargin = point.isCenter ? boundaryMargin * 0.5 : boundaryMargin; // Center point can get closer
            if (point.y > this.canvas.height - effectiveBoundaryMargin) {
                point.y = this.canvas.height - effectiveBoundaryMargin;
                point.prevY = point.y + vy * this.groundFriction;
            }
            if (point.y < effectiveBoundaryMargin) {
                point.y = effectiveBoundaryMargin;
                point.prevY = point.y + vy * this.groundFriction;
            }
            if (point.x < effectiveBoundaryMargin) {
                point.x = effectiveBoundaryMargin;
                point.prevX = point.x + vx * this.groundFriction;
            } else if (point.x > this.canvas.width - effectiveBoundaryMargin) {
                point.x = this.canvas.width - effectiveBoundaryMargin;
                point.prevX = point.x + vx * this.groundFriction;
            }
        }
        
        const constraintIterations = 3;
        for (let iter = 0; iter < constraintIterations; iter++) {
            for (let i = 0; i < this.springs.length; i++) {
                const spring = this.springs[i];
                // Ensure points exist, can happen briefly during splits if logic is complex
                if (!this.points[spring.pointA] || !this.points[spring.pointB]) continue;

                const pointA = this.points[spring.pointA];
                const pointB = this.points[spring.pointB];

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
    }
    
    render() {
        if (this.points.length === 0) return;
        this.ctx.save();
        
        const centerMass = this.getCenterPoint();
        const slimeCenterX = centerMass.x;
        const slimeCenterY = centerMass.y;

        const gradientInnerR = this.baseGradientInnerRadius;
        const gradientOuterR = this.baseGradientOuterRadius * this.slimeScale;

        const gradient = this.ctx.createRadialGradient(
            slimeCenterX, slimeCenterY, gradientInnerR,
            slimeCenterX, slimeCenterY, gradientOuterR 
        );
        gradient.addColorStop(0, 'rgba(0, 255, 170, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 255, 170, 0.1)');
        
        this.ctx.beginPath();
        const numOutlinePoints = this.points.length - (this.points[this.points.length-1].isCenter ? 1 : 0);
        
        if (numOutlinePoints < 2) { this.ctx.restore(); return; }

        this.ctx.moveTo(
            (this.points[numOutlinePoints - 1].x + this.points[0].x) / 2, 
            (this.points[numOutlinePoints - 1].y + this.points[0].y) / 2
        );

        for (let i = 0; i < numOutlinePoints; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % numOutlinePoints];
            this.ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
        this.ctx.closePath();
        
        this.ctx.shadowColor = this.slimeGlow;
        this.ctx.shadowBlur = 15 * this.slimeScale;
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.beginPath();
        const highlightX = slimeCenterX + this.baseHighlightOffsetX * this.slimeScale;
        const highlightY = slimeCenterY + this.baseHighlightOffsetY * this.slimeScale;
        const highlightR = this.baseHighlightRadius * this.slimeScale;
        this.ctx.arc(highlightX, highlightY, highlightR, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fill();
        
        this.ctx.restore();
        this.drawEyes(centerMass);
    }
    
    drawEyes(centerPoint) {
        const slimeBodyCenterX = centerPoint.x;
        const slimeBodyCenterY = centerPoint.y;
        
        const eyeOffsetX = this.baseEyeOffsetX * this.slimeScale;
        const eyeOffsetY = this.baseEyeOffsetY * this.slimeScale;
        const eyeRadius = this.baseEyeRadius * this.slimeScale;
        const pupilRadius = this.basePupilRadius * this.slimeScale;

        const vx = (centerPoint.x - centerPoint.prevX);
        const vy = (centerPoint.y - centerPoint.prevY);
        const jiggleMultiplier = 2; 

        const leftEyeX = slimeBodyCenterX - eyeOffsetX - vx * jiggleMultiplier;
        const leftEyeY = slimeBodyCenterY + eyeOffsetY - vy * jiggleMultiplier;
        const rightEyeX = slimeBodyCenterX + eyeOffsetX - vx * jiggleMultiplier;
        const rightEyeY = slimeBodyCenterY + eyeOffsetY - vy * jiggleMultiplier;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.beginPath(); this.ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2); this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        const pupilJiggleMultiplier = 3;
        this.ctx.beginPath(); this.ctx.arc(leftEyeX + vx * pupilJiggleMultiplier, leftEyeY + vy * pupilJiggleMultiplier, pupilRadius, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(rightEyeX + vx * pupilJiggleMultiplier, rightEyeY + vy * pupilJiggleMultiplier, pupilRadius, 0, Math.PI * 2); this.ctx.fill();
    }
}

export { Slime };