import { UserJingle } from '../types';

export class JingleRotationManager {
    private jingles: UserJingle[];
    private lastPlayTime: number;
    private lastPlayedJingleId: string | null = null;

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
    }

    /** Reset the countdown — called when user switches station */
    resetTimer() {
        this.lastPlayTime = Date.now();
    }

    shouldPlayJingle(): UserJingle | null {
        if (this.jingles.length === 0) return null;

        const minutesSinceLastPlay = (Date.now() - this.lastPlayTime) / 60000;

        for (const jingle of this.jingles) {
            if (this.jingles.length > 1 && jingle.id === this.lastPlayedJingleId) continue;

            const intervalMinutes = jingle.interval_minutes || 15;
            if (minutesSinceLastPlay >= intervalMinutes) {
                return jingle;
            }
        }

        return null;
    }

    markPlayed(jingleId: string) {
        this.lastPlayTime = Date.now();
        this.lastPlayedJingleId = jingleId;
    }

    getAllJingles(): UserJingle[] {
        return this.jingles;
    }
}
