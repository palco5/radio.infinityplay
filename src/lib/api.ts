// API Client for InfinityPlay Radio - Loopia Backend
// Zamenjuje Supabase client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
            const text = await response.text();
            try {
                const data = JSON.parse(text);
                errorMessage = data.error || data.message || JSON.stringify(data);
            } catch {
                // Not JSON, use text (truncate if too long)
                errorMessage = text.substring(0, 200) || `HTTP Error ${response.status} ${response.statusText}`;
            }
        } catch (e) {
            errorMessage = `HTTP Error ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

// Auth API
export const auth = {
    async register(email: string, password: string, first_name: string, last_name: string, phone_number?: string, country_code?: string, venue_name?: string) {
        const data = await apiCall('/auth.php?path=register', {
            method: 'POST',
            body: JSON.stringify({ email, password, first_name, last_name, phone_number, country_code, venue_name }),
        });

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        return data;
    },

    async login(email: string, password: string) {
        const data = await apiCall('/auth.php?path=login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        return data;
    },

    async getCurrentUser() {
        try {
            const data = await apiCall('/auth.php?path=me');
            return data.user;
        } catch (error) {
            localStorage.removeItem('auth_token');
            return null;
        }
    },

    async getAllProfiles() {
        const data = await apiCall('/auth.php?path=users');
        return data.users;
    },

    async changePassword(currentPassword: string, newPassword: string) {
        return apiCall('/auth.php?path=change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    async deleteAccount(password: string) {
        const data = await apiCall('/auth.php?path=delete-account', {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
        localStorage.removeItem('auth_token');
        return data;
    },

    logout() {
        localStorage.removeItem('auth_token');
    },
};

// Stations API
export const stations = {
    async getAll() {
        const data = await apiCall('/stations.php');
        return data.stations;
    },

    async getById(id: string) {
        const data = await apiCall(`/stations.php?id=${id}`);
        return data.station;
    },

    async create(station: any) {
        const data = await apiCall('/stations.php', {
            method: 'POST',
            body: JSON.stringify(station),
        });
        return data;
    },

    async update(id: string, updates: any) {
        const data = await apiCall(`/stations.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data;
    },

    async delete(id: string) {
        const data = await apiCall(`/stations.php?id=${id}`, {
            method: 'DELETE',
        });
        return data;
    },
};

// Profiles API
export const profiles = {
    async getById(id: string) {
        const data = await apiCall(`/profiles.php?id=${id}`);
        return data.profile;
    },

    async update(id: string, updates: any) {
        const data = await apiCall(`/profiles.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data.profile;
    },

    async delete(id: string) {
        await apiCall(`/profiles.php?id=${id}`, { method: 'DELETE' });
    },
};

// Favorites API
export const favorites = {
    async getAll() {
        const data = await apiCall('/favorites.php');
        return data.favorites;
    },

    async add(station_id: string) {
        const data = await apiCall('/favorites.php', {
            method: 'POST',
            body: JSON.stringify({ station_id }),
        });
        return data.favorite;
    },

    async remove(station_id: string) {
        await apiCall(`/favorites.php?station_id=${station_id}`, {
            method: 'DELETE',
        });
    },
};

// Email API
export const emails = {
    async send(to: string, subject: string, html: string) {
        const data = await apiCall('/send_email.php', {
            method: 'POST',
            body: JSON.stringify({ to, subject, html }),
        });
        return data;
    },
};

// Jingles API
export const jingles = {
    async getAll(user_id?: string) {
        const url = user_id ? `/jingles.php?user_id=${user_id}` : '/jingles.php';
        const data = await apiCall(url);
        return data.jingles;
    },

    async create(jingle: any) {
        const data = await apiCall('/jingles.php', {
            method: 'POST',
            body: JSON.stringify(jingle),
        });
        return data;
    },

    async update(id: string, updates: any) {
        const data = await apiCall(`/jingles.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data;
    },

    async delete(id: string) {
        const data = await apiCall(`/jingles.php?id=${id}`, {
            method: 'DELETE',
        });
        return data;
    },
};

// Remote Session API
export const remote = {
    async heartbeat(payload: { device_id: string; device_type: string; device_name: string; station_id: string | null; station_name: string | null; is_playing: boolean; song_title?: string | null; song_artist?: string | null; song_state?: string; song_queue?: string | null; saved_playlist_count?: number }) {
        return apiCall('/remote.php?action=heartbeat', { method: 'POST', body: JSON.stringify(payload) });
    },
    async status(deviceId: string) {
        return apiCall(`/remote.php?action=status&device_id=${encodeURIComponent(deviceId)}`);
    },
    async sendCommand(targetDeviceId: string, command: string) {
        return apiCall('/remote.php?action=command', { method: 'POST', body: JSON.stringify({ target_device_id: targetDeviceId, command }) });
    },
    async ack(deviceId: string, commandId: string) {
        return apiCall('/remote.php?action=ack', { method: 'POST', body: JSON.stringify({ device_id: deviceId, command_id: commandId }) });
    },
    async unregister(deviceId: string) {
        return apiCall(`/remote.php?device_id=${encodeURIComponent(deviceId)}`, { method: 'DELETE' }).catch(() => {});
    },
    async renameDevice(targetDeviceId: string, newName: string) {
        return apiCall('/remote.php?action=rename', { method: 'POST', body: JSON.stringify({ device_id: targetDeviceId, device_name: newName }) });
    },
    async liveStats(): Promise<{ listener_counts: Record<string, number>; total_playing: number; total_devices: number }> {
        return apiCall('/remote.php?action=live_stats');
    },
    async liveUsers(): Promise<{ user_sessions: Record<string, { station_name: string; station_id: string; is_playing: boolean; device_name: string; device_type: string }> }> {
        return apiCall('/remote.php?action=live_users');
    },
};

// YouTube Search API — returns video IDs via scraping proxy
export const youtubeSearch = {
    async getVideoIds(query: string, durationSeconds?: number): Promise<string[]> {
        try {
            const token = localStorage.getItem('auth_token');
            let url = `${API_URL}/youtube_search.php?q=${encodeURIComponent(query)}`;
            if (durationSeconds) url += `&duration=${Math.round(durationSeconds)}`;
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) return [];
            const data = await res.json();
            const ids: string[] = [];
            if (data.videoId) ids.push(data.videoId);
            if (Array.isArray(data.fallback)) ids.push(...data.fallback);
            return ids;
        } catch {
            return [];
        }
    },
};

// Now Playing API — fetches ICY metadata (song title) from any stream
export const nowplaying = {
    async getTitle(streamUrl: string): Promise<string> {
        try {
            const response = await fetch(`${API_URL}/nowplaying.php?url=${encodeURIComponent(streamUrl)}`);
            if (!response.ok) return '';
            const data = await response.json();
            return data.title || '';
        } catch {
            return '';
        }
    },

    async getInfo(streamUrl: string): Promise<{ title: string; coverart: string | null }> {
        try {
            const response = await fetch(`${API_URL}/nowplaying.php?url=${encodeURIComponent(streamUrl)}`);
            if (!response.ok) return { title: '', coverart: null };
            const data = await response.json();
            return { title: data.title || '', coverart: data.coverart || null };
        } catch {
            return { title: '', coverart: null };
        }
    },
};

// Paddle billing — checkout config + subscription management
export const paddle = {
    async getConfig(): Promise<{ environment: string; clientToken: string; prices: Record<string, string> }> {
        const response = await fetch(`${API_URL}/paddle_config.php`);
        return response.json();
    },

    async cancelSubscription() {
        return apiCall('/paddle_subscription.php?action=cancel', { method: 'POST' });
    },
};

// Export default client object (compatible with Supabase structure)
const apiClient = {
    auth,
    stations,
    profiles,
    favorites,
    emails,
};

export default apiClient;
