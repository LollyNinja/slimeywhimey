// food-manager.js
export class FoodManager {
    constructor(canvas, ctx, slimes, audioManager, particleManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.slimes = slimes; // Reference to the main slimes array
        this.audioManager = audioManager;
        this.particleManager = particleManager;

        this.foodItems = [];
        this.foodRadius = 8;
        this.foodColor = '#ff6347';
        this.foodGravity = 0.3;
    }

    spawnFood() {
        const foodX = Math.random() * (this.canvas.width - this.foodRadius * 4) + this.foodRadius * 2;
        const foodY = this.foodRadius * 2 + Math.random() * 50; // Spawn near top
        this.foodItems.push({ 
            x: foodX, 
            y: foodY, 
            prevX: foodX, // For potential future physics
            prevY: foodY, // For potential future physics
            radius: this.foodRadius, 
            color: this.foodColor 
        });
    }

    updateFoodAndEating() {
        for (let i = this.foodItems.length - 1; i >= 0; i--) {
            const food = this.foodItems[i];
            
            // Basic physics for food (could be expanded)
            let vy = food.y - food.prevY; // Infer velocity
            food.prevY = food.y;
            food.prevX = food.x; // Store previous x too

            vy += this.foodGravity;
            food.y += vy;

            // Remove if off screen (bottom)
            if (food.y - food.radius > this.canvas.height) {
                this.foodItems.splice(i, 1);
                continue;
            }

            let eaten = false;
            for (const slime of this.slimes) {
                // Simple bounding box check first for performance
                const slimeBox = slime.getBoundingBox();
                if (food.x + food.radius < slimeBox.minX || food.x - food.radius > slimeBox.maxX ||
                    food.y + food.radius < slimeBox.minY || food.y - food.radius > slimeBox.maxY) {
                    continue;
                }

                const numOuterPoints = slime.points.length - (slime.points[slime.points.length-1].isCenter ? 1 : 0);
                for (let j = 0; j < numOuterPoints; j++) {
                    const point = slime.points[j];
                    const dist = Math.sqrt(Math.pow(point.x - food.x, 2) + Math.pow(point.y - food.y, 2));
                    
                    // Scaled touch threshold based on slime size for eating
                    if (dist < food.radius + (10 * slime.slimeScale)) { 
                        // Create eat particle effect
                        if (this.particleManager) {
                            this.particleManager.createEatEffect(food.x, food.y, food.color);
                        }
                        
                        this.foodItems.splice(i, 1);
                        slime.applyGrowth(); // applyGrowth calls audioManager.playEatSound via slime.manager
                        eaten = true;
                        break; 
                    }
                }
                if (eaten) break;
            }
        }
    }

    renderFood() {
        this.ctx.save();
        for (const food of this.foodItems) {
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = food.color;
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    handleResize(scaleX, scaleY, oldWidth, oldHeight, newWidth, newHeight) {
        if (isFinite(scaleX) && isFinite(scaleY) && oldWidth > 0 && oldHeight > 0) {
            for (const food of this.foodItems) {
                food.x *= scaleX;
                food.y *= scaleY;
                food.prevX *= scaleX;
                food.prevY *= scaleY;
            }
        } else { // Fallback for initial resize or if old dimensions were zero
             for (const food of this.foodItems) {
                food.x = food.x / oldWidth * newWidth || newWidth / 2;
                food.y = food.y / oldHeight * newHeight || newHeight / 2;
                food.prevX = food.x;
                food.prevY = food.y;
            }
        }
    }
}