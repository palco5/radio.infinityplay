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
    async register(email: string, password: string, first_name: string, last_name: string, phone_number?: string, country_code?: string) {
        const data = await apiCall('/auth.php?path=register', {
            method: 'POST',
            body: JSON.stringify({ email, password, first_name, last_name, phone_number, country_code }),
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

// Export default client object (compatible with Supabase structure)
const apiClient = {
    auth,
    stations,
    profiles,
    favorites,
    emails,
};

export default apiClient;
