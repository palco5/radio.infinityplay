// Song Detection using Web Audio API
// Detects silence between songs to accurately count songs

export interface SongDetectorConfig {
    silenceThreshold: number;      // 0-255, lower = more sensitive
    silenceDuration: number;       // milliseconds of silence to detect song end
    minSongDuration: number;       // minimum song duration in ms
}

export type SongEndCallback = (songNumber: number) => void;

export class SongDetector {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private songCount: number = 0;
    private lastSongEndTime: number = 0;
    private isDetecting: boolean = false;
    private animationFrameId: number | null = null;

    private config: SongDetectorConfig = {
        silenceThreshold: 15,        // Slightly increased to catch near-silence
        silenceDuration: 1500,       // 1.5 seconds of silence = song ended
        minSongDuration: 30000,      // Songs must be at least 30 seconds
    };

    private onSongEndCallback: SongEndCallback | null = null;

    constructor(config?: Partial<SongDetectorConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Initialize song detection for an audio element
     */
    initialize(audioElement: HTMLAudioElement): void {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // Create source from audio element
            this.source = this.audioContext.createMediaElementSource(audioElement);

            // Connect: source -> analyser -> destination
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            console.log('🎵 Song detector initialized');
        } catch (error) {
            console.error('Failed to initialize song detector:', error);
        }
    }

    /**
     * Start detecting songs
     */
    start(onSongEnd: SongEndCallback): void {
        if (!this.analyser) {
            console.error('Song detector not initialized');
            return;
        }

        this.onSongEndCallback = onSongEnd;
        this.isDetecting = true;
        this.songCount = 0;
        this.lastSongEndTime = Date.now();

        this.detect();
        console.log('🎵 Song detection started');
    }

    /**
     * Stop detecting songs
     */
    stop(): void {
        this.isDetecting = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        console.log('🎵 Song detection stopped');
    }

    /**
     * Main detection loop
     */
    private detect(): void {
        if (!this.isDetecting || !this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let silenceStart: number | null = null;

        const detectLoop = () => {
            if (!this.isDetecting || !this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);

            // Calculate average volume across all frequencies
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / bufferLength;

            const now = Date.now();

            // Check if we're in silence
            if (average < this.config.silenceThreshold) {
                // Silence detected
                if (silenceStart === null) {
                    silenceStart = now;
                } else {
                    const silenceDuration = now - silenceStart;

                    // If silence lasted long enough, consider it end of song
                    if (silenceDuration >= this.config.silenceDuration) {
                        const timeSinceLastSong = now - this.lastSongEndTime;

                        // Only count as new song if enough time has passed
                        if (timeSinceLastSong >= this.config.minSongDuration) {
                            this.songCount++;
                            this.lastSongEndTime = now;

                            console.log(`🎵 Song #${this.songCount} detected (silence: ${silenceDuration}ms, avg volume: ${average.toFixed(2)})`);

                            // Trigger callback
                            if (this.onSongEndCallback) {
                                this.onSongEndCallback(this.songCount);
                            }
                        }

                        // Reset silence timer
                        silenceStart = null;
                    }
                }
            } else {
                // Sound detected - reset silence timer
                silenceStart = null;
            }

            // Continue detection loop
            this.animationFrameId = requestAnimationFrame(detectLoop);
        };

        detectLoop();
    }

    /**
     * Get current song count
     */
    getSongCount(): number {
        return this.songCount;
    }

    /**
     * Reset song counter
     */
    reset(): void {
        this.songCount = 0;
        this.lastSongEndTime = Date.now();
        console.log('🎵 Song counter reset');
    }

    /**
     * Update detection configuration
     */
    updateConfig(config: Partial<SongDetectorConfig>): void {
        this.config = { ...this.config, ...config };
        console.log('🎵 Song detector config updated:', this.config);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stop();

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        console.log('🎵 Song detector destroyed');
    }
}
