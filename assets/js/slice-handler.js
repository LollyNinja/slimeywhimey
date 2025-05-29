// slice-handler.js
import { Slime } from './slime-class.js';

const MIN_OUTER_POINTS_FOR_SPLIT = 3;

export class SliceHandler {
    constructor(canvas, ctx, slimes, audioManager, slimeManager, particleManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.slimes = slimes; 
        this.audioManager = audioManager;
        this.slimeManager = slimeManager;
        this.particleManager = particleManager;

        this.sliceMode = false;
        this.sliceStartPoint = null;
        this.sliceEndPoint = null;
        
        // Add a healing factor property to control regeneration speed
        this.healingFactor = 0.5; // Controls how quickly slimes regenerate after splitting
    }

    toggleSliceMode() {
        this.sliceMode = !this.sliceMode;
        this.canvas.style.cursor = this.sliceMode ? 'crosshair' : 'grab';
        if (!this.sliceMode) {
            this.sliceStartPoint = null;
            this.sliceEndPoint = null;
        }
        return this.sliceMode; 
    }

    startSlice(point) {
        if (!this.sliceMode) return;
        this.sliceStartPoint = { x: point.x, y: point.y };
        this.sliceEndPoint = { x: point.x, y: point.y };
    }

    updateSlice(point) {
        if (!this.sliceMode || !this.sliceStartPoint) return;
        this.sliceEndPoint = { x: point.x, y: point.y };
    }

    endSlice() {
        if (!this.sliceMode || !this.sliceStartPoint || !this.sliceEndPoint) return null;

        const p1 = this.sliceStartPoint;
        const p2 = this.sliceEndPoint;
        this.sliceStartPoint = null; 
        this.sliceEndPoint = null;

        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        if (dist > 10) { 
            // Create slice effect particles along the slice line
            if (this.particleManager) {
                this.particleManager.createSliceEffect(p1.x, p1.y, p2.x, p2.y);
            }
            
            return this.performSliceOperation(p1, p2);
        }
        return null;
    }
    
    lineIntersectsRect(p1, p2, rect) {
        if (p1.x >= rect.minX && p1.x <= rect.maxX && p1.y >= rect.minY && p1.y <= rect.maxY) return true;
        if (p2.x >= rect.minX && p2.x <= rect.maxX && p2.y >= rect.minY && p2.y <= rect.maxY) return true;

        const intersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
            const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (den === 0) return false; 
            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        };

        if (intersect(p1.x, p1.y, p2.x, p2.y, rect.minX, rect.minY, rect.maxX, rect.minY)) return true; 
        if (intersect(p1.x, p1.y, p2.x, p2.y, rect.maxX, rect.minY, rect.maxX, rect.maxY)) return true; 
        if (intersect(p1.x, p1.y, p2.x, p2.y, rect.maxX, rect.maxY, rect.minX, rect.maxY)) return true; 
        if (intersect(p1.x, p1.y, p2.x, p2.y, rect.minX, rect.maxY, rect.minX, rect.minY)) return true; 
        
        if (rect.minX <= p1.x && p1.x <= rect.maxX && rect.minY <= p1.y && p1.y <= rect.maxY &&
            rect.minX <= p2.x && p2.x <= rect.maxX && rect.minY <= p2.y && p2.y <= rect.maxY) return true;
            
        return false;
    }
    
    performSliceOperation(p1, p2) {
        const newSlimesToAdd = [];
        const slimesToRemoveIndexes = [];

        // Helper: build a circular ring of N points around (cx,cy) with radius R
        const buildCirclePoints = (N, cx, cy, R, baseMass, originalVelocities = null) => {
            const pts = [];
            for (let i = 0; i < N; i++) {
                const angle = (i / N) * Math.PI * 2;
                const x = cx + Math.cos(angle) * R;
                const y = cy + Math.sin(angle) * R;
                
                // If we have velocities from the original points, use them to create momentum
                let vx = 0, vy = 0;
                if (originalVelocities && originalVelocities.length > 0) {
                    // Use a random velocity from the original set to create more chaotic,
                    // organic regeneration movement
                    const randIdx = Math.floor(Math.random() * originalVelocities.length);
                    vx = originalVelocities[randIdx].vx * 0.8; // Scale down for stability
                    vy = originalVelocities[randIdx].vy * 0.8;
                }
                
                pts.push({
                    x, y,
                    prevX: x - vx, // Apply inferred velocity via prevX/Y displacement
                    prevY: y - vy,
                    baseMass: baseMass, // use provided baseMass
                    isHealing: true, // Mark as healing for potential visual effects
                    healProgress: 0, // Start healing from 0%
                    id: Math.random().toString(36).substr(2, 9)
                });
            }
            return pts;
        };

        for (let i = 0; i < this.slimes.length; i++) {
            const slime = this.slimes[i];
            const bbox = slime.getBoundingBox();

            if (!this.lineIntersectsRect(p1, p2, bbox)) continue; 

            const originalOuterPoints = slime.points.filter(pt => !pt.isCenter);
            if (originalOuterPoints.length < MIN_OUTER_POINTS_FOR_SPLIT * 2) continue; 

            let group1PointsData = [];
            let group2PointsData = [];

            // Collect velocities from original points for more natural regeneration
            const originalVelocities = originalOuterPoints.map(point => ({
                vx: point.x - point.prevX,
                vy: point.y - point.prevY
            }));

            // Split points into two groups based on which side of the line they're on
            for (const point of originalOuterPoints) {
                const side = (point.x - p1.x) * (p2.y - p1.y) - (point.y - p1.y) * (p2.x - p1.x);
                if (side >= 0) { 
                    group1PointsData.push({
                        x: point.x, y: point.y, 
                        prevX: point.prevX, prevY: point.prevY, 
                        baseMass: point.baseMass, 
                        id: point.id
                    }); 
                } else {
                    group2PointsData.push({
                        x: point.x, y: point.y, 
                        prevX: point.prevX, prevY: point.prevY, 
                        baseMass: point.baseMass, 
                        id: point.id
                    });
                }
            }

            if (group1PointsData.length < MIN_OUTER_POINTS_FOR_SPLIT || group2PointsData.length < MIN_OUTER_POINTS_FOR_SPLIT) {
                continue; 
            }

            slimesToRemoveIndexes.push(i);
            this.audioManager.playSplitSound();

            // Get slime center point for particle effect
            const centerPoint = slime.getCenterPoint();
            
            // Create slice particles at the intersection
            if (this.particleManager) {
                // Create additional burst at the intersection center
                for (let j = 0; j < 20; j++) { // Increased particles for more dramatic effect
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 2 + Math.random() * 8;
                    const particleX = centerPoint.x + Math.cos(angle) * distance;
                    const particleY = centerPoint.y + Math.sin(angle) * distance;
                    
                    // Create particles with varying velocities for more chaotic effect
                    const speed = 2 + Math.random() * 5;
                    this.particleManager.createParticle(particleX, particleY, {
                        velocityX: Math.cos(angle) * speed,
                        velocityY: Math.sin(angle) * speed,
                        size: 3 + Math.random() * 5,
                        color: slime.slimeColor,
                        alpha: 0.8 + Math.random() * 0.2,
                        decay: 0.02 + Math.random() * 0.02,
                        lifetime: 40 + Math.random() * 20
                    });
                }

                // Add particles specifically along the cut line
                const cutLineX = (p1.x + p2.x) / 2;
                const cutLineY = (p1.y + p2.y) / 2;
                const cutDirection = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const perpDirection = cutDirection + Math.PI/2;
                
                // Create particles perpendicular to the cut line
                for (let j = 0; j < 15; j++) {
                    const offset = -20 + Math.random() * 40;
                    const particleX = cutLineX + Math.cos(cutDirection) * offset;
                    const particleY = cutLineY + Math.sin(cutDirection) * offset;
                    
                    // Particles fly perpendicular to cut line
                    const perpSpeed = 3 + Math.random() * 6;
                    const side = Math.random() > 0.5 ? 1 : -1;
                    
                    this.particleManager.createParticle(particleX, particleY, {
                        velocityX: Math.cos(perpDirection) * perpSpeed * side,
                        velocityY: Math.sin(perpDirection) * perpSpeed * side,
                        size: 2 + Math.random() * 4,
                        color: slime.slimeColor,
                        alpha: 0.7 + Math.random() * 0.3,
                        decay: 0.03 + Math.random() * 0.02,
                        lifetime: 20 + Math.random() * 30
                    });
                }
            }

            const totalOriginalOuterPoints = originalOuterPoints.length;
            
            // Get a typical baseMass value to use for new points
            const typicalBaseMass = originalOuterPoints[0].baseMass;

            // Calculate centroid for group1
            let centerX1 = 0, centerY1 = 0;
            for (const p of group1PointsData) {
                centerX1 += p.x;
                centerY1 += p.y;
            }
            centerX1 /= group1PointsData.length;
            centerY1 /= group1PointsData.length;
            
            // Compute average distance from centroid → new radius R1
            let totalDist1 = 0;
            for (const p of group1PointsData) {
                totalDist1 += Math.hypot(p.x - centerX1, p.y - centerY1);
            }
            const R1 = totalDist1 / group1PointsData.length;
            
            // Build a fresh circle of N1 points with inferred velocity
            const N1 = Math.max(group1PointsData.length, MIN_OUTER_POINTS_FOR_SPLIT * 2);
            const circlePts1 = buildCirclePoints(
                N1,
                centerX1, centerY1,
                R1,
                typicalBaseMass,
                originalVelocities // Pass velocities for natural movement
            );
            
            // Create first new slime with circular points
            const scale1 = slime.slimeScale * Math.sqrt(N1 / totalOriginalOuterPoints);
            const config1 = {
                type: 'from_split', 
                outerPointsData: circlePts1,
                initialScale: scale1,
                baseSlimeRadius: slime.baseSlimeRadius,
                desiredCenterX: centerX1, 
                desiredCenterY: centerY1,
                color: slime.slimeColor, 
                glow: slime.slimeGlow,
                isHealing: true, // Mark slime as healing
                healingDirection: Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI // Direction to heal towards
            };
            newSlimesToAdd.push(new Slime(this.canvas, this.ctx, this.slimeManager, config1));

            // Calculate centroid for group2
            let centerX2 = 0, centerY2 = 0;
            for (const p of group2PointsData) {
                centerX2 += p.x;
                centerY2 += p.y;
            }
            centerX2 /= group2PointsData.length;
            centerY2 /= group2PointsData.length;
            
            // Compute average distance from centroid → new radius R2
            let totalDist2 = 0;
            for (const p of group2PointsData) {
                totalDist2 += Math.hypot(p.x - centerX2, p.y - centerY2);
            }
            const R2 = totalDist2 / group2PointsData.length;
            
            // Build a fresh circle of N2 points with inferred velocity
            const N2 = Math.max(group2PointsData.length, MIN_OUTER_POINTS_FOR_SPLIT * 2);
            const circlePts2 = buildCirclePoints(
                N2,
                centerX2, centerY2,
                R2,
                typicalBaseMass,
                originalVelocities // Pass velocities for natural movement
            );
            
            // Create second new slime with circular points
            const scale2 = slime.slimeScale * Math.sqrt(N2 / totalOriginalOuterPoints);
            const config2 = {
                type: 'from_split', 
                outerPointsData: circlePts2,
                initialScale: scale2,
                baseSlimeRadius: slime.baseSlimeRadius,
                desiredCenterX: centerX2, 
                desiredCenterY: centerY2,
                color: slime.slimeColor, 
                glow: slime.slimeGlow,
                isHealing: true, // Mark slime as healing
                healingDirection: Math.atan2(p2.y - p1.y, p2.x - p1.x) // Direction to heal towards
            };
            newSlimesToAdd.push(new Slime(this.canvas, this.ctx, this.slimeManager, config2));
        }

        return { slimesToRemoveIndexes, newSlimesToAdd };
    }

    renderSlicePreview(isMouseDown) {
        if (this.sliceMode && this.sliceStartPoint && this.sliceEndPoint && isMouseDown) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(this.sliceStartPoint.x, this.sliceStartPoint.y);
            this.ctx.lineTo(this.sliceEndPoint.x, this.sliceEndPoint.y);
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }
}