// Slime Physics Simulation - SlimeManager Class
import { Slime } from './slime-class.js';
import { AudioManager } from './audio-manager.js';
import { FoodManager } from './food-manager.js';
import { SliceHandler } from './slice-handler.js';
import { EventHandler } from './event-handler.js';
import { ParticleManager } from './particle-manager.js';

export class SlimeManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.slimes = [];

        // Interaction - mouse state is managed here, updated by EventHandler
        this.mouse = { x: 0, y: 0, down: false };
        this.draggedPointInfo = null; // { slimeId: null, pointIndex: null }
        this.dragStrength = 0.15;
        
        // Instantiate new handlers
        this.audioManager = new AudioManager();
        this.particleManager = new ParticleManager(this.canvas, this.ctx);
        this.foodManager = new FoodManager(this.canvas, this.ctx, this.slimes, this.audioManager, this.particleManager);
        // Pass `this` (SlimeManager instance) to SliceHandler for creating new Slime instances
        this.sliceHandler = new SliceHandler(this.canvas, this.ctx, this.slimes, this.audioManager, this, this.particleManager); 
        this.eventHandler = new EventHandler(this.canvas, this, this.sliceHandler, this.audioManager);
        
        this.init();
        this.eventHandler.setupEvents(); // Setup events via EventHandler
        this.animate();
    }

    init() {
        const initialSlimeConfig = {
            type: 'new_random',
            centerX: this.width / 2,
            centerY: this.height / 3,
            initialScale: 1.0,
            numOuterPoints: 15,
            baseSlimeRadius: 80
        };
        // Pass `this` (SlimeManager instance) as the manager to Slime
        this.slimes.push(new Slime(this.canvas, this.ctx, this, initialSlimeConfig));
    }

    // Wrapper methods for sounds, called by Slime instances or other handlers
    playEatSound() { 
        this.audioManager.playEatSound(); 
    }
    playSplitSound() { 
        this.audioManager.playSplitSound(); 
    }
    
    // Wrapper for UI, called from index.html
    toggleSliceMode() {
        const newMode = this.sliceHandler.toggleSliceMode();
        // The actual button text update is handled in index.html based on slimeManager.sliceHandler.sliceMode
        return newMode; 
    }
    
    findDragPoint() { // Called by EventHandler
        let minDist = Number.MAX_VALUE;
        let closestSlimeId = null;
        let closestPointIndex = -1;
        
        for (const slime of this.slimes) {
            const touchRadius = 50 * slime.slimeScale; // Use slime's scale
            for (let i = 0; i < slime.points.length; i++) {
                const dist = slime.distance(slime.points[i].x, slime.points[i].y, this.mouse.x, this.mouse.y);
                if (dist < minDist && dist < touchRadius) {
                    minDist = dist;
                    closestSlimeId = slime.id;
                    closestPointIndex = i;
                }
            }
        }
        
        if (closestSlimeId !== null) {
            this.draggedPointInfo = { slimeId: closestSlimeId, pointIndex: closestPointIndex };
        }
    }
    
    notifyResize(scaleX, scaleY, oldWidth, oldHeight, newWidth, newHeight) { // Called by EventHandler
        // Update slimes
        if (isFinite(scaleX) && isFinite(scaleY) && oldWidth > 0 && oldHeight > 0) {
            for (const slime of this.slimes) {
                for (const point of slime.points) {
                    point.x *= scaleX;
                    point.y *= scaleY;
                    point.prevX *= scaleX;
                    point.prevY *= scaleY;
                }
            }
        } else { 
            for (const slime of this.slimes) {
                if (slime.points.length > 0) {
                    const centerP = slime.getCenterPoint();
                    const dx = this.width / 2 - centerP.x;
                    const dy = this.height / 2 - centerP.y;
                    for (const point of slime.points) {
                        point.x += dx; point.y += dy;
                        point.prevX += dx; point.prevY += dy;
                    }
                }
            }
        }
        // Notify FoodManager
        this.foodManager.handleResize(scaleX, scaleY, oldWidth, oldHeight, newWidth, newHeight);
    }

    // Wrapper for UI, called from index.html
    spawnFood() {
        this.foodManager.spawnFood();
    }

    applySliceResult({ slimesToRemoveIndexes, newSlimesToAdd }) { // Called by EventHandler after SliceHandler.endSlice
        // Remove old slimes (iterate backwards to keep indices correct)
        slimesToRemoveIndexes.sort((a, b) => b - a).forEach(index => this.slimes.splice(index, 1));
        
        // Add new slimes
        this.slimes.push(...newSlimesToAdd);
    }

    update() {
        // Update particles first
        this.particleManager.update();
        
        for (const slime of this.slimes) {
            const oldPos = slime.updatePhysics(this.draggedPointInfo);
            
            // Create drag particles if the slime is being dragged
            if (this.draggedPointInfo && this.draggedPointInfo.slimeId === slime.id) {
                const centerPoint = slime.getCenterPoint();
                const vx = centerPoint.x - centerPoint.prevX;
                const vy = centerPoint.y - centerPoint.prevY;
                
                // Only create particles if there's significant movement
                if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
                    this.particleManager.createDragEffect(
                        centerPoint.x, centerPoint.y, 
                        vx, vy, 
                        slime.slimeColor
                    );
                }
            }
        }
        
        this.foodManager.updateFoodAndEating(); // Delegate to FoodManager
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.foodManager.renderFood(); // Delegate to FoodManager

        for (const slime of this.slimes) {
            slime.render();
        }

        // Render particles
        this.particleManager.render();

        // Delegate slice preview rendering to SliceHandler
        // Pass mouse.down state for conditional rendering of slice line
        this.sliceHandler.renderSlicePreview(this.mouse.down); 
    }
    
    animate() {
        const physicsPasses = 3; 
        for (let i = 0; i < physicsPasses; i++) {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}