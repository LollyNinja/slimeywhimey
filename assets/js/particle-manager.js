// particle-manager.js
export class ParticleManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
    }

    createParticle(x, y, options = {}) {
        const defaultOptions = {
            velocityX: (Math.random() - 0.5) * 5,
            velocityY: (Math.random() - 0.5) * 5 - 2, // Slight upward bias
            size: Math.random() * 5 + 2,
            color: '#00ffaa',
            alpha: 1,
            decay: 0.01 + Math.random() * 0.03,
            gravity: 0.1,
            friction: 0.98,
            lifetime: 60 + Math.random() * 40
        };

        const particleOptions = { ...defaultOptions, ...options };
        
        this.particles.push({
            x,
            y,
            velocityX: particleOptions.velocityX,
            velocityY: particleOptions.velocityY,
            size: particleOptions.size,
            originalSize: particleOptions.size,
            color: particleOptions.color,
            alpha: particleOptions.alpha,
            decay: particleOptions.decay,
            gravity: particleOptions.gravity,
            friction: particleOptions.friction,
            lifetime: particleOptions.lifetime,
            age: 0
        });
    }

    createSliceEffect(x1, y1, x2, y2, slimeColor = '#00ffaa') {
        // Calculate the slice line direction and length
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const particleCount = Math.max(5, Math.floor(distance / 10));
        
        // Create particles along the slice line
        for (let i = 0; i < particleCount; i++) {
            const ratio = i / (particleCount - 1);
            const x = x1 + dx * ratio;
            const y = y1 + dy * ratio;
            
            // Create a burst of particles at each point
            const burstCount = 3 + Math.floor(Math.random() * 3);
            for (let j = 0; j < burstCount; j++) {
                // Calculate perpendicular velocity for slice particles
                const perpX = -dy / distance * (2 + Math.random() * 3);
                const perpY = dx / distance * (2 + Math.random() * 3);
                
                // Randomize the perpendicular direction
                const sign = Math.random() > 0.5 ? 1 : -1;
                
                this.createParticle(x, y, {
                    velocityX: perpX * sign + (Math.random() - 0.5),
                    velocityY: perpY * sign + (Math.random() - 0.5),
                    size: 2 + Math.random() * 4,
                    color: slimeColor,
                    alpha: 0.8 + Math.random() * 0.2,
                    decay: 0.03 + Math.random() * 0.02,
                    lifetime: 30 + Math.random() * 20
                });
            }
        }
    }

    createDragEffect(x, y, vx, vy, slimeColor = '#00ffaa') {
        // Only create drag particles if there's significant movement
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < 0.5) return;
        
        // Create particles based on the velocity
        const particleCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(x, y, {
                velocityX: -vx * 0.3 + (Math.random() - 0.5) * 2,
                velocityY: -vy * 0.3 + (Math.random() - 0.5) * 2,
                size: 1 + Math.random() * 3,
                color: slimeColor,
                alpha: 0.4 + Math.random() * 0.3,
                decay: 0.04 + Math.random() * 0.03,
                lifetime: 15 + Math.random() * 15
            });
        }
    }

    createGrowthEffect(x, y, slimeColor = '#00ffaa') {
        const particleCount = 8 + Math.floor(Math.random() * 6);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 10;
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            this.createParticle(particleX, particleY, {
                velocityX: Math.cos(angle) * (2 + Math.random() * 3),
                velocityY: Math.sin(angle) * (2 + Math.random() * 3),
                size: 3 + Math.random() * 4,
                color: slimeColor,
                alpha: 0.8 + Math.random() * 0.2,
                decay: 0.01 + Math.random() * 0.02,
                gravity: 0.05,
                lifetime: 40 + Math.random() * 30
            });
        }
    }

    createEatEffect(foodX, foodY, foodColor = '#ff6347') {
        const particleCount = 10 + Math.floor(Math.random() * 8);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 5;
            const particleX = foodX + Math.cos(angle) * distance;
            const particleY = foodY + Math.sin(angle) * distance;
            
            this.createParticle(particleX, particleY, {
                velocityX: Math.cos(angle) * (1 + Math.random() * 2),
                velocityY: Math.sin(angle) * (1 + Math.random() * 2) - 1, // Slight upward bias
                size: 2 + Math.random() * 3,
                color: foodColor,
                alpha: 0.7 + Math.random() * 0.3,
                decay: 0.02 + Math.random() * 0.02,
                gravity: 0.05,
                lifetime: 30 + Math.random() * 20
            });
        }
    }

    createHealingEffect(x, y, slimeColor = '#00ffaa') {
        const particleCount = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 3 + Math.random() * 7;
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            this.createParticle(particleX, particleY, {
                velocityX: Math.cos(angle) * (0.5 + Math.random()),
                velocityY: Math.sin(angle) * (0.5 + Math.random()) - 1, // Slight upward bias
                size: 2 + Math.random() * 2,
                color: slimeColor,
                alpha: 0.6 + Math.random() * 0.3,
                decay: 0.03 + Math.random() * 0.02,
                gravity: 0.01,
                lifetime: 20 + Math.random() * 15
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Apply physics
            particle.velocityY += particle.gravity;
            particle.velocityX *= particle.friction;
            particle.velocityY *= particle.friction;
            
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            
            // Age the particle
            particle.age++;
            
            // Calculate remaining life percentage
            const lifePercentage = 1 - (particle.age / particle.lifetime);
            
            // Update size and alpha based on life percentage
            particle.size = particle.originalSize * lifePercentage;
            particle.alpha -= particle.decay;
            
            // Remove dead particles
            if (particle.alpha <= 0 || particle.age >= particle.lifetime) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        this.ctx.save();
        for (const particle of this.particles) {
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }
}