// event-handler.js
export class EventHandler {
    constructor(canvas, slimeManager, sliceHandler, audioManager) {
        this.canvas = canvas;
        this.slimeManager = slimeManager;
        this.sliceHandler = sliceHandler;
        this.audioManager = audioManager; // For resuming audio context
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp()); // No event for position
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        window.addEventListener('resize', () => this.handleResize());
    }

    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.slimeManager.mouse.x = e.clientX - rect.left;
        this.slimeManager.mouse.y = e.clientY - rect.top;
    }
    
    updateTouchPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        this.slimeManager.mouse.x = touch.clientX - rect.left;
        this.slimeManager.mouse.y = touch.clientY - rect.top;
    }

    handleMouseDown(e) {
        this.audioManager.resumeContext();
        this.updateMousePosition(e);
        this.slimeManager.mouse.down = true;

        if (this.sliceHandler.sliceMode) {
            this.sliceHandler.startSlice(this.slimeManager.mouse);
        } else {
            this.canvas.style.cursor = 'grabbing';
            this.slimeManager.findDragPoint();
        }
    }
    
    handleMouseMove(e) {
        this.updateMousePosition(e);
        if (this.slimeManager.mouse.down && this.sliceHandler.sliceMode) {
            this.sliceHandler.updateSlice(this.slimeManager.mouse);
        }
    }
    
    handleMouseUp(e) {
        if (e) this.updateMousePosition(e); 

        if (this.sliceHandler.sliceMode && this.slimeManager.mouse.down) {
            const sliceResult = this.sliceHandler.endSlice();
            if (sliceResult) {
                this.slimeManager.applySliceResult(sliceResult);
            }
        }
        
        this.slimeManager.mouse.down = false;
        this.slimeManager.draggedPointInfo = null;
        // sliceStartPoint/EndPoint are reset within sliceHandler.endSlice
        this.canvas.style.cursor = this.sliceHandler.sliceMode ? 'crosshair' : 'grab';
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.audioManager.resumeContext();
        if (e.touches.length > 0) {
            this.updateTouchPosition(e.touches[0]);
            this.slimeManager.mouse.down = true;
            if (this.sliceHandler.sliceMode) {
                this.sliceHandler.startSlice(this.slimeManager.mouse);
            } else {
                // cursor style not very relevant for touch
                this.slimeManager.findDragPoint();
            }
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            this.updateTouchPosition(e.touches[0]);
            if (this.slimeManager.mouse.down && this.sliceHandler.sliceMode) {
                this.sliceHandler.updateSlice(this.slimeManager.mouse);
            }
        }
    }

    handleTouchEnd(e) {
        // mouse.x/y are already set by last touchmove or touchstart
        if (this.sliceHandler.sliceMode && this.slimeManager.mouse.down) {
           const sliceResult = this.sliceHandler.endSlice();
            if (sliceResult) {
                this.slimeManager.applySliceResult(sliceResult);
            }
        }
        this.slimeManager.mouse.down = false;
        this.slimeManager.draggedPointInfo = null;
        // sliceStartPoint/EndPoint are reset within sliceHandler.endSlice
    }

    handleResize() {
        const oldWidth = this.slimeManager.width;
        const oldHeight = this.slimeManager.height;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        const newWidth = this.canvas.width;
        const newHeight = this.canvas.height;

        this.slimeManager.width = newWidth;
        this.slimeManager.height = newHeight;

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        this.slimeManager.notifyResize(scaleX, scaleY, oldWidth, oldHeight, newWidth, newHeight);
    }
}