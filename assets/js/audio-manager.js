// audio-manager.js
export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.eatSoundBuffer = null;
        this.splitSoundBuffer = null;
        
        this.loadSound('/blob_sound.mp3', (buffer) => this.eatSoundBuffer = buffer);
        this.loadSound('/split_sound.mp3', (buffer) => this.splitSoundBuffer = buffer);
    }

    async loadSound(url, callback) {
        if (!this.audioContext) return;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.audioContext.decodeAudioData(arrayBuffer, callback, 
                (error) => console.error(`Error decoding audio data for ${url}:`, error));
        } catch (error) {
            console.error(`Error loading sound ${url}:`, error);
        }
    }

    playSound(buffer) {
        if (!buffer || !this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(err => console.error("Error resuming AudioContext:", err));
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
    }

    playEatSound() { 
        this.playSound(this.eatSoundBuffer); 
    }

    playSplitSound() { 
        this.playSound(this.splitSoundBuffer); 
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(err => console.error("Error resuming AudioContext on user interaction:", err));
        }
    }
}

