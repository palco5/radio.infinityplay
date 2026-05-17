import { UserJingle } from '../types';

export class JingleRotationManager {
    private jingles: UserJingle[];
    private lastPlayTime: number;
    private lastPlayedJingleId: string | null = null;
    // Per-jingle song counters (for 'songs' schedule type)
    private songCounters: Map<string, number> = new Map();

    constructor(jingles: UserJingle[]) {
        this.jingles = jingles
            .filter(j => j.is_active)
            .sort((a, b) => a.play_order - b.play_order);
        this.lastPlayTime = Date.now();
    }

    updateJingles(jingles: UserJingle[]) {
        this.jingles = jingles
            .filter(j => j.is_active)
            .sort((a, b) => a.play_order - b.play_order);
        // Remove counters for deleted jingles
        const ids = new Set(this.jingles.map(j => j.id));
        for (const id of this.songCounters.keys()) {
            if (!ids.has(id)) this.songCounters.delete(id);
        }
    }

    /** Reset interval timer — called when user switches station */
    resetTimer() {
        this.lastPlayTime = Date.now();
        // Also reset song counters on station switch
        this.songCounters.clear();
    }

    /** Call this every time a new song is detected on the current station */
    notifySongChange() {
        for (const jingle of this.jingles) {
            if (jingle.schedule_type === 'songs') {
                this.songCounters.set(jingle.id, (this.songCounters.get(jingle.id) || 0) + 1);
            }
        }
    }

    shouldPlayJingle(): UserJingle | null {
        if (this.jingles.length === 0) return null;

        const minutesSinceLastPlay = (Date.now() - this.lastPlayTime) / 60000;

        for (const jingle of this.jingles) {
            if (this.jingles.length > 1 && jingle.id === this.lastPlayedJingleId) continue;

            if (jingle.schedule_type === 'songs') {
                const songsSinceLast = this.songCounters.get(jingle.id) || 0;
                const targetSongs = jingle.after_songs_count || 3;
                if (songsSinceLast >= targetSongs) return jingle;
                // Time-based fallback (~3 min/song): triggers even when stream has no ICY metadata
                if (minutesSinceLastPlay >= targetSongs * 3) return jingle;
            } else {
                // Default: interval mode
                const intervalMinutes = jingle.interval_minutes || 15;
                if (minutesSinceLastPlay >= intervalMinutes) return jingle;
            }
        }

        return null;
    }

    markPlayed(jingleId: string) {
        this.lastPlayTime = Date.now();
        this.lastPlayedJingleId = jingleId;
        // Reset song counter only for the jingle that just played
        this.songCounters.set(jingleId, 0);
    }

    getAllJingles(): UserJingle[] {
        return this.jingles;
    }
}
