// Event Bus za realtime komunikaciju između komponenti
type EventCallback = (data?: any) => void;

class EventBus {
    private events: Map<string, EventCallback[]> = new Map();

    // Pretplati se na event
    on(event: string, callback: EventCallback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
    }

    // Otkaži pretplatu
    off(event: string, callback: EventCallback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Emituj event
    emit(event: string, data?: any) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }

        // Emituj i preko localStorage za cross-tab komunikaciju
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`infinity_${event}`, { detail: data }));
        }
    }

    // Očisti sve event listenere
    clear() {
        this.events.clear();
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Event tipovi
export const EVENTS = {
    // Stanice
    STATION_CREATED: 'station_created',
    STATION_UPDATED: 'station_updated',
    STATION_DELETED: 'station_deleted',
    STATION_STATUS_CHANGED: 'station_status_changed',

    // Korisnici
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_PROFILE_UPDATED: 'user_profile_updated',
    USER_STATUS_CHANGED: 'user_status_changed',

    // Analitika
    LISTENING_TIME_UPDATED: 'listening_time_updated',
    STATION_PLAYED: 'station_played',

    // Podaci
    DATA_REFRESH: 'data_refresh',
} as const;

// Hook za korišćenje event bus-a u React komponentama
import { useEffect } from 'react';

export function useEventBus(event: string, callback: EventCallback) {
    useEffect(() => {
        eventBus.on(event, callback);

        // Listener za cross-tab komunikaciju
        const handleStorageEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            callback(customEvent.detail);
        };

        window.addEventListener(`infinity_${event}`, handleStorageEvent);

        return () => {
            eventBus.off(event, callback);
            window.removeEventListener(`infinity_${event}`, handleStorageEvent);
        };
    }, [event, callback]);
}
