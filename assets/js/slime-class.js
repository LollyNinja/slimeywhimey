// Slime Physics Simulation - Slime Class
import { updateSlimePhysics } from './slime-physics.js';
import { renderSlime, drawSlimeEyes } from './slime-rendering.js';
import { updateHealing } from './slime-healing.js';

export class Slime {
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
        
        // Healing properties
        this.isHealing = config.isHealing || false;
        this.healingProgress = 0;
        this.healingRate = 0.03; // Rate at which slime heals (0-1)
        this.healingDirection = config.healingDirection || 0;
        this.healingPulseTime = 0; // For pulsing effect during healing

        this.id = config.id || Math.random().toString(36).substr(2, 9); // Use provided ID or generate new

        if (config.type === 'new_random') {
            this.initSlimeNew(config.centerX, config.centerY, config.numOuterPoints);
        } else if (config.type === 'from_split') {
            this.initSlimeFromSplit(config.outerPointsData, config.desiredCenterX, config.desiredCenterY);
        }
    }

    // Initialization methods
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
        
        // Play eat sound
        this.manager.playEatSound();
        
        // Create growth particle effect at the slime's center
        const centerPoint = this.getCenterPoint();
        if (this.manager.particleManager) {
            this.manager.particleManager.createGrowthEffect(
                centerPoint.x, 
                centerPoint.y, 
                this.slimeColor
            );
        }
    }

    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Physics update - delegates to slime-physics.js
    updatePhysics(draggedPointInfo) {
        return updateSlimePhysics(this, draggedPointInfo);
    }
    
    // Healing update - delegates to slime-healing.js
    updateHealing() {
        updateHealing(this);
    }
    
    // Rendering - delegates to slime-rendering.js
    render() {
        renderSlime(this);
    }
    
    // Eye drawing - delegates to slime-rendering.js
    drawEyes(centerPoint) {
        drawSlimeEyes(this, centerPoint);
    }
}